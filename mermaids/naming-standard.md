# Mermaid Naming Standard

## Standard
- Node ID format: `domain_action_target`
- Domain prefixes:
  - `runtime_*`
  - `security_*`
  - `orchestrator_*`
  - `ai_*`
  - `aso_*`
  - `tooling_*`

## Legacy To Standard Mapping Examples
- `startScan` -> `security_start_scan`
- `configGate` -> `security_validate_runtime_config`
- `queryInput` -> `orchestrator_receive_query`
- `generateImage` -> `ai_generate_image`
- `optimizeMetadata` -> `aso_optimize_metadata`
- `userActor` -> `runtime_user_actor`

## Rules
- Keep IDs stable between revisions once published.
- Use labels for human-friendly display text; use IDs for consistency.
- Do not encode full file paths into IDs.
