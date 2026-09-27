"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.StateStore = void 0;
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const mock_data_1 = require("../mock-data");
class StateStore {
    static getBaseDir() {
        return path_1.default.resolve(process.cwd(), ".buildtwin", "runs");
    }
    /**
     * Validates simulation ID to prevent directory traversal.
     * Only allows alphanumeric characters, hyphens, and underscores.
     */
    static validateId(id) {
        if (!id || typeof id !== "string") {
            throw new Error("Simulation ID is required.");
        }
        const cleanId = id.replace(/^#/, "").trim();
        if (!/^[a-zA-Z0-9_\-]+$/.test(cleanId)) {
            throw new Error(`Invalid simulation ID: "${id}". Only alphanumeric characters, hyphens, and underscores are allowed.`);
        }
        return cleanId;
    }
    /**
     * Returns safe resolved run directory path.
     */
    static getRunDir(id) {
        const cleanId = this.validateId(id);
        const baseDir = this.getBaseDir();
        const runDir = path_1.default.resolve(baseDir, cleanId);
        // Security invariant: verify target path is inside baseDir
        if (!runDir.startsWith(baseDir)) {
            throw new Error("Security violation: path traversal detected in simulation ID.");
        }
        return runDir;
    }
    /**
     * Returns the path to state.json for a given simulation ID.
     */
    static getStatePath(id) {
        return path_1.default.join(this.getRunDir(id), "state.json");
    }
    /**
     * Ensures base directory exists.
     */
    static ensureBaseDir() {
        const baseDir = this.getBaseDir();
        if (!fs_1.default.existsSync(baseDir)) {
            fs_1.default.mkdirSync(baseDir, { recursive: true });
        }
    }
    /**
     * Persists a simulation state to disk atomically.
     */
    static saveState(state) {
        this.ensureBaseDir();
        const runDir = this.getRunDir(state.simulationId);
        if (!fs_1.default.existsSync(runDir)) {
            fs_1.default.mkdirSync(runDir, { recursive: true });
        }
        const statePath = path_1.default.join(runDir, "state.json");
        const json = JSON.stringify(state, null, 2);
        // Write to temporary file first then rename for atomic write
        const tempPath = `${statePath}.tmp.${Date.now()}`;
        fs_1.default.writeFileSync(tempPath, json, "utf-8");
        fs_1.default.renameSync(tempPath, statePath);
        // Also write metadata.json for lightweight inspection
        try {
            const metadata = {
                simulationId: state.simulationId,
                status: state.status,
                statusLabel: state.statusLabel,
                repository: state.repository,
                branch: state.branch,
                commit: state.commit,
                mutation: state.mutation,
                testCommand: state.testCommand,
                sandboxPath: state.sandboxPath,
                timestamps: state.timestamps,
            };
            fs_1.default.writeFileSync(path_1.default.join(runDir, "metadata.json"), JSON.stringify(metadata, null, 2), "utf-8");
        }
        catch { }
        // If Bob remediation data or remediation plan exists, write remediation.json
        try {
            if (state.bobRemediationData || state.remediation) {
                const remediationData = {
                    simulationId: state.simulationId,
                    planSummary: state.remediation?.planSummary,
                    targetState: state.remediation?.targetState,
                    bobRemediationData: state.bobRemediationData,
                    verification: state.verification,
                    updatedAt: state.timestamps.updatedAt,
                };
                fs_1.default.writeFileSync(path_1.default.join(runDir, "remediation.json"), JSON.stringify(remediationData, null, 2), "utf-8");
            }
        }
        catch { }
    }
    /**
     * Reads a simulation state from disk.
     */
    static getState(id) {
        try {
            const statePath = this.getStatePath(id);
            if (!fs_1.default.existsSync(statePath)) {
                // Fallback: check if it's one of the initial mock simulations
                return this.getMockState(id);
            }
            const raw = fs_1.default.readFileSync(statePath, "utf-8");
            return JSON.parse(raw);
        }
        catch (err) {
            if (err.code === "ENOENT") {
                return this.getMockState(id);
            }
            throw err;
        }
    }
    /**
     * Updates an existing simulation state on disk.
     */
    static updateState(id, updates) {
        const existing = this.getState(id);
        if (!existing) {
            throw new Error(`Simulation #${id} not found in state store.`);
        }
        const updated = {
            ...existing,
            ...updates,
            timestamps: {
                ...existing.timestamps,
                ...updates.timestamps,
                updatedAt: new Date().toISOString(),
            },
        };
        this.saveState(updated);
        return updated;
    }
    /**
     * Lists all persistent simulation states from disk.
     */
    static getAllStates() {
        this.ensureBaseDir();
        const baseDir = this.getBaseDir();
        const entries = fs_1.default.readdirSync(baseDir, { withFileTypes: true });
        const states = [];
        const seenIds = new Set();
        for (const entry of entries) {
            if (entry.isDirectory()) {
                const stateFile = path_1.default.join(baseDir, entry.name, "state.json");
                if (fs_1.default.existsSync(stateFile)) {
                    try {
                        const raw = fs_1.default.readFileSync(stateFile, "utf-8");
                        const parsed = JSON.parse(raw);
                        states.push(parsed);
                        seenIds.add(parsed.simulationId.toLowerCase());
                    }
                    catch {
                        // ignore corrupted run
                    }
                }
            }
        }
        // Include mock simulations if not already saved to disk
        for (const mock of mock_data_1.MOCK_SIMULATIONS) {
            if (!seenIds.has(mock.id.toLowerCase())) {
                const converted = this.mockToPersistent(mock);
                states.push(converted);
                // Persist mock to disk for cross-process consistency
                try {
                    this.saveState(converted);
                }
                catch { }
            }
        }
        // Sort by creation time descending (newest first)
        states.sort((a, b) => {
            const timeA = new Date(a.timestamps?.createdAt || 0).getTime();
            const timeB = new Date(b.timestamps?.createdAt || 0).getTime();
            return timeB - timeA;
        });
        return states;
    }
    /**
     * Helper to retrieve mock simulation formatted as PersistentSimulationState
     */
    static getMockState(id) {
        const cleanId = id.replace(/^#/, "").toLowerCase();
        const found = mock_data_1.MOCK_SIMULATIONS.find((m) => m.id.toLowerCase() === cleanId || m.id.replace("#", "").toLowerCase() === cleanId);
        if (!found)
            return null;
        const persistent = this.mockToPersistent(found);
        try {
            this.saveState(persistent);
        }
        catch { }
        return persistent;
    }
    /**
     * Converts UI Simulation to PersistentSimulationState
     */
    static mockToPersistent(sim) {
        return {
            simulationId: sim.id,
            status: sim.status,
            statusLabel: sim.statusLabel,
            repository: {
                name: sim.repo,
                branch: sim.branch,
                commit: sim.commit,
            },
            branch: sim.branch,
            commit: sim.commit,
            mutation: {
                filePath: sim.proposedChange.targetFile,
                oldValue: sim.proposedChange.findPattern,
                newValue: sim.proposedChange.replacePattern,
                applied: true,
            },
            tests: {
                total: sim.totalTests,
                passed: sim.testsPassed,
                failed: Math.max(0, sim.totalTests - sim.testsPassed),
            },
            baseline: sim.baseline,
            simulation: sim.simulationMetrics,
            testCommand: sim.hostEnv.testSuite || "npm test",
            affectedFiles: sim.affectedFiles || [sim.proposedChange.targetFile],
            failureDetails: sim.failureDetails || [],
            remediation: sim.remediation,
            bobRemediationData: sim.bobRemediationData,
            logs: sim.stackTrace,
            durationMs: 1200,
            changedFiles: [sim.proposedChange.targetFile],
            timestamps: {
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
            },
            sandboxPath: sim.sandboxPath,
            proposedChange: sim.proposedChange,
            workflows: sim.workflows,
            stackTrace: sim.stackTrace,
            hostEnv: sim.hostEnv,
            isReal: sim.isReal,
        };
    }
    /**
     * Converts PersistentSimulationState to UI Simulation
     */
    static persistentToUi(state) {
        return {
            id: state.simulationId,
            repo: state.repository.name,
            branch: state.branch,
            commit: state.commit,
            proposedChange: state.proposedChange,
            status: state.status,
            statusLabel: state.statusLabel,
            testsPassed: state.tests.passed ?? 0,
            totalTests: state.tests.total ?? 0,
            duration: `${(state.durationMs / 1000).toFixed(1)}s`,
            timeAgo: "Just now",
            workspaces: `${state.repository.name || "Repository"} / Sandbox-Twin`,
            workflows: state.workflows,
            stackTrace: state.logs,
            remediation: state.remediation,
            bobRemediationData: state.bobRemediationData,
            baseline: state.baseline,
            simulationMetrics: state.simulation,
            affectedFiles: state.affectedFiles,
            failureDetails: state.failureDetails,
            sandboxPath: state.sandboxPath,
            hostEnv: {
                ...state.hostEnv,
                sandboxStatus: state.sandboxPath ? "Active" : (state.status === "error" ? "Failed" : "Cleaned"),
            },
            isReal: true,
            profile: state.profile,
            errorMessage: state.errorMessage,
        };
    }
}
exports.StateStore = StateStore;
