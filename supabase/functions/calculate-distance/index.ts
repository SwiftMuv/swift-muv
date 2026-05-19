// Google Maps Distance Matrix via Lovable connector gateway
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
    const { origin, destination } = await req.json();
    if (!origin || !destination) return json({ error: 'origin and destination are required' }, 400);

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    const GOOGLE_MAPS_API_KEY = Deno.env.get('GOOGLE_MAPS_API_KEY');
    if (!LOVABLE_API_KEY || !GOOGLE_MAPS_API_KEY) return json({ error: 'Google Maps not configured' }, 500);

    // Use Routes API v2 (Distance Matrix replacement)
    const body = {
      origins: [{ waypoint: { address: String(origin) } }],
      destinations: [{ waypoint: { address: String(destination) } }],
      travelMode: 'DRIVE',
      routingPreference: 'TRAFFIC_AWARE',
    };

    const res = await fetch(`${GATEWAY_URL}/routes/distanceMatrix/v2:computeRouteMatrix`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'X-Connection-Api-Key': GOOGLE_MAPS_API_KEY,
        'Content-Type': 'application/json',
        'X-Goog-FieldMask': 'originIndex,destinationIndex,duration,distanceMeters,status,condition',
      },
      body: JSON.stringify(body),
    });

    const text = await res.text();
    if (!res.ok) {
      console.error('Routes API error', res.status, text);
      return json({ error: 'Distance lookup failed', details: text }, 502);
    }

    // Response is JSON array
    const rows = JSON.parse(text);
    const first = Array.isArray(rows) ? rows[0] : rows;
    if (!first?.distanceMeters) return json({ error: 'No route found' }, 404);

    const km = Math.round((first.distanceMeters / 1000) * 100) / 100;
    const durationSec = first.duration ? parseInt(String(first.duration).replace('s', ''), 10) : null;

    // Also geocode the addresses to lat/lng (used by RLS dispatch radius)
    const geocode = async (address: string) => {
      const r = await fetch(
        `${GATEWAY_URL}/maps/api/geocode/json?address=${encodeURIComponent(address)}`,
        { headers: { 'Authorization': `Bearer ${LOVABLE_API_KEY}`, 'X-Connection-Api-Key': GOOGLE_MAPS_API_KEY } },
      );
      const j = await r.json();
      return j.results?.[0]?.geometry?.location ?? null;
    };
    const [pickup, dropoff] = await Promise.all([geocode(String(origin)), geocode(String(destination))]);

    return json({ km, durationSec, pickup, dropoff });
  } catch (err) {
    console.error('calculate-distance error', err);
    return json({ error: err instanceof Error ? err.message : 'unknown' }, 500);
  }
});
