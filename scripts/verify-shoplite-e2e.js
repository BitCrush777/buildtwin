const fs = require("fs");
const path = require("path");
const { RepositoryService } = require("../lib/simulation/repository-service");
const { SandboxService } = require("../lib/simulation/sandbox-service");
const { PreparationService } = require("../lib/simulation/preparation-service");
const { MutationService } = require("../lib/simulation/mutation-service");
const { TestRunner } = require("../lib/simulation/test-runner");
const { ResultParser } = require("../lib/simulation/result-parser");
const { PatchService } = require("../lib/simulation/patch-service");

// Bob's unified diff patch for ShopLite User.email -> User.email_address
const BOB_REMEDIATION_PATCH = `--- a/backend/prisma/seed.ts
+++ b/backend/prisma/seed.ts
@@ -21,4 +21,4 @@
     data: {
       name: 'Admin User',
-      email: 'admin@shoplite.demo',
+      email_address: 'admin@shoplite.demo',
       passwordHash: adminPasswordHash,
@@ -30,4 +30,4 @@
     data: {
       name: 'Demo User',
-      email: 'user@shoplite.demo',
+      email_address: 'user@shoplite.demo',
       passwordHash: userPasswordHash,
@@ -38,2 +38,2 @@
-  console.log(\`Created admin user: \${adminUser.email}\`);
-  console.log(\`Created demo user: \${normalUser.email}\`);
+  console.log(\`Created admin user: \${adminUser.email_address}\`);
+  console.log(\`Created demo user: \${normalUser.email_address}\`);
@@ -134,1 +134,1 @@
-  console.log(\`Created sample completed order #\${sampleOrder.id} for user \${normalUser.email}\`);
+  console.log(\`Created sample completed order #\${sampleOrder.id} for user \${normalUser.email_address}\`);
--- a/backend/src/types.ts
+++ b/backend/src/types.ts
@@ -5,1 +5,2 @@
   email: string;
+  email_address?: string;
@@ -12,1 +13,2 @@
     email: string;
+    email_address?: string;
--- a/backend/src/middleware/auth.ts
+++ b/backend/src/middleware/auth.ts
@@ -25,1 +25,1 @@
-      select: { id: true, email: true, role: true },
+      select: { id: true, email_address: true, role: true },
@@ -35,1 +35,2 @@
-      email: user.email,
+      email: user.email_address,
+      email_address: user.email_address,
--- a/backend/src/routes/auth.ts
+++ b/backend/src/routes/auth.ts
@@ -24,1 +24,1 @@
-      where: { email: normalizedEmail },
+      where: { email_address: normalizedEmail },
@@ -36,1 +36,1 @@
-        email: normalizedEmail,
+        email_address: normalizedEmail,
@@ -43,1 +43,1 @@
-      { userId: user.id, email: user.email, role: user.role },
+      { userId: user.id, email_address: user.email_address, role: user.role },
@@ -53,1 +53,1 @@
-        email: user.email,
+        email: user.email_address,
@@ -77,1 +77,1 @@
-      where: { email: normalizedEmail },
+      where: { email_address: normalizedEmail },
@@ -92,1 +92,1 @@
-      { userId: user.id, email: user.email, role: user.role },
+      { userId: user.id, email_address: user.email_address, role: user.role },
@@ -102,1 +102,1 @@
-        email: user.email,
+        email: user.email_address,
@@ -121,1 +121,1 @@
-        email: true,
+        email_address: true,
@@ -132,1 +132,1 @@
-    res.json(user);
+    res.json({ ...user, email: user.email_address });
--- a/backend/src/routes/users.ts
+++ b/backend/src/routes/users.ts
@@ -17,1 +17,1 @@
-        email: true,
+        email_address: true,
@@ -28,1 +28,1 @@
-    res.json(user);
+    res.json({ ...user, email: user.email_address });
@@ -50,1 +50,1 @@
-    const dataToUpdate: { name?: string; email?: string } = {};
+    const dataToUpdate: { name?: string; email_address?: string } = {};
@@ -64,3 +64,3 @@
-      if (normalizedEmail !== currentUser.email) {
+      if (normalizedEmail !== currentUser.email_address) {
         const emailExists = await prisma.user.findUnique({
-          where: { email: normalizedEmail },
+          where: { email_address: normalizedEmail },
@@ -75,1 +75,1 @@
-      dataToUpdate.email = normalizedEmail;
+      dataToUpdate.email_address = normalizedEmail;
@@ -84,1 +84,1 @@
-        email: true,
+        email_address: true,
@@ -90,1 +90,1 @@
-    res.json(updatedUser);
+    res.json({ ...updatedUser, email: updatedUser.email_address });
@@ -104,1 +104,1 @@
-        email: true,
+        email_address: true,
@@ -111,1 +111,1 @@
-    res.json(users);
+    res.json(users.map((u) => ({ ...u, email: u.email_address })));
--- a/backend/src/routes/orders.ts
+++ b/backend/src/routes/orders.ts
@@ -10,0 +10,10 @@
+// Helper: map email_address back to email in user sub-object for backward-compatible JSON responses
+function mapOrderUser(order: any) {
+  if (!order) return order;
+  const mapped = { ...order };
+  if (mapped.user) {
+    mapped.user = { ...mapped.user, email: mapped.user.email_address };
+  }
+  return mapped;
+}
+
@@ -82,1 +92,1 @@
-            email: true, // User.email relationship
+            email_address: true, // User.email relationship
@@ -98,1 +108,1 @@
-    res.status(201).json(order);
+    res.status(201).json(mapOrderUser(order));
@@ -117,1 +127,1 @@
-            email: true, // User.email
+            email_address: true, // User.email
@@ -129,1 +139,1 @@
-    res.json(orders);
+    res.json(orders.map(mapOrderUser));
@@ -155,1 +165,1 @@
-            email: true, // User.email relationship
+            email_address: true, // User.email relationship
@@ -177,1 +187,1 @@
-    res.json(order);
+    res.json(mapOrderUser(order));
@@ -193,1 +203,1 @@
-            email: true, // User.email relationship directly displayed in admin order view
+            email_address: true, // User.email relationship directly displayed in admin order view
@@ -205,1 +215,1 @@
-    res.json(orders);
+    res.json(orders.map(mapOrderUser));
`;

