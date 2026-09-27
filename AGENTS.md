# BuildTwin Agent Guidelines & Operating Rules

These operational guidelines govern all AI agents, including IBM Bob, acting within or alongside the BuildTwin platform.

---

## 1. Core Platform Invariant
- **BuildTwin is a safe software-change simulation platform.**
- The primary purpose is to test proposed repository mutations inside isolated, ephemeral environments prior to touching real branches or production services.

---

## 2. Sandbox Isolation & Immutability
- **Never modify the original repository during simulation.**
- Clones of original repositories are pristine references. All mutations, experimental patches, and remediation attempts **must happen exclusively inside an isolated sandbox**.
- The production database, target repository, and remote branches must remain completely air-gapped and untouched during all simulation and remediation phases.

---

## 3. Remediation & Code Changes
- **Analyze first, plan before modifying.** Always trace affected call sites, consumer interfaces, and downstream services before applying any patch.
- **Modify only files relevant to the proposed change.** Do not reformat, refactor, or edit unrelated files or directories.
- **Preserve existing application behavior.** Never change functional semantics unless explicitly dictated by the proposed change.
- **Prefer backward-compatible changes.** When modifying models, schemas, or public APIs, provide compatible accessors, fallback bridges, or deprecation shims to prevent breaking consumer workflows.

---

## 4. Verification & Safe Deployment Rules
- **Never claim a fix is successful without running verification.** Reasoning or generative code output alone does NOT prove that a regression is resolved.
- **After remediation, run the affected test suite.** The full test suite must be executed inside the sandbox to validate that all invariants hold true.
- **Use BuildTwin verification before declaring SAFE TO DEPLOY.** Only when the BuildTwin test runner passes cleanly with exit code 0 and zero regressions may a change be deemed safe for deployment.
