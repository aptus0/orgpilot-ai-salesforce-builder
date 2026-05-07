import type {
  FormulaReturnType,
  SalesforceFieldSchema,
  SalesforceObjectSchema
} from "@/lib/types/schema";

function picklistValuePayload(values: string[]) {
  return {
    restricted: true,
    valueSetDefinition: {
      sorted: false,
      value: values.map((value, index) => ({
        fullName: value,
        default: index === 0,
        label: value
      }))
    }
  };
}

function formulaMetadataType(returnType?: FormulaReturnType) {
  return returnType || "Text";
}

function summaryOperation(value: SalesforceFieldSchema["summaryOperation"]) {
  switch (value) {
    case "count":
      return "count";
    case "min":
      return "min";
    case "max":
      return "max";
    case "sum":
    default:
      return "sum";
  }
}

function lookupDeleteConstraint(field: SalesforceFieldSchema) {
  if (field.deleteConstraint) {
    return field.deleteConstraint;
  }

  return field.required ? "Restrict" : "SetNull";
}

function fieldDeployRank(field: SalesforceFieldSchema) {
  switch (field.type) {
    case "Lookup":
    case "MasterDetail":
      return 1;
    case "Formula":
    case "Summary":
      return 3;
    default:
      return 2;
  }
}

export function buildCustomObjectMetadata(schema: SalesforceObjectSchema) {
  return {
    fullName: schema.objectApiName,
    label: schema.objectLabel,
    pluralLabel: schema.objectPluralLabel,
    description: schema.description,
    nameField:
      schema.nameField.type === "AutoNumber"
        ? {
            type: "AutoNumber",
            label: schema.nameField.label,
            displayFormat: schema.nameField.displayFormat || "AUTO-{0000}"
          }
        : {
            type: "Text",
            label: schema.nameField.label
          },
    deploymentStatus: schema.deploymentStatus || "Deployed",
    sharingModel: schema.sharingModel || "ReadWrite",
    enableActivities: schema.enableActivities ?? true,
    enableReports: schema.enableReports ?? true,
    enableSearch: schema.enableSearch ?? true
  };
}

export function buildCustomFieldMetadata(
  objectApiName: string,
  field: SalesforceFieldSchema
) {
  const metadata: Record<string, unknown> = {
    fullName: `${objectApiName}.${field.apiName}`,
    label: field.label,
    description: field.description,
    inlineHelpText: field.helpText
  };

  if (field.type === "Formula") {
    metadata.type = formulaMetadataType(field.formulaReturnType);
    metadata.formula = field.formula;
    metadata.formulaTreatBlanksAs = field.formulaTreatBlanksAs || "BlankAsZero";
  } else {
    metadata.type = field.type;
  }

  if (!["Checkbox", "LongTextArea", "Formula", "Summary", "EncryptedText", "MasterDetail"].includes(field.type)) {
    metadata.required = Boolean(field.required);
  }

  if (field.externalId) metadata.externalId = true;
  if (field.unique) metadata.unique = true;

  switch (field.type) {
    case "Text":
      metadata.length = field.length ?? 80;
      break;

    case "EncryptedText":
      metadata.length = field.length ?? 80;
      metadata.maskChar = field.maskChar || "asterisk";
      metadata.maskType = field.maskType || "lastFour";
      break;

    case "LongTextArea":
      metadata.length = field.length ?? 32768;
      metadata.visibleLines = field.visibleLines ?? 5;
      break;

    case "Number":
    case "Currency":
    case "Percent":
      metadata.precision = field.precision ?? (field.type === "Percent" ? 6 : 18);
      metadata.scale = field.scale ?? (field.type === "Number" ? 0 : 2);
      break;

    case "Formula":
      if (["Number", "Currency", "Percent"].includes(field.formulaReturnType || "")) {
        metadata.precision = field.precision ?? (field.formulaReturnType === "Percent" ? 6 : 18);
        metadata.scale = field.scale ?? (field.formulaReturnType === "Number" ? 0 : 2);
      }
      break;

    case "Checkbox":
      metadata.defaultValue = String(field.defaultValue ?? false);
      break;

    case "Picklist":
      metadata.valueSet = picklistValuePayload(field.values ?? ["New", "Active", "Inactive"]);
      break;

    case "Lookup":
      metadata.referenceTo = field.referenceTo || "Account";
      metadata.relationshipLabel = field.relationshipLabel || field.label;
      metadata.relationshipName = field.relationshipName || field.label.replace(/[^a-zA-Z0-9]/g, "");
      metadata.deleteConstraint = lookupDeleteConstraint(field);
      break;

    case "MasterDetail":
      metadata.referenceTo = field.referenceTo || "Account";
      metadata.relationshipLabel = field.relationshipLabel || field.label;
      metadata.relationshipName = field.relationshipName || field.label.replace(/[^a-zA-Z0-9]/g, "");
      metadata.reparentableMasterDetail = field.reparentableMasterDetail ?? false;
      metadata.writeRequiresMasterRead = false;
      break;

    case "Summary":
      metadata.type = "Summary";
      metadata.summaryOperation = summaryOperation(field.summaryOperation);
      metadata.summarizedObject = field.summarizedObject;
      metadata.summarizedField = field.summarizedField;
      metadata.summaryForeignKey = field.summaryForeignKey;
      if (field.summaryFilterItems && field.summaryFilterItems.length > 0) {
        metadata.summaryFilterItems = field.summaryFilterItems;
      }
      break;

    default:
      break;
  }

  Object.keys(metadata).forEach((key) => {
    if (metadata[key] === undefined || metadata[key] === "") {
      delete metadata[key];
    }
  });

  return metadata;
}

export function buildMetadataPayloads(schema: SalesforceObjectSchema) {
  const sortedFields = [...schema.fields].sort((left, right) => {
    return fieldDeployRank(left) - fieldDeployRank(right);
  });

  return {
    objectMetadata: schema.isStandardObject ? null : buildCustomObjectMetadata(schema),
    fieldMetadata: sortedFields.map((field) =>
      buildCustomFieldMetadata(schema.objectApiName, field)
    )
  };
}
