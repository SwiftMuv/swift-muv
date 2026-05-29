import { createClient } from 'npm:@supabase/supabase-js@2';
import Stripe from 'npm:stripe@17';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const json = (b: Record<string, unknown>, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

const err = (e: string, details?: string) => json({ error: e, details, fallback: true }, 200);

const getOrigin = (req: Request) => {
  const o = req.headers.get('origin');
  if (o) return o;
  const r = req.headers.get('referer');
  if (r) try { return new URL(r).origin; } catch { /* ignore */ }
  return 'https://example.com';
};

// Split a string into chunks of up to `size` chars (Stripe metadata = 500 chars/value).
const chunk = (s: string, size = 450): string[] => {
  const out: string[] = [];
  for (let i = 0; i < s.length; i += size) out.push(s.slice(i, i + size));
  return out;
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) return err('Unauthorized');

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const { data: claims, error: claimsErr } = await supabase.auth.getClaims(authHeader.replace('Bearer ', ''));
    if (claimsErr || !claims?.claims) return err('Unauthorized', claimsErr?.message);

    const userId = claims.claims.sub as string;
    const userEmail = claims.claims.email as string | undefined;

    const body = await req.json().catch(() => ({}));
    const payload = body.bookingPayload;
    const amountCad = Number(body.amountCad);

    if (!payload || typeof payload !== 'object') return err('bookingPayload is required');
    if (!amountCad || amountCad <= 0) return err('Invalid amount');

    const amountCents = Math.round(amountCad * 100);

    const stripeKey = Deno.env.get('STRIPE_SECRET_KEY');
    if (!stripeKey) return err('Stripe is not configured');
    const publishableKey = Deno.env.get('NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY');
    if (!publishableKey) return err('Stripe publishable key not configured');

    const stripe = new Stripe(stripeKey, { apiVersion: '2024-11-20.acacia' });
    const origin = getOrigin(req);

    // Serialize payload into chunked metadata keys (Stripe = 500 chars per value, 50 keys max).
    const serialized = JSON.stringify({ ...payload, customer_id: userId });
    const parts = chunk(serialized);
    if (parts.length > 45) return err('Booking payload too large');
    const payloadMeta: Record<string, string> = { payload_count: String(parts.length) };
    parts.forEach((p, i) => { payloadMeta[`p${i}`] = p; });

    const returnUrl = new URL('/dashboard', origin);
    returnUrl.searchParams.set('checkout', 'success');
    returnUrl.searchParams.set('session_id', '{CHECKOUT_SESSION_ID}');

    let session: Stripe.Checkout.Session;
    try {
      session = await stripe.checkout.sessions.create({
        mode: 'payment',
        ui_mode: 'embedded',
        payment_method_types: ['card'],
        customer_email: userEmail,
        payment_intent_data: {
          capture_method: 'manual',
          metadata: { customer_id: userId, kind: 'swiftmuv_booking' },
        },
        line_items: [
          {
            price_data: {
              currency: 'cad',
              unit_amount: amountCents,
              product_data: {
                name: 'SwiftMuv Move',
                description: `${payload.pickup_address ?? ''} → ${payload.dropoff_address ?? ''}`.slice(0, 250),
              },
            },
            quantity: 1,
          },
        ],
        return_url: returnUrl.toString(),
        metadata: { customer_id: userId, kind: 'swiftmuv_booking', ...payloadMeta },
      });
    } catch (e) {
      const m = e instanceof Error ? e.message : 'Stripe checkout request failed';
      console.error('stripe_checkout error', e);
      return err(m);
    }

    if (!session.client_secret) return err('Stripe did not return a client secret');

    return json({
      clientSecret: session.client_secret,
      sessionId: session.id,
      publishableKey,
    });
  } catch (e) {
    console.error('stripe_checkout unexpected', e);
    return err(e instanceof Error ? e.message : 'Unknown error');
  }
});
