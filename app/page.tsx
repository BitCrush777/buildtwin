import React from "react";
import { AppShell } from "@/components/layout/AppShell";
import { DashboardGreeting } from "@/components/dashboard/DashboardGreeting";
import { MetricsCards } from "@/components/dashboard/MetricsCards";
import { RecentSimulationsTable } from "@/components/dashboard/RecentSimulationsTable";
import { ActiveSandboxCard } from "@/components/dashboard/ActiveSandboxCard";
import { RegressionShieldCard } from "@/components/dashboard/RegressionShieldCard";

export default function DashboardPage() {
  return (
    <AppShell>
      <div className="flex flex-col w-full pb-16 max-w-7xl mx-auto">
        <DashboardGreeting />
        <MetricsCards />
        <div className="mt-space-lg flex flex-col xl:flex-row gap-space-md items-start">
          <RecentSimulationsTable />
          <div className="w-full xl:w-80 flex flex-col gap-space-sm flex-shrink-0">
            <ActiveSandboxCard />
            <RegressionShieldCard />
          </div>
        </div>
      </div>
    </AppShell>
  );
}
