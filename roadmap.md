# iOS for Xcode 14.2
- [x] Add the isolated hosted iPhone map; 17 compatibility/message checks passed and map-only/login isolation verified. Publish before legacy rebuild/sync; actual map rendering and iPhone gestures remain device checks.
- [x] Correct phone booking sizing and current-location pickup; verified GPS fallback/manual edits at iPhone size and 11 regression checks (physical iPhone and Google map rendering remain unverified).
- [x] Correct the legacy core runtime entry and verify the alias regression.
- [x] Add an isolated Capacitor 5 iOS project, preserving Android dependencies.
- [x] Configure permissions, branding, and shared web-source build/sync commands.
- [x] Check compatibility rules and document Mac setup and remaining device checks.
- [x] Prevent iOS commands from falling back to Capacitor 8 and document recovery from missing CapApp-SPM.