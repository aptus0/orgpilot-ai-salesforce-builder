import { z } from "zod";
import {
  SUPPORTED_FIELD_TYPES,
  type AiProvider,
  type FormulaReturnType,
  type SalesforceFieldSchema,
  type SalesforceFieldType,
  type SalesforceModelSchema,
  type SalesforceObjectSchema,
  type SummaryOperation
} from "@/lib/types/schema";
import {
  cleanLabel,
  pluralizeLabel,
  toRelationshipName,
  toSalesforceApiName,
  uniqueApiName
} from "@/lib/utils/naming";

const supportedFieldTypeSet = new Set<string>(SUPPORTED_FIELD_TYPES);
const formulaReturnTypes = new Set<string>([
  "Text",
  "Number",
  "Currency",
  "Percent",
  "Date",
  "DateTime",
  "Checkbox"
]);
const summaryOperations = new Set<string>(["sum", "min", "max", "count"]);
const aiProviders = new Set<string>([
  "fallback",
  "openai",
  "salesforce-einstein",
  "albert",
  "scala-llm"
]);

const RawFieldSchema = z.object({
  label: z.string().optional(),
  apiName: z.string().optional(),
  type: z.string().optional(),
  required: z.boolean().optional(),
  description: z.string().optional(),
  helpText: z.string().optional(),
  complianceTags: z.array(z.string()).optional(),
  length: z.number().int().positive().optional(),
  visibleLines: z.number().int().positive().optional(),
  maskType: z.string().optional(),
  maskChar: z.string().optional(),
  precision: z.number().int().positive().optional(),
  scale: z.number().int().min(0).optional(),
  defaultValue: z.boolean().optional(),
  values: z.array(z.string()).optional(),
  referenceTo: z.string().optional(),
  relationshipLabel: z.string().optional(),
  relationshipName: z.string().optional(),
  deleteConstraint: z.string().optional(),
  reparentableMasterDetail: z.boolean().optional(),
  formula: z.string().optional(),
  formulaReturnType: z.string().optional(),
  formulaTreatBlanksAs: z.string().optional(),
  summaryOperation: z.string().optional(),
  summarizedObject: z.string().optional(),
  summarizedField: z.string().optional(),
  summaryForeignKey: z.string().optional(),
  summaryFilterItems: z
    .array(
      z.object({
        field: z.string(),
        operation: z.string(),
        value: z.string()
      })
    )
    .optional(),
  externalId: z.boolean().optional(),
  unique: z.boolean().optional()
});

const RawObjectSchema = z.object({
  objectLabel: z.string().optional(),
  objectPluralLabel: z.string().optional(),
  objectApiName: z.string().optional(),
  description: z.string().optional(),
  isStandardObject: z.boolean().optional(),
  nameField: z
    .object({
      label: z.string().optional(),
      type: z.enum(["Text", "AutoNumber"]).optional(),
      displayFormat: z.string().optional()
    })
    .optional(),
  sharingModel: z.enum(["ReadWrite", "Private", "Read", "ControlledByParent"]).optional(),
  deploymentStatus: z.enum(["Deployed", "InDevelopment"]).optional(),
  enableReports: z.boolean().optional(),
  enableActivities: z.boolean().optional(),
  enableSearch: z.boolean().optional(),
  fields: z.array(RawFieldSchema).optional()
});

const RawModelSchema = z.object({
  modelName: z.string().optional(),
  modelApiName: z.string().optional(),
  industry: z.string().optional(),
  market: z.enum(["US", "TR", "EU", "GLOBAL"]).optional(),
  description: z.string().optional(),
  aiProvider: z.string().optional(),
  deployOrder: z.array(z.string()).optional(),
  objects: z.array(RawObjectSchema).optional(),
  complianceRules: z
    .array(
      z.object({
        code: z.string(),
        title: z.string(),
        description: z.string(),
        objectApiName: z.string().optional(),
        fieldApiName: z.string().optional(),
        severity: z.enum(["info", "warning", "critical"])
      })
    )
    .optional()
});

export type SchemaValidationResult = {
  schema: SalesforceObjectSchema;
  warnings: string[];
};

export type ModelValidationResult = {
  model: SalesforceModelSchema;
  warnings: string[];
};

function normalizeFieldType(type: unknown, warnings: string[]): SalesforceFieldType {
  if (typeof type === "string" && supportedFieldTypeSet.has(type)) {
    return type as SalesforceFieldType;
  }

  if (typeof type === "string") {
    warnings.push(`Desteklenmeyen field tipi "${type}" Text olarak değiştirildi.`);
  }

  return "Text";
}

function clamp(value: number | undefined, min: number, max: number, fallback: number) {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return fallback;
  }

  return Math.min(Math.max(value, min), max);
}

