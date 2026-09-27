import path from "path";
import fs from "fs";
import {
  Simulation,
  SimulateResponse,
  MutationInfo,
  TestRunMetrics,
  FailureDetail,
  ImpactedWorkflow,
  BobRemediationPlan,
  BobRemediationData,
  VerificationResult,
  SimulationStatus,
} from "./types";
import { RepositoryProfile } from "./profile-service";
import { MOCK_SIMULATIONS } from "../mock-data";

export interface PersistentSimulationState {
  simulationId: string;
  status: SimulationStatus;
  statusLabel: string;
  repository: {
    name: string;
    url?: string;
    branch: string;
    commit: string;
  };
  branch: string;
  commit: string;
  mutation: MutationInfo;
  tests: {
    total: number | null;
    passed: number | null;
    failed: number | null;
  };
  baseline?: TestRunMetrics;
  simulation?: TestRunMetrics;
  sandboxPath?: string;
  testCommand: string;
  affectedFiles: string[];
  failureDetails: FailureDetail[];
  remediation?: BobRemediationPlan;
  bobRemediationData?: BobRemediationData;
  verification?: VerificationResult;
  logs: string;
  durationMs: number;
  changedFiles: string[];
  errorMessage?: string;
  timestamps: {
    createdAt: string;
    updatedAt: string;
    verifiedAt?: string;
  };
  // UI presentation fields
  proposedChange: {
    title: string;
    targetFile: string;
    findPattern: string;
    findLineStart: number;
    findLineEnd: number;
    replacePattern: string;
    oldCode: string;
    newCode: string;
  };
  workflows: ImpactedWorkflow[];
  stackTrace: string;
  hostEnv: {
    sandboxStatus: string;
    repoTag: string;
    filesChanged: number;
    testSuite: string;
    productionImpact: string;
  };
  isReal?: boolean;
  profile?: RepositoryProfile;
}

export class StateStore {
  private static getBaseDir(): string {
    return path.resolve(process.cwd(), ".buildtwin", "runs");
  }

  /**
   * Validates simulation ID to prevent directory traversal.
   * Only allows alphanumeric characters, hyphens, and underscores.
   */
  public static validateId(id: string): string {
    if (!id || typeof id !== "string") {
      throw new Error("Simulation ID is required.");
    }
    const cleanId = id.replace(/^#/, "").trim();
    if (!/^[a-zA-Z0-9_\-]+$/.test(cleanId)) {
      throw new Error(
        `Invalid simulation ID: "${id}". Only alphanumeric characters, hyphens, and underscores are allowed.`
      );
    }
    return cleanId;
  }

  /**
   * Returns safe resolved run directory path.
   */
  public static getRunDir(id: string): string {
    const cleanId = this.validateId(id);
    const baseDir = this.getBaseDir();
    const runDir = path.resolve(baseDir, cleanId);

    // Security invariant: verify target path is inside baseDir
    if (!runDir.startsWith(baseDir)) {
      throw new Error("Security violation: path traversal detected in simulation ID.");
    }

    return runDir;
  }

  /**
   * Returns the path to state.json for a given simulation ID.
   */
  public static getStatePath(id: string): string {
    return path.join(this.getRunDir(id), "state.json");
  }

  /**
   * Ensures base directory exists.
   */
  private static ensureBaseDir(): void {
    const baseDir = this.getBaseDir();
    if (!fs.existsSync(baseDir)) {
      fs.mkdirSync(baseDir, { recursive: true });
    }
  }

  /**
   * Persists a simulation state to disk atomically.
   */
  public static saveState(state: PersistentSimulationState): void {
    this.ensureBaseDir();
    const runDir = this.getRunDir(state.simulationId);
    if (!fs.existsSync(runDir)) {
      fs.mkdirSync(runDir, { recursive: true });
    }

    const statePath = path.join(runDir, "state.json");
    const json = JSON.stringify(state, null, 2);

    // Write to temporary file first then rename for atomic write
    const tempPath = `${statePath}.tmp.${Date.now()}`;
    fs.writeFileSync(tempPath, json, "utf-8");
    fs.renameSync(tempPath, statePath);

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
      fs.writeFileSync(
        path.join(runDir, "metadata.json"),
        JSON.stringify(metadata, null, 2),
        "utf-8"
      );
    } catch {}

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
        fs.writeFileSync(
          path.join(runDir, "remediation.json"),
          JSON.stringify(remediationData, null, 2),
          "utf-8"
        );
      }
    } catch {}
  }

  /**
   * Reads a simulation state from disk.
   */
  public static getState(id: string): PersistentSimulationState | null {
    try {
      const statePath = this.getStatePath(id);
      if (!fs.existsSync(statePath)) {
        // Fallback: check if it's one of the initial mock simulations
        return this.getMockState(id);
      }
      const raw = fs.readFileSync(statePath, "utf-8");
      return JSON.parse(raw);
    } catch (err: any) {
      if (err.code === "ENOENT") {
        return this.getMockState(id);
      }
      throw err;
    }
  }

  /**
   * Updates an existing simulation state on disk.
   */
  public static updateState(
    id: string,
    updates: Partial<PersistentSimulationState>
  ): PersistentSimulationState {
    const existing = this.getState(id);
    if (!existing) {
      throw new Error(`Simulation #${id} not found in state store.`);
    }

    const updated: PersistentSimulationState = {
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
  public static getAllStates(): PersistentSimulationState[] {
    this.ensureBaseDir();
    const baseDir = this.getBaseDir();
    const entries = fs.readdirSync(baseDir, { withFileTypes: true });
    const states: PersistentSimulationState[] = [];
    const seenIds = new Set<string>();

    for (const entry of entries) {
      if (entry.isDirectory()) {
        const stateFile = path.join(baseDir, entry.name, "state.json");
        if (fs.existsSync(stateFile)) {
          try {
            const raw = fs.readFileSync(stateFile, "utf-8");
            const parsed = JSON.parse(raw);
            states.push(parsed);
            seenIds.add(parsed.simulationId.toLowerCase());
          } catch {
            // ignore corrupted run
          }
        }
      }
    }

    // Include mock simulations if not already saved to disk
    for (const mock of MOCK_SIMULATIONS) {
      if (!seenIds.has(mock.id.toLowerCase())) {
        const converted = this.mockToPersistent(mock);
        states.push(converted);
        // Persist mock to disk for cross-process consistency
        try {
          this.saveState(converted);
        } catch {}
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
  private static getMockState(id: string): PersistentSimulationState | null {
    const cleanId = id.replace(/^#/, "").toLowerCase();
    const found = MOCK_SIMULATIONS.find(
      (m) => m.id.toLowerCase() === cleanId || m.id.replace("#", "").toLowerCase() === cleanId
    );
    if (!found) return null;
    const persistent = this.mockToPersistent(found);
    try {
      this.saveState(persistent);
    } catch {}
    return persistent;
  }

  /**
   * Converts UI Simulation to PersistentSimulationState
   */
  public static mockToPersistent(sim: Simulation): PersistentSimulationState {
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
  public static persistentToUi(state: PersistentSimulationState): Simulation {
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
