// Delivers a push notification to a user's registered devices via FCM (v1 API).
// Invoked by the dispatch_push_notification trigger on the notifications table.
// Requires the FCM_SERVICE_ACCOUNT_JSON secret (Firebase service account).
import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

const json = (b: Record<string, unknown>, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

// --- Minimal Google service-account JWT → OAuth access token ---
const base64url = (data: Uint8Array | string): string => {
  const bytes = typeof data === 'string' ? new TextEncoder().encode(data) : data;
  let bin = '';
  bytes.forEach((b) => { bin += String.fromCharCode(b); });
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};

const pemToBytes = (pem: string): ArrayBuffer => {
  const b64 = pem.replace(/-----[^-]+-----/g, '').replace(/\s+/g, '');
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes.buffer;
};

async function getGoogleAccessToken(sa: { client_email: string; private_key: string }): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const header = base64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const claims = base64url(JSON.stringify({
    iss: sa.client_email,
    scope: 'https://www.googleapis.com/auth/firebase.messaging',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
  }));
  const unsigned = `${header}.${claims}`;
  const key = await crypto.subtle.importKey(
    'pkcs8',
    pemToBytes(sa.private_key),
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const sig = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, new TextEncoder().encode(unsigned));
  const jwt = `${unsigned}.${base64url(new Uint8Array(sig))}`;

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
  });
  const data = await res.json();
  if (!data.access_token) throw new Error('Google token exchange failed');
  return data.access_token as string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const { user_id, title, body, data } = await req.json().catch(() => ({}));
    if (!user_id || !title) return json({ error: 'user_id and title are required' }, 400);

    const saJson = Deno.env.get('FCM_SERVICE_ACCOUNT_JSON');
    if (!saJson) {
      // Firebase not configured yet — no-op so notifications still succeed in-app.
      return json({ skipped: 'fcm_not_configured' });
    }
    const sa = JSON.parse(saJson);

    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const { data: tokens } = await admin
      .from('device_tokens')
      .select('id, token')
      .eq('user_id', user_id);
    if (!tokens?.length) return json({ sent: 0 });

    const accessToken = await getGoogleAccessToken(sa);
    const stale: string[] = [];
    let sent = 0;

    for (const t of tokens) {
      const res = await fetch(`https://fcm.googleapis.com/v1/projects/${sa.project_id}/messages:send`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: {
            token: t.token,
            notification: { title, body: body ?? '' },
            data: Object.fromEntries(
              Object.entries((data as Record<string, unknown>) ?? {}).map(([k, v]) => [k, String(v)]),
            ),
            android: { priority: 'HIGH' },
          },
        }),
      });
      if (res.ok) sent += 1;
      else {
        const errText = await res.text();
        if (errText.includes('NOT_FOUND') || errText.includes('UNREGISTERED')) stale.push(t.id);
        console.warn('fcm send failed', res.status, errText.slice(0, 200));
      }
    }

    if (stale.length) {
      await admin.from('device_tokens').delete().in('id', stale);
    }

    return json({ sent, pruned: stale.length });
  } catch (e) {
    console.error('send-push unexpected', e);
    return json({ error: e instanceof Error ? e.message : 'Unknown error' }, 500);
  }
});
