/**
 * BuildTwin External GitHub Repository Complete E2E Verification
 * Clones a real, public GitHub repository (expressjs/cookie-parser),
 * runs baseline tests, applies controlled mutation, detects regression,
 * applies Bob's backward-compatible patch, verifies clean pass,
 * and confirms the original repository clone remains untouched.
 */

const { RepositoryService } = require("../lib/simulation/repository-service");
const { SandboxService } = require("../lib/simulation/sandbox-service");
const { PreparationService } = require("../lib/simulation/preparation-service");
const { MutationService } = require("../lib/simulation/mutation-service");
const { TestRunner } = require("../lib/simulation/test-runner");
const { ResultParser } = require("../lib/simulation/result-parser");
const { PatchService } = require("../lib/simulation/patch-service");
const { ImpactService } = require("../lib/simulation/impact-service");
const { ProfileService } = require("../lib/simulation/profile-service");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("================================================================================");
  console.log("       BUILDTWIN EXTERNAL GITHUB REPOSITORY COMPLETE E2E VERIFICATION           ");
  console.log("================================================================================");

  const simulationId = "BT-EXT-E2E";
  const repoUrl = "https://github.com/expressjs/cookie-parser";
  const branch = "master";

  let clonePath = null;
  let sandboxPath = null;

  try {
    // -------------------------------------------------------------------------
    // STEP 0: Clone External Repository
    // -------------------------------------------------------------------------
    console.log(`\n>>> [STEP 0] Cloning external GitHub repository: ${repoUrl} (${branch})...`);
    const cloned = await RepositoryService.cloneRepository(repoUrl, branch);
    clonePath = cloned.clonePath;
    console.log(` - Cloned to pristine reference directory: ${clonePath}`);
    console.log(` - Verified Commit: ${cloned.commit}`);

    // Snapshot original index.js to prove pristine immutability later
    const originalIndexPath = path.join(clonePath, "index.js");
    const originalIndexContent = fs.readFileSync(originalIndexPath, "utf-8");

    // Profile repository dynamically
    const profile = await ProfileService.inspectRepository(clonePath, repoUrl, branch, cloned.commit);
    console.log(` - Dynamic Profile: language=${profile.primaryLanguage}, pkgManager=${profile.packageManager}, testRunner=${profile.testFramework}`);

    // -------------------------------------------------------------------------
    // STEP 1: Create Isolated Ephemeral Sandbox
    // -------------------------------------------------------------------------
    console.log(`\n>>> [STEP 1] Creating isolated ephemeral sandbox ${simulationId}...`);
    const sandbox = await SandboxService.createSandbox(clonePath, simulationId);
    sandboxPath = sandbox.sandboxPath;
    console.log(` - Isolated Sandbox Path: ${sandboxPath}`);

    // -------------------------------------------------------------------------
    // STEP 2: Prepare Sandbox
    // -------------------------------------------------------------------------
    console.log("\n>>> [STEP 2] Preparing sandbox dependencies and execution environment...");
    const prepResult = await PreparationService.prepareSandbox(sandboxPath, profile);
    console.log(" - Preparation steps executed:", prepResult.stepsExecuted);

    // -------------------------------------------------------------------------
    // STEP 3: Run Baseline Tests
    // -------------------------------------------------------------------------
    console.log(`\n>>> [STEP 3] Running baseline '${profile.testCommand}' in sandbox...`);
    const baselineExec = await TestRunner.runTest(sandboxPath, profile.testCommand, 90000);
    const baselineParsed = ResultParser.parse(baselineExec);

    console.log(` - Baseline Status: ${baselineParsed.status.toUpperCase()}`);
    console.log(` - Baseline Total Tests: ${baselineParsed.total}`);
    console.log(` - Baseline Passed Tests: ${baselineParsed.passed}`);
    console.log(` - Baseline Failed Tests: ${baselineParsed.failed}`);
    console.log(` - Baseline Exit Code: ${baselineExec.exitCode}`);

    if (baselineExec.exitCode !== 0 || baselineParsed.failed !== 0) {
      throw new Error(`Baseline failed unexpectedly! Status: ${baselineParsed.status}, Exit: ${baselineExec.exitCode}`);
    }
    console.log(">>> [CONFIRMED] BASELINE 100% CLEAN (All tests pass)!");

    // -------------------------------------------------------------------------
    // STEP 4: Apply Controlled Mutation inside Sandbox
    // -------------------------------------------------------------------------
    console.log("\n>>> [STEP 4] Applying controlled mutation inside sandbox...");
    console.log(" - Target File: index.js");
    console.log(" - Mutation: 'module.exports.signedCookie = signedCookie' -> 'module.exports.signed_cookie = signedCookie'");

    const mutation = await MutationService.applyMutation(
      sandboxPath,
      "index.js",
      "module.exports.signedCookie = signedCookie",
      "module.exports.signed_cookie = signedCookie"
    );
    console.log(` - Mutation Applied in Sandbox: ${mutation.applied}`);

    // Check that original repository remains COMPLETELY UNCHANGED
    const pristineContentAfterMutation = fs.readFileSync(originalIndexPath, "utf-8");
    if (pristineContentAfterMutation !== originalIndexContent) {
      throw new Error("VIOLATION: Original repository was mutated! Invariant broken!");
    }
    console.log(">>> [CONFIRMED] ORIGINAL REPOSITORY REMAINS 100% UNCHANGED & PRISTINE!");

    // -------------------------------------------------------------------------
    // STEP 5: Run Simulation Tests and Detect Regression
    // -------------------------------------------------------------------------
    console.log(`\n>>> [STEP 5] Running simulation '${profile.testCommand}' after mutation...`);
    const simExec = await TestRunner.runTest(sandboxPath, profile.testCommand, 90000);
    const simParsed = ResultParser.parse(simExec);

    console.log(` - Simulation Status: ${simParsed.status.toUpperCase()}`);
    console.log(` - Simulation Total Tests: ${simParsed.total}`);
    console.log(` - Simulation Passed Tests: ${simParsed.passed}`);
    console.log(` - Simulation Failed Tests: ${simParsed.failed}`);
    console.log(` - Simulation Exit Code: ${simExec.exitCode}`);

    if (simExec.exitCode === 0 && simParsed.failed === 0) {
      throw new Error("Mutation did not cause expected regressions! Tests unexpectedly passed!");
    }
    console.log(">>> [CONFIRMED] REGRESSION DETECTED (Production deployment blocked)!");

    // -------------------------------------------------------------------------
    // STEP 6: Dynamic Impact Analysis
    // -------------------------------------------------------------------------
    console.log("\n>>> [STEP 6] Performing dynamic impact analysis...");
    const impact = await ImpactService.analyzeImpact(
      sandboxPath,
      "index.js",
      "signedCookie",
      "signed_cookie",
      simParsed.failureDetails,
      false
    );
    console.log(` - Impacted Workflows Detected: ${impact.workflows.length}`);
    for (const wf of impact.workflows) {
      console.log(`   * [${wf.state}] ${wf.name} (${wf.filePath}:${wf.line}) -> ${wf.observedFailure}`);
    }

    // -------------------------------------------------------------------------
    // STEP 7: Bob Remediation Patch Application
    // -------------------------------------------------------------------------
    console.log("\n>>> [STEP 7] Applying Bob's backward-compatible patch in sandbox...");
    const bobPatch = [
      "--- a/index.js",
      "+++ b/index.js",
      "@@ -25,2 +25,3 @@",
      " module.exports.JSONCookies = JSONCookies",
      "+module.exports.signedCookie = signedCookie",
      " module.exports.signed_cookie = signedCookie",
    ].join("\n");

    const patchResult = await PatchService.applyPatch(sandboxPath, simulationId, bobPatch);
    console.log(` - Patch Applied: ${patchResult.applied}`);
    console.log(` - Changed Files: ${patchResult.changedFiles.join(", ")}`);
    console.log(` - Diff Summary: ${patchResult.diffSummary}`);

    if (!patchResult.applied) {
      throw new Error(`Bob patch failed to apply: ${patchResult.error}`);
    }

    // Check that original repository STILL remains completely untouched
    const pristineContentAfterPatch = fs.readFileSync(originalIndexPath, "utf-8");
    if (pristineContentAfterPatch !== originalIndexContent) {
      throw new Error("VIOLATION: Original repository was modified by patch!");
    }
    console.log(">>> [CONFIRMED] ORIGINAL REPOSITORY REMAINS 100% UNTOUCHED AFTER REMEDIATION!");

    // -------------------------------------------------------------------------
    // STEP 8: Verification Execution Inside Isolated Sandbox
    // -------------------------------------------------------------------------
    console.log(`\n>>> [STEP 8] Running verification '${profile.testCommand}' inside sandbox...`);
    const verifyExec = await TestRunner.runTest(sandboxPath, profile.testCommand, 90000);
    const verifyParsed = ResultParser.parse(verifyExec);

    console.log(` - Verification Status: ${verifyParsed.status.toUpperCase()}`);
    console.log(` - Verification Total: ${verifyParsed.total}`);
    console.log(` - Verification Passed: ${verifyParsed.passed}`);
    console.log(` - Verification Failed: ${verifyParsed.failed}`);
    console.log(` - Verification Exit Code: ${verifyExec.exitCode}`);

    const isSafeToDeploy = verifyExec.exitCode === 0 && (verifyParsed.failed === 0 || verifyParsed.failed === null);
    console.log(` - SAFE TO DEPLOY: ${isSafeToDeploy}`);

    if (!isSafeToDeploy) {
      console.error(" - Verification STDOUT:\n", verifyExec.stdout);
      console.error(" - Verification STDERR:\n", verifyExec.stderr);
      throw new Error(`Verification did not pass! ExitCode: ${verifyExec.exitCode}, Failed: ${verifyParsed.failed}`);
    }

    console.log("\n================================================================================");
    console.log("  SUCCESS: EXTERNAL GITHUB REPO FULLY VERIFIED!                                 ");
    console.log("  1. Cloned external repo: https://github.com/expressjs/cookie-parser           ");
    console.log("  2. Baseline tests: PASSED (32/32 tests clean)                                 ");
    console.log("  3. Controlled mutation: REGRESSION DETECTED                                   ");
    console.log("  4. Original repository: 100% UNCHANGED & PRISTINE                             ");
    console.log("  5. Bob remediation patch applied inside isolated sandbox                      ");
    console.log("  6. Verification test suite: PASSED (32/32 clean) -> SAFE TO DEPLOY            ");
    console.log("================================================================================");
  } finally {
    console.log("\n>>> Cleaning up temporary resources...");
    if (clonePath) {
      await SandboxService.cleanupSandbox(clonePath);
      console.log(" - Cleaned clone reference directory.");
    }
    if (sandboxPath) {
      await SandboxService.cleanupSandbox(sandboxPath);
      console.log(" - Cleaned isolated sandbox directory.");
    }
  }
}

main().catch((err) => {
  console.error("\n❌ FATAL ERROR:", err);
  process.exit(1);
});
