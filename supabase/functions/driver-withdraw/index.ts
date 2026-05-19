import { createClient } from 'npm:@supabase/supabase-js@2';
import Stripe from 'npm:stripe@17';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

// Driver withdrawal: triggers an instant Stripe Connect payout on the driver's connected account.
// Funds previously transferred via release-earnings are payed out to the linked bank/debit card.
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

    const { amount } = await req.json();
    const amt = Number(amount);
    if (!amt || amt <= 0) return json({ error: 'Invalid amount' }, 400);

    const { data: profile } = await admin
      .from('driver_profiles')
      .select('stripe_connect_id')
      .eq('user_id', driverId)
      .maybeSingle();
    if (!profile?.stripe_connect_id) return json({ error: 'Connect your bank account first' }, 400);

    // Compute available balance from released jobs minus prior successful payouts
    const { data: jobs } = await admin
      .from('jobs')
      .select('driver_earnings')
      .eq('driver_id', driverId)
      .eq('earnings_status', 'released');
    const released = (jobs ?? []).reduce((s, j: any) => s + Number(j.driver_earnings ?? 0), 0);

    const { data: payouts } = await admin
      .from('driver_payouts')
      .select('amount, status')
      .eq('driver_id', driverId)
      .in('status', ['pending', 'processing', 'paid']);
    const paidOrPending = (payouts ?? []).reduce((s, p: any) => s + Number(p.amount ?? 0), 0);

    const available = Math.round((released - paidOrPending) * 100) / 100;
    if (amt > available) return json({ error: `Only $${available.toFixed(2)} available` }, 400);

    const stripeKey = Deno.env.get('STRIPE_SECRET_KEY');
    if (!stripeKey) return json({ error: 'Stripe not configured' }, 500);
    const stripe = new Stripe(stripeKey, { apiVersion: '2024-11-20.acacia' });

    const { data: payoutRow } = await admin
      .from('driver_payouts')
      .insert({ driver_id: driverId, amount: amt, status: 'processing' })
      .select()
      .single();

    try {
      const payout = await stripe.payouts.create(
        { amount: Math.round(amt * 100), currency: 'cad', method: 'instant' },
        { stripeAccount: profile.stripe_connect_id },
      );
      await admin.from('driver_payouts').update({
        status: 'paid',
        stripe_payout_id: payout.id,
        completed_at: new Date().toISOString(),
      }).eq('id', payoutRow!.id);
      return json({ ok: true, payoutId: payout.id, amount: amt });
    } catch (e: any) {
      const msg = e?.message ?? 'Payout failed';
      console.error('Stripe payout failed', e);
      await admin.from('driver_payouts').update({ status: 'failed', failure_reason: msg }).eq('id', payoutRow!.id);
      return json({ error: msg }, 502);
    }
  } catch (err) {
    console.error('driver-withdraw error', err);
    return json({ error: err instanceof Error ? err.message : 'unknown' }, 500);
  }
});
