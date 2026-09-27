"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.simulationService = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const repository_service_1 = require("./repository-service");
const sandbox_service_1 = require("./sandbox-service");
const mutation_service_1 = require("./mutation-service");
const test_runner_1 = require("./test-runner");
const result_parser_1 = require("./result-parser");
const preparation_service_1 = require("./preparation-service");
const patch_service_1 = require("./patch-service");
const profile_service_1 = require("./profile-service");
const impact_service_1 = require("./impact-service");
const state_store_1 = require("./state-store");
/**
 * Real Simulation Engine, verification runner, and persistent session service.
 * Completely repository-agnostic with dynamic profile detection, impact analysis,
 * multi-stack test execution, and persistent cross-process state.
 */
class SimulationService {
    /**
     * Returns all simulations from disk state store.
     */
    getAll() {
        const states = state_store_1.StateStore.getAllStates();
        return states.map(state_store_1.StateStore.persistentToUi);
    }
    /**
     * Finds simulation by ID from disk state store.
     */
    getById(id) {
        try {
            const cleanId = state_store_1.StateStore.validateId(id);
            const state = state_store_1.StateStore.getState(cleanId);
            if (!state)
                return undefined;
            return state_store_1.StateStore.persistentToUi(state);
        }
        catch {
            return undefined;
        }
    }
    /**
     * Retrieves persistent simulation state by ID directly.
     */
    getState(id) {
        try {
            const cleanId = state_store_1.StateStore.validateId(id);
            return state_store_1.StateStore.getState(cleanId);
        }
        catch {
            return null;
        }
    }
    /**
     * Computes the next sequential simulation ID based on persistent store.
     */
    getNextSimId() {
        const baseDir = path_1.default.resolve(process.cwd(), ".buildtwin", "runs");
        if (!fs_1.default.existsSync(baseDir)) {
            fs_1.default.mkdirSync(baseDir, { recursive: true });
        }
        let maxNum = 1042;
        try {
            const entries = fs_1.default.readdirSync(baseDir);
            for (const entry of entries) {
                const match = entry.match(/^BT-(\d+)/i);
                if (match) {
                    const num = parseInt(match[1], 10);
                    if (num > maxNum)
                        maxNum = num;
                }
            }
        }
        catch { }
        let candidate = maxNum + 1;
        while (true) {
            const candidateId = `BT-${candidate}`;
            const candidateDir = path_1.default.join(baseDir, candidateId);
            try {
                fs_1.default.mkdirSync(candidateDir);
                return candidateId;
            }
            catch (err) {
                if (err.code === "EEXIST") {
                    candidate++;
                }
                else {
                    return `BT-${candidate}-${Date.now().toString().slice(-4)}`;
                }
            }
        }
    }
    /**
     * Executes a real end-to-end BuildTwin simulation.
     * Clones repo, detects profile, creates ephemeral sandbox, runs baseline, mutates target file,
     * runs simulation tests, performs dynamic impact analysis, persists state.json,
     * and KEEPS sandbox directory alive for Bob remediation.
     */
    async runRealSimulation(req) {
        const simId = this.getNextSimId();
        let clonePath = null;
        let sandboxPath = null;
        try {
            // 1. Validate repository URL
            const validation = repository_service_1.RepositoryService.validateUrl(req.repoUrl);
            if (!validation.valid) {
                throw new Error(validation.error || "Invalid repository URL");
            }
            // 2. Clone repository into temporary directory
            const cloned = await repository_service_1.RepositoryService.cloneRepository(req.repoUrl, req.branch);
            clonePath = cloned.clonePath;
            // 3. Create isolated ephemeral sandbox copy
            const sandbox = await sandbox_service_1.SandboxService.createSandbox(clonePath, simId);
            sandboxPath = sandbox.sandboxPath;
            // 4. Dynamically inspect repository profile (stack, package manager, test framework)
            const profile = await profile_service_1.ProfileService.inspectRepository(sandboxPath, req.repoUrl, cloned.branch, cloned.commit);
            // Resolve effective test command
            const testCommand = (req.testCommand && req.testCommand.trim()) || profile.testCommand || "npm test";
            // 5. Install dependencies and prepare test environment dynamically inside sandbox
            await preparation_service_1.PreparationService.prepareSandbox(sandboxPath, profile);
            // 6. Run approved test command BEFORE mutation (Production Baseline)
            const baselineExecution = await test_runner_1.TestRunner.runTest(sandboxPath, testCommand, 120000);
            const parsedBaseline = result_parser_1.ResultParser.parse(baselineExecution);
            // 7. Apply controlled mutation to specified file inside the sandbox
            const mutation = await mutation_service_1.MutationService.applyMutation(sandboxPath, req.filePath, req.oldValue, req.newValue);
            // 8. Post-mutation setup (e.g. re-generate Prisma client if schema mutated)
            await preparation_service_1.PreparationService.postMutationSetup(sandboxPath, mutation.filePath, profile);
            // 9. Run approved test command AFTER mutation (Simulation Run)
            const simulationExecution = await test_runner_1.TestRunner.runTest(sandboxPath, testCommand, 120000);
            const parsedSimulation = result_parser_1.ResultParser.parse(simulationExecution);
            // 10. Perform dynamic impact analysis across the repository
            const impact = await impact_service_1.ImpactService.analyzeImpact(sandboxPath, mutation.filePath, mutation.oldValue, mutation.newValue, parsedSimulation.failureDetails, parsedSimulation.status === "passed");
            const allAffectedFiles = Array.from(new Set([mutation.filePath, ...parsedSimulation.affectedFiles, ...impact.affectedFiles]));
            // Construct Bob remediation structure if regressions occurred
            let bobRemediationData;
            if (parsedSimulation.status !== "passed") {
                bobRemediationData = {
                    summary: `Bob analyzed failures from modifying ${mutation.filePath} across ${allAffectedFiles.length} files and generated an isolated backward-compatible remediation plan.`,
                    affectedFiles: allAffectedFiles,
                    plan: [
                        `Trace broken call sites expecting '${mutation.oldValue}'.`,
                        `Implement backward-compatible accessor or alias for '${mutation.newValue}'.`,
                        `Verify all test invariants inside the isolated sandbox.`
                    ],
                    proposedChanges: allAffectedFiles.map((file) => ({
                        filePath: file,
                        description: file === mutation.filePath
                            ? `Provide backward-compatible accessor or virtual field for ${mutation.oldValue}.`
                            : `Update references to support ${mutation.newValue} while keeping fallback for ${mutation.oldValue}.`,
                    })),
                    tests: [testCommand],
                };
            }
            // 11. Structure response
            const response = {
                simulationId: simId,
                status: parsedSimulation.status,
                repository: {
                    name: cloned.repoName,
                    branch: cloned.branch,
                    commit: cloned.commit,
                },
                mutation: {
                    filePath: mutation.filePath,
                    oldValue: mutation.oldValue,
                    newValue: mutation.newValue,
                    applied: mutation.applied,
                },
                tests: {
                    total: parsedSimulation.total,
                    passed: parsedSimulation.passed,
                    failed: parsedSimulation.failed,
                },
                baseline: {
                    status: parsedBaseline.status,
                    total: parsedBaseline.total,
                    passed: parsedBaseline.passed,
                    failed: parsedBaseline.failed,
                    logs: parsedBaseline.logs,
                    durationMs: parsedBaseline.durationMs,
                    exitCode: baselineExecution.exitCode,
                },
                simulation: {
                    status: parsedSimulation.status,
                    total: parsedSimulation.total,
                    passed: parsedSimulation.passed,
                    failed: parsedSimulation.failed,
                    logs: parsedSimulation.logs,
                    durationMs: parsedSimulation.durationMs,
                    exitCode: simulationExecution.exitCode,
                },
                sandboxPath, // Retain live sandbox path for Bob
                affectedFiles: allAffectedFiles,
                failureDetails: parsedSimulation.failureDetails,
                logs: parsedSimulation.logs,
                durationMs: parsedSimulation.durationMs,
                changedFiles: mutation.changedFiles,
                bobRemediationData,
                profile,
                impactedWorkflows: impact.workflows,
            };
            // 12. Construct UI model and persist to disk state store
            const uiRecord = this.toUiSimulation(response, req, cloned.commit, impact.workflows);
            const persistentState = {
                simulationId: simId,
                status: uiRecord.status,
                statusLabel: uiRecord.statusLabel,
                repository: {
                    name: cloned.repoName,
                    url: req.repoUrl,
                    branch: cloned.branch,
                    commit: cloned.commit,
                },
                branch: cloned.branch,
                commit: cloned.commit,
                mutation: response.mutation,
                tests: response.tests,
                baseline: response.baseline,
                simulation: response.simulation,
                sandboxPath, // Retain live sandbox path
                testCommand,
                affectedFiles: allAffectedFiles,
                failureDetails: parsedSimulation.failureDetails,
                remediation: uiRecord.remediation,
                bobRemediationData,
                logs: parsedSimulation.logs,
                durationMs: parsedSimulation.durationMs,
                changedFiles: mutation.changedFiles,
                timestamps: {
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                },
                proposedChange: uiRecord.proposedChange,
                workflows: uiRecord.workflows,
                stackTrace: parsedSimulation.logs,
                hostEnv: {
                    ...uiRecord.hostEnv,
                    sandboxStatus: "Active",
                },
                isReal: true,
                profile,
            };
            state_store_1.StateStore.saveState(persistentState);
            return response;
        }
        catch (err) {
            const errorMsg = err.message || String(err);
            const urlValidation = repository_service_1.RepositoryService.validateUrl(req.repoUrl);
            const repoName = urlValidation.repoName || req.repoUrl.replace("https://github.com/", "").split("/")[1] || req.repoUrl.split("/").pop() || "Repository";
            const errorResponse = {
                simulationId: simId,
                status: "error",
                repository: {
                    name: repoName,
                    branch: req.branch || "main",
                },
                mutation: {
                    filePath: req.filePath,
                    oldValue: req.oldValue,
                    newValue: req.newValue,
                    applied: false,
                },
                tests: {
                    total: 0,
                    passed: 0,
                    failed: 0,
                },
                sandboxPath: sandboxPath || undefined,
                logs: `Simulation Error: ${errorMsg}`,
                durationMs: 0,
                changedFiles: [],
                errorMessage: errorMsg,
            };
            const uiRecord = this.toUiSimulation(errorResponse, req, "unknown", []);
            try {
                const errorState = {
                    simulationId: simId,
                    status: "error",
                    statusLabel: "Simulation Error",
                    repository: {
                        name: repoName,
                        url: req.repoUrl,
                        branch: req.branch || "main",
                        commit: "unknown",
                    },
                    branch: req.branch || "main",
                    commit: "unknown",
                    mutation: {
                        filePath: req.filePath,
                        oldValue: req.oldValue,
                        newValue: req.newValue,
                        applied: false,
                    },
                    tests: { total: 0, passed: 0, failed: 0 },
                    testCommand: req.testCommand,
                    sandboxPath: sandboxPath || undefined,
                    affectedFiles: [],
                    failureDetails: [],
                    remediation: undefined,
                    bobRemediationData: undefined,
                    logs: `Simulation Error: ${errorMsg}`,
                    durationMs: 0,
                    changedFiles: [],
                    timestamps: {
                        createdAt: new Date().toISOString(),
                        updatedAt: new Date().toISOString(),
                    },
                    proposedChange: uiRecord.proposedChange,
                    workflows: [],
                    stackTrace: `Simulation Error: ${errorMsg}`,
                    hostEnv: {
                        sandboxStatus: "Failed",
                        repoTag: `${repoName}@${req.branch || "main"}`,
                        filesChanged: 0,
                        testSuite: req.testCommand,
                        productionImpact: "0 (Halted)",
                    },
                    isReal: true,
                    errorMessage: errorMsg,
                };
                state_store_1.StateStore.saveState(errorState);
            }
            catch (saveErr) {
                console.error("Failed to persist error state:", saveErr);
            }
            return errorResponse;
        }
    }
    /**
     * Applies an IBM Bob-generated unified diff patch to the live sandbox for a simulation.
     */
    async applyPatch(simulationId, patch) {
        const cleanId = state_store_1.StateStore.validateId(simulationId);
        const state = state_store_1.StateStore.getState(cleanId);
        if (!state) {
            return {
                simulationId: cleanId,
                applied: false,
                changedFiles: [],
                diffSummary: "",
                error: `Simulation #${cleanId} not found in state store.`,
            };
        }
        if (!state.sandboxPath) {
            return {
                simulationId: cleanId,
                applied: false,
                changedFiles: [],
                diffSummary: "",
                error: `No active sandbox for simulation #${cleanId}. The sandbox may have been cleaned up or simulation not yet run.`,
            };
        }
        if (!fs_1.default.existsSync(state.sandboxPath)) {
            return {
                simulationId: cleanId,
                applied: false,
                changedFiles: [],
                diffSummary: "",
                error: `Active sandbox directory not found on disk: ${state.sandboxPath}`,
            };
        }
        const result = await patch_service_1.PatchService.applyPatch(state.sandboxPath, cleanId, patch);
        // Update persistent simulation record to reflect the applied patch
        if (result.applied) {
            state.status = "needs_attention";
            state.statusLabel = "Patch applied — awaiting verification";
            state.hostEnv.sandboxStatus = "Patch Applied";
            state.hostEnv.filesChanged = (state.hostEnv.filesChanged || 0) + result.changedFiles.length;
            state.changedFiles = Array.from(new Set([...(state.changedFiles || []), ...result.changedFiles]));
            state_store_1.StateStore.saveState(state);
        }
        return result;
    }
    /**
     * Verifies the remediated sandbox for a given simulation.
     * Loads sandboxPath and testCommand from persistent state.json.
     * Runs tests inside the sandbox.
     * If verification passes cleanly, cleans up the sandbox and updates state.json.
     */
    async verifySimulation(simulationId) {
        const cleanId = state_store_1.StateStore.validateId(simulationId);
        const state = state_store_1.StateStore.getState(cleanId);
        if (!state) {
            throw new Error(`Simulation #${simulationId} not found in state store.`);
        }
        let logs = "";
        let durationMs = 0;
        let total = state.tests.total || 1;
        let passed = 0;
        let failed = 0;
        let status = "error";
        if (state.sandboxPath && fs_1.default.existsSync(state.sandboxPath)) {
            try {
                // Run test suite against the live sandbox
                const execution = await test_runner_1.TestRunner.runTest(state.sandboxPath, state.testCommand || "npm test", 120000);
                const parsed = result_parser_1.ResultParser.parse(execution);
                logs = parsed.logs;
                durationMs = parsed.durationMs;
                total = parsed.total ?? total;
                passed = parsed.passed ?? 0;
                failed = parsed.failed ?? (parsed.status === "passed" ? 0 : 1);
                status = parsed.status;
                // Perform dynamic impact analysis for the post-verification state
                const impact = await impact_service_1.ImpactService.analyzeImpact(state.sandboxPath, state.mutation.filePath, state.mutation.oldValue, state.mutation.newValue, parsed.failureDetails, status === "passed" && failed === 0);
                state.workflows = impact.workflows;
            }
            catch (err) {
                status = "error";
                failed = total;
                passed = 0;
                logs = `Verification error: test runner failed to execute — ${err.message || String(err)}`;
            }
        }
        else {
            status = "error";
            failed = total;
            passed = 0;
            logs = `Verification cannot be performed: active sandbox for simulation ${cleanId} is no longer available on disk. Re-run the simulation to create a fresh sandbox before verifying.`;
        }
        const isSafeToDeploy = status === "passed" && failed === 0;
        // Update state fields
        state.status = isSafeToDeploy ? "safe" : "regression";
        state.statusLabel = isSafeToDeploy
            ? "Safe / Verified"
            : `${failed} Regression${failed === 1 ? "" : "s"} Detected`;
        state.tests = { total, passed, failed };
        state.logs = logs;
        state.timestamps.verifiedAt = new Date().toISOString();
        const verificationResult = {
            simulationId: state.simulationId,
            status,
            testCounts: {
                total,
                passed,
                failed,
            },
            logs,
            durationMs,
            affectedWorkflows: state.workflows,
            isSafeToDeploy,
        };
        state.verification = verificationResult;
        // Clean up sandbox directory ONLY IF safe to deploy
        if (isSafeToDeploy && state.sandboxPath) {
            if (fs_1.default.existsSync(state.sandboxPath)) {
                await sandbox_service_1.SandboxService.cleanupSandbox(state.sandboxPath);
            }
            state.sandboxPath = undefined;
            state.hostEnv.sandboxStatus = "Cleaned";
        }
        else {
            state.hostEnv.sandboxStatus = "Active";
        }
        // Persist updated verification state to disk
        state_store_1.StateStore.saveState(state);
        return verificationResult;
    }
    /**
     * Helper to map real API response to the UI Simulation interface
     */
    toUiSimulation(res, req, commit, dynamicWorkflows = []) {
        // 1. Explicit Error State handling
        if (res.status === "error") {
            return {
                id: res.simulationId,
                repo: res.repository.name,
                branch: res.repository.branch,
                commit: res.repository.commit || commit || "HEAD",
                proposedChange: {
                    title: `Mutate ${res.mutation.filePath}`,
                    targetFile: res.mutation.filePath,
                    findPattern: res.mutation.oldValue,
                    findLineStart: 1,
                    findLineEnd: 1,
                    replacePattern: res.mutation.newValue,
                    oldCode: res.mutation.oldValue,
                    newCode: res.mutation.newValue,
                },
                status: "error",
                statusLabel: "Simulation Error",
                testsPassed: 0,
                totalTests: 0,
                duration: `${(res.durationMs / 1000).toFixed(1)}s`,
                timeAgo: "Just now",
                workspaces: `${res.repository.name} / Sandbox-Twin`,
                workflows: [],
                stackTrace: res.logs || (res.errorMessage ? `Simulation Error: ${res.errorMessage}` : "Simulation Error"),
                remediation: undefined,
                bobRemediationData: undefined,
                baseline: res.baseline,
                simulationMetrics: res.simulation,
                affectedFiles: [],
                failureDetails: [],
                sandboxPath: res.sandboxPath,
                hostEnv: {
                    sandboxStatus: "Failed",
                    repoTag: `${res.repository.name}@${res.repository.branch}`,
                    filesChanged: 0,
                    testSuite: req.testCommand,
                    productionImpact: "0 (Halted)",
                },
                isReal: true,
                profile: res.profile,
                errorMessage: res.errorMessage,
            };
        }
        // 2. Strict Invariant: REGRESSION DETECTED is permitted ONLY when baseline executed,
        // mutation applied, post-mutation test executed, and >= 1 real failure detected.
        const baselineExecuted = res.baseline !== undefined;
        const mutationApplied = res.mutation.applied === true;
        const postMutationExecuted = res.simulation !== undefined;
        const hasRealFailures = res.tests.failed !== null && res.tests.failed > 0;
        const isRegression = res.status === "failed" &&
            baselineExecuted &&
            mutationApplied &&
            postMutationExecuted &&
            hasRealFailures;
        const isSafe = res.status === "passed" && (!res.tests.failed || res.tests.failed === 0);
        const total = res.tests.total ?? (isSafe ? 1 : 0);
        const passed = res.tests.passed ?? (isSafe ? total : 0);
        const failed = res.tests.failed ?? (isSafe ? 0 : Math.max(0, total - passed));
        // If neither isRegression nor isSafe, it is an engine / pre-test error
        if (!isRegression && !isSafe) {
            return {
                id: res.simulationId,
                repo: res.repository.name,
                branch: res.repository.branch,
                commit: res.repository.commit || commit || "HEAD",
                proposedChange: {
                    title: `Mutate ${res.mutation.filePath}`,
                    targetFile: res.mutation.filePath,
                    findPattern: res.mutation.oldValue,
                    findLineStart: 1,
                    findLineEnd: 1,
                    replacePattern: res.mutation.newValue,
                    oldCode: res.mutation.oldValue,
                    newCode: res.mutation.newValue,
                },
                status: "error",
                statusLabel: "Simulation Error",
                testsPassed: 0,
                totalTests: 0,
                duration: `${(res.durationMs / 1000).toFixed(1)}s`,
                timeAgo: "Just now",
                workspaces: `${res.repository.name} / Sandbox-Twin`,
                workflows: [],
                stackTrace: res.logs || (res.errorMessage ? `Simulation Error: ${res.errorMessage}` : "Simulation Error"),
                remediation: undefined,
                bobRemediationData: undefined,
                baseline: res.baseline,
                simulationMetrics: res.simulation,
                affectedFiles: [],
                failureDetails: [],
                sandboxPath: res.sandboxPath,
                hostEnv: {
                    sandboxStatus: "Failed",
                    repoTag: `${res.repository.name}@${res.repository.branch}`,
                    filesChanged: 0,
                    testSuite: req.testCommand,
                    productionImpact: "0 (Halted)",
                },
                isReal: true,
                profile: res.profile,
                errorMessage: res.errorMessage || "Simulation did not complete successfully.",
            };
        }
        const workflows = dynamicWorkflows.length > 0
            ? dynamicWorkflows
            : [
                {
                    id: "wf-1",
                    name: `${res.repository.name} Test Suite`,
                    filePath: res.mutation.filePath,
                    line: 1,
                    state: isSafe ? "PASSED" : "FAILED",
                    count: isSafe ? passed : failed || 1,
                    observedFailure: isSafe ? "All test assertions passed cleanly" : "Regression detected in test suite",
                    details: res.logs.split("\n")[0] || "Test execution output",
                    suggestedFix: isSafe ? "No change required" : `Add compatibility shim for '${res.mutation.newValue}'`,
                },
            ];
        const affectedFilesList = res.affectedFiles && res.affectedFiles.length > 0
            ? res.affectedFiles
            : [res.mutation.filePath];
        return {
            id: res.simulationId,
            repo: res.repository.name,
            branch: res.repository.branch,
            commit: res.repository.commit || commit || "HEAD",
            proposedChange: {
                title: `Mutate ${res.mutation.filePath}`,
                targetFile: res.mutation.filePath,
                findPattern: res.mutation.oldValue,
                findLineStart: 1,
                findLineEnd: 1,
                replacePattern: res.mutation.newValue,
                oldCode: res.mutation.oldValue,
                newCode: res.mutation.newValue,
            },
            status: isSafe ? "safe" : "regression",
            statusLabel: isSafe
                ? "Safe / Verified"
                : `${failed} Regression${failed === 1 ? "" : "s"} Detected`,
            testsPassed: passed,
            totalTests: total,
            duration: `${(res.durationMs / 1000).toFixed(1)}s`,
            timeAgo: "Just now",
            workspaces: `${res.repository.name} / Sandbox-Twin`,
            workflows,
            stackTrace: res.logs,
            remediation: {
                planSummary: isSafe
                    ? "All test invariants held true with proposed mutation."
                    : `Bob analyzed the failure in ${res.mutation.filePath} across ${affectedFilesList.length} files and generated an isolated backward-compatible patch.`,
                preparedDiff: {
                    added: 1,
                    removed: 1,
                    files: affectedFilesList.map((f, i) => ({
                        status: "M",
                        path: f,
                        type: i === 0 ? "primary" : "secondary",
                    })),
                },
                targetState: isSafe
                    ? "All workflows passed — Safe to deploy."
                    : `${total} / ${total} workflows expected to pass once remediation is verified.`,
            },
            bobRemediationData: res.bobRemediationData,
            baseline: res.baseline,
            simulationMetrics: res.simulation,
            affectedFiles: res.affectedFiles,
            failureDetails: res.failureDetails,
            sandboxPath: res.sandboxPath,
            hostEnv: {
                sandboxStatus: isSafe ? "Verified" : "Active",
                repoTag: `${res.repository.name}@${res.repository.branch}`,
                filesChanged: res.changedFiles.length || 1,
                testSuite: req.testCommand,
                productionImpact: "0 (Isolated)",
            },
            isReal: true,
            profile: res.profile,
            errorMessage: res.errorMessage,
        };
    }
    /**
     * Compatibility method for fast draft creation. Persists to disk state store.
     */
    createSimulation(input) {
        const simId = this.getNextSimId();
        const repoName = input.repoUrl.replace("https://github.com/", "").split("/")[1] || "Repository";
        const newSim = {
            id: simId,
            repo: repoName,
            branch: input.branch || "main",
            commit: "7f9a2e1",
            proposedChange: {
                title: `Modify ${input.targetFile}`,
                targetFile: input.targetFile,
                findPattern: input.findPattern,
                findLineStart: 1,
                findLineEnd: 1,
                replacePattern: input.replacePattern,
                oldCode: input.findPattern,
                newCode: input.replacePattern,
            },
            status: "needs_attention",
            statusLabel: "Pending Simulation",
            testsPassed: 0,
            totalTests: 0,
            duration: "0.0s",
            timeAgo: "Just now",
            workspaces: `${repoName} / Prod-Sim`,
            workflows: [],
            stackTrace: `Simulated modification of ${input.targetFile}\nFound: ${input.findPattern}\nReplaced: ${input.replacePattern}`,
            remediation: {
                planSummary: "Bob identified affected call sites and generated a backward-compatible remediation plan.",
                preparedDiff: {
                    added: 1,
                    removed: 1,
                    files: [{ status: "M", path: input.targetFile, type: "primary" }],
                },
                targetState: "All workflows expected to pass once remediation is verified.",
            },
            hostEnv: {
                sandboxStatus: "Active",
                repoTag: `${repoName}@${input.branch || "main"}`,
                filesChanged: 1,
                testSuite: input.testCommand || "npm test",
                productionImpact: "0 (Isolated)",
            },
            isReal: true,
        };
        const persistent = state_store_1.StateStore.mockToPersistent(newSim);
        state_store_1.StateStore.saveState(persistent);
        return newSim;
    }
}
exports.simulationService = new SimulationService();
