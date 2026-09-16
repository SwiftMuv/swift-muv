// Address suggestions for the booking screen.
// Runs server-side because the browser Maps key is app-restricted; the backend
// key (GOOGLE_API_KEY) or the Lovable connector gateway is used instead.
import { createClient } from 'npm:@supabase/supabase-js@2';

const GATEWAY_URL = 'https://connector-gateway.lovable.dev/google_maps';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) return json({ error: 'Unauthorized' }, 401);
    const authClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: claims } = await authClient.auth.getClaims(authHeader.replace('Bearer ', ''));
    if (!claims?.claims) return json({ error: 'Unauthorized' }, 401);

    const body = await req.json().catch(() => ({}));
    const input = String(body?.input ?? '').trim();
    const lat = Number(body?.lat);
    const lng = Number(body?.lng);
    if (input.length < 3) return json({ suggestions: [] });

    const DIRECT_KEY = Deno.env.get('GOOGLE_API_KEY');
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    const GOOGLE_MAPS_API_KEY = Deno.env.get('GOOGLE_MAPS_API_KEY');
    if (!DIRECT_KEY && (!LOVABLE_API_KEY || !GOOGLE_MAPS_API_KEY)) {
      return json({ error: 'Google Maps not configured' }, 500);
    }

    const payload: Record<string, unknown> = {
      input,
      includedRegionCodes: ['ca', 'us'],
    };
    if (Number.isFinite(lat) && Number.isFinite(lng)) {
      payload.locationBias = { circle: { center: { latitude: lat, longitude: lng }, radius: 50000 } };
    }

    // The managed connector key is unrestricted, so try it first; the pasted
    // project key may be app-restricted and rejected for server calls.
    const attempts: Array<() => Promise<Response>> = [];
    if (LOVABLE_API_KEY && GOOGLE_MAPS_API_KEY) {
      attempts.push(() =>
        fetch(`${GATEWAY_URL}/places/v1/places:autocomplete`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
            'X-Connection-Api-Key': GOOGLE_MAPS_API_KEY,
          },
          body: JSON.stringify(payload),
        }),
      );
    }
    if (DIRECT_KEY) {
      attempts.push(() =>
        fetch(`https://places.googleapis.com/v1/places:autocomplete?key=${DIRECT_KEY}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        }),
      );
    }

    let res: Response | null = null;
    let text = '';
    for (const attempt of attempts) {
      res = await attempt();
      text = await res.text();
      if (res.ok) break;
      console.error('places autocomplete attempt failed', res.status, text);
    }
    if (!res || !res.ok) {
      return json({ suggestions: [], error: 'AUTOCOMPLETE_FAILED' });
    }
    const parsed = JSON.parse(text);
    const suggestions = (parsed?.suggestions ?? [])
      .map((s: Record<string, any>) => {
        const p = s.placePrediction;
        if (!p) return null;
        return {
          placeId: p.placeId ?? p.place ?? '',
          text: p.text?.text ?? '',
          secondary: p.structuredFormat?.secondaryText?.text ?? '',
        };
      })
      .filter((s: unknown) => Boolean(s && (s as { text: string }).text));

    return json({ suggestions });
  } catch (err) {
    console.error('places-autocomplete error', err);
    return json({ error: err instanceof Error ? err.message : 'unknown' }, 500);
  }
});
