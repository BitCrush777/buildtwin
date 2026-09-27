import { NextRequest, NextResponse } from "next/server";
import { simulationService } from "@/lib/simulation/simulation-service";
import { SimulateRequest } from "@/lib/simulation/types";

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as SimulateRequest;

    if (!body.repoUrl) {
      return NextResponse.json(
        { error: "Repository URL is required." },
        { status: 400 }
      );
    }

    if (!body.filePath) {
      return NextResponse.json(
        { error: "Target file path is required." },
        { status: 400 }
      );
    }

    if (!body.oldValue) {
      return NextResponse.json(
        { error: "Find pattern (oldValue) is required." },
        { status: 400 }
      );
    }

    if (body.newValue === undefined) {
      return NextResponse.json(
        { error: "Replace pattern (newValue) is required." },
        { status: 400 }
      );
    }

    const payload: SimulateRequest = {
      ...body,
      testCommand: body.testCommand || "",
    };

    const result = await simulationService.runRealSimulation(payload);

    if (result.status === "error" && result.errorMessage) {
      // Return 422 with the structured error response
      return NextResponse.json(result, { status: 422 });
    }

    return NextResponse.json(result, { status: 200 });
  } catch (error: any) {
    return NextResponse.json(
      {
        error: "Internal simulation engine error",
        message: error.message || String(error),
      },
      { status: 500 }
    );
  }
}
