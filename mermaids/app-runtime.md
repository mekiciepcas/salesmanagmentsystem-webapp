```mermaid
flowchart TD
  subgraph prodRuntime [ProdRuntime]
    runtime_user_actor[User]
    runtime_render_rectifier_page[src/pages/rectifier-flex-pricing.html]
    runtime_bootstrap_rectifier_app[RectifierFlexiblePricing]
    runtime_call_api_router[src/server/api.js]
    runtime_query_postgres[src/db/connection.js]
    runtime_read_rectifier_excel[/api/excel/rectifier/Terminals]
    runtime_write_cart[/api/cart]
    runtime_integrate_quote_cart[QuoteCartIntegration]
  end

  subgraph devTooling [DevOrCIOperationOnly]
    tooling_run_full_audit[skills/007/full_audit.py]
    tooling_run_quick_scan[skills/007/quick_scan.py]
    tooling_run_score_calc[skills/007/score_calculator.py]
    tooling_run_health_check[skills/claude_monitor/health_check.py]
  end

  runtime_user_actor -->|runsInProduction| runtime_render_rectifier_page
  runtime_render_rectifier_page -->|runsInProduction| runtime_bootstrap_rectifier_app
  runtime_bootstrap_rectifier_app -->|fetchExcelData| runtime_read_rectifier_excel
  runtime_bootstrap_rectifier_app -->|addToCart| runtime_write_cart
  runtime_read_rectifier_excel --> runtime_call_api_router
  runtime_write_cart --> runtime_call_api_router
  runtime_call_api_router --> runtime_query_postgres
  runtime_bootstrap_rectifier_app --> runtime_integrate_quote_cart

  tooling_run_full_audit -->|devOrCIOperationOnly| runtime_call_api_router
  tooling_run_quick_scan -->|devOrCIOperationOnly| runtime_call_api_router
  tooling_run_score_calc -->|devOrCIOperationOnly| runtime_call_api_router
  tooling_run_health_check -->|devOrCIOperationOnly| runtime_call_api_router
```

Assumptions
- `prodRuntime` contains browser-delivered and server request path components.
- `devTooling` contains scanners/health scripts not required for end-user runtime path.
