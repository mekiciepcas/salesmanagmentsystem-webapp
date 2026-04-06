# Operational Metrics

## Security Pipeline Metrics
- `scanDurationMs`
  - Produced by: `run_scan` for `secrets`, `dependency`, `injection`.
  - Consumed by: release dashboard and CI trend reports.
- `findingsBySeverity`
  - Produced by: scanner aggregate stage.
  - Shape: `critical`, `high`, `medium`, `low`.
  - Consumed by: gate decision and remediation planning.
- `falsePositiveRatio`
  - Produced by: triage workflow (`falsePositive / totalFindings`).
  - Consumed by: tuning scanner patterns and thresholds.
- `gateFailureRate`
  - Produced by: gate decision node (`failedRuns / totalRuns`).
  - Consumed by: release readiness review.
- `meanTimeToRemediationHours`
  - Produced by: ticket lifecycle data (open-to-resolved delta).
  - Consumed by: security SLA tracking.

## Orchestrator Metrics
- `matchLatencyMs`
  - Produced by: `match` execution timer.
  - Consumed by: orchestrator performance dashboard.
- `registryLoadMs`
  - Produced by: `load_registry`.
  - Consumed by: cache and registry optimization decisions.
- `scoringCount`
  - Produced by: `score_skill`.
  - Consumed by: quality/cost analysis.
- `topSkillConfidence`
  - Produced by: ranking output.
  - Consumed by: fallback routing and operator review.

## Runtime Metrics
- `excelLoadLatencyMs`
  - Produced by: `loadExcelData` client timing.
  - Consumed by: frontend reliability tracking.
- `cartPostSuccessRate`
  - Produced by: `addToQuote` API response outcomes.
  - Consumed by: product conversion and error monitoring.
