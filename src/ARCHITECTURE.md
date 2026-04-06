# Source Layout And Module Boundaries

This repository uses bounded layers to reduce cross-domain coupling.

## Layers
- `src/runtime/`
  - Browser runtime adapters and UI-side integration helpers.
- `src/api/`
  - HTTP-facing composition and route entrypoints.
- `src/domain/`
  - Domain contracts (ports), use-cases, pure business logic.
- `src/infrastructure/`
  - External integrations (repositories, storage, transport adapters).
- `src/tooling/`
  - Development and CI-only scripts.

## Compatibility Note
Legacy locations (`src/server`, `src/scripts`, `src/db`) are still present.
New work should target the layered directories first and use wrappers during migration.

## Runtime Operations
- Excel catalog runtime path configuration for VM/server deployments is documented in `docs/vm-excel-setup.md`.
