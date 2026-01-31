# Plan Review Process

This document details the workflow for creating, reviewing, and implementing plans in myBrain.

## Overview

Plans are reviewed by senior engineers before implementation. This ensures quality, catches issues early, and provides external perspective on architectural decisions.

## Directory Structure

```
.claude/
  plans/                    # Original plans created by Claude
    feature-name-plan.md
  plan-reviews/             # Senior engineer reviews of plans
    feature-name-plan-review.md
  implementation-reviews/   # Post-implementation reviews
    feature-name-implementation-review.md
```

## Workflow

1. **Claude creates the plan** in `.claude/plans/` with descriptive filename
2. **Plan is presented** to senior engineers (external reviewers via user)
3. **Reviews are saved** in `.claude/plan-reviews/` with matching filename
4. **Reviewers provide** opinions, suggestions, and revisions
5. **Plan is approved** (or revised) before implementation begins
6. **Implementation follows** the approved plan
7. **Implementation reviews** saved to `.claude/implementation-reviews/`

## Plan Template

Plans saved to `.claude/plans/` must include:

```markdown
# Plan: [Descriptive Title]

## Status: PENDING REVIEW | APPROVED | REVISED

## Summary
[1-2 sentence overview]

## Problem
[What issue this solves]

## Proposed Solution
[Detailed approach]

## Implementation Steps
1. Step one
2. Step two
...

## Risks & Mitigations
[What could go wrong, how to handle it]

## Open Questions
[Things that need reviewer input]

## Reviewer Notes
[Space for senior engineer feedback - filled in during review]
```

## When to Create a Plan

**Create a formal plan when:**
- Major feature (5+ files affected)
- Architecture changes
- New patterns being established
- User explicitly requests a plan
- Complex refactoring

**No formal plan needed for:**
- Bug fixes
- Small features (1-3 files)
- Documentation updates
- Following established patterns

## Review Content

Senior engineer reviews typically include:
- **Executive Summary** - Overall assessment
- **Key Findings** - Issues by severity (critical/high/medium/low)
- **Codebase Integration Notes** - How plan fits with existing code
- **Risk & Scope Assessment** - Complexity and main risks
- **Recommended Adjustments** - Specific changes to the plan
- **Acceptance Criteria** - How to know the implementation succeeded

## After Review

- Plans may go through multiple revision cycles
- Reviewers may suggest alternative approaches
- Some plans may be rejected or deferred
- Implementation only begins after "APPROVED" status
- Address all critical/high findings before proceeding
- Medium/low findings can be addressed during implementation
