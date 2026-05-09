import { NextResponse } from "next/server";
import { enterpriseRealtorManagementModel } from "@/lib/templates/enterpriseRealtorManagement";
import { validateAndNormalizeModelSchema } from "@/lib/validation/schemaValidator";
import { createActivityLogEntry } from "@/lib/utils/activity";

export const runtime = "nodejs";

export async function GET() {
  const normalized = validateAndNormalizeModelSchema(enterpriseRealtorManagementModel());
  return NextResponse.json({
    ...normalized,
    trace: [
      createActivityLogEntry({
        source: "server",
        level: "success",
        action: "load-template",
        message: "Enterprise Realtor Management template yuklendi.",
        endpoint: "/api/templates/enterprise-realtor-management",
        requestMode: "template"
      })
    ]
  });
}
