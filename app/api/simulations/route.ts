import { NextResponse } from "next/server";
import { simulationService } from "@/lib/simulation/simulation-service";

export const dynamic = "force-dynamic";

export async function GET() {
  const all = simulationService.getAll();
  return NextResponse.json(all, { status: 200 });
}
