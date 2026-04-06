```mermaid
flowchart TD
  security_start_scan[AuditStart]
  security_validate_runtime_config[RuntimeConfigGate]
  security_collect_repo_files[CollectRepositoryFiles]
  security_run_secrets_gate[SecretsScannerGate]
  security_run_dependency_gate[DependencyScannerGate]
  security_run_injection_gate[InjectionScannerGate]
  security_aggregate_findings[AggregateFindings]
  security_decide_release[ReleaseDecision]
  security_block_release[ReleaseBlocked]
  security_allow_release[ReleaseAllowed]

  security_start_scan --> security_validate_runtime_config
  security_validate_runtime_config -->|pass: JWT_SECRET and ADMIN_REGISTER_SECRET configured| security_collect_repo_files
  security_validate_runtime_config -->|fail: required secret missing| security_block_release
  security_collect_repo_files --> security_run_secrets_gate
  security_run_secrets_gate -->|pass: no Critical secret and High count below threshold| security_run_dependency_gate
  security_run_secrets_gate -->|fail: Critical secret found| security_block_release

  security_run_dependency_gate -->|pass: no Critical CVE and policy accepted| security_run_injection_gate
  security_run_dependency_gate -->|fail: Critical CVE found| security_block_release

  security_run_injection_gate -->|pass: no exploitable High injection| security_aggregate_findings
  security_run_injection_gate -->|fail: exploitable High injection found| security_block_release

  security_aggregate_findings --> security_decide_release
  security_decide_release -->|all gates passed| security_allow_release
  security_decide_release -->|any gate failed| security_block_release
```

Gate Contract
- `SecretsScannerGate`
  - Trigger: every commit or CI release candidate.
  - Fail: `criticalCount >= 1` OR `highCount >= 3`.
  - Pass: `criticalCount = 0` AND `highCount < 3`.
- `DependencyScannerGate`
  - Trigger: after secrets gate passes.
  - Fail: `criticalCveCount >= 1` OR `highCveCount >= 5`.
  - Pass: `criticalCveCount = 0` AND `highCveCount < 5`.
- `InjectionScannerGate`
  - Trigger: after dependency gate passes.
  - Fail: `exploitableHigh >= 1`.
  - Pass: `exploitableHigh = 0`.

Artifacts
- `secrets_report.json`
- `dependency_report.json`
- `injection_report.json`
- `audit_summary.json`

Security Posture Notes
- Default admin auto-seeding is disabled; privileged accounts must be provisioned through controlled flows.
- Missing required runtime secrets are treated as release-blocking misconfiguration.
