import React from "react";

interface TwinTopologyGraphProps {
  repoName?: string;
  branch?: string;
}

export function TwinTopologyGraph({ repoName = "Source Repo", branch = "main" }: TwinTopologyGraphProps) {
  const displayRepo = repoName.length > 14 ? repoName.slice(0, 13) + "…" : repoName;

  return (
    <div className="bg-surface-container-low rounded-lg p-space-md flex flex-col gap-3 border border-surface-container-high/40 text-xs">
      <div className="flex items-center justify-between pb-1.5 border-b border-surface-container-high/30">
        <span className="font-mono text-xs font-semibold uppercase tracking-wider text-outline">
          Twin Topology Architecture
        </span>
        <span className="font-mono text-[11px] text-secondary">
          Ready
        </span>
      </div>

      {/* Architecture SVG diagram: Calm, technical vector layout */}
      <div className="bg-surface-container-lowest rounded p-space-sm relative overflow-hidden flex flex-col items-center border border-surface-container-high/30">
        <svg
          className="w-full h-36 text-outline"
          fill="none"
          viewBox="0 0 320 140"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Source Node */}
          <rect
            fill="#1e2022"
            stroke="#464554"
            strokeWidth="1"
            height="44"
            rx="4"
            width="80"
            x="15"
            y="48"
          />
          <text
            fill="#e2e2e5"
            fontFamily="monospace"
            fontSize="9"
            fontWeight="600"
            textAnchor="middle"
            x="55"
            y="68"
          >
            {displayRepo}
          </text>
          <text
            fill="#908fa0"
            fontFamily="monospace"
            fontSize="8"
            textAnchor="middle"
            x="55"
            y="81"
          >
            {branch}
          </text>

          {/* Pipe 1 */}
          <path
            d="M95 70 H135"
            stroke="#464554"
            strokeDasharray="3 3"
            strokeWidth="1.5"
          />

          {/* Isolated Sandbox Node */}
          <rect
            fill="#1e2022"
            stroke="#8083ff"
            strokeWidth="1.5"
            height="64"
            rx="4"
            width="80"
            x="135"
            y="38"
          />
          <text
            fill="#c0c1ff"
            fontFamily="monospace"
            fontSize="9"
            fontWeight="bold"
            textAnchor="middle"
            x="175"
            y="60"
          >
            SANDBOX
          </text>
          <text
            fill="#e2e2e5"
            fontFamily="monospace"
            fontSize="8"
            textAnchor="middle"
            x="175"
            y="74"
          >
            Ephemeral
          </text>
          <text
            fill="#908fa0"
            fontFamily="monospace"
            fontSize="7.5"
            textAnchor="middle"
            x="175"
            y="87"
          >
            Air-Gapped
          </text>

          {/* Pipe 2 */}
          <path d="M215 55 H245" stroke="#8083ff" strokeWidth="1.5" />
          <path d="M215 85 H245" stroke="#ffb783" strokeWidth="1.5" />

          {/* Target 1: Test Runner */}
          <rect
            fill="#1e2022"
            stroke="#464554"
            strokeWidth="1"
            height="28"
            rx="3"
            width="65"
            x="245"
            y="41"
          />
          <text
            fill="#c3c0ff"
            fontFamily="monospace"
            fontSize="8"
            fontWeight="500"
            textAnchor="middle"
            x="277"
            y="58"
          >
            Test Suite
          </text>

          {/* Target 2: Impact Analysis */}
          <rect
            fill="#1e2022"
            stroke="#464554"
            strokeWidth="1"
            height="28"
            rx="3"
            width="65"
            x="245"
            y="73"
          />
          <text
            fill="#ffb783"
            fontFamily="monospace"
            fontSize="8"
            fontWeight="500"
            textAnchor="middle"
            x="277"
            y="90"
          >
            Telemetry
          </text>
        </svg>
      </div>

      <div className="flex items-center justify-between text-[11px] font-mono text-outline pt-1">
        <span>Isolation: Ephemeral Copy</span>
        <span className="text-secondary font-medium">Safe to Mutate</span>
      </div>
    </div>
  );
}
