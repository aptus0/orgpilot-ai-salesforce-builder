import { NextResponse } from "next/server";
import { checkDeployStatus } from "@/lib/salesforce/deployMetadata";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const id = url.searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        {
          error: "id query parametresi zorunludur."
        },
        { status: 400 }
      );
    }

    const result = await checkDeployStatus(id);

    return NextResponse.json({
      id,
      result
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Deploy status okunamadı."
      },
      { status: 500 }
    );
  }
}
