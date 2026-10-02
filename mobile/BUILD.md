# Building the ShopSense Flutter app

## On your own laptop (recommended)

1. Install Flutter 3.47+ from https://docs.flutter.dev/get-started/install
   and run `flutter doctor` until all checks pass (Android Studio or Xcode
   for the platform you target).
2. `cd mobile`
3. `flutter pub get`
4. Run on a device/emulator:
   - `flutter run`
   - With a local FastAPI backend: `flutter run --dart-define=API_BASE=http://<your-lan-ip>:8000`
     (Android emulator: `http://10.0.2.2:8000` is the default and already set).
   - With the R11 re-rank endpoint: `flutter run --dart-define=FASTAPI_BASE=https://<your-fastapi-host>`
5. Build release APK: `flutter build apk --release`

## What to report back

- `flutter doctor` output (first run).
- Whether the APK installs and the three tabs (Search / Saved / Account) open.
- Photo search: does the camera/gallery picker work, and do results load?
- Text search: try "kala joota" and "sasta smartwatch".
- Any red error text (copy it exactly).

## Verification status

- **UNVERIFIED — cannot compile on this VM** (2026-10-02): the Flutter SDK
  3.47.6 was installed here (`flutter --version` works; Dart 3.13.5), but
  `flutter pub get` fails ("Failed to update packages" — pub.dev is not
  reachable from this environment) and `flutter doctor` cannot complete its
  checks. There is no Android SDK/emulator and no iOS toolchain here, so
  the app has not been compiled or run. The Dart code is scaffolded
  against `docs/openapi.yaml` and the web app's API shapes; `dart analyze`
  reports only missing-package errors (expected without `pub get`), no
  syntax errors.
- Build and run it on your own laptop (steps above) — that is the verified path.
