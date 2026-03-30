# BlockSocial Plants Calendar

**BlockSocial Plants Calendar** is a Rust-first, offline-capable plant calendar MVP for tracking plant runs, reminders, tasks, logs, and subscription limits across a desktop app and backend API.

This repository is the current **GitHub test branch / MVP baseline**. It is suitable for development, local testing, and architecture review. It should **not** yet be treated as a production-ready release.

## Company

**BlockSocial UG (haftungsbeschränkt)**  
Email: **info@blocksocial.eu**

## Project status

Current status: **advanced MVP / test build**

What is already in place:
- Rust workspace with shared domain logic
- Axum backend API
- desktop UI with Tauri shell
- local SQLite storage for offline-first behavior
- plant/task/log flows
- subscription plan logic
- centralized plant status model
- sync groundwork and dirty queue
- dashboard, plants, calendar, billing, and settings views
- onboarding and MVP readiness guidance in the UI

What is still not fully finished:
- final production hardening
- full Rust/Tauri build validation on a clean machine
- real payment/webhook production integration
- full settings/account feature completion
- complete QA across all flows

## MVP scope

The current MVP is designed around these core use cases:
- create and manage plants
- track plant lifecycle and current phase
- create tasks and reminders
- create log entries
- work offline locally
- sync later against a backend
- enforce subscription-based plant limits
- show dashboard summaries and readiness indicators

## Plans

The current plan model is:
- **Free**: 1 active plant
- **Basic**: 3 active plants
- **Pro**: 100 active plants
- **CSC**: unlimited active plants

Important behavior:
- only **active** plants count against the plan limit
- **ended** and **archived** plants do not block new plants
- **deleted** plants are hidden from normal views and summaries
- legacy bool flags remain for compatibility, but `plant_status` is the leading truth

## Plant status model

The app now uses a central status model for plants:
- `active`
- `ended`
- `archived`
- `deleted`

This status model is used across:
- shared Rust domain rules
- backend API and repositories
- local SQLite store inside the desktop shell
- desktop UI summaries and filters

Compatibility behavior remains in place for older records that still rely on:
- `is_active`
- `archived`

Those legacy fields are normalized into the modern status model when data is loaded or synchronized.

## Repository structure

```text
.
├── backend/                 # Axum backend API
├── desktop-ui/              # Vite frontend for the desktop shell
│   ├── src/                 # Main UI logic
│   └── src-tauri/           # Tauri desktop shell and local SQLite layer
├── docs/                    # Build/test docs and next-step notes
├── migrations/              # SQLite and PostgreSQL migrations
├── scripts/                 # Local helper scripts
├── shared/                  # Shared domain types, rules, sync contracts
├── Cargo.toml               # Workspace manifest
└── .env.example             # Backend environment example
```

## Main components

### `shared`
Contains shared Rust code used by backend and desktop shell:
- domain types
- subscription plans
- plant status rules
- summary calculations
- sync contracts
- normalization helpers

### `backend`
Rust backend built with **Axum**:
- auth endpoints
- plant endpoints
- task endpoints
- log endpoints
- subscription endpoints
- repository layer with SQLx

### `desktop-ui`
Desktop-facing UI built with **Vite** and plain JS:
- dashboard
- plant management
- calendar and reminder view
- subscription and billing view
- account and settings view
- onboarding and empty-state guidance

### `desktop-ui/src-tauri`
Tauri shell with local persistence:
- local SQLite database
- local session handling
- guest/offline mode
- local sync queue
- Tauri bridge to backend and local store

## Current MVP views

The desktop UI currently includes these major MVP areas:
- **Dashboard**
- **Plants**
- **Calendar & Reminder**
- **Subscription / Billing**
- **Account / Settings**

Additional UI elements already present:
- onboarding / first-run card
- readiness / completion card
- plant filters
- plant detail panel
- task list
- log list
- empty states with quick actions
- live status badges in navigation

## Offline-first approach

