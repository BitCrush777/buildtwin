import React from "react";

export function RegressionShieldCard() {
  return (
    <div className="bg-surface-container-low rounded-lg p-space-md flex flex-col gap-2 border border-surface-container-high/40 text-xs">
      <div className="flex items-center justify-between pb-1.5 border-b border-surface-container-high/30">
        <div className="flex items-center gap-1.5">
          <span className="material-symbols-outlined text-[15px] text-outline">
            shield
          </span>
          <span className="font-mono text-xs font-semibold uppercase tracking-wider text-on-surface">
            Regression Guard
          </span>
        </div>
        <span className="font-mono text-[11px] text-secondary">
          ACTIVE
        </span>
      </div>
      <p className="text-outline leading-relaxed font-sans">
        BuildTwin validates changes against full downstream test suites inside air-gapped twins before pull requests are merged.
      </p>
    </div>
  );
}
