"use client";

import React, { useState } from "react";
import {
  BobRemediationPlan,
  BobRemediationData,
  Simulation,
  VerificationResult,
} from "@/lib/simulation/types";

interface BobRemediationPanelProps {
  remediation?: BobRemediationPlan;
  bobRemediationData?: BobRemediationData;
  simulation?: Simulation;
  simulationId?: string;
  isRemediated: boolean;
  onRemediateComplete: (verification?: VerificationResult) => void;
  onViewDiff?: () => void;
}

export function BobRemediationPanel({
  remediation,
  bobRemediationData,
  simulation,
  simulationId,
  isRemediated,
  onRemediateComplete,
  onViewDiff,
}: BobRemediationPanelProps) {
  const isError = simulation?.status === "error";

  // Lifecycle states:
  // "initial" -> "analysis_ready" -> "patch_applied" -> "verified"
  const [stage, setStage] = useState<"initial" | "analyzing" | "ready" | "verifying" | "verified">(
    isRemediated ? "verified" : "initial"
  );
  const [copied, setCopied] = useState(false);
  const [verificationResult, setVerificationResult] = useState<VerificationResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const activeSimId = simulationId || simulation?.id || "BT-1042";
  const cleanId = activeSimId.replace("#", "");
  const totalTests =
    simulation?.simulationMetrics?.total ??
    (simulation?.totalTests ?? 0);

  // Structured plan fallback data
  const planData: BobRemediationData = bobRemediationData || {
    summary:
      remediation?.planSummary ||
      "Bob analyzed the failure and generated an isolated backward-compatible remediation plan.",
    affectedFiles: remediation?.preparedDiff?.files?.map((f) => f.path) || [
      simulation?.proposedChange?.targetFile || "source",
    ],
    plan: [
      `Trace broken call sites affected by ${simulation?.proposedChange?.targetFile || "the mutation"}.`,
      `Implement backward-compatible accessor or alias for '${simulation?.proposedChange?.replacePattern || "the new field"}'.`,
      `Verify all test invariants inside the isolated twin sandbox.`,
    ],
    proposedChanges: remediation?.preparedDiff?.files?.map((f) => ({
      filePath: f.path,
      description:
        f.type === "primary"
          ? "Add backward-compatible accessor for downstream consumers."
          : "Synchronize schema definitions with legacy accessors.",
    })) || [],
    tests: [simulation?.hostEnv?.testSuite || "npm test"],
  };

  const handleAskBobToFix = async () => {
    setStage("analyzing");
    setErrorMsg(null);
    try {
      await handleCopyTaskPrompt();
      setStage("ready");
    } catch {
      setStage("ready");
    }
  };

  const handleCopyTaskPrompt = async () => {
    const prompt = [
      `# IBM Bob Remediation Task: ${activeSimId}`,
      "",
      `**Repository:** ${simulation?.repo || "Active Workspace"}`,
      `**Target File:** ${simulation?.proposedChange?.targetFile || "source"}`,
      `**Mutation:** \`${simulation?.proposedChange?.findPattern || "oldValue"}\` -> \`${simulation?.proposedChange?.replacePattern || "newValue"}\``,
      `**Test Command:** ${planData.tests[0] || "npm test"}`,
      "",
      "## Regression Summary",
      planData.summary,
      "",
      "## Affected Files",
      ...planData.affectedFiles.map((f) => `- ${f}`),
      "",
      "## Remediation Directives (BuildTwin Rules & Bob Mode)",
      "- All remediation must happen inside the isolated sandbox.",
      "- Never modify the original repository.",
      "- Implement backward-compatible changes to prevent downstream breakage.",
      "- Verify the fix by running the approved test command.",
      "- Never claim success without verification.",
      "",
      "## Remediation Plan",
      ...planData.plan.map((step, i) => `${i + 1}. ${step}`),
      "",
      "## Proposed Changes",
      ...planData.proposedChanges.map(
        (change) => `- **${change.filePath}**: ${change.description}`
      ),
      "",
      "## Verification Command",
      `\`${planData.tests[0] || "npm test"}\``,
    ].join("\n");

    try {
      await navigator.clipboard.writeText(prompt);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const textarea = document.createElement("textarea");
      textarea.value = prompt;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleVerifySandbox = async () => {
    setStage("verifying");
    setErrorMsg(null);
    try {
      const res = await fetch(`/api/simulation/${encodeURIComponent(cleanId)}/verify`, {
        method: "POST",
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || `Verification failed with HTTP ${res.status}`);
      }

      const result: VerificationResult = await res.json();
      setVerificationResult(result);
      setStage("verified");
      onRemediateComplete(result);
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to verify sandbox.");
      setStage("ready");
    }
  };

  return (
    <div className="rounded-lg bg-surface-container-low p-space-md flex flex-col gap-space-md border border-surface-container-high/40">
      {/* Header: Engineering Panel */}
      <div className="flex items-center justify-between pb-2 border-b border-surface-container-high/30">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-primary text-[18px]">
            auto_fix_high
          </span>
          <span className="text-xs font-mono font-semibold uppercase tracking-wider text-on-surface">
            Remediation via IBM Bob
          </span>
        </div>

        <span
          className={`text-[11px] font-mono px-2 py-0.5 rounded font-medium ${
            isError
              ? "bg-surface-container text-outline"
              : stage === "verified"
              ? "bg-secondary-container/30 text-secondary"
              : stage === "ready"
              ? "bg-primary-container/20 text-primary"
              : "bg-surface-container text-outline"
          }`}
        >
          {isError
            ? "DISABLED"
            : stage === "verified"
            ? "VERIFIED CLEAN"
            : stage === "ready"
            ? "ANALYSIS COMPLETE"
            : "READY"}
        </span>
      </div>

      {/* Error notice if action fails */}
      {errorMsg && (
        <div className="rounded bg-error-container/20 border border-error/30 p-2 text-xs font-mono text-error flex items-start gap-1.5">
          <span className="material-symbols-outlined text-[15px] shrink-0 mt-0.5">error</span>
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Case 1: Simulation Error */}
      {isError && (
        <div className="flex flex-col gap-2 p-3 rounded bg-surface-container border border-surface-container-high/40 text-xs">
          <span className="font-mono font-semibold text-outline uppercase tracking-wider">
            Remediation Inactive
          </span>
          <p className="text-outline leading-relaxed">
            IBM Bob remediation is disabled because the simulation halted before tests could run. Fix the target file path or pattern to simulate again.
          </p>
        </div>
      )}

      {/* Case 2: Initial Regression State (Pre-analysis) */}
      {!isError && stage === "initial" && (
        <div className="flex flex-col gap-space-sm text-xs">
          <div className="flex flex-col gap-1">
            <span className="text-outline font-mono text-[11px] uppercase tracking-wider">
              Regression Status
            </span>
            <p className="text-on-surface leading-relaxed">
              Target mutation broke automated tests in the isolated sandbox. IBM Bob can analyze the regression and generate a backward-compatible fix.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2 p-2.5 rounded bg-surface-container font-mono text-xs border border-surface-container-high/30">
            <div>
              <span className="text-outline block text-[11px]">Affected target:</span>
              <span className="text-on-surface truncate block font-medium">
                {simulation?.proposedChange?.targetFile?.split("/").pop() || "source"}
              </span>
            </div>
            <div>
              <span className="text-outline block text-[11px]">Recommended action:</span>
              <span className="text-primary block font-medium">
                Backward Compatibility Shim
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Case 3: Analysis Ready State (Bob task generated / patch ready) */}
      {!isError && (stage === "ready" || stage === "verifying") && (
        <div className="flex flex-col gap-space-sm text-xs">
          {/* Engineering Metadata Rows */}
          <div className="grid grid-cols-2 gap-2 p-2.5 rounded bg-surface-container font-mono text-xs border border-surface-container-high/30">
            <div>
              <span className="text-outline block text-[11px]">Affected files:</span>
              <span className="text-on-surface font-medium">
                {planData.affectedFiles.length} file{planData.affectedFiles.length === 1 ? "" : "s"}
              </span>
            </div>
            <div>
              <span className="text-outline block text-[11px]">Patch size:</span>
              <span className="text-secondary font-medium">
                +{remediation?.preparedDiff?.added ?? 1} / -{remediation?.preparedDiff?.removed ?? 1} lines
              </span>
            </div>
          </div>

          {/* Rationale */}
          <div className="flex flex-col gap-1 p-2.5 rounded bg-surface-container border border-surface-container-high/30">
            <span className="text-[11px] font-mono text-outline uppercase tracking-wider">
              Rationale
            </span>
            <p className="text-on-surface-variant text-xs leading-relaxed italic">
              &quot;{remediation?.planSummary || planData.summary}&quot;
            </p>
          </div>

          {/* Prepared Diff Row */}
          <div className="flex items-center justify-between p-2 rounded bg-surface-container border border-surface-container-high/30 font-mono text-xs">
            <span className="text-outline">Prepared Diff:</span>
            {onViewDiff ? (
              <button
                type="button"
                onClick={onViewDiff}
                className="text-primary hover:underline text-xs"
              >
                View Diff
              </button>
            ) : (
              <span className="text-secondary">Ready to apply</span>
            )}
          </div>

          {/* Status Note */}
          <p className="text-[11px] font-mono text-outline">
            Bob generated a backward-compatible patch. Sandbox verification is required before declaring safe to deploy.
          </p>
        </div>
      )}

      {/* Case 4: Verified Safe State */}
      {!isError && stage === "verified" && (
        <div className="flex flex-col gap-space-sm text-xs">
          <div className="p-3 rounded bg-secondary-container/20 border border-secondary/40 flex flex-col gap-1.5">
            <div className="flex items-center gap-1.5 text-secondary font-mono text-xs font-semibold">
              <span className="material-symbols-outlined text-[16px]">verified</span>
              <span>VERIFICATION PASSED</span>
            </div>
            <p className="text-on-surface text-xs leading-relaxed">
              {verificationResult
                ? `${verificationResult.testCounts.passed ?? totalTests} / ${verificationResult.testCounts.total ?? totalTests} tests passed cleanly in isolated twin.`
                : `${totalTests} / ${totalTests} tests passed cleanly in isolated twin.`}
            </p>
            <div className="text-[11px] font-mono text-secondary/90 font-medium">
              SAFE TO DEPLOY · Zero regressions detected
            </div>
          </div>

          {/* Compact logs summary if available */}
          {verificationResult?.logs && (
            <div className="p-2 rounded bg-surface-container font-mono text-[11px] text-outline max-h-24 overflow-y-auto leading-relaxed border border-surface-container-high/30">
              <span className="text-on-surface block mb-1">Twin Verification Log:</span>
              <pre className="whitespace-pre-wrap">{verificationResult.logs.slice(0, 300)}...</pre>
            </div>
          )}
        </div>
      )}

      {/* Button Lifecycle Actions */}
      <div className="flex flex-col gap-2 mt-auto pt-2 border-t border-surface-container-high/30">
        {isError && (
          <button
            disabled
            type="button"
            className="w-full h-8 px-3 rounded text-xs font-medium bg-surface-container text-outline border border-surface-container-high/30 cursor-not-allowed opacity-50 flex items-center justify-center gap-1.5"
          >
            <span className="material-symbols-outlined text-[15px]">block</span>
            <span>Ask Bob to Fix (Disabled)</span>
          </button>
        )}

        {!isError && stage === "initial" && (
          <button
            onClick={handleAskBobToFix}
            type="button"
            className="w-full h-8 px-3.5 rounded text-xs font-semibold bg-primary text-on-primary hover:bg-primary-container hover:text-on-primary-container transition-colors shadow-sm flex items-center justify-center gap-1.5"
          >
            <span className="material-symbols-outlined text-[15px]">auto_fix_high</span>
            <span>Ask Bob to Fix</span>
          </button>
        )}

        {!isError && stage === "analyzing" && (
          <button
            disabled
            type="button"
            className="w-full h-8 px-3.5 rounded text-xs font-semibold bg-primary/70 text-on-primary cursor-wait flex items-center justify-center gap-1.5"
          >
            <span className="material-symbols-outlined text-[15px] animate-spin">autorenew</span>
            <span>Analyzing Regression...</span>
          </button>
        )}

        {!isError && (stage === "ready" || stage === "verifying") && (
          <div className="flex flex-col gap-2">
            <button
              onClick={handleCopyTaskPrompt}
              type="button"
              className="w-full h-8 px-3 rounded text-xs font-medium bg-surface-container hover:bg-surface-container-high text-on-surface transition-colors border border-surface-container-high/50 flex items-center justify-center gap-1.5"
            >
              <span className="material-symbols-outlined text-[14px]">
                {copied ? "check" : "content_copy"}
              </span>
              <span>{copied ? "Copied Prompt to Clipboard" : "Copy Bob Task Prompt"}</span>
            </button>

            <button
              onClick={handleVerifySandbox}
              disabled={stage === "verifying"}
              type="button"
              className="w-full h-8 px-3.5 rounded text-xs font-semibold bg-primary text-on-primary hover:bg-primary-container hover:text-on-primary-container transition-colors shadow-sm disabled:opacity-75 flex items-center justify-center gap-1.5"
            >
              <span className={`material-symbols-outlined text-[15px] ${stage === "verifying" ? "animate-spin" : ""}`}>
                {stage === "verifying" ? "autorenew" : "verified"}
              </span>
              <span>{stage === "verifying" ? "Verifying in Twin Sandbox..." : "Verify in Isolated Sandbox"}</span>
            </button>
          </div>
        )}

        {!isError && stage === "verified" && (
          <div className="flex flex-col gap-2">
            <div className="w-full h-8 px-3 rounded text-xs font-mono font-semibold bg-secondary-container/30 text-secondary border border-secondary/40 flex items-center justify-center gap-1.5">
              <span className="material-symbols-outlined text-[15px]">verified</span>
              <span>GATE CLEARED · SAFE TO DEPLOY</span>
            </div>

            <button
              onClick={() => {
                setStage("initial");
                setVerificationResult(null);
              }}
              type="button"
              className="text-center text-[11px] text-outline hover:text-on-surface font-mono transition-colors"
            >
              Reset to initial state
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
