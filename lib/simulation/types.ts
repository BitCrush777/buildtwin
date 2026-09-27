import { RepositoryProfile } from "./profile-service";

export type SimulationStatus =
  | 'regression'
  | 'safe'
  | 'needs_attention'
  | 'running'
  | 'remediated'
  | 'passed'
  | 'failed'
  | 'error';

export interface ImpactedWorkflow {
  id: string;
  name: string;
  filePath: string;
  line: number;
  state: 'FAILED' | 'PASSED';
  count: number;
  observedFailure: string;
  details: string;
  suggestedFix: string;
}

export interface BobRemediationPlan {
  planSummary: string;
  preparedDiff: {
    added: number;
    removed: number;
    files: Array<{
      status: 'M' | 'A' | 'D';
      path: string;
      type: 'primary' | 'secondary';
    }>;
  };
  targetState: string;
}

export interface ProposedChangeItem {
  filePath: string;
  description: string;
  diffSnippet?: string;
}

export interface BobRemediationData {
  summary: string;
  affectedFiles: string[];
  plan: string[];
  proposedChanges: ProposedChangeItem[];
  tests: string[];
}

export interface VerificationResult {
  simulationId: string;
  status: 'passed' | 'failed' | 'error';
  testCounts: {
    total: number | null;
    passed: number | null;
    failed: number | null;
  };
  logs: string;
  durationMs: number;
  affectedWorkflows: ImpactedWorkflow[];
  isSafeToDeploy: boolean;
}

export interface TestRunMetrics {
  status: 'passed' | 'failed' | 'error';
  total: number | null;
  passed: number | null;
  failed: number | null;
  logs: string;
  durationMs?: number;
  exitCode?: number;
}

export interface FailureDetail {
  test: string;
  file?: string;
  message: string;
}

export interface MutationInfo {
  filePath: string;
  oldValue: string;
  newValue: string;
  applied: boolean;
}

export interface Simulation {
  id: string;
  repo: string;
  branch: string;
  commit: string;
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
  status: SimulationStatus;
  statusLabel: string;
  testsPassed: number;
  totalTests: number;
  duration: string;
  timeAgo: string;
  workspaces: string;
  workflows: ImpactedWorkflow[];
  stackTrace: string;
  remediation?: BobRemediationPlan;
  bobRemediationData?: BobRemediationData;
  hostEnv: {
    sandboxStatus: string;
    repoTag: string;
    filesChanged: number;
    testSuite: string;
    productionImpact: string;
  };
  baseline?: TestRunMetrics;
  simulationMetrics?: TestRunMetrics;
  affectedFiles?: string[];
  failureDetails?: FailureDetail[];
  sandboxPath?: string;
  isReal?: boolean;
  profile?: RepositoryProfile;
  errorMessage?: string;
}

export interface CreateSimulationInput {
  repoUrl: string;
  branch?: string;
  targetFile: string;
  findPattern: string;
  replacePattern: string;
  testCommand: string;
}

export interface SimulateRequest {
  repoUrl: string;
  branch?: string;
  filePath: string;
  oldValue: string;
  newValue: string;
  testCommand: string;
}

export interface SimulateResponse {
  simulationId: string;
  status: 'passed' | 'failed' | 'error';
  repository: {
    name: string;
    branch: string;
    commit?: string;
  };
  mutation: MutationInfo;
  tests: {
    total: number | null;
    passed: number | null;
    failed: number | null;
  };
  baseline?: TestRunMetrics;
  simulation?: TestRunMetrics;
  sandboxPath?: string;
  affectedFiles?: string[];
  failureDetails?: FailureDetail[];
  logs: string;
  durationMs: number;
  changedFiles: string[];
  errorMessage?: string;
  bobRemediationData?: BobRemediationData;
  profile?: RepositoryProfile;
  impactedWorkflows?: ImpactedWorkflow[];
}

/**
 * Structured result returned by buildtwin_apply_patch.
 */
export interface ApplyPatchResponse {
  simulationId: string;
  applied: boolean;
  changedFiles: string[];
  diffSummary: string;
  error?: string;
}

/**
 * Full remediation result produced by Bob after analysis, patch generation,
 * application, and verification. Replaces the hardcoded BobRemediationData
 * template with a real, data-driven structure.
 */
export interface RemediationResult {
  simulationId: string;
  summary: string;
  affectedFiles: string[];
  plan: string[];
  patch: string;
  tests: string[];
  applyResult?: ApplyPatchResponse;
  verificationResult?: VerificationResult;
}
