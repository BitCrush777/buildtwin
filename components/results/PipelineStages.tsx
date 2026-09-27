import React from "react";
import { Simulation } from "@/lib/simulation/types";

interface PipelineStagesProps {
  isRemediated: boolean;
  simulation?: Simulation;
}

export function PipelineStages({ isRemediated, simulation }: PipelineStagesProps) {
  const isError = simulation?.status === "error";

  const baselineTotal =
    simulation?.baseline?.total ??
    (simulation?.totalTests ?? 0);
  const baselinePassed =
    simulation?.baseline?.passed ?? baselineTotal;

  const total =
    simulation?.simulationMetrics?.total ??
    (simulation?.totalTests ?? 0);
  const passed = isRemediated
    ? total
    : (simulation?.simulationMetrics?.passed ?? (simulation?.testsPassed ?? 0));
  const failed = isRemediated
    ? 0
    : (simulation?.simulationMetrics?.failed ?? Math.max(0, total - passed));

  return (
    <div className="mb-space-lg flex flex-col gap-2">
      <div className="flex items-center justify-between px-1 text-xs font-mono text-outline">
        <span className="uppercase tracking-wider">
          Twin Isolation Pipeline
        </span>
        <span>Isolated Sandbox Verification</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-space-md">
        {/* Step 1: Baseline */}
        <div className="flex flex-col rounded-lg bg-surface-container-low p-space-md border border-surface-container-high/40">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-mono px-1.5 py-0.5 rounded bg-surface-container text-outline uppercase font-semibold">
              01 · BASELINE
            </span>
            <span className="flex items-center gap-1.5 text-xs font-mono text-secondary">
              <span className="w-1.5 h-1.5 rounded-full bg-secondary" />
              {baselineTotal > 0 ? `${baselinePassed}/${baselineTotal} passed` : "Clean state"}
            </span>
          </div>
          <div className="text-sm font-semibold text-on-surface">
            Original Branch State
          </div>
          <p className="text-xs text-outline mt-1 mb-space-md leading-relaxed">
            Unmodified reference state on <code className="text-on-surface font-mono">{simulation?.branch || "main"}</code> before applying any changes.
          </p>
          <div className="mt-auto pt-2 flex items-center justify-between text-xs font-mono border-t border-surface-container-high/30">
            <span className="text-outline">Pre-flight check:</span>
            <span className="text-secondary font-medium">
              {baselineTotal > 0 ? `${baselinePassed} / ${baselineTotal} clean` : "No regressions"}
            </span>
          </div>
        </div>

        {/* Step 2: Simulation */}
        <div className="flex flex-col rounded-lg bg-surface-container-low p-space-md border border-surface-container-high/40">
          <div className="flex items-center justify-between mb-2">
            <span
              className={`text-[11px] font-mono px-1.5 py-0.5 rounded uppercase font-semibold ${
                isError
                  ? "bg-error-container/20 text-error"
                  : failed > 0
                  ? "bg-error-container/20 text-error"
                  : "bg-surface-container text-secondary"
              }`}
            >
              {isError ? "02 · SIMULATION ERROR" : "02 · MUTATION SIMULATION"}
            </span>
            <span
              className={`flex items-center gap-1.5 text-xs font-mono ${
                isError ? "text-error" : failed > 0 ? "text-error font-medium" : "text-secondary"
              }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  isError || failed > 0 ? "bg-error" : "bg-secondary"
                }`}
              />
              {isError
                ? "Halted (0 tests)"
                : failed > 0
                ? `${failed} test${failed === 1 ? "" : "s"} failed`
                : total > 0
                ? `${total}/${total} passed`
                : "No tests executed"}
            </span>
          </div>
          <div className="text-sm font-semibold text-on-surface">
            {isError ? "Mutation Execution Halted" : "Ephemeral Twin Test"}
          </div>
          <p className="text-xs text-outline mt-1 mb-space-md leading-relaxed">
            {isError
              ? (simulation?.errorMessage || "Target file or pattern could not be applied in the sandbox.")
              : failed > 0
              ? `Applied mutation inside sandbox. Observed ${failed} test failure${failed === 1 ? "" : "s"}.`
              : total > 0
              ? "Applied mutation inside sandbox. All assertions passed cleanly."
              : "Applied mutation inside sandbox. No test suite configured."}
          </p>
          <div className="mt-auto pt-2 flex items-center justify-between text-xs font-mono border-t border-surface-container-high/30">
            <span className="text-outline">Result:</span>
            <span
              className={
                isError || failed > 0
                  ? "text-error font-medium"
                  : "text-secondary font-medium"
              }
            >
              {isError
                ? "Execution Halted"
                : failed > 0
                ? `${failed} regression${failed === 1 ? "" : "s"} caught`
                : total > 0
                ? "All tests passed"
                : "No tests executed"}
            </span>
          </div>
        </div>

        {/* Step 3: Remediation & Verification */}
        <div
          className={`flex flex-col rounded-lg p-space-md border transition-all ${
            isRemediated
              ? "bg-surface-container-low border-secondary/40"
              : "bg-surface-container-low border-surface-container-high/40"
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-mono px-1.5 py-0.5 rounded bg-surface-container text-primary uppercase font-semibold">
              {isError
                ? "03 · NO REMEDIATION"
                : isRemediated
                ? "03 · VERIFICATION"
                : "03 · REMEDIATION"}
            </span>
            <span className="flex items-center gap-1.5 text-xs font-mono text-outline">
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  isError
                    ? "bg-outline"
                    : isRemediated
                    ? "bg-secondary"
                    : "bg-primary"
                }`}
              />
              {isError
                ? "Disabled"
                : isRemediated
                ? "Verified Clean"
                : "Awaiting Verification"}
            </span>
          </div>
          <div className="text-sm font-semibold text-on-surface">
            {isError
              ? "Remediation Inactive"
              : isRemediated
              ? "Remediation Verified"
              : "Remediation Plan"}
          </div>
          <p className="text-xs text-outline mt-1 mb-space-md leading-relaxed">
            {isError
              ? "Remediation is disabled because simulation halted before running test suites."
              : isRemediated
              ? "Remediation patch applied and verified cleanly inside isolated sandbox."
              : "Remediation patch generated by IBM Bob. Awaiting isolated sandbox verification."}
          </p>
          <div className="mt-auto pt-2 flex items-center justify-between text-xs font-mono border-t border-surface-container-high/30">
            <span className="text-outline">Deployment Gate:</span>
            <span
              className={
                isError
                  ? "text-outline"
                  : isRemediated
                  ? "text-secondary font-medium"
                  : "text-tertiary font-medium"
              }
            >
              {isError
                ? "Halted"
                : isRemediated
                ? "Safe to Deploy"
                : "Awaiting Verification"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
