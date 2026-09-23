# Stop Android build-time Capacitor sync

## Change
- Remove the Gradle task that runs `npm run build && npx cap sync android` during Android compilation.
- Keep a pre-build check that clearly reports when synced web files are missing.
- Preserve the existing Google Maps key handling and Android dependencies.

## Validation
- Inspect the resulting Gradle task graph/configuration for references to the removed sync task.
- Confirm Android builds will consume files produced by the manual `npm run build` and `npx cap sync android` steps without modifying plugin modules mid-build.

## After pulling on the Mac
Run `npm install`, `npm run build`, and `npx cap sync android` before opening or rebuilding in Android Studio.
