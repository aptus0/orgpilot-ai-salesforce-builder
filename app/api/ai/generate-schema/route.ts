import { NextResponse } from "next/server";
import { generateObjectSchema } from "@/lib/ai/generateObjectSchema";
import type { AiProvider } from "@/lib/types/schema";

const providers = new Set(["fallback", "openai", "salesforce-einstein", "albert", "scala-llm"]);

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    if (!body?.objectName || typeof body.objectName !== "string") {
      return NextResponse.json(
        {
          error: "objectName alanı zorunludur."
        },
        { status: 400 }
      );
    }

    const provider = providers.has(body.aiProvider)
      ? (body.aiProvider as AiProvider)
      : "openai";

    const result = await generateObjectSchema(
      body.objectName,
      typeof body.businessContext === "string" ? body.businessContext : undefined,
      provider
    );

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Schema üretim hatası."
      },
      { status: 500 }
    );
  }
}
