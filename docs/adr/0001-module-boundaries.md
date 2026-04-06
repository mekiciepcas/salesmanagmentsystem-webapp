# ADR 0001: Physical Module Boundaries

- Status: accepted
- Date: 2026-03-26

## Context
Runtime UI, API, domain logic, and tooling scripts were mixed under overlapping folders, causing unclear ownership and high coupling.

## Decision
Adopt layered folders:
- `src/runtime`
- `src/api`
- `src/domain`
- `src/infrastructure`
- `src/tooling`

Legacy folders remain as compatibility bridges during migration.

## Consequences
- Clearer ownership and refactor safety.
- Incremental migration complexity during transition.

## Alternatives Considered
- Keep existing mixed folder structure.
- Full big-bang move without compatibility wrappers.
