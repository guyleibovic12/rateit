# RateIt Local

Local desktop rating tool for Windows built with Electron, React, TypeScript, TailwindCSS, and SQLite persistence via `sql.js`.

The app now runs as a real local workflow:

- no seeded demo data is inserted on first launch
- models are imported from a local CSV or Excel file
- named users persist ratings and resume progress
- anonymous users work in a temporary in-memory session only

## Roles

- `rater`
  - can login with a name or anonymously
  - can rate models
  - can see only their own progress and summary
- `admin`
  - can import models
  - can import and map images
  - can export summary data
  - can filter and analyze all named raters

Admin access is not shown in the UI as a separate toggle.
The role is assigned automatically when the entered name matches

## Main Features

- Premium RTL desktop layout with right sidebar
- Role-aware login
- Fast rating screen with instant save
- Keyboard shortcuts:
  - `1` = `לא טוב`
  - `2` = `טוב`
  - `3` = `מצוין`
- Explicit post-rating actions:
  - `חזרה למסך הבית`
  - `המשך לדגם הבא`
- Fixed image containers with placeholder fallback
- Model import from CSV / Excel
- Image folder scan + image mapping flow
- Last viewed model is remembered per named user
- Central summary dashboard
- Summary modes:
  - per-rater breakdown
  - per-model average
- Rater filters in summary:
  - all raters
  - all named users
  - manual multi-select
  - include / exclude anonymous
- CSV export for admin

## Run

On the first real run:

1. Login with a name, or continue as `anonymous`
2. If you are the admin user, login as `arik_admin`
3. Import models from CSV / Excel
4. Start rating immediately
    utils.ts
database/
  sample-models.csv
```
