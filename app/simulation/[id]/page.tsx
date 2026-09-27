"use client";

import React, { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { ResultsHeader } from "@/components/results/ResultsHeader";
import { ResultsAlertBanner } from "@/components/results/ResultsAlertBanner";
import { PipelineStages } from "@/components/results/PipelineStages";
import { ImpactTable } from "@/components/results/ImpactTable";
import { StackTraceTerminal } from "@/components/results/StackTraceTerminal";
import { BobRemediationPanel } from "@/components/results/BobRemediationPanel";
import { TwinHostEnvCard } from "@/components/results/TwinHostEnvCard";
import { CodeDiffModal } from "@/components/results/CodeDiffModal";
import { MOCK_SIMULATIONS } from "@/lib/mock-data";
import { Simulation } from "@/lib/simulation/types";

export default function SimulationResultsPage() {
  const params = useParams();
  const rawId = typeof params?.id === "string" ? params.id : "BT-1042";
  const simId = rawId.replace("#", "");

  const mockMatch = MOCK_SIMULATIONS.find(
    (s) => s.id.toLowerCase() === simId.toLowerCase()
  );

  const [simulation, setSimulation] = useState<Simulation | null>(mockMatch || null);
  const [loading, setLoading] = useState<boolean>(!mockMatch);
  const [notFound, setNotFound] = useState<boolean>(false);
  const [isRemediated, setIsRemediated] = useState(
    mockMatch ? (mockMatch.status === "safe" || mockMatch.status === "remediated") : false
  );
  const [diffModalOpen, setDiffModalOpen] = useState(false);

  // Fetch real simulation from server API if exists
  useEffect(() => {
    let mounted = true;
    async function loadSimulation() {
      try {
        setLoading(true);
        setNotFound(false);
        const res = await fetch(`/api/simulation/${encodeURIComponent(simId)}`);
        if (res.ok) {
          const data: Simulation = await res.json();
          if (mounted) {
            setSimulation(data);
            setIsRemediated(data.status === "safe" || data.status === "remediated");
            setNotFound(false);
          }
        } else {
          if (mounted && !mockMatch) {
            setNotFound(true);
          }
        }
      } catch {
        if (mounted && !mockMatch) {
          setNotFound(true);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }
    loadSimulation();
    return () => {
      mounted = false;
    };
  }, [simId, mockMatch]);

  const handleAskBob = () => {
    const remediationSection = document.getElementById("remediation-dock");
    if (remediationSection) {
      remediationSection.scrollIntoView({ behavior: "smooth" });
    }
  };

  const handleRerun = async () => {
    setIsRemediated(false);
  };

  if (loading) {
    return (
      <AppShell>
        <div className="flex flex-col items-center justify-center w-full min-h-[60vh] gap-3">
          <span className="material-symbols-outlined text-[32px] text-primary animate-spin">
            autorenew
          </span>
          <div className="flex flex-col items-center gap-1">
            <h2 className="text-base font-semibold text-on-surface">
              Loading Simulation #{simId}
            </h2>
            <p className="text-xs font-mono text-outline">
              Reading isolated twin state and telemetry...
            </p>
          </div>
        </div>
      </AppShell>
    );
  }

  if (notFound || !simulation) {
    return (
      <AppShell>
        <div className="flex flex-col items-center justify-center w-full min-h-[60vh] gap-3 text-center">
          <div className="w-12 h-12 rounded-full bg-error-container/20 flex items-center justify-center text-error mb-1">
            <span className="material-symbols-outlined text-[24px]">search_off</span>
          </div>
          <div className="flex flex-col items-center gap-1 max-w-md">
            <h2 className="text-lg font-semibold text-on-surface">
              Simulation #{simId} Not Found
            </h2>
            <p className="text-xs text-on-surface-variant">
              No persistent simulation record exists with this ID. It may have expired or not been initialized.
            </p>
          </div>
          <div className="flex items-center gap-2 mt-4">
            <Link
              href="/simulate"
              className="px-3.5 py-1.5 rounded text-xs font-semibold bg-primary text-on-primary hover:bg-primary-container hover:text-on-primary-container transition-colors shadow-sm"
            >
              New Simulation
            </Link>
            <Link
              href="/"
              className="px-3.5 py-1.5 rounded text-xs font-medium bg-surface-container hover:bg-surface-container-high text-on-surface transition-colors border border-surface-container-high/50"
            >
              Return to Dashboard
            </Link>
          </div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="flex flex-col w-full pb-16 max-w-7xl mx-auto">
        <ResultsHeader
          simulation={simulation}
          isRemediated={isRemediated}
          onAskBob={handleAskBob}
          onRerun={handleRerun}
          onViewDiff={() => setDiffModalOpen(true)}
        />

        <ResultsAlertBanner isRemediated={isRemediated} simulation={simulation} />

        <PipelineStages isRemediated={isRemediated} simulation={simulation} />

        {/* Main Content Grid: Left (Impacted Files & Trace), Right (Remediation & Env) */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-space-lg items-start mt-2">
          {/* LEFT: Impacted Files + Trace Terminal (8 cols) */}
          <div className="xl:col-span-8 flex flex-col gap-0 rounded-lg overflow-hidden border border-surface-container-high/40 bg-surface-container-low shadow-sm">
            <ImpactTable
              workflows={simulation.workflows}
              isRemediated={isRemediated}
              simulation={simulation}
            />
            <StackTraceTerminal
              stackTrace={simulation.stackTrace}
              isRemediated={isRemediated}
              failureDetails={simulation.failureDetails}
            />
          </div>

          {/* RIGHT: Remediation Dock + Host Env (4 cols) */}
          <div id="remediation-dock" className="xl:col-span-4 flex flex-col gap-space-md">
            <BobRemediationPanel
              remediation={simulation.remediation}
              bobRemediationData={simulation.bobRemediationData}
              simulation={simulation}
              simulationId={simulation.id}
              isRemediated={isRemediated}
              onViewDiff={() => setDiffModalOpen(true)}
              onRemediateComplete={(verification) => {
                setIsRemediated(true);
                if (verification) {
                  setSimulation((prev) => {
                    if (!prev) return null;
                    return {
                      ...prev,
                      status: verification.isSafeToDeploy ? "safe" : "regression",
                      statusLabel: verification.isSafeToDeploy
                        ? "Safe / Verified"
                        : `${verification.testCounts.failed} Regressions Detected`,
                      testsPassed: verification.testCounts.passed ?? prev.testsPassed,
                      totalTests: verification.testCounts.total ?? prev.totalTests,
                      workflows:
                        verification.affectedWorkflows && verification.affectedWorkflows.length > 0
                          ? verification.affectedWorkflows
                          : prev.workflows,
                      stackTrace: verification.logs || prev.stackTrace,
                    };
                  });
                }
              }}
            />
            <TwinHostEnvCard
              hostEnv={simulation.hostEnv}
              isRemediated={isRemediated}
            />
          </div>
        </div>

        {/* Code Diff Modal */}
        <CodeDiffModal
          simulation={simulation}
          isOpen={diffModalOpen}
          onClose={() => setDiffModalOpen(false)}
        />
      </div>
    </AppShell>
  );
}
