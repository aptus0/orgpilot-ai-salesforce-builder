import { NextResponse } from "next/server";
import { deployModelSchema } from "@/lib/salesforce/deployMetadata";
import { createActivityLogEntry } from "@/lib/utils/activity";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    if (!body?.model) {
      return NextResponse.json(
        {
          error: "model alanı zorunludur."
        },
        { status: 400 }
      );
    }

    const result = await deployModelSchema({
      model: body.model,
      dryRun: Boolean(body.dryRun),
      salesforceConfig: body.salesforceConfig
    });

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Salesforce model deploy hatasi.",
        trace: [
          createActivityLogEntry({
            source: "server",
            level: "error",
            action: "deploy-model",
            message: error instanceof Error ? error.message : "Salesforce model deploy hatasi.",
            endpoint: "/api/salesforce/deploy-model",
            requestMode: "deploy"
          })
        ]
      },
      { status: 500 }
    );
  }
}
