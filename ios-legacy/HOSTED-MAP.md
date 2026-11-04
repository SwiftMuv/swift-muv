# iPhone map update

The iPhone shell now displays a map-only page from `https://swift-muv.lovable.app/mobile-map`. The existing managed Google Maps connection authorizes that HTTPS website, so the new Google Cloud browser key is not required for this update. Keep all your keys restricted.

## Release order

1. Publish the updated website in Lovable before rebuilding the iPhone app.
2. From the repository root on your Mac, update your local project from the connected repository.
3. Run:

```sh
npm install
npm install --prefix ios-legacy
npm run build --prefix ios-legacy
npm run sync --prefix ios-legacy
npm run open --prefix ios-legacy
```

4. Open the CocoaPods workspace, select your simulator or iPhone, then run the app. Do not run the root `npx cap sync ios`: the isolated legacy sync command is its Xcode 14.2-compatible equivalent.
5. Check the booking background, current-location pickup, destination selection, road route, touch gestures, and live driver marker on iPhone.

The embedded map receives only coordinates, geometry, and display options, never authentication tokens or booking/customer details. The parent iPhone app retains login, booking, and authenticated route calculation. Android remains unchanged.

Automated checks cover platform selection, payload validation, and message boundaries. Map tiles and iPhone WebView behavior still require device checks on the published website. An unpublished map page produces a dark error rather than loading the login screen as a map.

For more native development context, read the [Lovable mobile app guide](https://lovable.dev/blog).