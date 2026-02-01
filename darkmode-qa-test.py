#!/usr/bin/env python3
"""
Dark Mode QA Testing Tool
Systematic testing of dark mode across all pages
Reports contrast issues and visual problems
"""

import json
import subprocess
import os
from datetime import datetime
from pathlib import Path

# Configuration
TIMESTAMP = "2026-01-31"
PROJECT_ROOT = Path("C:/Users/NewAdmin/Desktop/PROJECTS/myBrain")
REPORT_DIR = PROJECT_ROOT / ".claude/reports"
SCREENSHOT_DIR = PROJECT_ROOT / ".claude/design/screenshots/qa/darkmode"
SESSION = "darkmode-qa"

# Design System - Dark Mode Colors
DESIGN_SYSTEM = {
    "text": {
        "primary": {"value": "#E5E5E5", "contrast": "12.6:1", "min_required": "4.5:1"},
        "secondary": {"value": "#A0A0A0", "contrast": "6.3:1", "min_required": "4.5:1"},
        "tertiary": {"value": "#B0B0B0", "contrast": "7:1", "min_required": "4.5:1"},
    },
    "backgrounds": {
        "base": "#121212",
        "primary": "#121212",
        "secondary": "#1A1A1A",
        "surface": "#1E1E1E",
        "tertiary": "#242424",
    },
    "borders": {
        "separator": "#2A2A2A",
        "default": "#383838",
    },
    "accents": {
        "blue": "#007AFF",
        "green": "#34C759",
        "orange": "#FF9500",
        "red": "#FF3B30",  # TRUE ERRORS ONLY
    }
}

# Pages to test
PAGES_TO_TEST = [
    ("Dashboard", "/"),
    ("Tasks", "/tasks"),
    ("Notes", "/notes"),
    ("Projects", "/projects"),
    ("Calendar", "/calendar"),
    ("Settings", "/settings"),
    ("Profile", "/profile"),
    ("Inbox", "/inbox"),
    ("Today", "/today"),
]

class DarkModeQATest:
    def __init__(self):
        self.issues = []
        self.screenshots = []
        self.pages_tested = 0
        self.start_time = datetime.now()

    def log_issue(self, page, component, issue, severity, current_colors, expected_colors):
        """Log a dark mode issue"""
        self.issues.append({
            "page": page,
            "component": component,
            "issue": issue,
            "severity": severity,
            "current_colors": current_colors,
            "expected_colors": expected_colors,
            "timestamp": datetime.now().isoformat(),
        })

    def log_screenshot(self, page, component, filename):
        """Log a screenshot taken"""
        self.screenshots.append({
            "page": page,
            "component": component,
            "filename": filename,
            "timestamp": datetime.now().isoformat(),
        })

    def generate_report(self):
        """Generate the QA report"""
        report = []
        report.append("# Dark Mode QA Testing Report")
        report.append(f"\n**Date:** {TIMESTAMP}")
        report.append(f"**Session:** {SESSION}")
        report.append(f"**Total Issues Found:** {len(self.issues)}")
        report.append(f"**Pages Tested:** {self.pages_tested}")
        report.append(f"**Duration:** {datetime.now() - self.start_time}")

        # Summary by severity
        critical = len([i for i in self.issues if i['severity'] == 'CRITICAL'])
        serious = len([i for i in self.issues if i['severity'] == 'SERIOUS'])
        minor = len([i for i in self.issues if i['severity'] == 'MINOR'])

        report.append(f"\n## Summary by Severity")
        report.append(f"- **CRITICAL:** {critical}")
        report.append(f"- **SERIOUS:** {serious}")
        report.append(f"- **MINOR:** {minor}")

        # Issues table
        report.append("\n## All Issues")
        report.append("\n| Page | Component | Issue | Severity | Current Colors | Expected Colors |")
        report.append("|------|-----------|-------|----------|----------------|-----------------|")

        for issue in sorted(self.issues, key=lambda x: {'CRITICAL': 0, 'SERIOUS': 1, 'MINOR': 2}.get(x['severity'], 3)):
            report.append(f"| {issue['page']} | {issue['component']} | {issue['issue']} | {issue['severity']} | {issue['current_colors']} | {issue['expected_colors']} |")

        # Screenshots
        report.append("\n## Screenshots Captured")
        report.append(f"Total: {len(self.screenshots)}")
        report.append("\n### By Page")

        pages = {}
        for ss in self.screenshots:
            page = ss['page']
            if page not in pages:
                pages[page] = []
            pages[page].append(ss)

        for page in sorted(pages.keys()):
            report.append(f"\n#### {page}")
            for ss in pages[page]:
                report.append(f"- {ss['component']}: `{ss['filename']}`")

        # Design System Reference
        report.append("\n## Design System Reference (Dark Mode)")
        report.append("\n### Text Colors")
        for color, info in DESIGN_SYSTEM['text'].items():
            report.append(f"- `{color}`: {info['value']} (Contrast: {info['contrast']}, Min Required: {info['min_required']})")

        report.append("\n### Backgrounds")
        for bg_type, value in DESIGN_SYSTEM['backgrounds'].items():
            report.append(f"- `{bg_type}`: {value}")

        report.append("\n### Accent Colors")
        for color, value in DESIGN_SYSTEM['accents'].items():
            report.append(f"- `{color}`: {value}")

        report.append("\n## Test Configuration")
        report.append(f"- Account: claude-test-admin@mybrain.test")
        report.append(f"- Session: --session {SESSION}")
        report.append(f"- Pages: {self.pages_tested}/{len(PAGES_TO_TEST)}")
        report.append(f"- Report Time: {datetime.now().isoformat()}")

        return "\n".join(report)

