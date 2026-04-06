# ADR 0003: Security Gate Threshold Policy

- Status: accepted
- Date: 2026-03-26

## Context
Security scans existed as guidance but were not consistently enforced in CI.

## Decision
Enforce hard gates in CI with these policies:
- Config gate: required secrets must exist in template/config contract.
- Secrets gate: fail on `critical >= 1` or `high >= 3`.
- Dependency gate: fail on `critical >= 1` or `high >= 5`.
- Injection gate: fail on `exploitableHigh >= 1`.

## Consequences
- Stronger release protection.
- Potentially higher short-term CI failure rate.

## Alternatives Considered
- Warning-only mode.
- Manual approval without automated thresholds.