function normalizePicklistValues(values: unknown): string[] {
  if (!Array.isArray(values)) {
    return ["New", "Active", "Inactive"];
  }

  const unique = new Set<string>();

  for (const value of values) {
    if (typeof value !== "string") continue;
    const cleaned = cleanLabel(value, "");
    if (cleaned) unique.add(cleaned);
  }

  const list = Array.from(unique).slice(0, 100);
  return list.length > 0 ? list : ["New", "Active", "Inactive"];
}

function normalizeReferenceName(value: string | undefined, fallback: string) {
  if (!value) return fallback;
  const trimmed = value.trim();
  if (["Account", "User", "Contact", "Opportunity", "Case"].includes(trimmed)) {
    return trimmed;
  }
  return trimmed.endsWith("__c") ? trimmed : toSalesforceApiName(trimmed);
}

function normalizeFormulaReturnType(value: unknown): FormulaReturnType {
  if (typeof value === "string" && formulaReturnTypes.has(value)) {
    return value as FormulaReturnType;
  }
  return "Text";
}

function normalizeSummaryOperation(value: unknown): SummaryOperation {
  if (typeof value === "string" && summaryOperations.has(value)) {
    return value as SummaryOperation;
  }
  return "sum";
}

function normalizeObjectApiName(raw: string | undefined, label: string, isStandardObject?: boolean) {
  const value = raw?.trim() || label;
  if (isStandardObject) {
    return value.replace(/[^a-zA-Z0-9_]/g, "_").replace(/_+/g, "_");
  }
  return toSalesforceApiName(value);
}

function normalizeComplianceTags(values: string[] | undefined) {
  return Array.from(
    new Set((values ?? []).map((value) => cleanLabel(value, "")).filter(Boolean))
  ).slice(0, 20);
}

function normalizeField(
  rawField: z.infer<typeof RawFieldSchema>,
  usedApiNames: Set<string>,
  warnings: string[]
): SalesforceFieldSchema {
  const label = cleanLabel(rawField.label, "Custom Field");
  const type = normalizeFieldType(rawField.type, warnings);
  const generatedApiName = toSalesforceApiName(label);
  const apiName = uniqueApiName(toSalesforceApiName(rawField.apiName ?? generatedApiName), usedApiNames);

  const field: SalesforceFieldSchema = {
    label,
    apiName,
    type,
    required: Boolean(rawField.required),
    description: rawField.description,
    helpText: rawField.helpText,
    complianceTags: normalizeComplianceTags(rawField.complianceTags)
  };

  if ((rawField.externalId || rawField.unique) && !["Text", "Number", "Email"].includes(type)) {
    warnings.push(`${apiName}: externalId/unique yalnızca uygun field tiplerinde önerilir; bayraklar kaldırıldı.`);
  } else {
    field.externalId = rawField.externalId;
    field.unique = rawField.unique;
  }

  switch (type) {
    case "Text":
      field.length = clamp(rawField.length, 1, 255, 80);
      break;

    case "EncryptedText":
      field.length = clamp(rawField.length, 1, 175, 80);
      field.maskType = (rawField.maskType as SalesforceFieldSchema["maskType"]) || "lastFour";
      field.maskChar = (rawField.maskChar as SalesforceFieldSchema["maskChar"]) || "asterisk";
      field.required = false;
      break;

    case "LongTextArea":
      field.length = clamp(rawField.length, 256, 131072, 32768);
      field.visibleLines = clamp(rawField.visibleLines, 2, 50, 5);
      field.required = false;
      break;

    case "Number":
    case "Currency":
    case "Percent":
      field.precision = clamp(rawField.precision, 1, 18, type === "Percent" ? 6 : 18);
      field.scale = clamp(rawField.scale, 0, 17, type === "Number" ? 0 : 2);
      if ((field.scale ?? 0) >= (field.precision ?? 18)) {
        field.scale = Math.max(0, (field.precision ?? 18) - 1);
      }
      break;

    case "Checkbox":
      field.defaultValue = rawField.defaultValue ?? false;
      field.required = false;
      break;

    case "Picklist":
      field.values = normalizePicklistValues(rawField.values);
      break;

    case "Lookup":
    case "MasterDetail":
      field.referenceTo = normalizeReferenceName(rawField.referenceTo, "Account");
      field.relationshipLabel = cleanLabel(rawField.relationshipLabel, label);
      field.relationshipName = toRelationshipName(rawField.relationshipName ?? label);
      field.deleteConstraint =
        type === "Lookup"
          ? ((rawField.deleteConstraint as SalesforceFieldSchema["deleteConstraint"]) ??
            (field.required ? "Restrict" : "SetNull"))
          : undefined;
      field.reparentableMasterDetail = rawField.reparentableMasterDetail ?? false;
      break;

    case "Formula":
      field.formula = rawField.formula?.trim() || '"TODO: Formula"';
      field.formulaReturnType = normalizeFormulaReturnType(rawField.formulaReturnType);
      field.formulaTreatBlanksAs =
        rawField.formulaTreatBlanksAs === "BlankAsBlank" ? "BlankAsBlank" : "BlankAsZero";
      if (["Number", "Currency", "Percent"].includes(field.formulaReturnType)) {
        field.precision = clamp(rawField.precision, 1, 18, field.formulaReturnType === "Percent" ? 6 : 18);
        field.scale = clamp(rawField.scale, 0, 17, field.formulaReturnType === "Number" ? 0 : 2);
      }
      field.required = false;
      break;

    case "Summary":
      field.summaryOperation = normalizeSummaryOperation(rawField.summaryOperation);
      field.summarizedObject = normalizeReferenceName(rawField.summarizedObject, "Child_Object__c");
      field.summarizedField = rawField.summarizedField?.trim();
      field.summaryForeignKey = rawField.summaryForeignKey?.trim();
      field.summaryFilterItems = rawField.summaryFilterItems;
      field.required = false;
      break;

    default:
      break;
  }

  return field;
}

