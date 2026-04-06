# ADR 0002: Ports And Adapters For Cross-Domain Calls

- Status: accepted
- Date: 2026-03-26

## Context
UI and API layers performed direct cross-domain calls (`fetch`, direct repository access) with no explicit contracts.

## Decision
Introduce domain ports and infrastructure/runtime adapters:
- Domain ports in `src/domain/ports`
- Runtime transport adapters in `src/runtime/adapters`
- Infrastructure repository/adapters in `src/infrastructure`

Pilot flow: `rectifier-flex-pricing` cart/excel integration.

## Consequences
- Better testability and boundary control.
- Slight increase in adapter boilerplate.

## Alternatives Considered
- Keep direct fetch/db usage.
- Service locator without explicit contracts.
