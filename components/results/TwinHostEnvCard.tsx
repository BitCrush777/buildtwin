import React from "react";
import { Simulation } from "@/lib/simulation/types";

interface TwinHostEnvCardProps {
  hostEnv: Simulation["hostEnv"];
  isRemediated: boolean;
}

export function TwinHostEnvCard({
  hostEnv,
  isRemediated,
}: TwinHostEnvCardProps) {
  return (
    <div className="rounded-lg bg-surface-container-low p-space-md border border-surface-container-high/40 flex flex-col gap-space-sm text-xs">
      <div className="flex items-center justify-between pb-1.5 border-b border-surface-container-high/30">
        <span className="font-mono text-[11px] uppercase tracking-wider text-outline">
          Twin Sandbox Environment
        </span>
        <span className="flex items-center gap-1 font-mono text-[11px] text-secondary">
          <span className="w-1.5 h-1.5 rounded-full bg-secondary" />
          <span>Air-Gapped</span>
        </span>
      </div>

      <div className="flex flex-col gap-2 font-mono text-xs">
        <div className="flex items-center justify-between">
          <span className="text-outline">Sandbox State:</span>
          <span className="text-on-surface font-medium">
            {isRemediated ? "Verified Clean" : hostEnv?.sandboxStatus || "Active"}
          </span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-outline">Target Repository:</span>
          <span className="text-on-surface truncate max-w-[180px]">
            {hostEnv?.repoTag || "Sandbox"}
          </span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-outline">Files Mutated:</span>
          <span className="text-on-surface font-medium">
            {hostEnv?.filesChanged ?? 1}
          </span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-outline">Test Suite:</span>
          <code className="text-primary font-mono text-[11px] px-1 py-0.5 rounded bg-surface-container">
            {hostEnv?.testSuite || "npm test"}
          </code>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-outline">Production Guard:</span>
          <span className="text-secondary font-medium">
            {isRemediated ? "Safe to Merge" : "Gate Active"}
          </span>
        </div>
      </div>
    </div>
  );
}
