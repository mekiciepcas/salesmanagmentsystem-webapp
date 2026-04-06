# ADR 0004: Runtime Vs Tooling Separation

- Status: accepted
- Date: 2026-03-26

## Context
Production runtime and development tooling concerns were mixed in architecture views and code discussions.

## Decision
Maintain explicit boundary labels and structure:
- `prodRuntime` for user-facing execution paths.
- `devOrCIOperationOnly` for scanning/maintenance scripts.

Diagram and code ownership must preserve this separation.

## Consequences
- Lower risk of tooling logic leaking into production path.
- Requires discipline in reviews and CI checks.

## Alternatives Considered
- Single blended architecture view.
- Implicit runtime/tooling separation without labels.
