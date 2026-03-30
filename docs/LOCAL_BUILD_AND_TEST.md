# Local Build and Test Guide

## Minimum tooling
- Rust toolchain via `rustup`
- Node.js 20+
- npm
- PostgreSQL 15+ for backend API checks

## Quick start
1. Copy `.env.example` to `.env` and adjust values if needed.
2. Create the local database named `plants_calendar`.
3. Run the automated checks:
   - macOS/Linux: `./scripts/run-local-checks.sh`
   - Windows PowerShell: `./scripts/run-local-checks.ps1`

## Recommended command order
```bash
cargo fmt --all --check
cargo check --workspace
cargo test -p shared
cargo test -p backend -- --nocapture
node --check desktop-ui/src/main.js
cd desktop-ui && npm install && npm run build
```

## Manual smoke checklist

### Backend
- Start PostgreSQL and ensure `DATABASE_URL` points to a reachable database.
- Start backend with `cargo run -p backend`.
- Confirm `GET /health` returns success.
- Confirm `GET /subscription` and `GET /subscription/status` answer without crashing.

### Auth
- Register a fresh user.
- Login with the same user.
- Read `GET /me` with the returned bearer token.

### Plants
- Create a plant in Free plan and verify count becomes `1 / 1`.
- Try to create a second active plant in Free plan and verify it is blocked.
- End or archive the first plant and verify a new plant can be created again.
- Reactivate an archived plant while at plan limit and verify it is blocked.
- Delete a plant and verify it disappears from visible lists.

### Summary / Dashboard
- Verify `active_plants`, `ended_plants`, `archived_plants`, `visible_plants`, `remaining_slots` and `over_limit_by` look correct.
- Downgrade a user with more active plants than allowed and verify grandfathered plants stay visible but new creates/reactivations are blocked.

### Desktop / Tauri
- Start the desktop shell after backend is reachable.
- Repeat create / archive / end / reactivate flows locally.
- Run one sync push and one sync pull.
- Verify old cached plants still resolve to the correct `plant_status`.

## What Step 93 adds
- dedicated local check scripts for Bash and PowerShell
- `.env.example` for the backend defaults
- a single documented smoke-test path for status model, summary, plan limits and sync


Zusätzlich im Desktop-UI-Verzeichnis:
- `npm run test:smoke` für einfache statusbezogene JS-Smoke-Checks
