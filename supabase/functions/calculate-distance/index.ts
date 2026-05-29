// Google Maps Distance Matrix via Lovable connector gateway
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
    // Require authentication to prevent quota abuse
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) return json({ error: 'Unauthorized' }, 401);
    const authClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: claims } = await authClient.auth.getClaims(authHeader.replace('Bearer ', ''));
    if (!claims?.claims) return json({ error: 'Unauthorized' }, 401);

    const { origin, destination } = await req.json();
    if (!origin || !destination) return json({ error: 'origin and destination are required' }, 400);

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    const GOOGLE_MAPS_API_KEY = Deno.env.get('GOOGLE_MAPS_API_KEY');
    if (!LOVABLE_API_KEY || !GOOGLE_MAPS_API_KEY) return json({ error: 'Google Maps not configured' }, 500);

    // Geocode addresses first; extract coords + province/city
    const geocode = async (address: string) => {
      const r = await fetch(
        `${GATEWAY_URL}/maps/api/geocode/json?address=${encodeURIComponent(address)}`,
        { headers: { 'Authorization': `Bearer ${LOVABLE_API_KEY}`, 'X-Connection-Api-Key': GOOGLE_MAPS_API_KEY } },
      );
      const j = await r.json();
      const result = j.results?.[0];
      if (!result) return null;
      const comps = result.address_components ?? [];
      const find = (type: string) =>
        comps.find((c: { types: string[] }) => c.types.includes(type))?.short_name ?? null;
      return {
        ...result.geometry.location,
        formatted: result.formatted_address ?? address,
        province: find('administrative_area_level_1'),
        city: find('locality') ?? find('postal_town') ?? find('administrative_area_level_2'),
        country: find('country'),
      };
    };
    const [pickup, dropoff] = await Promise.all([geocode(String(origin)), geocode(String(destination))]);

    if (!pickup || !dropoff) {
      return json({ error: 'Could not resolve addresses', pickup, dropoff }, 404);
    }

    let km: number | null = null;
    let durationSec: number | null = null;

    // Use Routes API v2 with coordinates (most reliable)
    try {
      const body = {
        origins: [{ waypoint: { location: { latLng: { latitude: pickup.lat, longitude: pickup.lng } } } }],
        destinations: [{ waypoint: { location: { latLng: { latitude: dropoff.lat, longitude: dropoff.lng } } } }],
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
      if (!res.ok) console.error('Routes API error', res.status, text);
      const rows = JSON.parse(text);
      const first = Array.isArray(rows) ? rows[0] : rows;
      if (first?.distanceMeters) {
        km = Math.round((first.distanceMeters / 1000) * 100) / 100;
        durationSec = first.duration ? parseInt(String(first.duration).replace('s', ''), 10) : null;
      } else {
        console.warn('Routes API returned no distance', first);
      }
    } catch (e) {
      console.error('Routes API call failed', e);
    }

    // Haversine fallback if Routes API didn't return a value
    if (km == null) {
      const toRad = (d: number) => (d * Math.PI) / 180;
      const dLat = toRad(dropoff.lat - pickup.lat);
      const dLng = toRad(dropoff.lng - pickup.lng);
      const a = Math.sin(dLat / 2) ** 2 +
        Math.cos(toRad(pickup.lat)) * Math.cos(toRad(dropoff.lat)) * Math.sin(dLng / 2) ** 2;
      km = Math.round(2 * 6371 * Math.asin(Math.sqrt(a)) * 100) / 100;
    }

    let moveType: 'local' | 'intercity' | 'inter-province' = 'local';
    if (pickup?.province && dropoff?.province) {
      if (pickup.province !== dropoff.province) moveType = 'inter-province';
      else if (pickup.city && dropoff.city && pickup.city !== dropoff.city) moveType = 'intercity';
    }

    return json({ km, durationSec, pickup, dropoff, moveType });
  } catch (err) {
    console.error('calculate-distance error', err);
    return json({ error: err instanceof Error ? err.message : 'unknown' }, 500);
  }
});
