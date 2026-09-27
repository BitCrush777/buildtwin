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

    let body: { patch?: string };
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
    }

    if (!body.patch || typeof body.patch !== "string") {
      return NextResponse.json(
        { error: "patch is required and must be a string (unified diff format)." },
        { status: 400 }
      );
    }

    const result = await simulationService.applyPatch(simulationId, body.patch);

    if (!result.applied) {
      return NextResponse.json(result, { status: 422 });
    }

    return NextResponse.json(result, { status: 200 });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to apply patch." },
      { status: 500 }
    );
  }
}
