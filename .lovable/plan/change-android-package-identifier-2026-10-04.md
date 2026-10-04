# Change Android package identifier

## Changes
- Replace `com.swiftmuv.app.v2` with `com.swiftmuv.app` in the Capacitor and Android build configuration.
- Move `MainActivity.java` into the matching `com/swiftmuv/app` package path and update its package declaration.
- Update the Android package references in app resources and setup documentation so they remain consistent.
- Record the Android identifier as a project architecture rule.

## Verification
- Search the project to ensure the old identifier is gone.
- Run the relevant Android Gradle validation and inspect the latest preview build status.

## Important
Google Play treats a different package identifier as a different app. A build using `com.swiftmuv.app` cannot update the existing Play Store listing published as `com.swiftmuv.app.v2`.
