# AGENTS.md

F1 Hotlaps: one Expo app (iOS and Android, dev builds only) at the repo root. It receives EA F1 25 and F1 26 UDP telemetry and stores the player's Laps on the phone. No backend.

- Plan: `~/.cursor/plans/f1_hotlaps_mvp_8d2e41a7.plan.md`. Decisions: `docs/adr/`.
- Use the terms in `GLOSSARY.md` in code, UI text, and tests (Packet, Lap, Fastest, Latest, Trace, Condition…), not their _Avoid_ words.
- Follow `.cursor/rules/design-principles.mdc` (DRY, KISS, SOLID).
- `docs/telemetry/` is the source of truth for the protocol: `f1-25-udp-spec.txt`, `f1-26-udp-spec.txt`, and the Season 8 PDF (track and session-type appendix, covers F1 26).
- Recorded Packet fixtures for tests live in `fixtures/packets/` (trimmed, gzipped, committed). Full captures go in `fixtures/captures/` (gitignored).

## Commands

Node 24 (`.nvmrc`), pnpm via Corepack.

- `pnpm typecheck`, `pnpm lint`, `pnpm test` — run all three before you finish.
- `pnpm packets capture|replay|trim …` — Packet capture tool (`scripts/packets.ts`).
- `pnpm dev`, `pnpm ios`, `pnpm android` — dev client; `ios/` and `android/` are generated, never edit or commit them.

## Conventions

- Import from `src/` with the `@/` alias (`@/domain/format`). Jest resolves it from `tsconfig.json`.
- Tests sit next to the code as `*.test.ts(x)`. Never put tests in `app/`; expo-router would treat them as routes.
- Every dependency is already installed. Do not edit `package.json`; ask first if something is missing.
- Native config lives in `app.config.ts` (add plugins there, e.g. `./modules/pip/app.plugin.js`).

## Folder ownership

One workstream owns each folder; stay inside yours and import other folders through their public functions.

| Workstream | Folders |
| --- | --- |
| capture-replay | `scripts/`, `fixtures/` |
| pip | `modules/pip/`, `src/pip/` |
| protocol | `src/protocol/` |
| domain | `src/domain/` |
| storage | `src/storage/` |
| recorder | `src/recording/` |
| capture-activity | `src/activity/`, `src/capture/`, `src/live/` |
| screens | `app/`, `src/ui/` |
