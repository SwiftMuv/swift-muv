// Stripe webhook → creates the booking row only after a successful checkout.
// Listens for `checkout.session.completed`.
import { createClient } from 'npm:@supabase/supabase-js@2';
import Stripe from 'npm:stripe@17';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, stripe-signature',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const reassemble = (meta: Record<string, string>): unknown | null => {
  const count = Number(meta.payload_count ?? 0);
  if (!count) return null;
  let s = '';
  for (let i = 0; i < count; i++) s += meta[`p${i}`] ?? '';
  try { return JSON.parse(s); } catch { return null; }
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405, headers: corsHeaders });

  const stripeKey = Deno.env.get('STRIPE_SECRET_KEY');
  const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');
  if (!stripeKey || !webhookSecret) {
    console.error('stripe-webhook missing secrets');
    return new Response('Misconfigured', { status: 500, headers: corsHeaders });
  }

  const stripe = new Stripe(stripeKey, { apiVersion: '2024-11-20.acacia' });
  const signature = req.headers.get('stripe-signature');
  if (!signature) return new Response('Missing signature', { status: 400, headers: corsHeaders });

  const rawBody = await req.text();
  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(rawBody, signature, webhookSecret);
  } catch (e) {
    console.error('stripe-webhook signature verification failed', e);
    return new Response('Bad signature', { status: 400, headers: corsHeaders });
  }

  if (event.type !== 'checkout.session.completed') {
    return new Response(JSON.stringify({ received: true, ignored: event.type }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const session = event.data.object as Stripe.Checkout.Session;
  const meta = (session.metadata ?? {}) as Record<string, string>;

  const admin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  // ---- Tip flow: transfer 100% of tip to driver's Stripe Connect account ----
  if (meta.kind === 'swiftmuv_tip') {
    const jobId = meta.job_id;
    const bookingId = meta.booking_id;
    const driverId = meta.driver_id;
    const amount = Number(meta.amount ?? 0);
    if (!jobId || !driverId || !amount) {
      return new Response(JSON.stringify({ received: true, ignored: 'tip_missing_meta' }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Idempotency: skip if we already transferred this session's tip.
    const transferGroup = `tip_${session.id}`;
    try {
      const existing = await stripe.transfers.list({ transfer_group: transferGroup, limit: 1 });
      if (existing.data.length > 0) {
        return new Response(JSON.stringify({ received: true, tip: 'already_transferred' }), {
          status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    } catch (e) {
      console.warn('tip transfer lookup failed', e);
    }

    const { data: driverProfile } = await admin
      .from('driver_profiles')
      .select('stripe_connect_id')
      .eq('user_id', driverId)
      .maybeSingle();

    let transferId: string | null = null;
    if (driverProfile?.stripe_connect_id) {
      try {
        const transfer = await stripe.transfers.create({
          amount: Math.round(amount * 100),
          currency: (session.currency ?? 'cad').toLowerCase(),
          destination: driverProfile.stripe_connect_id,
          transfer_group: transferGroup,
          metadata: { kind: 'swiftmuv_tip', job_id: jobId, booking_id: bookingId, driver_id: driverId },
        });
        transferId = transfer.id;
      } catch (e) {
        console.error('tip transfer failed', e);
      }
    } else {
      console.warn('tip received but driver has no stripe_connect_id', { driverId, jobId });
    }

    return new Response(JSON.stringify({ received: true, tip: { amount, transferId } }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  if (meta.kind !== 'swiftmuv_booking') {
    return new Response(JSON.stringify({ received: true, ignored: 'not_swiftmuv' }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const payload = reassemble(meta) as Record<string, unknown> | null;
  if (!payload) {
    console.error('stripe-webhook could not reassemble payload', { sessionId: session.id });
    return new Response('Bad payload', { status: 400, headers: corsHeaders });
  }

  const piId = typeof session.payment_intent === 'string'
    ? session.payment_intent
    : session.payment_intent?.id ?? null;

  // Idempotency: ignore if we already created a booking for this PI.
  if (piId) {
    const { data: existing } = await admin
      .from('bookings')
      .select('id')
      .eq('stripe_payment_intent_id', piId)
      .maybeSingle();
    if (existing) {
      return new Response(JSON.stringify({ received: true, booking_id: existing.id }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
  }

  const customerId = (payload.customer_id as string) || meta.customer_id;
  if (!customerId) return new Response('Missing customer_id', { status: 400, headers: corsHeaders });

  const insertRow: Record<string, unknown> = {
    customer_id: customerId,
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
    stripe_payment_intent_id: piId,
    status: 'pending',
  };

  const { data: inserted, error } = await admin
    .from('bookings')
    .insert(insertRow)
    .select('id')
    .single();

  if (error) {
    console.error('stripe-webhook insert failed', error);
    return new Response('Insert failed', { status: 500, headers: corsHeaders });
  }

  return new Response(JSON.stringify({ received: true, booking_id: inserted.id }), {
    status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});