The project is structured around an offline-capable workflow:
- users can work locally in desktop mode
- guest mode is supported
- local data is stored in SQLite
- dirty changes are queued for later sync
- backend and local store both normalize plant records before use

This makes the project suitable for later expansion into broader cross-device syncing and stronger mobile support.

## Authentication

Current auth support includes:
- register
- login
- bearer token protected backend routes
- guest mode in the desktop app

Current limitation:
- Google auth is still a stub and should not be considered production-ready yet

## Billing and subscription state

The repo already includes:
- subscription state summaries
- visible/active/inactive/ended/archive counts
- remaining slot calculations
- over-limit calculations
- checkout/webhook MVP groundwork

Current limitation:
- billing/payment is not yet fully wired for production usage

## Database and migrations

The repo contains migrations for both:
- **SQLite**
- **PostgreSQL**

Migration coverage includes:
- initial schema
- sync tombstones
- auth/session state
- subscription history
- plant status model
- legacy backfill for older plant records

Files are located in:
- `migrations/*_sqlite_*.sql`
- `migrations/*_postgres_*.sql`

## Local development

### Requirements

Recommended local setup:
- Rust toolchain
- Cargo
- Node.js 18+
- npm
- Tauri prerequisites for your OS
- SQLite available locally
- PostgreSQL if you want to run the backend with a real database

### Environment

Copy the example file and adjust it locally:

```bash
cp .env.example .env
```

Current example values include:
- `DATABASE_URL`
- `JWT_SECRET`

## Recommended local checks

### Workspace checks

```bash
cargo fmt --all --check
cargo check --workspace
cargo test -p shared
cargo test -p backend
```

### Desktop UI checks

```bash
cd desktop-ui
npm install
npm run check
npm run test:smoke
npm run build
```

### Helper scripts

The repository already includes helper scripts for local verification:
- `scripts/run-local-checks.sh`
- `scripts/run-local-checks.ps1`

Additional build/test guidance is documented in:
- `docs/LOCAL_BUILD_AND_TEST.md`

## What was verified in the current preparation cycle

Within the preparation work for this repository, the following was verified directly:
- `node --check desktop-ui/src/main.js`
- `node desktop-ui/scripts/smoke-status-tests.mjs`

What was **not** verified in this environment:
- full `cargo check`
- full `cargo test`
- full Tauri desktop build

Reason:
- the preparation environment did not provide a complete Rust/Cargo toolchain

So this repository should be treated as:
- **ready for GitHub upload and real testing**
- but **not yet confirmed as production-clean**

## Recommended GitHub positioning

For GitHub, this repository should be described as:
- **MVP test branch**
- **development baseline**
- **not yet a final release**

A good first GitHub description could be:

> Rust-first offline-capable plant calendar MVP by BlockSocial with backend API, Tauri desktop UI, subscription limits, sync groundwork, and local SQLite support.

## Known limitations

At the time of this README, these points still need follow-up work:
- production-grade payment integration
- real Google auth validation
- full build validation on a clean local machine
- complete UX/QA round across all user flows
- final release hardening
- eventual mobile rollout work if Android/iOS are targeted later

## Suggested next steps after GitHub upload

Recommended order:
1. upload this repository to GitHub
2. run local workspace checks
3. run desktop UI checks
4. fix any first compile/runtime issues revealed by the real machine
5. test all major MVP flows end-to-end
6. decide whether the next milestone is:
   - MVP bugfix pass
   - production billing integration
   - stronger sync reliability
   - mobile expansion

## Internal development progress summary

This repository already includes major work completed through the later MVP steps, including:
- plan-limit engine hardening
- plant status migration from legacy bool flags
- summary/dashboard normalization
- sync and migration cleanup
- local build/test preparation
- smoke tests
- MVP navigation and flow completion
- MVP readiness and closure round in the UI

## Contact

For project ownership, licensing, or collaboration requests:

**BlockSocial UG (haftungsbeschränkt)**  
**info@blocksocial.eu**
