// Turns device coordinates into a street address (used to pre-fill the pickup field).
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
    const lat = Number(body?.lat);
    const lng = Number(body?.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) {
      return json({ error: 'lat and lng are required' }, 400);
    }

    const DIRECT_KEY = Deno.env.get('GOOGLE_API_KEY');
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    const GOOGLE_MAPS_API_KEY = Deno.env.get('GOOGLE_MAPS_API_KEY');
    if (!DIRECT_KEY && (!LOVABLE_API_KEY || !GOOGLE_MAPS_API_KEY)) {
      return json({ error: 'Google Maps not configured' }, 500);
    }

    const path = `/maps/api/geocode/json?latlng=${lat},${lng}`;
    const url = DIRECT_KEY
      ? `https://maps.googleapis.com${path}&key=${DIRECT_KEY}`
      : `${GATEWAY_URL}${path}`;
    const headers: Record<string, string> = DIRECT_KEY
      ? {}
      : { Authorization: `Bearer ${LOVABLE_API_KEY}`, 'X-Connection-Api-Key': GOOGLE_MAPS_API_KEY! };

    const res = await fetch(url, { headers });
    const text = await res.text();
    if (!res.ok) {
      console.error('reverse geocode failed', res.status, text);
      return json({ error: 'Reverse geocode failed', status: res.status, details: text }, res.status);
    }
    const parsed = JSON.parse(text);
    const result = parsed?.results?.[0];
    if (!result) return json({ address: null });

    const comps = result.address_components ?? [];
    const find = (type: string) =>
      comps.find((c: { types: string[] }) => c.types.includes(type))?.short_name ?? null;

    return json({
      address: result.formatted_address ?? null,
      lat,
      lng,
      city: find('locality') ?? find('postal_town') ?? find('administrative_area_level_2'),
      province: find('administrative_area_level_1'),
    });
  } catch (err) {
    console.error('reverse-geocode error', err);
    return json({ error: err instanceof Error ? err.message : 'unknown' }, 500);
  }
});
