import OpenAI from "openai";
import type { AiProvider, SalesforceObjectSchema } from "@/lib/types/schema";
import { SALESFORCE_SCHEMA_SYSTEM_PROMPT } from "@/lib/ai/systemPrompt";
import { extractJsonObject } from "@/lib/utils/json";
import { pluralizeLabel, toSalesforceApiName } from "@/lib/utils/naming";
import { validateAndNormalizeObjectSchema } from "@/lib/validation/schemaValidator";

function lowerIncludes(value: string, keywords: string[]) {
  const lower = value.toLowerCase();
  return keywords.some((keyword) => lower.includes(keyword));
}

function fallbackSchema(objectName: string, businessContext?: string): SalesforceObjectSchema {
  const objectLabel = objectName.trim() || "AI Generated Object";
  const objectApiName = toSalesforceApiName(objectLabel);

  const base = {
    objectLabel,
    objectPluralLabel: pluralizeLabel(objectLabel),
    objectApiName,
    description:
      businessContext?.trim() ||
      `${objectLabel} kayıtlarını yönetmek için otomatik oluşturulan Salesforce objesi.`,
    nameField: {
      label: lowerIncludes(objectLabel, ["candidate", "profile", "müşteri", "customer"])
        ? "Full Name"
        : "Name",
      type: "Text" as const
    },
    sharingModel: "ReadWrite" as const,
    deploymentStatus: "Deployed" as const,
    enableReports: true,
    enableActivities: true,
    enableSearch: true
  };

  if (lowerIncludes(objectLabel, ["loan", "credit", "application", "kredi", "başvuru", "basvuru"])) {
    return {
      ...base,
      nameField: { label: "Application Number", type: "AutoNumber" as const, displayFormat: "APP-{00000}" },
      sharingModel: "Private" as const,
      fields: [
        { label: "Applicant", apiName: "Applicant__c", type: "Lookup", referenceTo: "Account", required: true },
        { label: "Requested Amount", apiName: "Requested_Amount__c", type: "Currency", precision: 18, scale: 2, required: true },
        { label: "Term Months", apiName: "Term_Months__c", type: "Number", precision: 5, scale: 0, required: true },
        {
          label: "Status",
          apiName: "Status__c",
          type: "Picklist",
          values: ["Draft", "Under Review", "Approved", "Denied", "Withdrawn"],
          required: true
        },
        { label: "APR", apiName: "APR__c", type: "Percent", precision: 6, scale: 3, complianceTags: ["TILA", "Reg Z"] },
        { label: "Credit Pull Consent", apiName: "Credit_Pull_Consent__c", type: "Checkbox", defaultValue: false, complianceTags: ["FCRA"] }
      ]
    };
  }

  if (lowerIncludes(objectLabel, ["candidate", "profile", "applicant", "aday"])) {
    return {
      ...base,
      fields: [
        { label: "Email", apiName: "Email__c", type: "Email", required: true },
        { label: "Phone", apiName: "Phone__c", type: "Phone", required: false },
        {
          label: "Experience Level",
          apiName: "Experience_Level__c",
          type: "Picklist",
          values: ["Junior", "Mid", "Senior", "Lead"],
          required: false
        },
        { label: "LinkedIn URL", apiName: "LinkedIn_URL__c", type: "Url", required: false },
        {
          label: "Status",
          apiName: "Status__c",
          type: "Picklist",
          values: ["New", "Screening", "Interview", "Offer", "Rejected", "Hired"],
          required: true
        },
        { label: "Notes", apiName: "Notes__c", type: "LongTextArea", length: 32768, visibleLines: 5 }
      ]
    };
  }

  if (lowerIncludes(objectLabel, ["product", "market", "ürün", "urun", "stok"])) {
    return {
      ...base,
      fields: [
        { label: "SKU", apiName: "SKU__c", type: "Text", length: 80, required: true, unique: true },
        { label: "Barcode", apiName: "Barcode__c", type: "Text", length: 80 },
        { label: "Price", apiName: "Price__c", type: "Currency", precision: 18, scale: 2, required: true },
        { label: "Stock Quantity", apiName: "Stock_Quantity__c", type: "Number", precision: 18, scale: 0 },
        {
          label: "Category",
          apiName: "Category__c",
          type: "Picklist",
          values: ["Food", "Cleaning", "Cosmetics", "Fresh Produce", "Hardware", "Other"]
        },
        { label: "Is Active", apiName: "Is_Active__c", type: "Checkbox", defaultValue: true }
      ]
    };
  }

  return {
    ...base,
    fields: [
      { label: "Status", apiName: "Status__c", type: "Picklist", values: ["New", "Active", "Inactive", "Archived"], required: true },
      { label: "External Reference", apiName: "External_Reference__c", type: "Text", length: 120, externalId: true },
      { label: "Start Date", apiName: "Start_Date__c", type: "Date" },
      { label: "Amount", apiName: "Amount__c", type: "Currency", precision: 18, scale: 2 },
      { label: "Description", apiName: "Description__c", type: "LongTextArea", length: 32768, visibleLines: 5 }
    ]
  };
}

