// Confirms paid checkouts and creates their booking rows — a safety net for
// when the Stripe webhook is not delivered. Idempotent with the webhook
// (keyed on stripe_payment_intent_id).
// Body: { sessionId?: string } — without sessionId, reconciles the caller's
// completed checkouts from the last 14 days.
import { createClient } from 'npm:@supabase/supabase-js@2';
import Stripe from 'npm:stripe@17';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

const reassemble = (meta: Record<string, string>): Record<string, unknown> | null => {
  const count = Number(meta.payload_count ?? 0);
  if (!count) return null;
  let s = '';
  for (let i = 0; i < count; i++) s += meta[`p${i}`] ?? '';
  try { return JSON.parse(s); } catch { return null; }
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) return json({ error: 'Unauthorized' }, 401);
    const userClient = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: claims, error: cErr } = await userClient.auth.getClaims(authHeader.replace('Bearer ', ''));
    if (cErr || !claims?.claims) return json({ error: 'Unauthorized' }, 401);
    const userId = claims.claims.sub as string;

    const stripeKey = Deno.env.get('STRIPE_SECRET_KEY');
    if (!stripeKey) return json({ error: 'Stripe not configured' }, 500);
    const stripe = new Stripe(stripeKey, { apiVersion: '2024-11-20.acacia' });
    const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

    const body = await req.json().catch(() => ({}));
    const sessionId = typeof body.sessionId === 'string' ? body.sessionId : null;

    let sessions: Stripe.Checkout.Session[] = [];
    if (sessionId) {
      sessions = [await stripe.checkout.sessions.retrieve(sessionId)];
    } else {
      const since = Math.floor(Date.now() / 1000) - 14 * 86400;
      const list = await stripe.checkout.sessions.list({ created: { gte: since }, limit: 100, status: 'complete' });
      sessions = list.data;
    }

    const created: string[] = [];
    const existing: string[] = [];
    for (const session of sessions) {
      const meta = (session.metadata ?? {}) as Record<string, string>;
      if (meta.kind !== 'swiftmuv_booking' || meta.customer_id !== userId) continue;
      if (session.status !== 'complete') continue;
      const piId = typeof session.payment_intent === 'string' ? session.payment_intent : session.payment_intent?.id ?? null;
      if (!piId) continue;

      const { data: found } = await admin.from('bookings').select('id').eq('stripe_payment_intent_id', piId).maybeSingle();
      if (found) { existing.push(found.id); continue; }

      const payload = reassemble(meta);
      if (!payload) { console.error('confirm-checkout bad payload', session.id); continue; }

      const row: Record<string, unknown> = {
        customer_id: userId,
        pickup_address: payload.pickup_address ?? '',
        dropoff_address: payload.dropoff_address ?? '',
        move_size: payload.move_size ?? 'medium',
        move_type: payload.move_type ?? 'local',
        distance_km: payload.distance_km ?? 0,
        items: payload.items ?? [],
        crew_count: payload.crew_count ?? 0,
        vehicle_category: payload.vehicle_category ?? null,
        pickup_lat: payload.pickup_lat ?? null,
        pickup_lng: payload.pickup_lng ?? null,
        dropoff_lat: payload.dropoff_lat ?? null,
        dropoff_lng: payload.dropoff_lng ?? null,
        scheduled_at: payload.scheduled_at ?? null,
        stripe_payment_intent_id: piId,
        status: 'pending',
      };
      if (typeof payload.recommended_vehicle === 'string' && payload.recommended_vehicle) row.recommended_vehicle = payload.recommended_vehicle;
      if (Number(payload.total_price) > 0) row.total_price = Number(payload.total_price);

      const { data: ins, error } = await admin.from('bookings').insert(row).select('id').single();
      if (error) {
        // Unique race with the webhook — re-read.
        const { data: again } = await admin.from('bookings').select('id').eq('stripe_payment_intent_id', piId).maybeSingle();
        if (again) existing.push(again.id); else console.error('confirm-checkout insert failed', error);
        continue;
      }
      created.push(ins.id);
    }

    const bookingId = created[0] ?? existing[0] ?? null;
    return json({ bookingId, created, existing, paid: bookingId !== null });
  } catch (e) {
    console.error('confirm-checkout error', e);
    return json({ error: e instanceof Error ? e.message : 'Unknown error' }, 500);
  }
});
