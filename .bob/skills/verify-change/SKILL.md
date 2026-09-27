---
name: verify-change
title: BuildTwin Verification
description: Execute BuildTwin test verification inside the isolated sandbox to inspect test outputs and validate that regressions have been completely resolved before certifying safe deployment.
---

# BuildTwin Verification

## Purpose
Rigorously verify that a remediation patch actually resolves the detected regression in an isolated sandbox environment.

## Operational Directives
1. **Never claim success from reasoning alone.** Generative AI assertions or static code inspection without automated verification cannot certify deployment safety.
2. **Run BuildTwin verification:**
   - Invoke the BuildTwin verification tool (`buildtwin_verify`) or run the approved sandbox test command suite (`npm test`).
   - Execute tests in the isolated ephemeral sandbox directory.
3. **Inspect test results:**
   - Parse exit codes, stdout, and stderr logs.
   - Count executed, passed, and failed test cases.
4. **Inspect failures:**
   - If failures persist, extract the exact stack trace, failing file path, line number, and error message.
   - Propose secondary remedial adjustments to address remaining breakages.
5. **Report pass/fail:**
   - Output an objective verification summary detailing duration, total passed tests, and resolution status.
   - Only declare **SAFE TO DEPLOY** when 100% of affected workflows pass cleanly with exit code 0.
