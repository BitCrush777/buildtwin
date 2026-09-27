"use client";

import React, { useState } from "react";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-surface-container-lowest text-on-surface flex flex-col selection:bg-primary/20 selection:text-primary">
      {/* Sidebar navigation */}
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main Content Area */}
      <div className="lg:pl-64 flex flex-col min-h-screen">
        <Header onToggleSidebar={() => setSidebarOpen((prev) => !prev)} />
        <main className="w-full pt-14 px-space-md lg:px-space-lg flex-1 bg-surface-container-lowest">
          {children}
        </main>
      </div>
    </div>
  );
}
