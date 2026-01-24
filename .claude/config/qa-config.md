# QA Configuration

This file configures the automated QA system behavior.

## Coverage Strategy (Graduated)

```yaml
coverage:
  # Current phase (update as coverage grows)
  current_phase: 1

  # Phase 1: Informational (NOW - until 20% overall)
  # - Run tests, report coverage
  # - Never block PRs
  phase_1:
    mode: informational
    block: false

  # Phase 2: Diff Coverage (Enable at 20% overall)
  # - New code must have 70% coverage
  # - Block if new code is untested
  phase_2:
    trigger_at_overall: 20
    new_code_minimum: 70
    block_on_new_code: true

  # Phase 3: Floor Enforcement (Enable at 40% overall)
  # - Coverage cannot drop more than 2%
  # - New code must have 80% coverage
  phase_3:
    trigger_at_overall: 40
    max_drop_percent: 2
    new_code_minimum: 80
    block: true

  # Coverage weighting by importance
  # NOTE: Design intent - not enforced yet
  # When implemented, these weights apply to coverage calculations
  weighting:
    auth_routes: 2.0        # Security critical
    mutation_endpoints: 1.5  # Data integrity
    core_features: 1.5       # tasks, notes, projects
    read_endpoints: 1.0      # Standard
    admin_routes: 0.5        # Low traffic
    utilities: 0.5           # Low risk
```

## E2E Configuration

```yaml
e2e:
  # Environment - ALWAYS local in CI, never production
  ci_environment: local_build

  # Data isolation
  isolation:
    strategy: unique_user_per_run
    user_prefix: "test-{timestamp}-{random}"
    cleanup: after_each_test

  # Note: E2E tests validate integration and user flows,
  # NOT production performance or infrastructure behavior.

  # Test stability
  retries: 2
  timeout_ms: 60000

  # Sequential execution to prevent race conditions
  parallel: false
  workers: 1

  # Required flows (must have E2E tests)
  required_flows:
    - login_valid_credentials
    - login_invalid_credentials
    - logout
    - dashboard_loads
    - create_task
    - create_note

  # Optional flows (nice to have)
  optional_flows:
    - create_project
    - edit_task
    - delete_task
    - file_upload
```

## CI Time Budgets

```yaml
# Pre-defined to prevent CI creep
# If exceeded consistently, optimize tests before adding more
ci_time_budgets:
  unit_tests: 3_minutes
  e2e_tests: 5_minutes
  total_pipeline: 10_minutes

  action_if_exceeded: optimize_before_adding_more
```

## Audit Configuration

```yaml
audits:
  weekly:
    enabled: true
    day: sunday
    hour_utc: 2

    # What to check
    checks:
      - coverage_trends
      - new_untested_files
      - flaky_test_report

    # Output - report only, no auto-PR
    output:
      report: true
      auto_pr: false

    # Conditional PR (only create if these trigger)
    create_pr_if:
      coverage_drops_by: 5  # percentage points
      critical_path_untested: true
      security_vulnerability: true

  monthly:
    enabled: true
    day_of_month: 1

    checks:
      - full_coverage_audit
      - security_scan
      - npm_audit
      - dependency_review
      - code_quality_metrics

    output:
      report: true
      auto_pr: false
```

## Agent Configuration

```yaml
agents:
  # Strict execution order - never parallel
  execution_order:
    1: qa-reviewer
    2: test-writer

  parallel: false

  qa_reviewer:
    # Simple issues to auto-fix
    auto_fix:
      - console_log_removal
      - missing_try_catch
      - obvious_typos

    # Complex issues to report only
    report_only:
      - architecture_concerns
      - major_refactoring
      - security_issues

  test_writer:
    # Only runs after qa-reviewer completes
    prerequisite: qa_reviewer_complete

    # Focus on behavior, not implementation
    test_style: behavior_driven

    # Minimal mocking policy
    mock_policy: external_services_only

    # Required patterns for different code types
    required_patterns:
      protected_routes: auth_triple  # 401/403/200
      user_input: validation_tests
      new_features: happy_path_first
```

## Notification Preferences

```yaml
notifications:
  # Always show to user
  always_show:
    - test_results_summary
    - coverage_change_percent
    - ci_pass_fail

  # Show only on request
  on_request:
    - detailed_coverage_report
    - untested_files_list
    - full_audit_report

  # Alert immediately (interrupt if needed)
  alert_on:
    - security_vulnerability_found
    - coverage_drop_over_5_percent
    - ci_failure

  # Do silently (don't mention unless asked)
  silent:
    - routine_test_additions
    - minor_lint_fixes
    - successful_audits
```

## Override Logging

```yaml
# When user overrides a QA failure, log it
override_logging:
  enabled: true

  # What to record
  log_fields:
    - timestamp
    - what_failed
    - why_overridden
    - risk_accepted

  # Where to record
  log_location: .claude/reports/overrides.md
```