def main():
    """Main test execution"""
    print("=" * 60)
    print("DARK MODE QA TESTING")
    print("=" * 60)
    print(f"Timestamp: {TIMESTAMP}")
    print(f"Session: {SESSION}")
    print(f"Pages to test: {len(PAGES_TO_TEST)}")
    print()

    # Create test infrastructure
    SCREENSHOT_DIR.mkdir(parents=True, exist_ok=True)
    REPORT_DIR.mkdir(parents=True, exist_ok=True)

    # Initialize test
    test = DarkModeQATest()

    # Instructions for manual agent testing
    instructions = f"""
DARK MODE QA TESTING - READY TO EXECUTE

Setup Complete:
- Report directory: {REPORT_DIR}
- Screenshot directory: {SCREENSHOT_DIR}
- Session: --session {SESSION}
- Pages to test: {len(PAGES_TO_TEST)}

Pages:
1. Dashboard (/)
2. Tasks (/tasks)
3. Notes (/notes)
4. Projects (/projects)
5. Calendar (/calendar)
6. Settings (/settings)
7. Profile (/profile)
8. Inbox (/inbox)
9. Today (/today)
10. Modals/Dropdowns/Tooltips

Testing Agent Instructions:
- Use agent-browser --session {SESSION}
- Login: claude-test-admin@mybrain.test / ClaudeTest123
- Enable dark mode
- For each page:
  1. Take screenshot
  2. Check text contrast (expected: {DESIGN_SYSTEM['text']['primary']['value']} text on {DESIGN_SYSTEM['backgrounds']['secondary']} background)
  3. Verify background colors match design system
  4. Check interactive elements
  5. Document any issues
- Save screenshots to: {SCREENSHOT_DIR}
- Full context available at: {REPORT_DIR}/darkmode-qa-agent-context-2026-01-31.md

This script is ready. Proceed with agent-based testing.
"""

    print(instructions)

    # Save test configuration
    config_file = REPORT_DIR / "darkmode-qa-config-2026-01-31.json"
    config = {
        "timestamp": TIMESTAMP,
        "session": SESSION,
        "pages": PAGES_TO_TEST,
        "design_system": DESIGN_SYSTEM,
        "report_dir": str(REPORT_DIR),
        "screenshot_dir": str(SCREENSHOT_DIR),
    }

    with open(config_file, 'w') as f:
        json.dump(config, f, indent=2)

    print(f"\nConfiguration saved to: {config_file}")
    print("\nReady for agent-based dark mode testing.")
    print("=" * 60)

if __name__ == "__main__":
    main()
