```mermaid
flowchart TD
  orchestrator_receive_query[UserOrTaskQuery]
  orchestrator_ensure_registry[ensure_registry]
  orchestrator_load_registry[load_registry]
  orchestrator_get_project_skills[get_project_skills]
  orchestrator_load_projects[load_projects]
  orchestrator_match_skills[match]
  orchestrator_score_skill[score_skill]
  orchestrator_normalize_score[normalize]
  orchestrator_map_capability[query_to_capabilities]
  orchestrator_return_ranked_skills[RankedSkillRecommendations]

  orchestrator_receive_query --> orchestrator_map_capability
  orchestrator_map_capability --> orchestrator_match_skills
  orchestrator_match_skills --> orchestrator_load_registry
  orchestrator_load_registry --> orchestrator_ensure_registry
  orchestrator_match_skills --> orchestrator_get_project_skills
  orchestrator_get_project_skills --> orchestrator_load_projects
  orchestrator_match_skills --> orchestrator_score_skill
  orchestrator_score_skill --> orchestrator_normalize_score
  orchestrator_score_skill --> orchestrator_map_capability
  orchestrator_match_skills --> orchestrator_return_ranked_skills
```

Operational Signals
- `matchLatencyMs`: time spent in `match`.
- `registryLoadMs`: time spent in `load_registry`.
- `scoringCount`: number of skills scored per query.
- `topSkillConfidence`: highest ranked score for observability.
