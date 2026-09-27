"use client";

import React, { useEffect, useState } from "react";
import { Simulation } from "@/lib/simulation/types";

interface MetricsCardsProps {
  simulations?: Simulation[];
}

export function MetricsCards({ simulations: propSimulations }: MetricsCardsProps) {
  const [sims, setSims] = useState<Simulation[]>(propSimulations || []);

  useEffect(() => {
    if (propSimulations) {
      setSims(propSimulations);
      return;
    }

    async function load() {
      try {
        const res = await fetch("/api/simulations");
        if (res.ok) {
          const data = await res.json();
          setSims(data);
        }
      } catch {
        // keep fallback
      }
    }
    load();
  }, [propSimulations]);

  const totalSimulations = sims.length;
  const regressionsCaught = sims.filter(
    (s) => s.status === "regression" || s.status === "failed" || s.status === "needs_attention"
  ).length;
  const verifiedSafe = sims.filter(
    (s) => s.status === "safe" || s.status === "remediated" || s.status === "passed"
  ).length;
  const activeSandboxes = sims.filter(
    (s) => s.sandboxPath != null || s.hostEnv?.sandboxStatus === "Active"
  ).length;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-space-sm mt-space-md">
      {/* Metric 1: Total Simulations Run */}
      <div className="bg-surface-container-low p-space-md rounded-lg flex flex-col justify-between border border-surface-container-high/40">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-mono uppercase tracking-wider text-outline">
            Simulations Recorded
          </span>
          <span className="material-symbols-outlined text-outline text-[16px]">
            history
          </span>
        </div>
        <div className="flex items-baseline justify-between mt-3">
          <span className="text-2xl font-semibold text-on-surface font-mono tracking-tight">
            {totalSimulations}
          </span>
          <span className="text-xs text-outline font-mono">ephemeral runs</span>
        </div>
      </div>

      {/* Metric 2: Regressions Caught */}
      <div className="bg-surface-container-low p-space-md rounded-lg flex flex-col justify-between border border-surface-container-high/40">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-mono uppercase tracking-wider text-outline">
            Regressions Caught
          </span>
          <div className="flex items-center gap-1 text-xs font-mono text-tertiary">
            <span className="w-1.5 h-1.5 rounded-full bg-tertiary" />
            <span>BLOCKED</span>
          </div>
        </div>
        <div className="flex items-baseline justify-between mt-3">
          <span className="text-2xl font-semibold text-tertiary font-mono tracking-tight">
            {regressionsCaught}
          </span>
          <span className="text-xs text-outline font-mono">pre-merge gates</span>
        </div>
      </div>

      {/* Metric 3: Verified Safe */}
      <div className="bg-surface-container-low p-space-md rounded-lg flex flex-col justify-between border border-surface-container-high/40">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-mono uppercase tracking-wider text-outline">
            Verified Safe to Deploy
          </span>
          <div className="flex items-center gap-1 text-xs font-mono text-secondary">
            <span className="w-1.5 h-1.5 rounded-full bg-secondary" />
            <span>PASSED</span>
          </div>
        </div>
        <div className="flex items-baseline justify-between mt-3">
          <span className="text-2xl font-semibold text-secondary font-mono tracking-tight">
            {verifiedSafe}
          </span>
          <span className="text-xs text-outline font-mono">clean verification</span>
        </div>
      </div>

      {/* Metric 4: Active Sandboxes */}
      <div className="bg-surface-container-low p-space-md rounded-lg flex flex-col justify-between border border-surface-container-high/40">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-mono uppercase tracking-wider text-outline">
            Active Sandboxes
          </span>
          <span className="material-symbols-outlined text-outline text-[16px]">
            dns
          </span>
        </div>
        <div className="flex items-baseline justify-between mt-3">
          <span className="text-2xl font-semibold text-on-surface font-mono tracking-tight">
            {activeSandboxes}
          </span>
          <span className="text-xs text-outline font-mono">isolated copies</span>
        </div>
      </div>
    </div>
  );
}
