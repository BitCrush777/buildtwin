"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { MOCK_SIMULATIONS } from "@/lib/mock-data";
import { Simulation } from "@/lib/simulation/types";

interface RecentSimulationsTableProps {
  initialSimulations?: Simulation[];
}

export function RecentSimulationsTable({ initialSimulations }: RecentSimulationsTableProps) {
  const [simulations, setSimulations] = useState<Simulation[]>(
    initialSimulations || MOCK_SIMULATIONS
  );
  const [filter, setFilter] = useState<"all" | "broken" | "safe">("all");
  const [refreshing, setRefreshing] = useState(false);

  const fetchSimulations = async () => {
    try {
      const res = await fetch("/api/simulations");
      if (res.ok) {
        const data = await res.json();
        setSimulations(data);
      }
    } catch {
      // Keep existing
    }
  };

  useEffect(() => {
    fetchSimulations();
  }, []);

  const filteredSimulations = simulations.filter((sim) => {
    if (filter === "broken") {
      return (
        sim.status === "regression" ||
        sim.status === "needs_attention" ||
        sim.status === "failed" ||
        sim.status === "error"
      );
    }
    if (filter === "safe") {
      return sim.status === "safe" || sim.status === "remediated" || sim.status === "passed";
    }
    return true;
  });

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchSimulations();
    setTimeout(() => setRefreshing(false), 400);
  };

  return (
    <div className="flex-1 bg-surface-container-low rounded-lg overflow-hidden flex flex-col border border-surface-container-high/40 shadow-sm">
      {/* Header Bar */}
      <div className="h-11 px-space-md bg-surface-container flex items-center justify-between border-b border-surface-container-high/30">
        <div className="flex items-center gap-2.5">
          <span className="material-symbols-outlined text-outline text-[16px]">
            table_chart
          </span>
          <h2 className="text-xs font-mono font-semibold uppercase tracking-wider text-on-surface">
            Simulation History
          </h2>
          <span className="text-xs font-mono bg-surface-container-high px-1.5 py-0.5 rounded text-outline">
            {filteredSimulations.length} total
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Filter Pills */}
          <div className="flex items-center bg-surface-container-high rounded p-0.5 text-xs font-mono">
            <button
              onClick={() => setFilter("all")}
              type="button"
              className={`px-2 py-0.5 rounded transition-colors ${
                filter === "all"
                  ? "bg-surface text-on-surface font-medium shadow-xs"
                  : "text-outline hover:text-on-surface"
              }`}
            >
              All
            </button>
            <button
              onClick={() => setFilter("broken")}
              type="button"
              className={`px-2 py-0.5 rounded transition-colors ${
                filter === "broken"
                  ? "bg-surface text-tertiary font-medium shadow-xs"
                  : "text-outline hover:text-on-surface"
              }`}
            >
              Regressions
            </button>
            <button
              onClick={() => setFilter("safe")}
              type="button"
              className={`px-2 py-0.5 rounded transition-colors ${
                filter === "safe"
                  ? "bg-surface text-secondary font-medium shadow-xs"
                  : "text-outline hover:text-on-surface"
              }`}
            >
              Safe
            </button>
          </div>

          <button
            onClick={handleRefresh}
            className="w-7 h-7 flex items-center justify-center rounded hover:bg-surface-container-high text-outline hover:text-on-surface transition-colors"
            title="Reload simulations"
            type="button"
            aria-label="Refresh simulations"
          >
            <span
              className={`material-symbols-outlined text-[15px] ${
                refreshing ? "animate-spin text-primary" : ""
              }`}
            >
              refresh
            </span>
          </button>
        </div>
      </div>

      {/* Table Container */}
      <div className="overflow-x-auto w-full">
        <table className="w-full text-left border-collapse min-w-[760px]">
          <thead>
            <tr className="bg-surface-container-low text-outline text-[11px] font-mono uppercase border-b border-surface-container-high/40 h-8">
              <th className="px-space-md font-medium">Simulation</th>
              <th className="px-space-sm font-medium">Repository</th>
              <th className="px-space-sm font-medium">Change</th>
              <th className="px-space-sm font-medium">Status</th>
              <th className="px-space-sm font-medium">Tests</th>
              <th className="px-space-sm font-medium">Duration</th>
              <th className="px-space-md text-right font-medium">Updated</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-container-high/20 text-xs font-mono">
            {filteredSimulations.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-8 px-space-md text-center text-outline">
                  No simulations match the selected filter.
                </td>
              </tr>
            ) : (
              filteredSimulations.map((sim) => {
                const isError = sim.status === "error";
                const isFailed =
                  sim.status === "regression" ||
                  sim.status === "needs_attention" ||
                  sim.status === "failed";
                const isSafe = sim.status === "safe" || sim.status === "remediated" || sim.status === "passed";

                const total = sim.simulationMetrics?.total ?? sim.totalTests;
                const passed = sim.simulationMetrics?.passed ?? sim.testsPassed;

                const repoShort = sim.repo.replace(/^https?:\/\/github\.com\//i, "");

                return (
                  <tr
                    key={sim.id}
                    className="hover:bg-surface-container/40 transition-colors group"
                  >
                    {/* ID */}
                    <td className="px-space-md py-2.5 font-medium">
                      <Link
                        href={`/simulation/${sim.id}`}
                        className="text-primary hover:underline flex items-center gap-1"
                      >
                        #{sim.id.replace("#", "")}
                      </Link>
                    </td>

                    {/* Repository / Branch */}
                    <td className="px-space-sm py-2.5">
                      <div className="flex items-center gap-1.5 font-sans">
                        <span className="text-on-surface font-medium truncate max-w-[140px]">
                          {repoShort}
                        </span>
                        <span className="text-[11px] font-mono text-outline px-1 rounded bg-surface-container">
                          {sim.branch}
                        </span>
                      </div>
                    </td>

                    {/* Proposed Change */}
                    <td className="px-space-sm py-2.5">
                      <div className="flex flex-col">
                        <span className="text-on-surface text-xs font-sans font-medium truncate max-w-[180px]">
                          {sim.proposedChange?.title || sim.proposedChange?.targetFile}
                        </span>
                        <span className="text-[11px] font-mono text-outline truncate max-w-[180px]">
                          {sim.proposedChange?.targetFile}
                        </span>
                      </div>
                    </td>

                    {/* Status */}
                    <td className="px-space-sm py-2.5">
                      {isError ? (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-medium bg-error-container/20 text-error">
                          <span className="w-1.5 h-1.5 rounded-full bg-error" />
                          Simulation Error
                        </span>
                      ) : isSafe ? (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-medium bg-surface-container text-secondary">
                          <span className="w-1.5 h-1.5 rounded-full bg-secondary" />
                          Safe to Deploy
                        </span>
                      ) : isFailed ? (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-medium bg-error-container/20 text-error">
                          <span className="w-1.5 h-1.5 rounded-full bg-error" />
                          Regression
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-medium bg-surface-container text-outline">
                          <span className="w-1.5 h-1.5 rounded-full bg-outline" />
                          Running
                        </span>
                      )}
                    </td>

                    {/* Tests */}
                    <td className="px-space-sm py-2.5 text-on-surface-variant">
                      {isError ? (
                        <span className="text-outline">0 / 0</span>
                      ) : total > 0 ? (
                        <span>
                          <span className={isFailed ? "text-error" : "text-secondary"}>
                            {passed}
                          </span>
                          {" / "}
                          <span>{total}</span>
                        </span>
                      ) : (
                        <span className="text-outline">No tests</span>
                      )}
                    </td>

                    {/* Duration */}
                    <td className="px-space-sm py-2.5 text-outline">
                      {sim.duration}
                    </td>

                    {/* Updated */}
                    <td className="px-space-md py-2.5 text-right text-outline text-[11px]">
                      {sim.timeAgo || "Just now"}
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
