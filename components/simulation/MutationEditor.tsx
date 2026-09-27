"use client";

import React, { useState } from "react";

interface MutationEditorProps {
  repoUrl?: string;
  setRepoUrl?: (val: string) => void;
  targetFile: string;
  setTargetFile: (val: string) => void;
  findPattern: string;
  setFindPattern: (val: string) => void;
  replacePattern: string;
  setReplacePattern: (val: string) => void;
  testCommand: string;
  setTestCommand: (val: string) => void;
}

export function MutationEditor({
  repoUrl,
  setRepoUrl,
  targetFile,
  setTargetFile,
  findPattern,
  setFindPattern,
  replacePattern,
  setReplacePattern,
  testCommand,
  setTestCommand,
}: MutationEditorProps) {
  const [advancedOpen, setAdvancedOpen] = useState(false);

  return (
    <div className="bg-surface-container-low rounded-lg p-space-md flex flex-col gap-space-md border border-surface-container-high/40">
      {/* Header */}
      <div className="flex items-center justify-between pb-1.5 border-b border-surface-container-high/30">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-mono px-1.5 py-0.5 rounded bg-surface-container text-primary font-semibold">
            02
          </span>
          <h2 className="text-xs font-mono font-semibold uppercase tracking-wider text-on-surface">
            Proposed Change
          </h2>
        </div>
        <span className="text-xs font-mono text-outline">
          Target File &amp; Delta
        </span>
      </div>

      {/* Target File Input */}
      <div className="flex flex-col gap-1.5">
        <div className="flex flex-wrap items-center justify-between gap-1">
          <label className="text-xs font-mono text-on-surface-variant font-medium">
            Target File Path
          </label>
          <div className="flex items-center gap-1.5 text-xs font-mono">
            <span className="text-outline text-[11px]">Presets:</span>
            <button
              type="button"
              onClick={() => {
                setRepoUrl?.("https://github.com/kanishkvk9141/shoplite");
                setTargetFile("backend/prisma/schema.prisma");
                setFindPattern("email        String     @unique");
                setReplacePattern("email_address String     @unique");
                setTestCommand("npm test");
              }}
              className="text-[11px] font-mono text-secondary hover:underline px-1.5 py-0.5 rounded bg-surface-container border border-surface-container-high/40"
            >
              ShopLite (Prisma)
            </button>
            <button
              type="button"
              onClick={() => {
                setRepoUrl?.("fixture:node-npm-service");
                setTargetFile("src/pricing.js");
                setFindPattern("function calculateDiscount");
                setReplacePattern("function applyDiscount");
                setTestCommand("npm test");
              }}
              className="text-[11px] font-mono text-primary hover:underline px-1.5 py-0.5 rounded bg-surface-container border border-surface-container-high/40"
            >
              Node (pricing.js)
            </button>
          </div>
        </div>
        <div className="relative flex items-center">
          <span className="material-symbols-outlined absolute left-3 text-outline text-[16px]">
            description
          </span>
          <input
            className="w-full bg-surface-container-lowest text-on-surface font-mono text-xs pl-9 pr-3 py-2 rounded focus:outline-none focus:ring-1 focus:ring-primary border border-surface-container-high/40"
            type="text"
            value={targetFile}
            onChange={(e) => setTargetFile(e.target.value)}
            placeholder="src/user.js"
          />
        </div>
      </div>

      {/* Find & Replace Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-space-md">
        {/* Find Block */}
        <div className="flex flex-col gap-1">
          <div className="flex items-center justify-between text-xs font-mono">
            <span className="text-error font-medium flex items-center gap-1">
              <span className="material-symbols-outlined text-[14px]">remove_circle</span>
              <span>Find Pattern (Original)</span>
            </span>
            <span className="text-outline text-[11px]">Exact match</span>
          </div>

          <div className="bg-surface-container-lowest rounded p-2.5 flex flex-col font-mono text-xs border border-surface-container-high/40">
            <textarea
              aria-label="Find pattern"
              rows={3}
              value={findPattern}
              onChange={(e) => setFindPattern(e.target.value)}
              className="w-full bg-error-container/15 text-error font-mono text-xs p-2 rounded border border-error/30 focus:outline-none focus:ring-1 focus:ring-error resize-y"
              placeholder="Enter exact lines to find in file..."
            />
            <span className="mt-1.5 text-[11px] text-outline font-mono truncate">
              - {findPattern.split("\n")[0] || "pattern"}
            </span>
          </div>
        </div>

        {/* Replace Block */}
        <div className="flex flex-col gap-1">
          <div className="flex items-center justify-between text-xs font-mono">
            <span className="text-secondary font-medium flex items-center gap-1">
              <span className="material-symbols-outlined text-[14px]">add_circle</span>
              <span>Replace With (Mutation)</span>
            </span>
            <span className="text-outline text-[11px]">Virtual patch</span>
          </div>

          <div className="bg-surface-container-lowest rounded p-2.5 flex flex-col font-mono text-xs border border-surface-container-high/40">
            <textarea
              aria-label="Replacement pattern"
              rows={3}
              value={replacePattern}
              onChange={(e) => setReplacePattern(e.target.value)}
              className="w-full bg-secondary-container/20 text-secondary font-mono text-xs p-2 rounded border border-secondary/30 focus:outline-none focus:ring-1 focus:ring-secondary resize-y"
              placeholder="Enter replacement lines..."
            />
            <span className="mt-1.5 text-[11px] text-outline font-mono truncate">
              + {replacePattern.split("\n")[0] || "pattern"}
            </span>
          </div>
        </div>
      </div>

      {/* Advanced Options Collapsible Disclosure */}
      <div className="border-t border-surface-container-high/30 pt-2 flex flex-col gap-2">
        <button
          type="button"
          onClick={() => setAdvancedOpen(!advancedOpen)}
          className="flex items-center justify-between py-1 text-xs font-mono text-outline hover:text-on-surface transition-colors"
        >
          <span className="flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[16px]">tune</span>
            <span>Advanced Configuration (Test Command &amp; Sandbox Constraints)</span>
          </span>
          <span className="material-symbols-outlined text-[16px]">
            {advancedOpen ? "expand_less" : "expand_more"}
          </span>
        </button>

        {advancedOpen && (
          <div className="p-space-sm rounded bg-surface-container flex flex-col gap-3 border border-surface-container-high/40 text-xs font-mono">
            <div className="flex flex-col sm:flex-row gap-space-md items-start sm:items-center">
              <div className="flex-1 w-full flex flex-col gap-1">
                <label className="text-on-surface-variant font-medium flex items-center justify-between">
                  <span>Custom Test Command Suite</span>
                  <span className="text-outline text-[11px]">Approved: npm, pytest, go test, cargo</span>
                </label>
                <div className="relative flex items-center">
                  <span className="material-symbols-outlined absolute left-2.5 text-outline text-[16px]">
                    terminal
                  </span>
                  <input
                    className="w-full bg-surface-container-lowest text-on-surface font-mono text-xs pl-8 pr-3 py-1.5 rounded focus:outline-none focus:ring-1 focus:ring-primary border border-surface-container-high/40"
                    type="text"
                    value={testCommand}
                    onChange={(e) => setTestCommand(e.target.value)}
                  />
                </div>
              </div>

              <div className="w-full sm:w-44 flex flex-col gap-1">
                <label className="text-on-surface-variant font-medium">
                  Execution Timeout
                </label>
                <div className="bg-surface-container-lowest px-3 py-1.5 rounded flex items-center justify-between text-outline border border-surface-container-high/40">
                  <span>45s (cgroups)</span>
                  <span className="material-symbols-outlined text-[14px]">lock_clock</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 pt-1 text-[11px] text-outline border-t border-surface-container-high/20">
              <span className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-secondary" />
                Air-gapped sandbox isolation
              </span>
              <span>·</span>
              <span className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                Original repository remains untouched
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
