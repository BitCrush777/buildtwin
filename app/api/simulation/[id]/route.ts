import { NextRequest, NextResponse } from "next/server";
import { simulationService } from "@/lib/simulation/simulation-service";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const sim = simulationService.getById(params.id);
  if (!sim) {
    return NextResponse.json({ error: "Simulation not found" }, { status: 404 });
  }

  return NextResponse.json(sim, { status: 200 });
}
