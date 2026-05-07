import { NextResponse } from "next/server";
import { deployObjectSchema } from "@/lib/salesforce/deployMetadata";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    if (!body?.schema) {
      return NextResponse.json(
        {
          error: "schema alanı zorunludur."
        },
        { status: 400 }
      );
    }

    const result = await deployObjectSchema({
      schema: body.schema,
      dryRun: Boolean(body.dryRun)
    });

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Salesforce deploy hatası."
      },
      { status: 500 }
    );
  }
}
