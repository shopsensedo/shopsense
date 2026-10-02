# ShopSense mobile — compile errors (paste from your laptop)

How to use:
1. On your laptop: `cd mobile && flutter pub get`
2. Then: `flutter run --dart-define=FASTAPI_BASE=<your-space-url>`
   (or `flutter build apk` for a release APK)
3. If it fails, copy the FULL error output and paste it below, then send
   this file back to the agent. The agent will fix the code and you re-run.

Keep each attempt in its own section so we can track what was fixed.

---

## Attempt 1 — YYYY-MM-DD

Command:

```
(paste the exact command you ran)
```

Output:

```
(paste the full error output here)
```

---

## Attempt 2 — YYYY-MM-DD

Command:

```
```

Output:

```
```

---

## Known issues already found by static review (see REVIEW.md)

- `results_screen.dart`: `queries.first` crashes on empty list — needs a guard.
- `detail_screen.dart`: `item['image'] as String` etc. crash if a field is missing.
- No save button on results (SavedScreen has nothing to display yet).
- `_text` controller in `home_screen.dart` is never disposed.
