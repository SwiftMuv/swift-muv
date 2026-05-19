## Defaults I'll use (since you skipped)

- **Vehicles**: Pickup Truck, Cargo Van, Box Truck, 16ft Moving Truck
- **Items + prices** (volume price): Box $5, Chair $8, Table $15, TV $15, Sofa $25, Bed $20, Dresser $20, Wardrobe $30, Appliance $30, Other $10
- **Distance fee**: $2.00 / km (min $15)
- **Crew member**: +$10 each
- **Floor surcharge** (no elevator only): +$10 / floor above ground (only when stairs)
- **Commission**: 20% platform fee on every completed job + 100% of cancellation fees → Admin
- **Cancellation fee**: $10 CAD (only when a driver has accepted)

Tell me to change any of these in your reply and I'll adjust before building.

## What gets built

### 1. Database changes
- `vehicle_categories` enum: `pickup_truck | cargo_van | box_truck | moving_truck_16`
- `bookings`: add `vehicle_category`, `distance_km`, `floor_level`, `has_elevator`, `crew_count`, `items` (jsonb), `tip_amount`, `cancellation_fee`, `pickup_lat/lng`, `dropoff_lat/lng`
- `driver_profiles`: add `vehicle_category` (drivers only see jobs matching their category)
- `jobs`: add `earnings_status` (`pending | released | paid_out`), `platform_fee`, `driver_earnings`, `stripe_payment_intent_id`, `stripe_transfer_id`
- New `driver_payouts` table: amount, status, stripe_payout_id, bank account info
- New `ratings` table: rater_id, ratee_id, job_id, stars (1-5), comment
- RLS for all + update dispatch policy to filter by `vehicle_category`

### 2. Edge functions (new / updated)
- `calculate-distance` — Google Maps Distance Matrix; returns km + duration
- `stripe_checkout` — update to manual capture, store payment_intent_id, apply 20% application_fee at capture
- `release-earnings` — triggered when driver marks dropoff arrived → captures payment, moves earnings `pending → released`, computes 80/20 split
- `cancel-booking` — enforces rules (no fee if no driver; $10 fee + payout to admin if driver accepted; blocked if in_transit)
- `driver-withdraw` — Stripe payout to connected bank account
- `stripe-connect` — already exists, ensure Express onboarding works for bank withdrawal

### 3. Frontend
- **Booking page** rewrite: address autocomplete (Google Places), auto distance + price preview, vehicle category picker (cards with icons), items dropdown w/ quantity, floor + elevator toggles, crew member counter, live price breakdown (items + service fee + distance fee + crew + tip only)
- **Driver dashboard**: only show jobs matching driver's `vehicle_category`; "Arrived at dropoff" button triggers `release-earnings`
- **Driver wallet**: earnings split into Pending vs Available; "Withdraw" button calls `driver-withdraw`
- **Active job (customer)**: hide cancel button once status is `in_transit`; show $10 fee warning if status is `accepted`
- **Rating modal**: auto-pops for customer on job completion (5-star + optional comment)

## Technical notes
- Google Maps connector: I'll prompt you to connect it (you confirmed yes)
- Stripe Connect Express: drivers must complete onboarding before withdrawal button enables
- 20% commission via Stripe `application_fee_amount` on PaymentIntent capture, routed to platform account
- Cancellation fee: separate PaymentIntent on the customer's saved payment method, fully to platform
- Earnings escrow: payment is **authorized** at checkout, **captured** only when driver hits "Arrived at dropoff"; refunded automatically on no-fault cancellation

## Out of scope (call out if you want them)
- In-app dispute flow for ratings
- Multi-stop moves
- Scheduling beyond "ASAP"

Approve and I'll start with the migration + Google Maps connector hookup.