async function callJsonEndpoint(params: {
  endpoint: string;
  apiKey?: string;
  objectName: string;
  businessContext?: string;
  provider: AiProvider;
}) {
  const response = await fetch(params.endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(params.apiKey ? { Authorization: `Bearer ${params.apiKey}` } : {})
    },
    body: JSON.stringify({
      objectName: params.objectName,
      businessContext: params.businessContext,
      systemPrompt: SALESFORCE_SCHEMA_SYSTEM_PROMPT,
      provider: params.provider
    })
  });

  if (!response.ok) {
    throw new Error(`${params.provider} endpoint hatası: ${response.status}`);
  }

  return response.json();
}

async function generateWithProvider(provider: AiProvider, objectName: string, businessContext?: string) {
  if (provider === "fallback") {
    return { parsed: fallbackSchema(objectName, businessContext), usedAI: false };
  }

  if (provider === "openai") {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) throw new Error("OPENAI_API_KEY bulunamadı.");

    const client = new OpenAI({ apiKey });
    const completion = await client.chat.completions.create({
      model: process.env.OPENAI_MODEL || "gpt-4o-mini",
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SALESFORCE_SCHEMA_SYSTEM_PROMPT },
        { role: "user", content: JSON.stringify({ objectName, businessContext }) }
      ]
    });

    const raw = completion.choices[0]?.message?.content;
    if (!raw) throw new Error("OpenAI boş yanıt döndürdü.");
    return { parsed: extractJsonObject(raw), usedAI: true };
  }

  if (provider === "salesforce-einstein") {
    const endpoint = process.env.SALESFORCE_AI_ENDPOINT;
    if (!endpoint) throw new Error("SALESFORCE_AI_ENDPOINT tanımlı değil.");
    return {
      parsed: await callJsonEndpoint({
        endpoint,
        apiKey: process.env.SALESFORCE_AI_API_KEY,
        objectName,
        businessContext,
        provider
      }),
      usedAI: true
    };
  }

  if (provider === "albert") {
    const endpoint = process.env.ALBERT_AI_ENDPOINT;
    if (!endpoint) throw new Error("ALBERT_AI_ENDPOINT tanımlı değil.");
    return {
      parsed: await callJsonEndpoint({
        endpoint,
        apiKey: process.env.ALBERT_AI_API_KEY,
        objectName,
        businessContext,
        provider
      }),
      usedAI: true
    };
  }

  const endpoint = process.env.SCALA_LLM_ENDPOINT;
  if (!endpoint) throw new Error("SCALA_LLM_ENDPOINT tanımlı değil.");
  return {
    parsed: await callJsonEndpoint({
      endpoint,
      apiKey: process.env.SCALA_LLM_API_KEY,
      objectName,
      businessContext,
      provider: "scala-llm"
    }),
    usedAI: true
  };
}

export async function generateObjectSchema(
  objectName: string,
  businessContext?: string,
  provider: AiProvider = "openai"
): Promise<{ schema: SalesforceObjectSchema; usedAI: boolean; warnings: string[]; provider: AiProvider }> {
  try {
    const result = await generateWithProvider(provider, objectName, businessContext);
    const normalized = validateAndNormalizeObjectSchema(result.parsed);

    return {
      ...normalized,
      usedAI: result.usedAI,
      provider
    };
  } catch (error) {
    const normalized = validateAndNormalizeObjectSchema(fallbackSchema(objectName, businessContext));
    return {
      ...normalized,
      usedAI: false,
      provider: "fallback",
      warnings: [
        ...normalized.warnings,
        `${provider} kullanılamadı; güvenli fallback schema üretildi. Detay: ${
          error instanceof Error ? error.message : "Bilinmeyen hata"
        }`
      ]
    };
  }
}
