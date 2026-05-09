export const SUPPORTED_FIELD_TYPES = [
  "Text",
  "LongTextArea",
  "Number",
  "Currency",
  "Percent",
  "Date",
  "DateTime",
  "Checkbox",
  "Email",
  "Phone",
  "Url",
  "Picklist",
  "Lookup",
  "MasterDetail",
  "EncryptedText",
  "Formula",
  "Summary"
] as const;

export type SalesforceFieldType = (typeof SUPPORTED_FIELD_TYPES)[number];

export type AiProvider =
  | "fallback"
  | "openai"
  | "salesforce-einstein"
  | "albert"
  | "scala-llm";

export type ConnectionMode = "env" | "username-password" | "access-token" | "sf-cli";

export type SalesforceRuntimeConfig = {
  loginUrl?: string;
  username?: string;
  password?: string;
  securityToken?: string;
  instanceUrl?: string;
  accessToken?: string;
  targetOrg?: string;
  apiVersion?: string;
};

export type ActivityLogEntry = {
  id: string;
  timestamp: string;
  source: "client" | "server";
  level: "info" | "success" | "error";
  action:
    | "generate-schema"
    | "load-template"
    | "deploy-model"
    | "deploy-object"
    | "deploy-status"
    | "settings";
  message: string;
  endpoint?: string;
  requestMode?: "schema" | "template" | "dry-run" | "deploy" | "status" | "settings";
  connectionMode?: ConnectionMode;
  detail?: string;
};

export type NameFieldConfig = {
  label: string;
  type: "Text" | "AutoNumber";
  displayFormat?: string;
};

export type FormulaReturnType =
  | "Text"
  | "Number"
  | "Currency"
  | "Percent"
  | "Date"
  | "DateTime"
  | "Checkbox";

export type SummaryOperation = "sum" | "min" | "max" | "count";

export type SalesforceFieldSchema = {
  label: string;
  apiName: string;
  type: SalesforceFieldType;
  required?: boolean;
  description?: string;
  helpText?: string;
  complianceTags?: string[];

  // Text / LongTextArea / EncryptedText
  length?: number;
  visibleLines?: number;
  maskType?: "all" | "creditCard" | "ssn" | "lastFour" | "sin" | "nino";
  maskChar?: "asterisk" | "X";

  // Number / Currency / Percent / Formula numeric returns
  precision?: number;
  scale?: number;

  // Checkbox
  defaultValue?: boolean;

  // Picklist
  values?: string[];

  // Lookup / MasterDetail
  referenceTo?: string;
  relationshipLabel?: string;
  relationshipName?: string;
  deleteConstraint?: "SetNull" | "Cascade" | "Restrict";
  reparentableMasterDetail?: boolean;

  // Formula
  formula?: string;
  formulaReturnType?: FormulaReturnType;
  formulaTreatBlanksAs?: "BlankAsBlank" | "BlankAsZero";

  // Rollup Summary
  summaryOperation?: SummaryOperation;
  summarizedObject?: string;
  summarizedField?: string;
  summaryForeignKey?: string;
  summaryFilterItems?: Array<{
    field: string;
    operation: string;
    value: string;
  }>;

  externalId?: boolean;
  unique?: boolean;
};

export type SalesforceObjectSchema = {
  objectLabel: string;
  objectPluralLabel: string;
  objectApiName: string;
  description?: string;
  isStandardObject?: boolean;
  nameField: NameFieldConfig;
  sharingModel?: "ReadWrite" | "Private" | "Read" | "ControlledByParent";
  deploymentStatus?: "Deployed" | "InDevelopment";
  enableReports?: boolean;
  enableActivities?: boolean;
  enableSearch?: boolean;
  fields: SalesforceFieldSchema[];
  validationRules?: Array<{
    ruleName: string;
    errorConditionFormula: string;
    errorMessage: string;
  }>;
  triggers?: string[];
};

export type ComplianceRule = {
  code: string;
  title: string;
  description: string;
  objectApiName?: string;
  fieldApiName?: string;
  severity: "info" | "warning" | "critical";
};

export type SalesforceModelSchema = {
  modelName: string;
  modelApiName: string;
  industry?: string;
  market?: "US" | "TR" | "EU" | "GLOBAL";
  description?: string;
  aiProvider?: AiProvider;
  deployOrder: string[];
  objects: SalesforceObjectSchema[];
  complianceRules?: ComplianceRule[];
  businessRulesAndAutomations?: Array<{
    code: string;
    title: string;
    description: string;
    objectApiName?: string;
    type: string;
  }>;
};

export type SchemaGenerationResult = {
  schema: SalesforceObjectSchema;
  warnings: string[];
  usedAI: boolean;
  provider: AiProvider;
};

export type ModelGenerationResult = {
  model: SalesforceModelSchema;
  warnings: string[];
  usedAI: boolean;
  provider: AiProvider;
};
