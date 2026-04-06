# Mermaid Architecture Index

This directory contains the decomposed architecture diagrams from `fullprocess-mermaid.md`.

## Core Architecture Views
- `app-runtime.md`
  - Production runtime flow.
  - Explicit separation between `prodRuntime` and `devTooling`.
- `security-audit-pipeline.md`
  - Secrets/dependency/injection gates.
  - Pass/fail thresholds and release decision node.
- `agent-orchestrator.md`
  - Skill matching, registry loading, scoring, and recommendation flow.
- `ai-aso-tools.md`
  - AI image generation safety flow and ASO analysis flow.

## Critical Function Sub-Flows
- `rectifier-flex-flow-sequence.md`
  - End-to-end user-to-cart sequence for rectifier pricing.
- `rectifier-flex-flow-state.md`
  - Runtime state transitions for rectifier pricing UI logic.

## Operations and Governance
- `metrics.md`
  - Security, orchestrator, and runtime operational metrics.
  - Producer/consumer notes for each metric.
- `naming-standard.md`
  - Mermaid node ID policy (`domain_action_target`).
  - Legacy-to-standard mapping examples.

## Ownership
- Diagram ownership rules are managed via `.github/CODEOWNERS`.
- Architecture-impacting code changes must include `mermaids/` or `docs/adr/` updates.

## Review Cadence
- Monthly architecture review checklist:
  - `docs/architecture-review-checklist.md`

## Scope Coverage Mapping
- P1: diagram split to 4 parts -> complete (`app-runtime`, `security-audit-pipeline`, `agent-orchestrator`, `ai-aso-tools`).
- P1: runtime boundary clarity -> complete (`app-runtime` has `prodRuntime` vs `devTooling`).
- P2: critical rectifier sub-flow -> complete (`rectifier-flex-flow-sequence`, `rectifier-flex-flow-state`).
- P2: security gate fail conditions -> complete (`security-audit-pipeline` gate contract with thresholds).
- P3: operational metrics -> complete (`metrics.md` plus metrics notes in orchestrator/ai/security diagrams).
