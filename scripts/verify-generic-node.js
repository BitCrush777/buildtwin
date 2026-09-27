/**
 * BuildTwin Generic Node.js Microservice Verification Test
 * Tests repository-agnostic simulation, impact analysis, patch application, and verification
 * on a non-ShopLite repository fixture (fixtures/node-npm-service).
 */

const { simulationService } = require("../lib/simulation/simulation-service");
const { SandboxService } = require("../lib/simulation/sandbox-service");
const { StateStore } = require("../lib/simulation/state-store");
const fs = require("fs");
const path = require("path");

async function runGenericNodeTest() {
  console.log("================================================================================");
  console.log("       BUILDTWIN REPOSITORY-AGNOSTIC VERIFICATION TEST: NODE MICROSERVICE       ");
  console.log("================================================================================");

  console.log("\n>>> Step 1: Initiating simulation on 'fixture:node-npm-service'...");
  const simRequest = {
    repoUrl: "fixture:node-npm-service",
    branch: "main",
    filePath: "src/pricing.js",
    oldValue: "function calculateDiscount",
    newValue: "function applyDiscount",
    // Notice testCommand is left undefined to test auto-detection!
  };

  const simResponse = await simulationService.runRealSimulation(simRequest);

  console.log(`\n>>> Step 2: Validating Auto-Detected Profile & Simulation Metadata:`);
  console.log(` - Simulation ID: ${simResponse.simulationId}`);
  console.log(` - Status: ${simResponse.status}`);
  console.log(` - Sandbox Path: ${simResponse.sandboxPath}`);
  console.log(` - Detected Language: ${simResponse.profile?.primaryLanguage}`);
  console.log(` - Detected Package Manager: ${simResponse.profile?.packageManager}`);
  console.log(` - Detected Test Framework: ${simResponse.profile?.testFramework}`);
  console.log(` - Detected Test Command: ${simResponse.profile?.testCommand}`);

  if (simResponse.profile?.packageManager !== "npm") {
    throw new Error(`Expected packageManager 'npm', got '${simResponse.profile?.packageManager}'`);
  }
  if (!simResponse.profile?.testCommand.includes("test")) {
    throw new Error(`Expected testCommand to include 'test', got '${simResponse.profile?.testCommand}'`);
  }

  console.log(`\n>>> Step 3: Validating Baseline & Regression Metrics:`);
  console.log(` - Baseline Total: ${simResponse.baseline?.total}`);
  console.log(` - Baseline Passed: ${simResponse.baseline?.passed}`);
  console.log(` - Baseline Exit Code: ${simResponse.baseline?.exitCode}`);
  console.log(` - Simulation Total: ${simResponse.simulation?.total}`);
  console.log(` - Simulation Passed: ${simResponse.simulation?.passed}`);
  console.log(` - Simulation Failed: ${simResponse.simulation?.failed}`);
  console.log(` - Simulation Exit Code: ${simResponse.simulation?.exitCode}`);

  if (simResponse.baseline?.exitCode !== 0) {
    throw new Error(`Expected baseline exit code 0, got ${simResponse.baseline?.exitCode}`);
  }
  if (simResponse.baseline?.passed !== 4) {
    throw new Error(`Expected 4 baseline tests to pass, got ${simResponse.baseline?.passed}`);
  }
  if (simResponse.simulation?.exitCode !== 1 || simResponse.simulation?.failed < 1) {
    throw new Error(`Expected simulation test failure, got exitCode=${simResponse.simulation?.exitCode}, failed=${simResponse.simulation?.failed}`);
  }

  console.log(`\n>>> Step 4: Validating Dynamic Impact Analysis:`);
  const impactedWorkflows = simResponse.impactedWorkflows || [];
  console.log(` - Impacted Workflows Count: ${impactedWorkflows.length}`);
  for (const wf of impactedWorkflows) {
    console.log(`   * [${wf.state}] ${wf.name} (${wf.filePath}:${wf.line}) -> ${wf.observedFailure}`);
  }

  const hasTestPricingImpact = impactedWorkflows.some((w) => w.filePath.includes("pricing"));
  if (!hasTestPricingImpact) {
    throw new Error("Expected impactedWorkflows to include reference to pricing");
  }

  console.log(`\n>>> Step 5: Applying Backward-Compatible Patch via Bob Remediation...`);
  const patchDiff = [
    "--- a/src/pricing.js",
    "+++ b/src/pricing.js",
    "@@ -12,4 +12,5 @@",
    " module.exports = {",
    "   applyDiscount,",
    "+  calculateDiscount: applyDiscount,",
    "   calculateTax,",
    " };",
  ].join("\n");

  const patchResult = await simulationService.applyPatch(simResponse.simulationId, patchDiff);
  console.log(` - Patch Applied: ${patchResult.applied}`);
  console.log(` - Changed Files: ${patchResult.changedFiles.join(", ")}`);
  if (!patchResult.applied) {
    throw new Error("Patch failed to apply inside sandbox!");
  }

  console.log(`\n>>> Step 6: Verifying Patch Inside Isolated Sandbox...`);
  const verifyResult = await simulationService.verifySimulation(simResponse.simulationId);
  console.log(` - Verification Exit Code: ${verifyResult.exitCode}`);
  console.log(` - Tests Passed: ${verifyResult.testCounts?.passed}/${verifyResult.testCounts?.total}`);
  console.log(` - Is Safe To Deploy: ${verifyResult.isSafeToDeploy}`);

  if (!verifyResult.isSafeToDeploy) {
    throw new Error("Verification did not pass: isSafeToDeploy is false!");
  }
  if (verifyResult.testCounts?.passed !== 4) {
    throw new Error(`Expected 4 tests to pass after patch, got ${verifyResult.testCounts?.passed}`);
  }

  console.log(`\n>>> Step 7: Cleaning up sandbox...`);
  await SandboxService.cleanupSandbox(simResponse.sandboxPath);
  console.log(` - Sandbox cleaned successfully.`);

  console.log("\n================================================================================");
  console.log("       SUCCESS: REPOSITORY-AGNOSTIC GENERIC WORKFLOW FULLY VERIFIED!            ");
  console.log("================================================================================");
}

runGenericNodeTest().catch((err) => {
  console.error("\n❌ TEST FAILED:", err);
  process.exit(1);
});
