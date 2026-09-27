const { simulationService } = require("../lib/simulation/simulation-service");
const { StateStore } = require("../lib/simulation/state-store");
const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");

async function runCrossProcessTest() {
  console.log("================================================================================");
  console.log("       BUILDTWIN CROSS-PROCESS STATE & MCP WORKFLOW VERIFICATION TEST           ");
  console.log("================================================================================");

  // -------------------------------------------------------------------------
  // STEP 1: Process A (Next.js Engine / Simulation Service)
  // -------------------------------------------------------------------------
  console.log("\n>>> [PROCESS A] Initiating real simulation on local ShopLite fixture...");

  const simRequest = {
    repoUrl: "local-fixture",
    branch: "main",
    filePath: "src/user.js",
    oldValue: 'email: "developer@buildtwin.io"',
    newValue: 'email_address: "developer@buildtwin.io"',
    testCommand: "npm test",
  };

  const simResponse = await simulationService.runRealSimulation(simRequest);

  console.log(`[PROCESS A] Simulation created: ID = ${simResponse.simulationId}`);
  console.log(`[PROCESS A] Initial Status: ${simResponse.status}`);
  console.log(`[PROCESS A] Sandbox Directory: ${simResponse.sandboxPath}`);
  console.log(`[PROCESS A] Baseline Total Tests: ${simResponse.baseline?.total}`);
  console.log(`[PROCESS A] Simulation Failed Tests: ${simResponse.simulation?.failed}`);

  // Assert state on disk
  const runDir = StateStore.getRunDir(simResponse.simulationId);
  const stateFile = path.join(runDir, "state.json");
  const metadataFile = path.join(runDir, "metadata.json");
  const remediationFile = path.join(runDir, "remediation.json");

  console.log(`\n>>> [DISK CHECK] Verifying files in .buildtwin/runs/${simResponse.simulationId}/...`);
  console.log(` - state.json exists: ${fs.existsSync(stateFile)}`);
  console.log(` - metadata.json exists: ${fs.existsSync(metadataFile)}`);
  console.log(` - remediation.json exists: ${fs.existsSync(remediationFile)}`);

  if (!fs.existsSync(stateFile)) {
    throw new Error(`CRITICAL: state.json was NOT persisted at ${stateFile}`);
  }

  const persistedState = JSON.parse(fs.readFileSync(stateFile, "utf-8"));
  console.log(` - Persisted simulationId: ${persistedState.simulationId}`);
  console.log(` - Persisted status: ${persistedState.status}`);
  console.log(` - Persisted sandboxPath: ${persistedState.sandboxPath}`);
  console.log(` - Sandbox directory exists on disk: ${fs.existsSync(persistedState.sandboxPath)}`);

  if (!persistedState.sandboxPath || !fs.existsSync(persistedState.sandboxPath)) {
    throw new Error(`CRITICAL: Sandbox directory was cleaned up prematurely! Path: ${persistedState.sandboxPath}`);
  }

  // -------------------------------------------------------------------------
  // STEP 2: Process B (Separate node process running mcp/server.js)
  // -------------------------------------------------------------------------
  console.log("\n>>> [PROCESS B] Spawning independent IBM Bob MCP Server process (node mcp/server.js)...");
  const mcpServer = spawn("node", ["mcp/server.js"], {
    cwd: path.resolve(__dirname, ".."),
    stdio: ["pipe", "pipe", "pipe"],
  });

  mcpServer.stderr.on("data", (data) => {
    console.error(`[MCP Server stderr]: ${data.toString()}`);
  });

  let messageId = 1;
  function sendJsonRpc(method, params) {
    return new Promise((resolve, reject) => {
      const id = messageId++;
      const payload = JSON.stringify({
        jsonrpc: "2.0",
        id,
        method,
        params,
      }) + "\n";

      const timeout = setTimeout(() => {
        mcpServer.stdout.removeListener("data", onData);
        reject(new Error(`Timeout waiting for JSON-RPC response for method ${method}`));
      }, 15000);

      const onData = (data) => {
        const lines = data.toString().split(/\r?\n/).filter(Boolean);
        for (const line of lines) {
          try {
            const msg = JSON.parse(line);
            if (msg.id === id) {
              clearTimeout(timeout);
              mcpServer.stdout.removeListener("data", onData);
              if (msg.error) {
                return reject(new Error(`RPC Error: ${JSON.stringify(msg.error)}`));
              }
              return resolve(msg.result);
            }
          } catch {
            // non-json or fragmented line, wait for more
          }
        }
      };

      mcpServer.stdout.on("data", onData);
      mcpServer.stdin.write(payload);
    });
  }

  // 2a. Initialize MCP
  const initRes = await sendJsonRpc("initialize", {});
  console.log(`[PROCESS B] MCP Server initialized: ${initRes.serverInfo.name} v${initRes.serverInfo.version}`);

  // 2b. Call buildtwin_get_result
  console.log(`\n>>> [PROCESS B] Calling buildtwin_get_result('${simResponse.simulationId}')...`);
  const getRes = await sendJsonRpc("tools/call", {
    name: "buildtwin_get_result",
    arguments: { simulationId: simResponse.simulationId },
  });

  if (getRes.isError) {
    throw new Error(`buildtwin_get_result failed: ${getRes.content[0].text}`);
  }

  const retrievedState = JSON.parse(getRes.content[0].text);
  console.log(`[PROCESS B] Retrieved simulationId: ${retrievedState.simulationId}`);
  console.log(`[PROCESS B] Retrieved status: ${retrievedState.status}`);
  console.log(`[PROCESS B] Retrieved test failed count: ${retrievedState.tests.failed}`);
  console.log(`[PROCESS B] Retrieved sandboxPath: ${retrievedState.sandboxPath}`);

  if (retrievedState.simulationId !== simResponse.simulationId) {
    throw new Error("Simulation ID mismatch between Process A and Process B!");
  }
  if (!retrievedState.sandboxPath || !fs.existsSync(retrievedState.sandboxPath)) {
    throw new Error("Process B cannot see the live sandbox directory created by Process A!");
  }

  // 2c. Call buildtwin_apply_patch
  console.log("\n>>> [PROCESS B] Calling buildtwin_apply_patch with Bob's backward-compatible patch...");
  const patchDiff = `--- a/src/user.js
+++ b/src/user.js
@@ -10,6 +10,3 @@
   getUserEmail() {
-    if (!this.user.email) {
-      throw new Error("Property 'email' does not exist on User. Did you mean 'email_address'?");
-    }
-    return this.user.email;
+    return this.user.email || this.user.email_address;
   }
`;

  const applyRes = await sendJsonRpc("tools/call", {
    name: "buildtwin_apply_patch",
    arguments: {
      simulationId: simResponse.simulationId,
      patch: patchDiff,
    },
  });

  console.log(`[PROCESS B] buildtwin_apply_patch response:`);
  console.log(applyRes.content[0].text);
  const patchResult = JSON.parse(applyRes.content[0].text);
  if (!patchResult.applied) {
    throw new Error(`Failed to apply patch: ${patchResult.error}`);
  }

  // Check disk state after patch
  const postPatchDisk = JSON.parse(fs.readFileSync(stateFile, "utf-8"));
  console.log(`[DISK CHECK] Disk status after patch: ${postPatchDisk.status} (${postPatchDisk.statusLabel})`);

  // 2d. Call buildtwin_verify
  console.log("\n>>> [PROCESS B] Calling buildtwin_verify to run tests inside sandbox...");
  const verifyRes = await sendJsonRpc("tools/call", {
    name: "buildtwin_verify",
    arguments: { simulationId: simResponse.simulationId },
  });

  console.log(`[PROCESS B] buildtwin_verify response:`);
  console.log(verifyRes.content[0].text);
  const verifyResult = JSON.parse(verifyRes.content[0].text);

  if (!verifyResult.isSafeToDeploy) {
    throw new Error(`Verification did not pass cleanly! Status: ${verifyResult.status}`);
  }

  // 2e. Check that state was updated on disk and sandbox cleaned up
  const finalDiskState = JSON.parse(fs.readFileSync(stateFile, "utf-8"));
  console.log(`\n>>> [DISK CHECK] Final state on disk:`);
  console.log(` - Status: ${finalDiskState.status} (${finalDiskState.statusLabel})`);
  console.log(` - Tests passed: ${finalDiskState.tests.passed} / ${finalDiskState.tests.total}`);
  console.log(` - Sandbox directory path: ${finalDiskState.sandboxPath || "(undefined / cleaned)"}`);
  console.log(` - Sandbox on disk cleaned up: ${!fs.existsSync(persistedState.sandboxPath)}`);

  if (fs.existsSync(persistedState.sandboxPath)) {
    throw new Error("Sandbox directory was NOT cleaned up after safe verification!");
  }

  // -------------------------------------------------------------------------
  // STEP 3: Process A verifies updated state through simulationService
  // -------------------------------------------------------------------------
  console.log("\n>>> [PROCESS A] Verifying that Next.js simulationService sees the verified state...");
  const uiSim = simulationService.getById(simResponse.simulationId);
  console.log(`[PROCESS A] getById status: ${uiSim?.status} (${uiSim?.statusLabel})`);
  console.log(`[PROCESS A] getById testsPassed: ${uiSim?.testsPassed} / ${uiSim?.totalTests}`);

  // Kill MCP server process
  mcpServer.kill();

  console.log("\n================================================================================");
  console.log("       ALL CHECKS PASSED: CROSS-PROCESS STATE PERSISTENCE VERIFIED!             ");
  console.log("================================================================================");
}

runCrossProcessTest().catch((err) => {
  console.error("FATAL ERROR in cross-process test:", err);
  process.exit(1);
});
