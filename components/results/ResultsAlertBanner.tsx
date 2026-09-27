import React from "react";
import { Simulation } from "@/lib/simulation/types";

interface ResultsAlertBannerProps {
  isRemediated: boolean;
  simulation?: Simulation;
}

export function ResultsAlertBanner({
  isRemediated,
  simulation,
}: ResultsAlertBannerProps) {
  // Case 1: Simulation Error (Mutation failed or pre-test environment issue)
  if (simulation?.status === "error") {
    const errorDetail =
      simulation.errorMessage ||
      simulation.stackTrace ||
      "Mutation could not be applied to the target file in the sandbox.";

    return (
      <div className="mb-space-lg rounded-lg bg-surface-container-low p-space-md border border-error/30">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-space-md">
          <div className="flex items-start gap-space-md">
            <div className="w-8 h-8 rounded bg-error-container/20 flex items-center justify-center flex-shrink-0 mt-0.5 text-error">
              <span className="material-symbols-outlined text-[18px]">error</span>
            </div>
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-semibold uppercase tracking-wider text-error">
                  Simulation Error
                </span>
                <span className="text-xs font-mono text-outline">· Execution Halted</span>
              </div>
              <p className="text-sm font-medium text-on-surface">
                Mutation could not be applied to target file.
              </p>
              <p className="text-xs font-mono text-outline">
                Reason: <span className="text-error/90">{errorDetail}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start md:self-auto flex-shrink-0 text-xs font-mono text-outline bg-surface-container px-3 py-1.5 rounded border border-surface-container-high/40">
            <span>No tests executed</span>
          </div>
        </div>
      </div>
    );
  }

  const total =
    simulation?.simulationMetrics?.total ??
    (simulation?.totalTests ?? 0);
  const passed = isRemediated
    ? total
    : (simulation?.simulationMetrics?.passed ?? (simulation?.testsPassed ?? 0));
  const failed = isRemediated
    ? 0
    : (simulation?.simulationMetrics?.failed ?? Math.max(0, total - passed));

  // Case 2: Verified Safe to Deploy
  if (isRemediated || simulation?.status === "safe") {
    return (
      <div className="mb-space-lg rounded-lg bg-surface-container-low p-space-md border border-secondary/30">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-space-md">
          <div className="flex items-start gap-space-md">
            <div className="w-8 h-8 rounded bg-secondary-container/30 flex items-center justify-center flex-shrink-0 mt-0.5 text-secondary">
              <span className="material-symbols-outlined text-[18px]">verified</span>
            </div>
            <div className="flex flex-col gap-0.5">
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-semibold uppercase tracking-wider text-secondary">
                  Verification Passed
                </span>
                <span className="text-xs font-mono text-outline">· Gate Unlocked</span>
              </div>
              <p className="text-sm font-semibold text-on-surface">
                {total > 0 ? `${total} / ${total} tests passed` : "All assertions passed"} — Safe to deploy.
              </p>
              <p className="text-xs text-outline">
                Remediation verified cleanly inside the isolated sandbox. Zero downstream regressions detected.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start md:self-auto flex-shrink-0 text-xs font-mono bg-surface-container px-3 py-1.5 rounded border border-surface-container-high/40">
            <span className="text-outline">{total} executed</span>
            <span className="text-outline-variant">·</span>
            <span className="text-secondary font-medium">{passed} passed</span>
            <span className="text-outline-variant">·</span>
            <span className="text-outline">{failed} failed</span>
          </div>
        </div>
      </div>
    );
  }

  // Case 3: Zero Tests Executed fallback (when total is 0 and no error)
  if (total === 0) {
    return (
      <div className="mb-space-lg rounded-lg bg-surface-container-low p-space-md border border-surface-container-high/40">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-space-md">
          <div className="flex items-start gap-space-md">
            <div className="w-8 h-8 rounded bg-surface-container-high flex items-center justify-center flex-shrink-0 mt-0.5 text-outline">
              <span className="material-symbols-outlined text-[18px]">info</span>
            </div>
            <div className="flex flex-col gap-0.5">
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-semibold uppercase tracking-wider text-outline">
                  Simulation Complete
                </span>
                <span className="text-xs font-mono text-outline">· No Test Metrics</span>
              </div>
              <p className="text-sm font-medium text-on-surface">
                Mutation applied successfully in sandbox.
              </p>
              <p className="text-xs text-outline">
                No automated test suites were detected or executed for this run.
              </p>
            </div>
          </div>

          <div className="flex items-center self-start md:self-auto flex-shrink-0 text-xs font-mono text-outline bg-surface-container px-3 py-1.5 rounded border border-surface-container-high/40">
            <span>No tests executed</span>
          </div>
        </div>
      </div>
    );
  }

  // Case 4: Real Regression Detected
  return (
    <div className="mb-space-lg rounded-lg bg-surface-container-low p-space-md border border-error/30">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-space-md">
        <div className="flex items-start gap-space-md">
          <div className="w-8 h-8 rounded bg-error-container/20 flex items-center justify-center flex-shrink-0 mt-0.5 text-error">
            <span className="material-symbols-outlined text-[18px]">warning</span>
          </div>
          <div className="flex flex-col gap-0.5">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-semibold uppercase tracking-wider text-error">
                Regression Detected
              </span>
              <span className="text-xs font-mono text-outline">· Deployment Blocked</span>
            </div>
            <p className="text-sm font-semibold text-on-surface">
              {failed} test failure{failed === 1 ? "" : "s"} observed after applying mutation.
            </p>
            <p className="text-xs text-outline">
              Consumer assertions broke in the isolated twin. Production deployment gate remains blocked.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start md:self-auto flex-shrink-0 text-xs font-mono bg-surface-container px-3 py-1.5 rounded border border-surface-container-high/40">
          <span className="text-outline">{total} executed</span>
          <span className="text-outline-variant">·</span>
          <span className="text-secondary font-medium">{passed} passed</span>
          <span className="text-outline-variant">·</span>
          <span className="text-error font-medium">{failed} failed</span>
        </div>
      </div>
    </div>
  );
}
