import { NextResponse } from "next/server";
import { checkDeployStatus } from "@/lib/salesforce/deployMetadata";
import { createActivityLogEntry } from "@/lib/utils/activity";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const id = typeof body?.id === "string" ? body.id : "";

    if (!id) {
      return NextResponse.json(
        {
          error: "id alani zorunludur."
        },
        { status: 400 }
      );
    }

    const result = await checkDeployStatus(id, body.salesforceConfig);

    return NextResponse.json({
      id,
      ...result
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Deploy status okunamadi.",
        trace: [
          createActivityLogEntry({
            source: "server",
            level: "error",
            action: "deploy-status",
            message: error instanceof Error ? error.message : "Deploy status okunamadi.",
            endpoint: "/api/salesforce/deploy-status",
            requestMode: "status"
          })
        ]
      },
      { status: 500 }
    );
  }
}
