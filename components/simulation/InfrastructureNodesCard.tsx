import React from "react";

export function InfrastructureNodesCard() {
  return (
    <div className="bg-surface-container-low rounded-lg p-space-md flex flex-col gap-3 border border-surface-container-high/40 text-xs">
      <div className="flex items-center justify-between pb-1.5 border-b border-surface-container-high/30">
        <span className="font-mono text-xs font-semibold uppercase tracking-wider text-on-surface">
          Sandbox Guarantees
        </span>
        <span className="flex items-center gap-1 font-mono text-[11px] text-secondary">
          <span className="w-1.5 h-1.5 rounded-full bg-secondary" />
          <span>INVARIANTS</span>
        </span>
      </div>

      <div className="space-y-2 font-mono text-xs">
        {/* Invariant 1 */}
        <div className="p-2.5 rounded bg-surface-container flex items-start gap-2.5 border border-surface-container-high/30">
          <span className="material-symbols-outlined text-[16px] text-secondary mt-0.5">
            lock
          </span>
          <div className="flex flex-col gap-0.5">
            <span className="font-semibold text-on-surface">
              Original Repo Pristine
            </span>
            <span className="text-[11px] text-outline font-sans">
              Upstream remotes, production databases, and target branches remain completely untouched.
            </span>
          </div>
        </div>

        {/* Invariant 2 */}
        <div className="p-2.5 rounded bg-surface-container flex items-start gap-2.5 border border-surface-container-high/30">
          <span className="material-symbols-outlined text-[16px] text-primary mt-0.5">
            folder_copy
          </span>
          <div className="flex flex-col gap-0.5">
            <span className="font-semibold text-on-surface">
              Isolated Twin Directory
            </span>
            <span className="text-[11px] text-outline font-sans">
              Mutations and test runs occur exclusively inside an isolated temporary directory.
            </span>
          </div>
        </div>

        {/* Invariant 3 */}
        <div className="p-2.5 rounded bg-surface-container flex items-start gap-2.5 border border-surface-container-high/30">
          <span className="material-symbols-outlined text-[16px] text-tertiary mt-0.5">
            verified_user
          </span>
          <div className="flex flex-col gap-0.5">
            <span className="font-semibold text-on-surface">
              Verified Deployment Gate
            </span>
            <span className="text-[11px] text-outline font-sans">
              Safe to Deploy is only certified when sandbox verification passes with exit code 0.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
