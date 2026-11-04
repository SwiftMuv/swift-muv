# Fix the iPhone booking map

## Result
Show the dark booking map on iPhone without weakening Google key restrictions, changing Android, or upgrading Xcode 14.2.

## Changes
- Serve a map-only view from the published SwiftMuv website, where the existing Google Maps connection is authorized.
- Display that view inside the iPhone booking screen, preserving the booking sheet, pickup location, destination, route, and live driver marker.
- Keep login and all booking operations in the iPhone app; the map view has no account or booking lookup access.
- Keep Android’s native map and existing dark-map settings unchanged.
- Use the existing managed website map connection; the newly created key does not need to replace working server credentials.

## Technical details
- Render the map-only entry separately from authentication and app startup effects; do not weaken protected routes.
- Exchange only validated coordinates, route geometry, and display settings through a bounded message contract. Check the expected window and origins; never transfer tokens, customer details, or booking identifiers.
- Use the authenticated parent app’s existing route calculations rather than requesting legacy browser Directions from the embedded view.
- Provide dark loading/error states and preserve Google attribution.
- Add focused tests for coordinate validation, message restrictions, and iOS-only selection; check unrelated booking behavior without live Google Maps requests.

## Release and verification
The website must be published before rebuilding and syncing the legacy iOS app. Google map rendering cannot be verified in this sandbox; final checks require the published website and your iPhone/Xcode simulator. Test current pickup, both address changes, route updates, and map gestures there.