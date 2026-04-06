# Monthly Architecture Review Checklist

## Boundary Integrity
- [ ] Runtime, API, domain, infrastructure, tooling boundaries respected.
- [ ] Cross-domain calls pass through port/adapter layers.

## Security Governance
- [ ] Config/secrets/dependency/injection gates pass trends reviewed.
- [ ] Gate failure root causes documented and assigned.

## Diagram And ADR Hygiene
- [ ] Mermaid diagrams reflect current code paths.
- [ ] ADR records updated for major architectural changes.
- [ ] Naming standard `domain_action_target` remains consistent.

## Operational Metrics
- [ ] Scan duration trend reviewed.
- [ ] Finding severity distribution reviewed.
- [ ] False positive ratio and remediation time tracked.
