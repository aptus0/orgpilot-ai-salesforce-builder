import { NextResponse } from "next/server";
import { deployModelSchema } from "@/lib/salesforce/deployMetadata";

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
      dryRun: Boolean(body.dryRun)
    });

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Salesforce model deploy hatası."
      },
      { status: 500 }
    );
  }
}
