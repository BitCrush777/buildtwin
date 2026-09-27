"use client";

import React, { useState } from "react";
import { FailureDetail } from "@/lib/simulation/types";

interface StackTraceTerminalProps {
  stackTrace: string;
  isRemediated: boolean;
  failureDetails?: FailureDetail[];
}

export function StackTraceTerminal({
  stackTrace,
  isRemediated,
  failureDetails,
}: StackTraceTerminalProps) {
  const [copied, setCopied] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(stackTrace || "");
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const lines = stackTrace ? stackTrace.trim().split("\n") : [];
  const previewLimit = 12;
  const hasMoreLines = lines.length > previewLimit;
  const displayedLines = expanded ? lines : lines.slice(0, previewLimit);

  const hasFailures = failureDetails && failureDetails.length > 0;

  return (
    <div className="flex flex-col bg-surface-container-lowest border-t border-surface-container-high/40 rounded-b-lg">
      {/* 1. Compact Failure Summary (Scannable in 3 seconds) */}
      {!isRemediated && hasFailures && (
        <div className="p-space-md border-b border-surface-container-high/30 bg-error-container/10">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-mono font-semibold uppercase tracking-wider text-error flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[14px]">error</span>
              Test Failure Summary
            </span>
            <span className="text-xs font-mono text-outline">
              {failureDetails.length} failed assertion{failureDetails.length === 1 ? "" : "s"}
            </span>
          </div>

          <div className="space-y-2">
            {failureDetails.map((failure, idx) => (
              <div
                key={idx}
                className="p-2.5 rounded bg-surface-container-low border border-error/20 flex flex-col gap-1 text-xs font-mono"
              >
                <div className="flex items-center justify-between text-on-surface">
                  <span className="font-semibold text-error/90">
                    {failure.test}
                  </span>
                  {failure.file && (
                    <span className="text-outline text-[11px]">
                      {failure.file}
                    </span>
                  )}
                </div>
                <div className="text-on-surface-variant text-[11px] break-all leading-relaxed">
                  {failure.message}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 2. Developer Console Header */}
      <div className="flex items-center justify-between px-space-md py-2 bg-surface-container-low text-xs font-mono text-outline border-b border-surface-container-high/20">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-[14px]">terminal</span>
          <span className="font-medium text-on-surface-variant">Sandbox Execution Logs</span>
          <span className="text-outline-variant">·</span>
          <span>{lines.length} lines</span>
        </div>

        <div className="flex items-center gap-3">
          {hasMoreLines && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="text-primary hover:underline text-xs bg-transparent border-none cursor-pointer flex items-center gap-1"
              type="button"
            >
              <span>{expanded ? "Collapse trace" : "Show full trace"}</span>
              <span className="material-symbols-outlined text-[14px]">
                {expanded ? "expand_less" : "expand_more"}
              </span>
            </button>
          )}

          <button
            onClick={handleCopy}
            className="text-outline hover:text-on-surface text-xs bg-transparent border-none cursor-pointer flex items-center gap-1 transition-colors"
            type="button"
            title="Copy trace to clipboard"
          >
            <span className="material-symbols-outlined text-[13px]">
              {copied ? "check" : "content_copy"}
            </span>
            <span>{copied ? "Copied" : "Copy"}</span>
          </button>
        </div>
      </div>

      {/* 3. Terminal Output */}
      <div className="p-space-md overflow-x-auto max-h-[380px] font-mono text-xs text-on-surface-variant leading-relaxed">
        {stackTrace ? (
          <table className="w-full border-collapse">
            <tbody>
              {displayedLines.map((line, idx) => (
                <tr key={idx} className="hover:bg-surface-container/30">
                  <td className="w-8 pr-3 text-right text-outline/50 select-none text-[11px] align-top py-0.5">
                    {idx + 1}
                  </td>
                  <td className="whitespace-pre-wrap break-all py-0.5 text-on-surface-variant text-[12px]">
                    {line}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : isRemediated ? (
          <div className="py-4 text-secondary flex items-center gap-2 text-xs">
            <span className="material-symbols-outlined text-[16px]">check_circle</span>
            <span>All test suite assertions passed cleanly. Zero regressions detected.</span>
          </div>
        ) : (
          <div className="py-4 text-outline text-xs">
            No console output recorded for this run.
          </div>
        )}

        {hasMoreLines && !expanded && (
          <div className="pt-2 text-center border-t border-surface-container-high/20 mt-2">
            <button
              onClick={() => setExpanded(true)}
              className="text-xs text-primary hover:underline font-mono inline-flex items-center gap-1"
              type="button"
            >
              <span>Show {lines.length - previewLimit} more lines...</span>
              <span className="material-symbols-outlined text-[13px]">expand_more</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
