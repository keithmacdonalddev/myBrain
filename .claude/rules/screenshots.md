---
paths: ["**/*"]
---

## Quick Reference
- Use folder-based organization: verify/, review/, debug/, temp/, reference/
- Naming: `[date]-[description].png` within folders
- temp/ and debug/ are auto-cleanup candidates
- verify/ cleaned after phase completion
- review/ and reference/ kept long-term

---

# Screenshot Naming Convention

Screenshots should be organized by purpose to enable automatic cleanup decisions.

## Folder Structure

```
.claude/design/screenshots/
├── verify/          # Phase verification evidence
│   └── phase8/      # Subfolder per phase
├── review/          # Design reviews (keep long-term)
├── debug/           # Troubleshooting (delete after fix)
├── temp/            # Quick captures (delete after session)
└── reference/       # Documentation (keep permanently)
```

## Naming Format

Within folders, use: `[YYYY-MM-DD]-[description].png`

Examples:
- `verify/phase8/2026-01-31-dashboard-dark.png`
- `debug/2026-01-31-button-overflow.png`
- `review/2026-01-31-v2-sidebar-final.png`
- `reference/admin-panel-overview.png`

## Retention Policy

| Folder | Retention | Auto-cleanup |
|--------|-----------|--------------|
| temp/ | Same session | Yes - delete after session |
| debug/ | Until fix verified | Yes - delete after fix confirmed |
| verify/ | Until phase complete | Yes - delete after phase completion |
| review/ | Long-term | No - keep for design history |
| reference/ | Permanent | No - keep for documentation |

## When Taking Screenshots

1. **Verification testing** → `verify/[phase]/`
2. **Bug investigation** → `debug/`
3. **Design review/approval** → `review/`
4. **Quick check (throwaway)** → `temp/`
5. **Documentation/reference** → `reference/`

## Skills That Use Screenshots

Update these skills to follow this convention:
- `/smoke-test` - Should use `verify/smoke/`
- `/design-review` - Should use `review/`
- Verification agents - Should use `verify/[phase]/`

## Cleanup Triggers

- End of session: Delete all `temp/`
- Bug fixed: Delete related `debug/` files
- Phase complete: Archive or delete `verify/[phase]/`
- Never auto-delete: `review/`, `reference/`
