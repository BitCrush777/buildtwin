"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BuildTwinLogo } from "../ui/BuildTwinLogo";

interface HeaderProps {
  onToggleSidebar?: () => void;
}

export function Header({ onToggleSidebar }: HeaderProps) {
  const pathname = usePathname();
  const [searchFocused, setSearchFocused] = useState(false);

  return (
    <header className="fixed top-0 left-0 lg:left-64 right-0 h-14 bg-surface/90 backdrop-blur-md z-40 flex items-center justify-between px-space-md lg:px-space-lg border-b border-surface-container-high/40">
      {/* Left side items */}
      <div className="flex items-center gap-space-sm lg:gap-space-md">
        {/* Mobile menu trigger */}
        <button
          onClick={onToggleSidebar}
          className="lg:hidden p-1.5 rounded text-outline hover:text-on-surface hover:bg-surface-container transition-colors"
          type="button"
          aria-label="Toggle navigation menu"
        >
          <span className="material-symbols-outlined text-[20px]">menu</span>
        </button>

        {/* Mobile logo */}
        <div className="lg:hidden flex items-center gap-1.5">
          <BuildTwinLogo className="h-5 w-5" />
          <span className="text-sm font-semibold tracking-tight text-on-surface">
            BuildTwin
          </span>
        </div>

        {/* Workspace context pill */}
        <div className="hidden sm:flex items-center gap-2 px-2.5 py-1 rounded bg-surface-container text-on-surface text-xs font-mono border border-surface-container-high/30">
          <span className="material-symbols-outlined text-outline text-[15px]">
            deployed_code
          </span>
          <span className="text-on-surface font-medium">
            Active Workspace
          </span>
          <span className="text-outline-variant">/</span>
          <span className="text-secondary font-medium">
            main
          </span>
        </div>

        {/* Isolation Guard indicator */}
        <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded bg-surface-container-low text-xs font-mono text-outline border border-surface-container-high/20">
          <span className="w-1.5 h-1.5 rounded-full bg-secondary" />
          <span>Twin Isolation Active</span>
        </div>
      </div>

      {/* Right side items */}
      <div className="flex items-center gap-space-sm lg:gap-space-md">
        {/* Search input (⌘K) */}
        <div
          className={`hidden md:flex items-center gap-2 bg-surface-container-low px-2.5 py-1 rounded text-outline transition-all border border-surface-container-high/30 ${
            searchFocused
              ? "w-72 ring-1 ring-primary/40 bg-surface-container text-on-surface"
              : "w-64"
          }`}
        >
          <span className="material-symbols-outlined text-[16px]">search</span>
          <input
            type="text"
            placeholder="Search simulations (⌘K)..."
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
            className="text-xs flex-1 bg-transparent border-none outline-none text-on-surface placeholder:text-outline font-sans"
          />
          <span className="text-[10px] font-mono px-1 py-0.5 rounded bg-surface-container-high text-outline select-none">
            ⌘K
          </span>
        </div>

        {/* Header Action CTA */}
        {pathname === "/simulate" ? (
          <button
            className="flex items-center gap-1.5 h-8 px-3 rounded bg-primary text-on-primary text-xs font-semibold hover:bg-primary-container hover:text-on-primary-container transition-colors shadow-sm"
            type="button"
            onClick={() => {
              const btn = document.getElementById("create-sim-btn");
              if (btn) btn.click();
            }}
          >
            <span className="material-symbols-outlined text-[15px]">play_arrow</span>
            <span>Run Simulation</span>
          </button>
        ) : (
          <Link
            href="/simulate"
            className="flex items-center gap-1.5 h-8 px-3.5 rounded bg-primary text-on-primary text-xs font-semibold hover:bg-primary-container hover:text-on-primary-container transition-colors shadow-sm"
          >
            <span className="material-symbols-outlined text-[15px]">add</span>
            <span>New Simulation</span>
          </Link>
        )}
      </div>
    </header>
  );
}
