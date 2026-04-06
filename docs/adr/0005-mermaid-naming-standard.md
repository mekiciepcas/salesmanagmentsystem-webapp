# ADR 0005: Mermaid Node Naming Standard

- Status: accepted
- Date: 2026-03-26

## Context
Legacy diagram node IDs were inconsistent and too verbose, reducing maintainability.

## Decision
Adopt node ID format `domain_action_target` and keep human-readable labels in node text.

## Consequences
- Better consistency and easier drift checks.
- Initial migration effort for legacy diagrams.

## Alternatives Considered
- Keep current mixed naming.
- Encode full file/symbol names directly in node IDs.
