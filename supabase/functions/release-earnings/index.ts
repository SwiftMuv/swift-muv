import { createClient } from 'npm:@supabase/supabase-js@2';
import Stripe from 'npm:stripe@17';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

// Capture the held payment when driver arrives at drop-off.
// Splits: 20% application fee to platform, 80% transferred to driver's Stripe Connect account.
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
    const driverId = claims.claims.sub as string;

    const { jobId } = await req.json();
    if (!jobId) return json({ error: 'jobId required' }, 400);

    const { data: job } = await admin
      .from('jobs')
      .select('id, booking_id, driver_id, status, earnings_status, bookings:booking_id(total_price, stripe_payment_intent_id)')
      .eq('id', jobId)
      .maybeSingle();
    if (!job) return json({ error: 'Job not found' }, 404);
    if (job.driver_id !== driverId) return json({ error: 'Forbidden' }, 403);
    if (job.status !== 'completed') return json({ error: 'Job must be completed before releasing earnings' }, 400);
    if (job.earnings_status !== 'pending') return json({ message: 'Already released', earnings_status: job.earnings_status });

    const booking: any = job.bookings;
    const total = Number(booking?.total_price ?? 0);
    const pi = booking?.stripe_payment_intent_id;
    if (!total || !pi) return json({ error: 'Booking missing payment data' }, 400);

    const stripeKey = Deno.env.get('STRIPE_SECRET_KEY');
    if (!stripeKey) return json({ error: 'Stripe not configured' }, 500);
    const stripe = new Stripe(stripeKey, { apiVersion: '2024-11-20.acacia' });

    const { data: config } = await admin.from('app_config').select('key,value').eq('key', 'platform_commission_rate').maybeSingle();
    const commissionRate = Number(config?.value ?? 0.20);
    const platformFee = Math.round(total * commissionRate * 100) / 100;
    const driverEarnings = Math.round((total - platformFee) * 100) / 100;

    // Capture the previously authorized payment (full amount to platform account)
    try {
      await stripe.paymentIntents.capture(pi);
    } catch (e: any) {
      // Already captured is fine
      if (!String(e?.message ?? '').includes('already')) {
        console.error('Capture failed', e);
        return json({ error: 'Capture failed', details: e?.message }, 502);
      }
    }

    // Transfer 80% to driver's connected account (if connected)
    const { data: driverProfile } = await admin
      .from('driver_profiles')
      .select('stripe_connect_id')
      .eq('user_id', driverId)
      .maybeSingle();

    let transferId: string | null = null;
    if (driverProfile?.stripe_connect_id) {
      try {
        const transfer = await stripe.transfers.create({
          amount: Math.round(driverEarnings * 100),
          currency: 'cad',
          destination: driverProfile.stripe_connect_id,
          transfer_group: `job_${jobId}`,
          metadata: { job_id: jobId, driver_id: driverId },
        });
        transferId = transfer.id;
      } catch (e) {
        console.error('Transfer failed (driver will see pending until Connect onboarding complete)', e);
      }
    }

    await admin.from('jobs').update({
      earnings_status: 'released',
      platform_fee: platformFee,
      driver_earnings: driverEarnings,
      stripe_transfer_id: transferId,
    }).eq('id', jobId);

    return json({ ok: true, platformFee, driverEarnings, transferId });
  } catch (err) {
    console.error('release-earnings error', err);
    return json({ error: err instanceof Error ? err.message : 'unknown' }, 500);
  }
});
