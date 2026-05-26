import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

// Driver withdrawal: verifies the driver has linked bank details and creates a
// pending payout transaction request. Actual disbursement is handled offline by admins
// (or a downstream processor) by updating the driver_payouts row to 'processing'/'paid'.
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

    // 1. Must have linked bank account in driver_bank_details
    const { data: bank } = await admin
      .from('driver_bank_details')
      .select('id, account_last4, bank_name')
      .eq('driver_id', driverId)
      .maybeSingle();
    if (!bank) return json({ error: 'Link a bank account before requesting a withdrawal' }, 400);

    // 2. Compute available balance: released earnings minus prior pending/processing/paid payouts
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
    const reserved = (payouts ?? []).reduce((s, p: any) => s + Number(p.amount ?? 0), 0);

    const available = Math.round((released - reserved) * 100) / 100;
    if (amt > available) return json({ error: `Only $${available.toFixed(2)} available` }, 400);

    // 3. Create pending payout transaction request
    const { data: payoutRow, error: insErr } = await admin
      .from('driver_payouts')
      .insert({ driver_id: driverId, amount: amt, status: 'pending' })
      .select()
      .single();
    if (insErr) return json({ error: insErr.message }, 500);

    // 4. In-app notification for the driver
    await admin.from('notifications').insert({
      user_id: driverId,
      type: 'payout_requested',
      title: 'Withdrawal requested',
      body: `Your $${amt.toFixed(2)} withdrawal to ${bank.bank_name} ••${bank.account_last4} is pending.`,
      data: { payout_id: payoutRow.id, amount: amt },
    });

    return json({ ok: true, payoutId: payoutRow.id, amount: amt, status: 'pending' });
  } catch (err) {
    console.error('driver-withdraw error', err);
    return json({ error: err instanceof Error ? err.message : 'unknown' }, 500);
  }
});