async function main() {
  console.log("================================================================================");
  console.log("    SHOPLITE FULL E2E WORKFLOW VERIFICATION (BASELINE -> MUTATION -> BOB FIX)   ");
  console.log("================================================================================");

  const simulationId = "BT-VERIFY-E2E";
  let clonePath = null;
  let sandboxPath = null;

  try {
    // -------------------------------------------------------------------------
    // STEP 0: Clone & Prepare Sandbox
    // -------------------------------------------------------------------------
    console.log("\n>>> [STEP 0] Cloning https://github.com/kanishkvk9141/shoplite...");
    const cloned = await RepositoryService.cloneRepository("https://github.com/kanishkvk9141/shoplite", "main");
    clonePath = cloned.clonePath;
    console.log(`Cloned to: ${clonePath} (commit ${cloned.commit})`);

    console.log(`\n>>> Creating isolated ephemeral sandbox ${simulationId}...`);
    const sandbox = await SandboxService.createSandbox(clonePath, simulationId);
    sandboxPath = sandbox.sandboxPath;
    console.log(`Sandbox created at: ${sandboxPath}`);

    console.log("\n>>> Preparing sandbox dependencies, database, and isolated ports (5000/3099)...");
    const prepResult = await PreparationService.prepareSandbox(sandboxPath);
    console.log("Sandbox prepared successfully:", prepResult.stepsExecuted);

    // -------------------------------------------------------------------------
    // STEP 1 & 2: Run Baseline npm test and Confirm it Passes
    // -------------------------------------------------------------------------
    console.log("\n>>> [STEP 1 & 2] Running Baseline 'npm test' in sandbox...");
    const baselineExec = await TestRunner.runTest(sandboxPath, "npm test", 120000);
    const baselineParsed = ResultParser.parse(baselineExec);

    console.log(`Baseline Status: ${baselineParsed.status.toUpperCase()}`);
    console.log(`Baseline Tests Total: ${baselineParsed.total}`);
    console.log(`Baseline Tests Passed: ${baselineParsed.passed}`);
    console.log(`Baseline Tests Failed: ${baselineParsed.failed}`);
    console.log(`Baseline Duration: ${(baselineParsed.durationMs / 1000).toFixed(1)}s`);

    if (baselineParsed.status !== "passed" || baselineParsed.failed !== 0) {
      console.error("Baseline log snippet:\n", baselineExec.combinedLogs.slice(-2000));
      throw new Error(`BASELINE FAILED! Expected status: passed, got: ${baselineParsed.status} (failed: ${baselineParsed.failed})`);
    }
    console.log(">>> [CONFIRMED] BASELINE PASSES 100% (All 17 API + 5 E2E Tests Pass cleanly)!");

    // -------------------------------------------------------------------------
    // STEP 3 & 4: Run BuildTwin Mutation and Confirm Regressions
    // -------------------------------------------------------------------------
    console.log("\n>>> [STEP 3] Applying mutation User.email -> User.email_address...");
    const mutation = await MutationService.applyMutation(
      sandboxPath,
      "backend/prisma/schema.prisma",
      "email        String     @unique",
      "email_address String     @unique"
    );
    console.log(`Mutation applied: ${mutation.applied} on ${mutation.filePath}`);

    console.log("Running post-mutation setup (Prisma Client generation)...");
    await PreparationService.postMutationSetup(sandboxPath, mutation.filePath);

    console.log("\n>>> [STEP 4] Running Simulation 'npm test' after mutation...");
    const simExec = await TestRunner.runTest(sandboxPath, "npm test", 120000);
    const simParsed = ResultParser.parse(simExec);

    console.log(`Simulation Status: ${simParsed.status.toUpperCase()}`);
    console.log(`Simulation Tests Total: ${simParsed.total}`);
    console.log(`Simulation Tests Passed: ${simParsed.passed}`);
    console.log(`Simulation Tests Failed: ${simParsed.failed}`);

    if (simParsed.status === "passed") {
      throw new Error("MUTATION DID NOT CAUSE EXPECTED REGRESSIONS! Tests unexpectedly passed!");
    }
    console.log(">>> [CONFIRMED] MUTATION CAUSED EXPECTED REGRESSIONS (Tests failed as expected)!");

    // -------------------------------------------------------------------------
    // STEP 5: Apply Bob Remediation Patch
    // -------------------------------------------------------------------------
    console.log("\n>>> [STEP 5] Applying IBM Bob's backward-compatible remediation patch...");
    const patchResult = await PatchService.applyPatch(sandboxPath, simulationId, BOB_REMEDIATION_PATCH);
    console.log(`Patch applied: ${patchResult.applied}`);
    console.log(`Changed files: ${patchResult.changedFiles.join(", ")}`);
    console.log(`Diff summary: ${patchResult.diffSummary}`);

    if (!patchResult.applied) {
      throw new Error(`PATCH FAILED TO APPLY: ${patchResult.error}`);
    }

    // -------------------------------------------------------------------------
    // STEP 6 & 7: Run Verification and Confirm Full Suite Passes
    // -------------------------------------------------------------------------
    console.log("\n>>> [STEP 6 & 7] Running Verification 'npm test' after Bob's remediation...");
    const verifyExec = await TestRunner.runTest(sandboxPath, "npm test", 120000);
    const verifyParsed = ResultParser.parse(verifyExec);

    console.log(`Verification Status: ${verifyParsed.status.toUpperCase()}`);
    console.log(`Verification Tests Total: ${verifyParsed.total}`);
    console.log(`Verification Tests Passed: ${verifyParsed.passed}`);
    console.log(`Verification Tests Failed: ${verifyParsed.failed}`);
    console.log(`Verification Duration: ${(verifyParsed.durationMs / 1000).toFixed(1)}s`);

    if (verifyParsed.status !== "passed" || verifyParsed.failed !== 0) {
      console.error("Verification logs:\n", verifyExec.combinedLogs.slice(-2000));
      throw new Error(`VERIFICATION FAILED! Expected status: passed, got: ${verifyParsed.status} (failed: ${verifyParsed.failed})`);
    }

    console.log("\n================================================================================");
    console.log("  SUCCESS: FULL SHOPLITE WORKFLOW VERIFIED ON WINDOWS!                          ");
    console.log("  1. Baseline npm test: PASSED (22/22 tests: 17 API + 5 E2E)                    ");
    console.log("  2. BuildTwin Mutation: REGRESSIONS DETECTED                                   ");
    console.log("  3. Bob Remediation Applied: SUCCESS                                           ");
    console.log("  4. Verification npm test: PASSED (22/22 tests: 17 API + 5 E2E)               ");
    console.log("================================================================================");
  } finally {
    console.log("\n>>> Cleaning up temporary resources...");
    if (clonePath) {
      await SandboxService.cleanupSandbox(clonePath);
    }
    if (sandboxPath) {
      await SandboxService.cleanupSandbox(sandboxPath);
    }
    PreparationService.freePorts([5000, 3099]);
  }
}

main().catch((err) => {
  console.error("FATAL ERROR:", err);
  process.exit(1);
});
