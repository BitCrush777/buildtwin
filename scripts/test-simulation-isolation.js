const { simulationService } = require("../lib/simulation/simulation-service");
const { StateStore } = require("../lib/simulation/state-store");
const fs = require("fs");
const path = require("path");

async function runIsolationAndErrorClassificationTest() {
  console.log("================================================================================");
  console.log("   BUILDTWIN CONCURRENCY ISOLATION & ERROR CLASSIFICATION REGRESSION TEST       ");
  console.log("================================================================================");

  // -------------------------------------------------------------------------
  // TEST 1: Simultaneous Execution of Two Distinct Simulations
  // -------------------------------------------------------------------------
  console.log("\n>>> [TEST 1] Initiating 2 simultaneous simulations concurrently...");

  const reqA = {
    repoUrl: "local-fixture",
    branch: "main",
    filePath: "src/user.js",
    oldValue: 'email: "developer@buildtwin.io"',
    newValue: 'email_address: "developer@buildtwin.io"',
    testCommand: "npm test",
  };

  const reqB = {
    repoUrl: "fixture:node-npm-service",
    branch: "feature/pricing",
    filePath: "src/pricing.js",
    oldValue: "function calculateDiscount",
    newValue: "function applyDiscount",
    testCommand: "npm test",
  };

  const startTime = Date.now();
  const [resA, resB] = await Promise.all([
    simulationService.runRealSimulation(reqA),
    simulationService.runRealSimulation(reqB),
  ]);
  const duration = Date.now() - startTime;

  console.log(`[TEST 1] Both simulations completed in parallel in ${duration}ms.`);
  console.log(` - Simulation A: ID = ${resA.simulationId}, Repo = ${resA.repository.name}, File = ${resA.mutation.filePath}`);
  console.log(` - Simulation B: ID = ${resB.simulationId}, Repo = ${resB.repository.name}, File = ${resB.mutation.filePath}`);

  // Invariant 1: Distinct simulation IDs
  if (resA.simulationId === resB.simulationId) {
    throw new Error(`CRITICAL INVARIANT VIOLATION: Duplicate simulation IDs generated! (${resA.simulationId})`);
  }

  // Invariant 2: Repositories and target files must NOT leak
  if (resA.repository.name === resB.repository.name) {
    throw new Error(`CRITICAL INVARIANT VIOLATION: Repository names leaked between simulations!`);
  }
  if (resA.mutation.filePath !== "src/user.js") {
    throw new Error(`CRITICAL INVARIANT VIOLATION: Simulation A file corrupted: ${resA.mutation.filePath}`);
  }
  if (resB.mutation.filePath !== "src/pricing.js") {
    throw new Error(`CRITICAL INVARIANT VIOLATION: Simulation B file corrupted: ${resB.mutation.filePath}`);
  }

  // Invariant 3: Distinct sandbox paths
  if (!resA.sandboxPath || !resB.sandboxPath || resA.sandboxPath === resB.sandboxPath) {
    throw new Error(`CRITICAL INVARIANT VIOLATION: Sandboxes collided! Path A: ${resA.sandboxPath}, Path B: ${resB.sandboxPath}`);
  }

  // Invariant 4: On-disk state isolation
  const statePathA = StateStore.getStatePath(resA.simulationId);
  const statePathB = StateStore.getStatePath(resB.simulationId);

  const diskA = JSON.parse(fs.readFileSync(statePathA, "utf-8"));
  const diskB = JSON.parse(fs.readFileSync(statePathB, "utf-8"));

  if (diskA.simulationId !== resA.simulationId || diskA.mutation.filePath !== "src/user.js") {
    throw new Error(`CRITICAL: Disk state A corrupted by cross-talk!`);
  }
  if (diskB.simulationId !== resB.simulationId || diskB.mutation.filePath !== "src/pricing.js") {
    throw new Error(`CRITICAL: Disk state B corrupted by cross-talk!`);
  }

  // Invariant 5: simulationService.getById resolution
  const uiSimA = simulationService.getById(resA.simulationId);
  const uiSimB = simulationService.getById(resB.simulationId);

  if (!uiSimA || uiSimA.proposedChange.targetFile !== "src/user.js") {
    throw new Error(`simulationService.getById failed to resolve accurate state for simulation A`);
  }
  if (!uiSimB || uiSimB.proposedChange.targetFile !== "src/pricing.js") {
    throw new Error(`simulationService.getById failed to resolve accurate state for simulation B`);
  }

  console.log(">>> [TEST 1 PASSED] Perfect isolation: 0 metadata leakage between simultaneous simulations.");

  // -------------------------------------------------------------------------
  // TEST 2: Error Classification — Missing Target File
  // -------------------------------------------------------------------------
  console.log("\n>>> [TEST 2] Testing Error Classification on non-existent file...");

  const reqMissingFile = {
    repoUrl: "local-fixture",
    branch: "main",
    filePath: "src/nonexistent-user.js",
    oldValue: "foo",
    newValue: "bar",
    testCommand: "npm test",
  };

  const resMissing = await simulationService.runRealSimulation(reqMissingFile);

  console.log(` - Returned status: ${resMissing.status}`);
  console.log(` - Returned tests: total=${resMissing.tests.total}, failed=${resMissing.tests.failed}`);
  console.log(` - Error message: ${resMissing.errorMessage}`);

  if (resMissing.status !== "error") {
    throw new Error(`CRITICAL RULE VIOLATION: Expected status 'error', got '${resMissing.status}'! Missing file must NOT be classified as regression.`);
  }
  if (resMissing.tests.total !== 0 || resMissing.tests.failed !== 0) {
    throw new Error(`CRITICAL RULE VIOLATION: Expected testsExecuted=0, failed=0, got total=${resMissing.tests.total}, failed=${resMissing.tests.failed}!`);
  }

  const uiMissing = simulationService.getById(resMissing.simulationId);
  if (!uiMissing) {
    throw new Error("Could not retrieve missing file simulation via getById");
  }

  console.log(` - UI status: ${uiMissing.status}`);
  console.log(` - UI statusLabel: ${uiMissing.statusLabel}`);
  console.log(` - UI workflows count: ${uiMissing.workflows.length}`);
  console.log(` - UI remediation exists: ${Boolean(uiMissing.remediation)}`);

  if (uiMissing.status !== "error") {
    throw new Error(`UI status must be 'error', got '${uiMissing.status}'`);
  }
  if (uiMissing.workflows.length !== 0) {
    throw new Error(`CRITICAL: Fake workflows were created for a simulation error! Count: ${uiMissing.workflows.length}`);
  }
  if (uiMissing.remediation) {
    throw new Error("CRITICAL: Remediation plan was generated for a simulation error!");
  }
  if (!uiMissing.errorMessage || !uiMissing.errorMessage.includes("Target file not found")) {
    throw new Error(`Expected error message to explain file not found. Got: ${uiMissing.errorMessage}`);
  }

  console.log(">>> [TEST 2 PASSED] Target file error correctly classified as SIMULATION ERROR with 0 tests and 0 fake workflows.");

  // -------------------------------------------------------------------------
  // TEST 3: Error Classification — Pattern Not Found
  // -------------------------------------------------------------------------
  console.log("\n>>> [TEST 3] Testing Error Classification on pattern not found...");

  const reqMissingPattern = {
    repoUrl: "local-fixture",
    branch: "main",
    filePath: "src/user.js",
    oldValue: "PATTERN_THAT_DEFINITELY_DOES_NOT_EXIST_XYZ_987",
    newValue: "replacement_pattern",
    testCommand: "npm test",
  };

  const resPattern = await simulationService.runRealSimulation(reqMissingPattern);

  console.log(` - Returned status: ${resPattern.status}`);
  console.log(` - Error message: ${resPattern.errorMessage}`);

  if (resPattern.status !== "error") {
    throw new Error(`Expected status 'error' for missing pattern, got '${resPattern.status}'`);
  }
  if (resPattern.tests.total !== 0 || resPattern.tests.failed !== 0) {
    throw new Error(`Expected tests=0 for missing pattern error`);
  }

  const uiPattern = simulationService.getById(resPattern.simulationId);
  if (!uiPattern || uiPattern.workflows.length !== 0 || uiPattern.remediation) {
    throw new Error("UI model for missing pattern must have 0 workflows and no Bob remediation.");
  }

  console.log(">>> [TEST 3 PASSED] Pattern not found correctly classified as SIMULATION ERROR.");

  // -------------------------------------------------------------------------
  // TEST 4: Error Classification — Target file on ShopLite repo mismatch
  // -------------------------------------------------------------------------
  console.log("\n>>> [TEST 4] Testing target file mismatch: src/user.js against ShopLite fixture (where user.js does not exist in root)...");

  // In ShopLite repo, schema is in backend/prisma/schema.prisma, NOT src/user.js
  const reqShopLiteMismatch = {
    repoUrl: "https://github.com/kanishkvk9141/shoplite",
    branch: "main",
    filePath: "src/user.js",
    oldValue: 'email: "developer@buildtwin.io"',
    newValue: 'email_address: "developer@buildtwin.io"',
    testCommand: "npm test",
  };

  const resShopLiteMismatch = await simulationService.runRealSimulation(reqShopLiteMismatch);
  console.log(` - Returned status: ${resShopLiteMismatch.status}`);
  console.log(` - Error message: ${resShopLiteMismatch.errorMessage}`);

  if (resShopLiteMismatch.status !== "error") {
    throw new Error(`Expected 'error' for ShopLite src/user.js mismatch, got '${resShopLiteMismatch.status}'`);
  }
  if (resShopLiteMismatch.tests.total !== 0 || resShopLiteMismatch.tests.failed !== 0) {
    throw new Error(`Expected 0 tests for ShopLite src/user.js mismatch`);
  }

  const uiShopLiteMismatch = simulationService.getById(resShopLiteMismatch.simulationId);
  if (uiShopLiteMismatch.status !== "error" || uiShopLiteMismatch.workflows.length !== 0) {
    throw new Error("UI model must be error with 0 workflows for ShopLite src/user.js mismatch");
  }

  console.log(">>> [TEST 4 PASSED] ShopLite file mismatch correctly halts with SIMULATION ERROR.");

  console.log("\n================================================================================");
  console.log("   ALL CONCURRENCY ISOLATION & ERROR CLASSIFICATION TESTS PASSED CLEANLY!       ");
  console.log("================================================================================");
}

runIsolationAndErrorClassificationTest().catch((err) => {
  console.error("FATAL TEST FAILURE:", err);
  process.exit(1);
});
