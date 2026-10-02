# ShopSense mobile — static review (S5, 2026-10-02)

The app cannot be compiled in this environment (`flutter pub get` fails —
pub.dev unreachable). This is a careful line-by-line static review. Pinning
and platform scaffolding done; remaining issues are listed below.

## What was done

- `flutter create --no-pub --project-name shopsense .` generated `android/`
  and `ios/` scaffolding. Custom `lib/` files were preserved (verified:
  `lib/main.dart` still has the ShopSenseApp).
- `pubspec.yaml`: versions pinned exact (no carets): `http: 1.2.0`,
  `image_picker: 1.0.7`, `shared_preferences: 2.2.2`,
  `url_launcher: 6.2.5`, `flutter_lints: 4.0.0`. SDK `>=3.2.0 <4.0.0`.

## Imports — OK

- All imports resolve to declared dependencies or relative files. No
  unused-package imports found.
- `api.dart`: `dart:convert`, `package:http/http.dart` — both declared.

## Null safety — issues found

1. `results_screen.dart` line ~35: `widget.photoBytes!` — force-unwrap is
   safe here (guarded by `widget.query != null` check above), but brittle.
   If a future constructor passes both null, it crashes. Consider an assert.
2. `results_screen.dart` line ~38: `queries.first` — throws StateError if
   `describe-image` returns an empty `queries` list. **Fix before release:**
   guard with `if (queries.isEmpty) throw Exception('no queries')`.
3. `results_screen.dart` `_apply`: `d['results'] as List?` — if the API
   ever returns a non-List `results`, this throws a TypeError. Acceptable
   for prototype; the catch-all shows the error.
4. `detail_screen.dart`: `item['image'] as String`, `item['title'] as String`,
   `item['url'] as String` — force-casts. If a result lacks any field, the
   detail screen crashes. **Fix before release:** use `as String? ?? ''`
   and hide the widget when empty.

## API base via --dart-define — OK

- `api.dart`: `fastApiBase = String.fromEnvironment('FASTAPI_BASE',
  defaultValue: '')` — correct. Empty string → `searchImage` throws a clear
  "FASTAPI_BASE not configured" and the UI falls back to describe-image.
- `signin_screen.dart`: `API_BASE` defaults to `http://10.0.2.2:8000`
  (Android emulator loopback). Correct for local dev; override with
  `--dart-define=API_BASE=<space-url>` for the public backend.
- `vercelBase` is hardcoded to `https://shopsense-teal.vercel.app` — correct.

## Missing / incomplete features

1. **No save action on results.** `SavedScreen` exists and reads
   `saved_items` from SharedPreferences, but nothing ever writes to it.
   There is no save/bookmark button on `ResultsScreen` or `DetailScreen`.
   Either add one or mark the limitation in the UI.
2. **No delete/unsave** on `SavedScreen`.
3. **Token storage**: `SignInScreen` stores the JWT in SharedPreferences
   (plaintext). Acceptable for prototype; note for the report — use
   `flutter_secure_storage` before any real users.
4. **No logout** action.

## Minor

- `home_screen.dart`: `_text` TextEditingController is never disposed.
  Add a `dispose()` override.
- Timeouts: 15s (live-search), 20s (describe), 60s (/search/image) —
  reasonable.
- `image_picker`: `maxWidth: 1024, imageQuality: 85` — reasonable size cap.

## Not verifiable here

- Widget tree correctness, layout overflow, Material 3 theming.
- `image_picker` camera/gallery permissions on real devices.
- `url_launcher` externalApplication mode on iOS/Android.
