"use client";

import React from "react";
import { Simulation } from "@/lib/simulation/types";

interface CodeDiffModalProps {
  simulation: Simulation;
  isOpen: boolean;
  onClose: () => void;
}

export function CodeDiffModal({
  simulation,
  isOpen,
  onClose,
}: CodeDiffModalProps) {
  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="diff-dialog-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm"
    >
      <div className="bg-surface-container-low border border-surface-container-high/60 rounded-xl w-full max-w-3xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="h-12 px-space-md bg-surface-container flex items-center justify-between border-b border-surface-container-high/40">
          <div className="flex items-center gap-2 font-mono text-xs text-on-surface">
            <span className="material-symbols-outlined text-outline text-[16px]">
              difference
            </span>
            <span id="diff-dialog-title" className="font-medium">
              Proposed Mutation Diff: <code className="text-primary">{simulation.proposedChange.targetFile}</code>
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-outline hover:text-on-surface hover:bg-surface-container-high transition-colors"
            type="button"
            aria-label="Close dialog"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>

        {/* Content */}
        <div className="p-space-md overflow-y-auto font-mono text-xs flex flex-col gap-space-md">
          <div className="flex items-center justify-between text-outline text-[11px] bg-surface-container px-3 py-1.5 rounded border border-surface-container-high/30">
            <span>Unified Diff Preview (Isolated Twin Sandbox)</span>
            <span className="text-secondary font-medium">Virtual Mutation Delta</span>
          </div>

          <div className="bg-surface-container-lowest p-space-md rounded-lg font-mono text-xs leading-relaxed border border-surface-container-high/30 overflow-x-auto">
            <div className="text-outline pb-2 mb-2 border-b border-surface-container-high/30 text-[11px]">
              --- a/{simulation.proposedChange.targetFile}
              <br />
              +++ b/{simulation.proposedChange.targetFile}
            </div>
            <div className="text-outline text-[11px] select-none">@@ -1,1 +1,1 @@</div>
            <div className="bg-error-container/20 text-error px-2.5 py-1 rounded my-1 font-mono text-xs border border-error/20">
              - {simulation.proposedChange.findPattern}
            </div>
            <div className="bg-secondary-container/25 text-secondary px-2.5 py-1 rounded font-mono text-xs border border-secondary/20">
              + {simulation.proposedChange.replacePattern}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="h-12 px-space-md bg-surface-container flex items-center justify-end border-t border-surface-container-high/40">
          <button
            onClick={onClose}
            className="h-8 px-4 rounded text-xs font-medium bg-surface-container-high hover:bg-surface-bright text-on-surface transition-colors border border-surface-container-highest"
            type="button"
          >
            Close Diff
          </button>
        </div>
      </div>
    </div>
  );
}
