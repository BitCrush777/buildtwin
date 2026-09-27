import React from "react";
import Link from "next/link";

export function DashboardGreeting() {
  return (
    <div className="flex flex-col md:flex-row md:items-end justify-between py-space-md gap-space-md border-b border-surface-container-high/40">
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center gap-1.5 text-outline text-xs font-mono">
          <span>BuildTwin</span>
          <span className="text-outline-variant">/</span>
          <span>Simulation Workspace</span>
          <span className="text-outline-variant">/</span>
          <span className="text-secondary font-medium">Production Twin</span>
        </div>
        <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-on-surface">
          Software Change Simulator
        </h1>
        <p className="text-xs sm:text-sm text-outline max-w-2xl font-sans">
          Test risky repository mutations inside isolated sandboxes to detect downstream regressions before merge.
        </p>
      </div>

      <div className="flex items-center gap-2 flex-shrink-0">
        <Link
          href="/simulate"
          className="h-8 px-3.5 rounded text-xs font-semibold bg-primary text-on-primary hover:bg-primary-container hover:text-on-primary-container transition-colors flex items-center gap-1.5 shadow-sm"
        >
          <span className="material-symbols-outlined text-[15px]">play_arrow</span>
          <span>New Simulation</span>
        </Link>
      </div>
    </div>
  );
}
