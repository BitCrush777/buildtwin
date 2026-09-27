"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BuildTwinLogo } from "../ui/BuildTwinLogo";

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export function Sidebar({ isOpen = false, onClose }: SidebarProps) {
  const pathname = usePathname();

  const isOverviewActive = pathname === "/";
  const isSimulationsActive = pathname.startsWith("/simulate") || pathname.startsWith("/simulation");

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`fixed left-0 top-0 h-full w-64 bg-surface-container-low z-50 flex flex-col justify-between select-none transition-transform duration-200 ease-in-out border-r border-surface-container-high/40 ${
          isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        <div className="flex flex-col">
          {/* Brand header */}
          <div className="h-14 px-space-md flex items-center justify-between border-b border-surface-container-high/30">
            <Link
              href="/"
              className="flex items-center gap-2 group"
              onClick={onClose}
            >
              <BuildTwinLogo className="h-6 w-6 transition-transform group-hover:scale-105" />
              <span className="text-sm font-semibold tracking-tight text-on-surface">
                BuildTwin
              </span>
            </Link>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-surface-container text-outline">
              v1.4
            </span>
          </div>

          {/* Workspace Switcher */}
          <div className="px-space-md py-space-sm">
            <button
              className="w-full flex items-center justify-between px-2.5 py-2 rounded bg-surface-container text-on-surface hover:bg-surface-container-high transition-colors text-left border border-surface-container-high/30"
              type="button"
            >
              <div className="flex items-center gap-2 min-w-0">
                <span className="material-symbols-outlined text-outline text-[16px]">
                  domain
                </span>
                <div className="flex flex-col text-left truncate">
                  <span className="text-[10px] font-mono text-outline uppercase tracking-wider">
                    Workspace
                  </span>
                  <span className="text-xs font-mono text-on-surface truncate font-medium">
                    Production Twin #1
                  </span>
                </div>
              </div>
              <span className="material-symbols-outlined text-outline text-[16px]">
                unfold_more
              </span>
            </button>
          </div>

          {/* Nav Section Label */}
          <div className="px-space-md pt-space-xs pb-1">
            <span className="text-[10px] font-mono text-outline uppercase tracking-wider px-1">
              Simulation Engine
            </span>
          </div>

          {/* Main Navigation */}
          <nav className="flex flex-col gap-0.5 px-space-md">
            <Link
              href="/"
              onClick={onClose}
              className={`flex items-center gap-2.5 px-2.5 py-2 rounded text-xs transition-colors ${
                isOverviewActive
                  ? "bg-surface-container text-on-surface font-semibold shadow-xs border border-surface-container-high/40"
                  : "text-on-surface-variant hover:bg-surface-container/60 hover:text-on-surface"
              }`}
            >
              <span className="material-symbols-outlined text-[17px]">
                space_dashboard
              </span>
              <span>Overview</span>
            </Link>

            <Link
              href="/simulate"
              onClick={onClose}
              className={`flex items-center gap-2.5 px-2.5 py-2 rounded text-xs transition-colors ${
                isSimulationsActive
                  ? "bg-surface-container text-on-surface font-semibold shadow-xs border border-surface-container-high/40"
                  : "text-on-surface-variant hover:bg-surface-container/60 hover:text-on-surface"
              }`}
            >
              <span className="material-symbols-outlined text-[17px]">
                terminal
              </span>
              <span>Simulations</span>
            </Link>

            <button
              type="button"
              className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded text-xs text-outline hover:bg-surface-container/40 hover:text-on-surface transition-colors text-left"
            >
              <span className="material-symbols-outlined text-[17px]">source</span>
              <span>Repositories</span>
            </button>

            <button
              type="button"
              className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded text-xs text-outline hover:bg-surface-container/40 hover:text-on-surface transition-colors text-left"
            >
              <span className="material-symbols-outlined text-[17px]">verified</span>
              <span>Deploy Gates</span>
            </button>
          </nav>
        </div>

        {/* Bottom Section */}
        <div className="flex flex-col p-space-md gap-2 border-t border-surface-container-high/30 text-xs font-mono">
          <div className="flex items-center justify-between text-outline text-[11px] px-1">
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-secondary" />
              <span>Twin Isolation Active</span>
            </span>
            <span>Zero Drift</span>
          </div>

          <div className="p-2 rounded bg-surface-container text-[11px] text-outline border border-surface-container-high/30 leading-relaxed font-sans">
            BuildTwin simulates risky changes inside isolated sandboxes. Production branches remain untouched.
          </div>
        </div>
      </aside>
    </>
  );
}
