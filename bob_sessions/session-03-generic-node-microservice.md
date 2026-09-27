# Bob Session 03: Generic Node.js Microservice (node:test)

- **Simulation ID:** `BT-1051`
- **Repository:** `fixtures/node-npm-service`
- **Primary Tech Stack:** Node.js 22, CommonJS, native `node:test` runner
- **Target File:** `src/pricing.js`
- **Proposed Mutation:** `function calculateDiscount` -> `function applyDiscount`
- **Agent Mode:** `buildtwin-engineer`

---

## 1. Initial State & Baseline Execution

BuildTwin auto-detected:
* Language: JavaScript
* Package Manager: npm
* Test Framework: `node:test` (zero external dependencies)
* Baseline Execution:
  * Total Tests: 4
  * Passed: 4
  * Failed: 0
  * Exit Code: 0

---

## 2. Controlled Mutation & Regression

Mutation applied inside sandbox:
```javascript
-function calculateDiscount(price, discountPercent) {
+function applyDiscount(price, discountPercent) {
```
Simulation execution `npm test`:
* Status: FAILED (Exit Code: 1)
* Regression: `ReferenceError: calculateDiscount is not defined`
* Impacted Files: `src/pricing.js` and `test/pricing.test.js`

---

## 3. IBM Bob Autonomous Remediation

Bob analyzed the symbol breakage and applied a backward-compatible alias export:
```diff
--- a/src/pricing.js
+++ b/src/pricing.js
@@ -12,4 +12,5 @@
 module.exports = {
   applyDiscount,
+  calculateDiscount: applyDiscount,
   calculateTax,
 };
```

---

## 4. Verification Execution & Safe Deployment

* Verification Command: `node --test`
* Verification Metrics:
  * Total Tests: 4
  * Passed: 4
  * Failed: 0
  * Exit Code: 0
  * `isSafeToDeploy`: **true**
* Sandbox cleanup: Cleanly deleted from temporary storage.
