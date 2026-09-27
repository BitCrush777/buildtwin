import React from "react";
import { ImpactedWorkflow, Simulation } from "@/lib/simulation/types";

interface ImpactTableProps {
  workflows: ImpactedWorkflow[];
  isRemediated: boolean;
  simulation?: Simulation;
}

export function ImpactTable({ workflows, isRemediated, simulation }: ImpactTableProps) {
  const hasWorkflows = workflows && workflows.length > 0;
  const targetFile = simulation?.proposedChange?.targetFile;

  return (
    <div className="flex flex-col rounded-lg bg-surface-container-low overflow-hidden border border-surface-container-high/40">
      {/* Table Header Bar */}
      <div className="flex items-center justify-between px-space-md py-space-sm bg-surface-container border-b border-surface-container-high/30">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-[16px] text-outline">
            account_tree
          </span>
          <span className="text-xs font-mono font-semibold uppercase tracking-wider text-on-surface">
            Impacted Files &amp; Call Sites
          </span>
          <span className="text-xs font-mono px-1.5 py-0.5 rounded bg-surface-container-high text-outline">
            {hasWorkflows ? workflows.length : 0} detected
          </span>
        </div>

        <div className="text-xs font-mono text-outline">
          Blast Radius Analysis
        </div>
      </div>

      {/* Table Container */}
      <div className="w-full overflow-x-auto">
        <table className="w-full text-left border-collapse min-w-[650px]">
          <thead>
            <tr className="bg-surface-container-low text-outline text-[11px] font-mono uppercase border-b border-surface-container-high/40 h-8">
              <th className="py-2 px-space-md font-medium">File</th>
              <th className="py-2 px-space-sm font-medium">Line</th>
              <th className="py-2 px-space-sm font-medium">Role</th>
              <th className="py-2 px-space-sm font-medium">Status</th>
              <th className="py-2 px-space-md font-medium">Observed Impact / Assertion</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-container-high/30 text-xs">
            {!hasWorkflows ? (
              <tr>
                <td colSpan={5} className="py-8 px-space-md text-center text-outline font-mono">
                  <div className="flex flex-col items-center justify-center gap-1.5">
                    <span className="material-symbols-outlined text-[22px] text-outline">
                      rule
                    </span>
                    <span className="text-on-surface font-medium">
                      No downstream test failures or call site regressions detected.
                    </span>
                    <span className="text-xs text-outline">
                      {simulation?.status === "error"
                        ? "Simulation halted before running downstream test assertions."
                        : isRemediated
                        ? "All consumer assertions verified cleanly in isolated sandbox."
                        : "Clean execution with zero broken assertions."}
                    </span>
                  </div>
                </td>
              </tr>
            ) : (
              workflows.map((wf) => {
                const isMutationSource = targetFile && wf.filePath.includes(targetFile.split("/").pop() || "");
                const isItemFailed = !isRemediated && wf.state === "FAILED";

                // Determine precise role based on file extension and evidence
                let role = "Consumer Assertion";
                if (isMutationSource) {
                  role = "Source Mutation";
                } else if (wf.filePath.includes("test") || wf.filePath.includes("spec")) {
                  role = "Test Suite";
                } else if (wf.filePath.includes("route") || wf.filePath.includes("controller")) {
                  role = "API Endpoint";
                }

                // Determine non-contradictory status
                let statusBadge = (
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-mono font-medium bg-surface-container text-secondary">
                    <span className="w-1.5 h-1.5 rounded-full bg-secondary" />
                    VERIFIED
                  </span>
                );

                if (!isRemediated) {
                  if (isMutationSource) {
                    statusBadge = (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-mono font-medium bg-surface-container text-primary">
                        <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                        CHANGED
                      </span>
                    );
                  } else if (isItemFailed) {
                    statusBadge = (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-mono font-medium bg-error-container/20 text-error">
                        <span className="w-1.5 h-1.5 rounded-full bg-error" />
                        FAILED
                      </span>
                    );
                  } else {
                    statusBadge = (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-mono font-medium bg-surface-container text-outline">
                        <span className="w-1.5 h-1.5 rounded-full bg-outline" />
                        AFFECTED
                      </span>
                    );
                  }
                }

                return (
                  <tr
                    key={wf.id}
                    className="hover:bg-surface-container/50 transition-colors"
                  >
                    {/* File */}
                    <td className="py-2.5 px-space-md align-top font-mono">
                      <div className="flex flex-col">
                        <span className="text-on-surface font-medium truncate max-w-xs">
                          {wf.filePath}
                        </span>
                        <span className="text-[11px] text-outline">
                          {wf.name}
                        </span>
                      </div>
                    </td>

                    {/* Line */}
                    <td className="py-2.5 px-space-sm align-top font-mono text-outline">
                      L{wf.line || 1}
                    </td>

                    {/* Role */}
                    <td className="py-2.5 px-space-sm align-top font-mono text-on-surface-variant">
                      {role}
                    </td>

                    {/* Status */}
                    <td className="py-2.5 px-space-sm align-top">
                      {statusBadge}
                    </td>

                    {/* Observed Impact / Assertion */}
                    <td className="py-2.5 px-space-md align-top">
                      <div className="flex flex-col gap-0.5">
                        <span
                          className={`font-mono ${
                            isItemFailed ? "text-error" : "text-on-surface-variant"
                          }`}
                        >
                          {isRemediated ? "Assertion passed after remediation" : wf.observedFailure}
                        </span>
                        {wf.details && (
                          <span className="text-[11px] text-outline">
                            {wf.details}
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