export function validateAndNormalizeObjectSchema(input: unknown): SchemaValidationResult {
  const parsed = RawObjectSchema.parse(input);
  const warnings: string[] = [];

  const objectLabel = cleanLabel(parsed.objectLabel, "AI Generated Object");
  const objectPluralLabel = cleanLabel(parsed.objectPluralLabel, pluralizeLabel(objectLabel));
  const objectApiName = normalizeObjectApiName(parsed.objectApiName, objectLabel, parsed.isStandardObject);

  if (parsed.objectApiName && parsed.objectApiName !== objectApiName) {
    warnings.push(`Object API name normalize edildi: ${objectApiName}`);
  }

  const rawFields = (parsed.fields ?? []).slice(0, 100);

  if ((parsed.fields?.length ?? 0) > 100) {
    warnings.push("Maksimum 100 field destekleniyor; fazla field'lar kırpıldı.");
  }

  const usedApiNames = new Set<string>();
  const fields = rawFields.map((field) => normalizeField(field, usedApiNames, warnings));

  if (fields.length === 0) {
    fields.push(
      normalizeField(
        {
          label: "Status",
          type: "Picklist",
          values: ["New", "Active", "Inactive"],
          required: false
        },
        usedApiNames,
        warnings
      )
    );
    warnings.push("Field listesi boş geldiği için varsayılan Status field eklendi.");
  }

  return {
    warnings,
    schema: {
      objectLabel,
      objectPluralLabel,
      objectApiName,
      description: parsed.description,
      isStandardObject: parsed.isStandardObject ?? objectApiName === "Account",
      nameField: {
        label: cleanLabel(parsed.nameField?.label, parsed.isStandardObject ? "Name" : "Name"),
        type: parsed.nameField?.type ?? "Text",
        displayFormat: parsed.nameField?.displayFormat
      },
      sharingModel: parsed.sharingModel ?? (parsed.isStandardObject ? "ReadWrite" : "ReadWrite"),
      deploymentStatus: parsed.deploymentStatus ?? "Deployed",
      enableReports: parsed.enableReports ?? true,
      enableActivities: parsed.enableActivities ?? true,
      enableSearch: parsed.enableSearch ?? true,
      fields
    }
  };
}

export function validateAndNormalizeModelSchema(input: unknown): ModelValidationResult {
  const parsed = RawModelSchema.parse(input);
  const warnings: string[] = [];

  const objects = (parsed.objects ?? []).map((object) => {
    const normalized = validateAndNormalizeObjectSchema(object);
    warnings.push(...normalized.warnings.map((warning) => `${normalized.schema.objectApiName}: ${warning}`));
    return normalized.schema;
  });

  if (objects.length === 0) {
    throw new Error("Model içinde en az 1 object olmalı.");
  }

  const objectNames = objects.map((object) => object.objectApiName);
  const deployOrder = (parsed.deployOrder && parsed.deployOrder.length > 0 ? parsed.deployOrder : objectNames)
    .filter((name, index, list) => list.indexOf(name) === index);

  const missingInDeployOrder = objectNames.filter((name) => !deployOrder.includes(name));
  if (missingInDeployOrder.length > 0) {
    deployOrder.push(...missingInDeployOrder);
    warnings.push(`Deploy order içinde olmayan object'ler sona eklendi: ${missingInDeployOrder.join(", ")}`);
  }

  const provider = aiProviders.has(parsed.aiProvider ?? "")
    ? (parsed.aiProvider as AiProvider)
    : "fallback";

  return {
    warnings,
    model: {
      modelName: cleanLabel(parsed.modelName, "Salesforce Data Model"),
      modelApiName: (parsed.modelApiName ?? "Salesforce_Data_Model")
        .replace(/[^a-zA-Z0-9_]/g, "_")
        .replace(/_+/g, "_"),
      industry: parsed.industry,
      market: parsed.market ?? "GLOBAL",
      description: parsed.description,
      aiProvider: provider,
      deployOrder,
      objects,
      complianceRules: parsed.complianceRules ?? []
    }
  };
}
