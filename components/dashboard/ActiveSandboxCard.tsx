import React from "react";
import Link from "next/link";

export function ActiveSandboxCard() {
  return (
    <div className="bg-surface-container-low rounded-lg p-space-md flex flex-col gap-3 border border-surface-container-high/40 text-xs">
      <div className="flex items-center justify-between pb-1.5 border-b border-surface-container-high/30">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-[16px] text-outline">
            deployed_code
          </span>
          <h3 className="font-mono text-xs font-semibold uppercase tracking-wider text-on-surface">
            Active Twin Sandbox
          </h3>
        </div>
        <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-surface-container text-secondary font-mono text-[11px]">
          <span className="w-1.5 h-1.5 rounded-full bg-secondary" />
          <span>READY</span>
        </div>
      </div>

      <p className="text-outline leading-relaxed font-sans">
        Isolated sandbox environment for testing repository mutations without modifying production or upstream branches.
      </p>

      <div className="bg-surface-container rounded p-2.5 flex flex-col gap-1.5 font-mono text-xs border border-surface-container-high/30">
        <div className="flex items-center justify-between">
          <span className="text-outline">Engine Isolation:</span>
          <span className="text-on-surface font-medium">Ephemeral Directory</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-outline">Upstream Drift:</span>
          <span className="text-secondary font-medium">0 mutations</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-outline">Supported Runtimes:</span>
          <span className="text-on-surface">Node, Py, Go, Rust</span>
        </div>
      </div>

      <Link
        href="/simulate"
        className="w-full mt-1 h-8 px-3 rounded bg-primary text-on-primary font-semibold hover:bg-primary-container hover:text-on-primary-container transition-colors flex items-center justify-center gap-1.5 shadow-sm text-xs"
      >
        <span className="material-symbols-outlined text-[15px]">play_arrow</span>
        <span>Run New Simulation</span>
      </Link>
    </div>
  );
}
