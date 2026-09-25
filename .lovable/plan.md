# Driver availability and live customer trip

## Goal
Make drivers online immediately after each successful login while preserving their ability to go offline during that session, and present active customer trips as a full-screen ride-hailing map with a floating dark information sheet.

## Changes
- Set the signed-in driver's availability to online once when the driver dashboard opens, then keep the existing Go online / Go offline control authoritative until the next login.
- Expand the active customer trip from an activity card into a dedicated full-screen experience for assigned and in-progress bookings.
- Keep the Google map mounted across the whole screen, with live driver, pickup, and destination markers plus the driver-to-pickup route and distance.
- Overlay a dark bottom sheet containing ETA/status, meeting point, driver photo/rating/name, vehicle details, plate, contact actions, and completion code.
- Show a polished waiting state until a driver accepts, then reveal details immediately from Realtime updates.
- Preserve existing chat, call, sharing, map, support, and completion-code actions.

## Technical details
- Reuse the existing booking and job Realtime subscriptions and live booking coordinate stream.
- Extend active-trip data to include destination coordinates and booking/job status.
- Keep map lifecycle stable; marker updates must not recreate the map.
- Use existing semantic theme tokens and shared buttons.
- Verify compilation and the active-trip layout at phone and desktop viewport sizes.
