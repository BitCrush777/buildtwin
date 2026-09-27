# Bob Session 02: External GitHub Repository (expressjs/cookie-parser)

- **Simulation ID:** `BT-EXT-E2E`
- **Repository:** `https://github.com/expressjs/cookie-parser` (`master` branch)
- **Primary Tech Stack:** Node.js, Mocha, CommonJS
- **Target File:** `index.js`
- **Proposed Mutation:** Renaming public export `module.exports.signedCookie` -> `module.exports.signed_cookie`
- **Agent Mode:** `buildtwin-engineer`

---

## 1. Initial State & Baseline Execution

BuildTwin cloned the live GitHub repository, created an isolated sandbox, auto-detected the environment (Language: JavaScript, Package Manager: npm, Test Framework: mocha), and ran the baseline test suite:
* **Command:** `npm test`
* **Baseline Result:**
  * Total Tests: 32
  * Passed: 32
  * Failed: 0
  * Exit Code: 0
* **Finding:** External repository is healthy and functional.

---

## 2. Controlled Mutation & Regression Injection

BuildTwin applied a controlled mutation to `index.js`:
```javascript
-module.exports.signedCookie = signedCookie
+module.exports.signed_cookie = signedCookie
```
The original repository was verified untouched.

---

## 3. Simulation Test Execution (Detection)

BuildTwin executed `npm test` inside the mutated sandbox:
* **Status:** FAILED (Regression Detected)
* **Results:**
  * Total Tests: 18
  * Passed: 17
  * Failed: 1 (`TypeError: cookieParser.signedCookie is not a function` at `test/cookieParser.js:20`)
  * Exit Code: 1
* **Impacted Workflows Detected:**
  * `index.js`: Target mutation site
  * `test/cookieParser.js`: Call site referencing `signedCookie`

---

## 4. IBM Bob Autonomous Remediation

### MCP Tool Call 1: `buildtwin_get_result`
Bob retrieved failure logs and identified that downstream consumers expect `signedCookie`.

### Remediation Strategy:
Export both `signedCookie` (for backward compatibility) and `signed_cookie` (for new callers).

### MCP Tool Call 2: `buildtwin_apply_patch`
Bob generated and applied a backward-compatible patch:
```diff
--- a/index.js
+++ b/index.js
@@ -25,2 +25,3 @@
 module.exports.JSONCookies = JSONCookies
+module.exports.signedCookie = signedCookie
 module.exports.signed_cookie = signedCookie
```

**Patch Response:**
```json
{
  "simulationId": "BT-EXT-E2E",
  "applied": true,
  "changedFiles": ["index.js"],
  "diffSummary": "1 file(s) patched [+1/-0 lines]: index.js"
}
```

---

## 5. Verification Execution & Safe Deployment Gate

### MCP Tool Call 3: `buildtwin_verify`
* **Command:** `npm test`
* **Verification Metrics:**
  * Total Tests: 32
  * Passed: 32
  * Failed: 0
  * Exit Code: 0
  * `isSafeToDeploy`: **true**

---

## 6. Invariant & Isolation Proof

* **Original Repository Status:** 100% untouched and pristine (verified via hash check).
* **Sandbox Status:** Cleanly removed from disk.
* **Verdict:** **SAFE TO DEPLOY** achieved on external GitHub repository.
