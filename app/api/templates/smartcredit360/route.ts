import { NextResponse } from "next/server";
import { smartCredit360Model } from "@/lib/templates/smartcredit360";
import { validateAndNormalizeModelSchema } from "@/lib/validation/schemaValidator";

export const runtime = "nodejs";

export async function GET() {
  const normalized = validateAndNormalizeModelSchema(smartCredit360Model());
  return NextResponse.json(normalized);
}
