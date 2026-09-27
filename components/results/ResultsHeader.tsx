import React from "react";
import { Simulation } from "@/lib/simulation/types";

interface ResultsHeaderProps {
  simulation: Simulation;
  isRemediated: boolean;
  onAskBob: () => void;
  onRerun: () => void;
  onViewDiff: () => void;
}

export function ResultsHeader({
  simulation,
  isRemediated,
  onAskBob,
  onRerun,
  onViewDiff,
}: ResultsHeaderProps) {
  const isError = simulation.status === "error";
  const isSafe = isRemediated || simulation.status === "safe";
  const isRegression = simulation.status === "regression" && !isRemediated;

  const repoName = simulation.repo.replace(/^https?:\/\/github\.com\//i, "");

  return (
    <div className="flex flex-col gap-space-md pb-space-lg mb-space-lg border-b border-surface-container-high/40">
      {/* Top Metadata Bar: Calm, technical breadcrumb */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs font-mono text-outline">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-on-surface-variant font-medium flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[14px] text-outline">
              deployed_code
            </span>
            {repoName}
          </span>
          <span className="text-outline-variant">/</span>
          <span className="px-1.5 py-0.5 rounded bg-surface-container text-on-surface font-medium">
            {simulation.branch}
          </span>
          <span className="text-outline-variant">·</span>
          <span>
            Commit <code className="text-on-surface font-medium">{simulation.commit?.slice(0, 7) || "HEAD"}</code>
          </span>
          <span className="text-outline-variant">·</span>
          <span>
            Duration: <span className="text-on-surface font-medium">{simulation.duration}</span>
          </span>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <span className="flex items-center gap-1.5">
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                isError
                  ? "bg-error"
                  : isSafe
                  ? "bg-secondary"
                  : "bg-tertiary"
              }`}
            />
            <span>Twin Sandbox:</span>
            <span className="text-on-surface font-medium">
              {isError
                ? "Halted (Error)"
                : isSafe
                ? "Verified Clean"
                : "Active Sandbox"}
            </span>
          </span>
        </div>
      </div>

      {/* Main Header & Actions Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-space-md">
        <div className="flex flex-col gap-1.5 min-w-0">
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-on-surface">
              Simulation #{simulation.id.replace("#", "")}
            </h1>

            {isError ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-mono font-medium bg-error-container/20 text-error border border-error/30">
                <span className="material-symbols-outlined text-[12px]">error</span>
                SIMULATION ERROR
              </span>
            ) : isSafe ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-mono font-medium bg-secondary-container/30 text-secondary border border-secondary/30">
                <span className="material-symbols-outlined text-[12px]">verified</span>
                SAFE TO DEPLOY
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-mono font-medium bg-error-container/20 text-error border border-error/30">
                <span className="material-symbols-outlined text-[12px]">warning</span>
                REGRESSION DETECTED
              </span>
            )}
          </div>

          {/* Target change description */}
          <div className="flex items-center gap-2 text-xs font-mono text-on-surface-variant flex-wrap">
            <span className="text-outline">Proposed change:</span>
            <code className="text-primary font-medium px-1 py-0.5 rounded bg-surface-container">
              {simulation.proposedChange.targetFile}
            </code>
            <span className="text-outline-variant">·</span>
            <span className="text-error/90 line-through">
              {simulation.proposedChange.findPattern.split("\n")[0].slice(0, 32)}
            </span>
            <span className="text-outline">→</span>
            <span className="text-secondary font-medium">
              {simulation.proposedChange.replacePattern.split("\n")[0].slice(0, 32)}
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2 flex-shrink-0">
          <button
            onClick={onRerun}
            className="flex items-center gap-1.5 h-8 px-3 rounded text-xs font-medium bg-surface-container hover:bg-surface-container-high text-on-surface transition-colors border border-surface-container-high/50"
            type="button"
          >
            <span className="material-symbols-outlined text-[15px] text-outline">
              sync
            </span>
            <span>Rerun Simulation</span>
          </button>

          <button
            onClick={onViewDiff}
            className="flex items-center gap-1.5 h-8 px-3 rounded text-xs font-medium bg-surface-container hover:bg-surface-container-high text-on-surface transition-colors border border-surface-container-high/50"
            type="button"
          >
            <span className="material-symbols-outlined text-[15px] text-outline">
              difference
            </span>
            <span>View Diff</span>
          </button>

          {isRegression && (
            <button
              onClick={onAskBob}
              className="flex items-center gap-1.5 h-8 px-3.5 rounded text-xs font-semibold bg-primary text-on-primary hover:bg-primary-container hover:text-on-primary-container transition-colors shadow-sm"
              type="button"
            >
              <span className="material-symbols-outlined text-[15px]">
                auto_fix_high
              </span>
              <span>Ask Bob to Fix</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
