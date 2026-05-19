import { createClient } from 'npm:@supabase/supabase-js@2';
import Stripe from 'npm:stripe@17';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const jsonResponse = (body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

const checkoutErrorResponse = (error: string, details?: string) =>
  jsonResponse({ error, details, fallback: true }, 200);

const getAppReturnUrl = (origin: string, path: string, params: Record<string, string>) => {
  const url = new URL(path, origin);
  Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, value));
  return url.toString();
};

const getRequestOrigin = (req: Request) => {
  const origin = req.headers.get('origin');
  if (origin) return origin;

  const referer = req.headers.get('referer');
  if (referer) {
    try {
      return new URL(referer).origin;
    } catch (_err) {
      console.error('Invalid referer URL for checkout redirect:', referer);
    }
  }

  return 'https://example.com';
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return checkoutErrorResponse('Unauthorized');
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return checkoutErrorResponse('Unauthorized', claimsError?.message);
    }

    const userId = claimsData.claims.sub as string;
    const userEmail = claimsData.claims.email as string | undefined;

    const body = await req.json().catch(() => ({}));
    const bookingId: string | undefined = body.bookingId;
    if (!bookingId) {
      return checkoutErrorResponse('bookingId is required');
    }

    // Load booking & validate ownership
    const { data: booking, error: bErr } = await supabase
      .from('bookings')
      .select('id, customer_id, total_price, pickup_address, dropoff_address, status')
      .eq('id', bookingId)
      .maybeSingle();

    if (bErr || !booking) {
      return checkoutErrorResponse('Booking not found', bErr?.message);
    }
    if (booking.customer_id !== userId) {
      return checkoutErrorResponse('Forbidden');
    }

    const amount = Math.round(Number(booking.total_price) * 100);
    if (!amount || amount <= 0) {
      return checkoutErrorResponse('Invalid booking amount');
    }

    const stripeKey = Deno.env.get('STRIPE_SECRET_KEY');
    if (!stripeKey) {
      return checkoutErrorResponse('Stripe is not configured');
    }

    const stripe = new Stripe(stripeKey, { apiVersion: '2024-11-20.acacia' });
    const origin = getRequestOrigin(req);
    const publishableKey = Deno.env.get('NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY');
    if (!publishableKey) {
      return checkoutErrorResponse('Stripe publishable key not configured');
    }

    let session: Stripe.Checkout.Session;
    try {
      session = await stripe.checkout.sessions.create({
        mode: 'payment',
        ui_mode: 'embedded',
        payment_method_types: ['card'],
        customer_email: userEmail,
        payment_intent_data: {
          capture_method: 'manual', // hold funds until driver arrives at drop-off
          metadata: { booking_id: booking.id, customer_id: userId },
        },
        line_items: [
          {
            price_data: {
              currency: 'cad',
              unit_amount: amount,
              product_data: {
                name: 'SwiftMuv Move',
                description: `${booking.pickup_address} → ${booking.dropoff_address}`,
              },
            },
            quantity: 1,
          },
        ],
        return_url: getAppReturnUrl(origin, '/dashboard', { checkout: 'success', booking: booking.id, session_id: '{CHECKOUT_SESSION_ID}' }),
        metadata: { booking_id: booking.id, customer_id: userId },
      });
    } catch (stripeErr) {
      const message = stripeErr instanceof Error ? stripeErr.message : 'Stripe checkout request failed';
      console.error('stripe_checkout Stripe API error', stripeErr);
      return checkoutErrorResponse(message);
    }

    if (!session.client_secret) {
      console.error('stripe_checkout missing client_secret', { sessionId: session.id });
      return checkoutErrorResponse('Stripe checkout did not return a client secret.');
    }

    // Save payment_intent on booking so release/cancel can act on it later
    if (session.payment_intent) {
      const piId = typeof session.payment_intent === 'string' ? session.payment_intent : session.payment_intent.id;
      const adminClient = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      );
      await adminClient.from('bookings').update({ stripe_payment_intent_id: piId }).eq('id', booking.id);
    }

    return jsonResponse({
      clientSecret: session.client_secret,
      sessionId: session.id,
      publishableKey,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('stripe_checkout unexpected error', err);
    return checkoutErrorResponse(message);
  }
});
