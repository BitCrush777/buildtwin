import { NextRequest, NextResponse } from "next/server";
import { simulationService } from "@/lib/simulation/simulation-service";

export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const simulationId = params.id;
    if (!simulationId) {
      return NextResponse.json({ error: "Simulation ID is required." }, { status: 400 });
    }

    const verification = await simulationService.verifySimulation(simulationId);
    return NextResponse.json(verification, { status: 200 });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to verify simulation." },
      { status: 404 }
    );
  }
}
