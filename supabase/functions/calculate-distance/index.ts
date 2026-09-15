// Google Maps distance calculation.
// Uses the project-owned GOOGLE_API_KEY (direct Google calls) when available,
// falling back to the Lovable connector gateway keys otherwise.
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

    const DIRECT_KEY = Deno.env.get('GOOGLE_API_KEY');
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    const GOOGLE_MAPS_API_KEY = Deno.env.get('GOOGLE_MAPS_API_KEY');
    if (!DIRECT_KEY && (!LOVABLE_API_KEY || !GOOGLE_MAPS_API_KEY)) {
      return json({ error: 'Google Maps not configured' }, 500);
    }

    // One helper for every Google call: direct host + ?key= when the project
    // key exists, otherwise the connector gateway path.
    const gfetch = (
      directUrl: string,
      gatewayPath: string,
      opts: { method?: string; body?: unknown; fieldMask?: string } = {},
    ): Promise<Response> => {
      const headers: Record<string, string> = {};
      let url: string;
      if (DIRECT_KEY) {
        url = directUrl + (directUrl.includes('?') ? '&' : '?') + `key=${DIRECT_KEY}`;
      } else {
        url = `${GATEWAY_URL}${gatewayPath}`;
        headers['Authorization'] = `Bearer ${LOVABLE_API_KEY}`;
        headers['X-Connection-Api-Key'] = GOOGLE_MAPS_API_KEY!;
      }
      if (opts.body !== undefined) headers['Content-Type'] = 'application/json';
      if (opts.fieldMask) headers['X-Goog-FieldMask'] = opts.fieldMask;
      return fetch(url, {
        method: opts.method ?? 'GET',
        headers,
        body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
      });
    };

    // Geocode addresses first; extract coords + province/city
    const geocode = async (address: string) => {
      const r = await gfetch(
        `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}`,
        `/maps/api/geocode/json?address=${encodeURIComponent(address)}`,
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

    // Fallback: Places API (New) text search — handles POIs / informal addresses
    const placesSearch = async (address: string) => {
      try {
        const r = await gfetch(
          'https://places.googleapis.com/v1/places:searchText',
          '/places/v1/places:searchText',
          {
            method: 'POST',
            fieldMask: 'places.formattedAddress,places.location,places.addressComponents',
            body: { textQuery: address, maxResultCount: 1 },
          },
        );
        const j = await r.json();
        const p = j.places?.[0];
        if (!p?.location) return null;
        const comps = p.addressComponents ?? [];
        const find = (type: string) =>
          comps.find((c: { types: string[] }) => c.types.includes(type))?.shortText ?? null;
        return {
          lat: p.location.latitude,
          lng: p.location.longitude,
          formatted: p.formattedAddress ?? address,
          province: find('administrative_area_level_1'),
          city: find('locality') ?? find('postal_town') ?? find('administrative_area_level_2'),
          country: find('country'),
        };
      } catch (e) {
        console.warn('placesSearch failed', e);
        return null;
      }
    };

    const resolve = async (address: string) => (await geocode(address)) ?? (await placesSearch(address));
    const [pickup, dropoff] = await Promise.all([resolve(String(origin)), resolve(String(destination))]);

    if (!pickup || !dropoff) {
      return json({
        error: 'ADDRESS_RESOLUTION_FAILED',
        details: !pickup && !dropoff ? 'Both pickup and dropoff could not be resolved' : !pickup ? 'Pickup address could not be resolved' : 'Dropoff address could not be resolved',
        pickup,
        dropoff,
        fallback: true,
      });
    }

    let km: number | null = null;
    let durationSec: number | null = null;
    let polyline: string | null = null;

    // Preferred: computeRoutes returns distance, duration AND the drawable route path.
    try {
      const res = await gfetch(
        'https://routes.googleapis.com/directions/v2:computeRoutes',
        '/routes/directions/v2:computeRoutes',
        {
          method: 'POST',
          fieldMask: 'routes.distanceMeters,routes.duration,routes.polyline.encodedPolyline',
          body: {
            origin: { location: { latLng: { latitude: pickup.lat, longitude: pickup.lng } } },
            destination: { location: { latLng: { latitude: dropoff.lat, longitude: dropoff.lng } } },
            travelMode: 'DRIVE',
            routingPreference: 'TRAFFIC_AWARE',
            polylineQuality: 'OVERVIEW',
          },
        },
      );
      const text = await res.text();
      if (!res.ok) console.error('computeRoutes error', res.status, text);
      const route = JSON.parse(text)?.routes?.[0];
      if (route?.distanceMeters) {
        km = Math.round((route.distanceMeters / 1000) * 100) / 100;
        durationSec = route.duration ? parseInt(String(route.duration).replace('s', ''), 10) : null;
        polyline = route.polyline?.encodedPolyline ?? null;
      }
    } catch (e) {
      console.error('computeRoutes call failed', e);
    }

    // Use Routes API v2 with coordinates (most reliable)
    try {
      if (km != null) throw new Error('skip-matrix');
      const body = {
        origins: [{ waypoint: { location: { latLng: { latitude: pickup.lat, longitude: pickup.lng } } } }],
        destinations: [{ waypoint: { location: { latLng: { latitude: dropoff.lat, longitude: dropoff.lng } } } }],
        travelMode: 'DRIVE',
        routingPreference: 'TRAFFIC_AWARE',
      };
      const res = await gfetch(
        'https://routes.googleapis.com/distanceMatrix/v2:computeRouteMatrix',
        '/routes/distanceMatrix/v2:computeRouteMatrix',
        {
          method: 'POST',
          fieldMask: 'originIndex,destinationIndex,duration,distanceMeters,status,condition',
          body,
        },
      );
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
