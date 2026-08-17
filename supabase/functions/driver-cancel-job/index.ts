import { createClient } from 'npm:@supabase/supabase-js@2';
import Stripe from 'npm:stripe@17';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

// Driver cancels a job they already accepted.
// - Driver forfeits all earnings for the job (job removed, earnings never released)
// - Customer receives a full refund (uncaptured auth is cancelled, captured payment refunded)
// - Booking is cancelled with zero cancellation fee
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) return json({ error: 'Unauthorized' }, 401);

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

    const { data: claims } = await supabase.auth.getClaims(authHeader.replace('Bearer ', ''));
    if (!claims?.claims) return json({ error: 'Unauthorized' }, 401);
    const userId = claims.claims.sub as string;

    const body = await req.json().catch(() => ({}));
    const jobId = typeof body?.jobId === 'string' ? body.jobId : null;
    const reason = typeof body?.reason === 'string' ? body.reason.slice(0, 500) : null;
    if (!jobId) return json({ error: 'jobId required' }, 400);

    const { data: job } = await admin
      .from('jobs')
      .select('id, driver_id, booking_id, status, earnings_status')
      .eq('id', jobId)
      .maybeSingle();
    if (!job) return json({ error: 'Job not found' }, 404);
    if (job.driver_id !== userId) return json({ error: 'Forbidden' }, 403);
    if (job.status === 'completed') return json({ error: 'Job already completed' }, 400);
    if (job.earnings_status === 'paid_out') return json({ error: 'Earnings already paid out' }, 400);

    const { data: booking } = await admin
      .from('bookings')
      .select('id, customer_id, total_price, stripe_payment_intent_id')
      .eq('id', job.booking_id)
      .maybeSingle();

    // Full refund to the customer
    let refunded = false;
    const pi = booking?.stripe_payment_intent_id;
    if (pi) {
      const stripeKey = Deno.env.get('STRIPE_SECRET_KEY');
      if (!stripeKey) return json({ error: 'Stripe not configured' }, 500);
      const stripe = new Stripe(stripeKey, { apiVersion: '2024-11-20.acacia' });
      try {
        const intent = await stripe.paymentIntents.retrieve(pi);
        if (intent.status === 'requires_capture' || intent.status === 'requires_payment_method' || intent.status === 'requires_confirmation') {
          await stripe.paymentIntents.cancel(pi);
        } else if (intent.status === 'succeeded') {
          await stripe.refunds.create({ payment_intent: pi });
        }
        refunded = true;
      } catch (e) {
        console.error('driver-cancel-job refund failed', e);
        return json({ error: 'Could not refund the customer' }, 502);
      }
    }

    // Driver forfeits everything: remove the job assignment entirely
    await admin.from('jobs').delete().eq('id', job.id);

    await admin
      .from('bookings')
      .update({ status: 'cancelled', cancellation_fee: 0 })
      .eq('id', job.booking_id);

    if (booking?.customer_id) {
      await admin.from('notifications').insert({
        user_id: booking.customer_id,
        type: 'booking_cancelled_by_driver',
        title: 'Move cancelled by driver',
        body: 'Your driver cancelled the move. You have been fully refunded.',
        data: { booking_id: job.booking_id, refunded, reason },
      });
    }

    return json({ ok: true, refunded, driver_earnings: 0 });
  } catch (err) {
    console.error('driver-cancel-job error', err);
    return json({ error: err instanceof Error ? err.message : 'unknown' }, 500);
  }
});
