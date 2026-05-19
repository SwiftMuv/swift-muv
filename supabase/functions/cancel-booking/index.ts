import { createClient } from 'npm:@supabase/supabase-js@2';
import Stripe from 'npm:stripe@17';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

// Cancellation rules:
// - No driver accepted yet  -> free cancel, full refund (uncaptured PI cancelled)
// - Driver accepted, not in transit -> charge $10 fee (captures only $10 of held PI to platform), refunds rest
// - In transit -> blocked
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

    const { bookingId } = await req.json();
    if (!bookingId) return json({ error: 'bookingId required' }, 400);

    const { data: booking } = await admin
      .from('bookings')
      .select('id, customer_id, status, total_price, stripe_payment_intent_id')
      .eq('id', bookingId)
      .maybeSingle();
    if (!booking) return json({ error: 'Booking not found' }, 404);
    if (booking.customer_id !== userId) return json({ error: 'Forbidden' }, 403);

    const { data: job } = await admin.from('jobs').select('id, status').eq('booking_id', bookingId).maybeSingle();

    if (job && (job.status === 'in_transit' || job.status === 'completed')) {
      return json({ error: 'Cannot cancel — move is in transit.' }, 400);
    }

    const stripeKey = Deno.env.get('STRIPE_SECRET_KEY');
    if (!stripeKey) return json({ error: 'Stripe not configured' }, 500);
    const stripe = new Stripe(stripeKey, { apiVersion: '2024-11-20.acacia' });

    const { data: feeCfg } = await admin.from('app_config').select('value').eq('key', 'cancellation_fee_cad').maybeSingle();
    const cancellationFee = Number(feeCfg?.value ?? 10);

    let appliedFee = 0;
    const pi = booking.stripe_payment_intent_id;

    if (!job) {
      // No driver — full refund / cancel the authorization
      if (pi) {
        try {
          await stripe.paymentIntents.cancel(pi);
        } catch (e) {
          console.warn('PI cancel (no driver) failed, may already be captured', e);
        }
      }
    } else {
      // Driver accepted — capture only the $10 fee
      if (pi) {
        try {
          await stripe.paymentIntents.capture(pi, { amount_to_capture: Math.round(cancellationFee * 100) });
          appliedFee = cancellationFee;
        } catch (e: any) {
          console.error('Partial capture failed', e);
          return json({ error: 'Could not process cancellation fee', details: e?.message }, 502);
        }
      }
      await admin.from('jobs').update({ status: 'completed', completed_at: new Date().toISOString() }).eq('id', job.id);
    }

    await admin.from('bookings').update({
      status: 'cancelled',
      cancellation_fee: appliedFee,
    }).eq('id', bookingId);

    return json({ ok: true, cancellation_fee: appliedFee });
  } catch (err) {
    console.error('cancel-booking error', err);
    return json({ error: err instanceof Error ? err.message : 'unknown' }, 500);
  }
});
