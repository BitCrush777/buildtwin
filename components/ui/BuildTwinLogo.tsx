import React from "react";

export function BuildTwinLogo({ className = "h-8 w-8" }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 32 32"
      className={className}
      fill="none"
    >
      <rect
        x="4"
        y="4"
        width="16"
        height="16"
        rx="3"
        stroke="#f4f5f6"
        strokeWidth="2"
        strokeDasharray="1 1"
        opacity="0.45"
      />
      <rect
        x="12"
        y="12"
        width="16"
        height="16"
        rx="3"
        stroke="#6366f1"
        strokeWidth="2"
        fill="#131517"
      />
      <path
        d="M12 12L20 4M28 20L20 28"
        stroke="#6366f1"
        strokeWidth="1.5"
        strokeLinecap="round"
        opacity="0.7"
      />
      <circle cx="20" cy="20" r="2.5" fill="#f4f5f6" />
    </svg>
  );
}
