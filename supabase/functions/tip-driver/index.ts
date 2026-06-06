import { createClient } from 'npm:@supabase/supabase-js@2';
import Stripe from 'npm:stripe@17';

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

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

    const { data: claims } = await supabase.auth.getClaims(authHeader.replace('Bearer ', ''));
    if (!claims?.claims) return json({ error: 'Unauthorized' }, 401);
    const customerId = claims.claims.sub as string;
    const customerEmail = claims.claims.email as string | undefined;

    const body = await req.json().catch(() => ({}));
    const jobId = String(body.jobId ?? '');
    const amount = Number(body.amount);
    if (!jobId) return json({ error: 'jobId required' }, 400);
    if (!Number.isFinite(amount) || amount <= 0 || amount > 500) return json({ error: 'Invalid amount' }, 400);

    const { data: job } = await admin
      .from('jobs')
      .select('id, booking_id, driver_id, status, tip_amount, bookings:booking_id(customer_id, total_price)')
      .eq('id', jobId)
      .maybeSingle();
    if (!job) return json({ error: 'Job not found' }, 404);
    const booking: any = job.bookings;
    if (!booking || booking.customer_id !== customerId) return json({ error: 'Forbidden' }, 403);
    if (job.status !== 'completed') return json({ error: 'Trip must be completed' }, 400);

    const stripeKey = Deno.env.get('STRIPE_SECRET_KEY');
    if (!stripeKey) return json({ error: 'Stripe not configured' }, 500);
    const stripe = new Stripe(stripeKey, { apiVersion: '2024-11-20.acacia' });

    // Create + confirm an off-session-free payment intent via Checkout-like API.
    // Simpler: create an embedded checkout session for the tip.
    const origin = req.headers.get('origin') ?? 'https://swift-muv.lovable.app';
    const returnUrl = new URL('/dashboard', origin);
    returnUrl.searchParams.set('tip', 'success');

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      ui_mode: 'embedded',
      payment_method_types: ['card'],
      customer_email: customerEmail,
      line_items: [{
        price_data: {
          currency: 'cad',
          unit_amount: Math.round(amount * 100),
          product_data: { name: 'Driver Tip', description: `Tip for completed move` },
        },
        quantity: 1,
      }],
      return_url: returnUrl.toString(),
      metadata: {
        kind: 'swiftmuv_tip',
        job_id: jobId,
        booking_id: job.booking_id,
        driver_id: job.driver_id,
        customer_id: customerId,
        amount: String(amount),
      },
    });

    // Optimistically record tip on the job/booking; webhook will confirm/transfer.
    const newTip = Number(job.tip_amount ?? 0) + amount;
    await admin.from('jobs').update({ tip_amount: newTip }).eq('id', jobId);
    await admin.from('bookings').update({ tip_amount: newTip }).eq('id', job.booking_id);

    // Best-effort: transfer to driver's connect account immediately on session completion handled by webhook.
    // Here we return the embedded client_secret so the customer can pay in-app.
    return json({
      clientSecret: session.client_secret,
      sessionId: session.id,
      publishableKey: Deno.env.get('NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY'),
    });
  } catch (err) {
    console.error('tip-driver error', err);
    return json({ error: err instanceof Error ? err.message : 'unknown' }, 500);
  }
});
