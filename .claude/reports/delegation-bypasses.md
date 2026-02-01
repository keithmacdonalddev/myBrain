# Agent Delegation Bypasses

This file tracks authorized bypasses of the delegation model for emergency situations.

**Bypass Protocol:**
1. Main Claude identifies emergency situation requiring direct tool usage
2. Requests user approval in conversation with context
3. User approves and specifies duration (typically 30 minutes)
4. Bypass logged with timestamp and duration
5. Bypass automatically expires after specified time
6. Session notes explain why bypass was needed

**Valid emergency reasons:**
- Production data corruption requiring urgent investigation
- Critical security vulnerability needing immediate analysis
- System completely broken, blocking all other work
- User explicitly requests Main Claude handle directly

**Not valid:**
- "This will be faster if I do it directly"
- "Just need to quickly check something"
- Routine work that should be delegated

---

## Active & Historical Bypasses

| Granted | Tool | Reason | Duration | Status |
|---------|------|--------|----------|--------|

*No bypasses yet - hook installed 2026-01-31*

---

## Bypass Usage Notes

When a bypass is used:
1. Update this file with the approved bypass entry
2. Tool invocation will be logged to this file
3. Bypass expires after duration
4. Any tool use after expiration is flagged as violation
