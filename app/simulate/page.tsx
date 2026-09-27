"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { SimulationStepper } from "@/components/simulation/SimulationStepper";
import { RepoMetadataCard } from "@/components/simulation/RepoMetadataCard";
import { MutationEditor } from "@/components/simulation/MutationEditor";
import { TwinTopologyGraph } from "@/components/simulation/TwinTopologyGraph";
import { InfrastructureNodesCard } from "@/components/simulation/InfrastructureNodesCard";

const PROGRESS_STEPS = [
  "Validating repository",
  "Cloning pristine reference",
  "Creating isolated sandbox",
  "Applying controlled mutation",
  "Executing test suite",
  "Collecting telemetry",
];

export default function NewSimulationPage() {
  const router = useRouter();

  const [repoUrl, setRepoUrl] = useState("https://github.com/kanishkvk9141/shoplite");
  const [branch, setBranch] = useState("main");
  const [targetFile, setTargetFile] = useState("backend/prisma/schema.prisma");
  const [findPattern, setFindPattern] = useState("email        String     @unique");
  const [replacePattern, setReplacePattern] = useState("email_address String     @unique");
  const [testCommand, setTestCommand] = useState("npm test");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(-1);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleLoadShopLitePreset = () => {
    setRepoUrl("https://github.com/kanishkvk9141/shoplite");
    setBranch("main");
    setTargetFile("backend/prisma/schema.prisma");
    setFindPattern("email        String     @unique");
    setReplacePattern("email_address String     @unique");
    setTestCommand("npm test");
  };

  const handleCreateSimulation = async () => {
    setIsSubmitting(true);
    setErrorMessage(null);
    setCurrentStepIndex(0); // Validating repository

    try {
      await new Promise((r) => setTimeout(r, 200));

      setCurrentStepIndex(1); // Cloning
      const timerClone = setTimeout(() => setCurrentStepIndex(2), 400); // Sandbox created
      const timerChange = setTimeout(() => setCurrentStepIndex(3), 700); // Change applied
      const timerTest = setTimeout(() => setCurrentStepIndex(4), 1000); // Tests running

      const res = await fetch("/api/simulate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          repoUrl,
          branch,
          filePath: targetFile,
          oldValue: findPattern,
          newValue: replacePattern,
          testCommand,
        }),
      });

      clearTimeout(timerClone);
      clearTimeout(timerChange);
      clearTimeout(timerTest);

      const data = await res.json();

      if (!res.ok && !data.simulationId) {
        throw new Error(data.error || data.message || "Simulation failed to start.");
      }

      setCurrentStepIndex(5); // Telemetry collected
      await new Promise((r) => setTimeout(r, 300));

      router.push(`/simulation/${data.simulationId}`);
    } catch (err: any) {
      setIsSubmitting(false);
      setCurrentStepIndex(-1);
      setErrorMessage(err.message || String(err));
    }
  };

  const displayRepoName = repoUrl.split("/").pop()?.replace(".git", "") || "shoplite";

  return (
    <AppShell>
      <div className="flex flex-col w-full pb-16 max-w-7xl mx-auto">
        {/* Header Ribbon */}
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-space-md py-space-md mb-space-md border-b border-surface-container-high/40">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-1.5 text-outline text-xs font-mono">
              <span>BuildTwin</span>
              <span className="text-outline-variant">/</span>
              <span>Simulate</span>
              <span className="text-outline-variant">/</span>
              <span className="text-secondary font-medium">New Job</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-on-surface">
              Configure Software Simulation
            </h1>
            <p className="text-xs sm:text-sm text-outline max-w-2xl font-sans">
              Spawn an isolated sandbox to execute your repository test suite against a proposed code change before committing.
            </p>
          </div>

          <SimulationStepper currentStep={2} />
        </div>

        {/* Error Alert Banner if validation/execution fails */}
        {errorMessage && (
          <div className="mb-space-md p-space-md rounded-lg bg-surface-container-low border border-error/40 flex items-start gap-space-sm text-error text-xs font-mono">
            <span className="material-symbols-outlined text-[18px] shrink-0 mt-0.5">error</span>
            <div className="flex flex-col gap-0.5">
              <span className="font-semibold text-error uppercase tracking-wider">Simulation Failed</span>
              <span className="text-on-surface-variant whitespace-pre-wrap">{errorMessage}</span>
            </div>
          </div>
        )}

        {/* Main Grid: Form on Left (8 cols), Architecture & Invariants on Right (4 cols) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-lg items-start">
          {/* Left Column: Form & Configuration (8 cols) */}
          <div className="lg:col-span-8 flex flex-col gap-space-md">
            {/* Quick Demo Preset Bar */}
            <div className="flex items-center justify-between p-2.5 px-3 rounded-lg bg-surface-container-low border border-surface-container-high/40 text-xs font-mono">
              <div className="flex items-center gap-2 text-on-surface">
                <span className="material-symbols-outlined text-primary text-[16px]">
                  science
                </span>
                <span className="font-medium">Live Demo Preset:</span>
                <span className="text-secondary">kanishkvk9141/shoplite</span>
              </div>
              <button
                type="button"
                onClick={handleLoadShopLitePreset}
                className="h-7 px-2.5 rounded bg-surface-container hover:bg-surface-container-high text-primary font-medium border border-surface-container-high/50 transition-colors flex items-center gap-1"
              >
                <span className="material-symbols-outlined text-[14px]">restart_alt</span>
                <span>Load Preset</span>
              </button>
            </div>

            {/* Section 1: Source Repository */}
            <RepoMetadataCard
              repoUrl={repoUrl}
              setRepoUrl={setRepoUrl}
              branch={branch}
              setBranch={setBranch}
            />

            {/* Section 2: Mutation Matrix */}
            <MutationEditor
              repoUrl={repoUrl}
              setRepoUrl={setRepoUrl}
              targetFile={targetFile}
              setTargetFile={setTargetFile}
              findPattern={findPattern}
              setFindPattern={setFindPattern}
              replacePattern={replacePattern}
              setReplacePattern={setReplacePattern}
              testCommand={testCommand}
              setTestCommand={setTestCommand}
            />

            {/* Action Bar */}
            <div className="bg-surface-container-low rounded-lg p-space-md flex flex-col gap-3 border border-surface-container-high/40">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-space-md">
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <button
                    id="create-sim-btn"
                    type="button"
                    onClick={handleCreateSimulation}
                    disabled={isSubmitting}
                    className="w-full sm:w-auto h-9 px-5 rounded bg-primary text-on-primary font-semibold text-xs flex items-center justify-center gap-2 hover:bg-primary-container hover:text-on-primary-container transition-all active:scale-[0.99] shadow-sm disabled:opacity-80"
                  >
                    <span
                      className={`material-symbols-outlined text-[16px] ${
                        isSubmitting ? "animate-spin" : ""
                      }`}
                    >
                      {isSubmitting ? "autorenew" : "play_circle"}
                    </span>
                    <span>
                      {isSubmitting && currentStepIndex >= 0
                        ? PROGRESS_STEPS[currentStepIndex]
                        : "Run Simulation"}
                    </span>
                  </button>

                  <Link
                    href="/"
                    className="w-full sm:w-auto h-9 px-4 rounded bg-surface-container text-on-surface hover:bg-surface-container-high transition-colors text-xs font-medium border border-surface-container-high/50 flex items-center justify-center"
                  >
                    Cancel
                  </Link>
                </div>

                <div className="flex items-center gap-1.5 text-xs font-mono text-outline">
                  <span className="material-symbols-outlined text-[15px] text-secondary">
                    shield
                  </span>
                  <span>Zero Production Impact Guarantee</span>
                </div>
              </div>

              {/* Live Progress Feedback during simulation */}
              {isSubmitting && (
                <div className="bg-surface-container p-2.5 rounded border border-surface-container-high/40 flex flex-wrap items-center gap-2 text-xs font-mono">
                  {PROGRESS_STEPS.map((step, idx) => {
                    const isDone = idx < currentStepIndex;
                    const isCurrent = idx === currentStepIndex;
                    return (
                      <div
                        key={step}
                        className={`flex items-center gap-1 px-2 py-0.5 rounded ${
                          isDone
                            ? "bg-secondary-container/30 text-secondary"
                            : isCurrent
                            ? "bg-primary text-on-primary font-bold animate-pulse"
                            : "text-outline bg-surface-container-low"
                        }`}
                      >
                        <span>{isDone ? "✓" : idx + 1}.</span>
                        <span>{step}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Visual Architecture & Sandbox Invariants (4 cols) */}
          <div className="lg:col-span-4 flex flex-col gap-space-md">
            <TwinTopologyGraph repoName={displayRepoName} branch={branch} />
            <InfrastructureNodesCard />
          </div>
        </div>
      </div>
    </AppShell>
  );
}
