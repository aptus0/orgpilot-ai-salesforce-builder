import AdmZip from "adm-zip";
import type {
  SalesforceFieldSchema,
  SalesforceObjectSchema
} from "@/lib/types/schema";
import { escapeXml } from "@/lib/salesforce/xml";

function fieldXml(field: SalesforceFieldSchema) {
  const parts: string[] = [];

  parts.push("    <fields>");
  parts.push(`        <fullName>${escapeXml(field.apiName)}</fullName>`);
  if (field.description) {
    parts.push(`        <description>${escapeXml(field.description)}</description>`);
  }
  if (field.helpText) {
    parts.push(`        <inlineHelpText>${escapeXml(field.helpText)}</inlineHelpText>`);
  }
  parts.push(`        <label>${escapeXml(field.label)}</label>`);

  if (field.type === "Text") {
    parts.push(`        <length>${field.length ?? 80}</length>`);
  }

  if (["Number", "Currency", "Percent"].includes(field.type)) {
    parts.push(`        <precision>${field.precision ?? 18}</precision>`);
    parts.push(`        <scale>${field.scale ?? (field.type === "Number" ? 0 : 2)}</scale>`);
  }

  if (field.type === "LongTextArea") {
    parts.push(`        <length>${field.length ?? 32768}</length>`);
  }

  if (field.type === "Lookup") {
    parts.push(
      `        <deleteConstraint>${field.deleteConstraint ?? (field.required ? "Restrict" : "SetNull")}</deleteConstraint>`
    );
    parts.push(`        <referenceTo>${escapeXml(field.referenceTo ?? "Account")}</referenceTo>`);
    parts.push(
      `        <relationshipLabel>${escapeXml(field.relationshipLabel ?? field.label)}</relationshipLabel>`
    );
    parts.push(
      `        <relationshipName>${escapeXml(field.relationshipName ?? field.label.replace(/[^a-zA-Z0-9]/g, ""))}</relationshipName>`
    );
  }

  if (
    field.type !== "Checkbox" &&
    field.type !== "LongTextArea" &&
    field.type !== "MasterDetail"
  ) {
    parts.push(`        <required>${field.required ? "true" : "false"}</required>`);
  }

  if (field.type === "Checkbox") {
    parts.push(`        <defaultValue>${field.defaultValue ? "true" : "false"}</defaultValue>`);
  }

  parts.push(`        <type>${escapeXml(field.type)}</type>`);

  if (field.type === "Picklist") {
    parts.push("        <valueSet>");
    parts.push("            <restricted>true</restricted>");
    parts.push("            <valueSetDefinition>");
    parts.push("                <sorted>false</sorted>");
    for (const [index, value] of (field.values ?? ["New", "Active", "Inactive"]).entries()) {
      parts.push("                <value>");
      parts.push(`                    <fullName>${escapeXml(value)}</fullName>`);
      parts.push(`                    <default>${index === 0 ? "true" : "false"}</default>`);
      parts.push(`                    <label>${escapeXml(value)}</label>`);
      parts.push("                </value>");
    }
    parts.push("            </valueSetDefinition>");
    parts.push("        </valueSet>");
  }

  if (field.type === "LongTextArea") {
    parts.push(`        <visibleLines>${field.visibleLines ?? 5}</visibleLines>`);
  }

  parts.push("    </fields>");

  return parts.join("\n");
}

export function buildCustomObjectXml(schema: SalesforceObjectSchema) {
  const parts: string[] = [];

  parts.push('<?xml version="1.0" encoding="UTF-8"?>');
  parts.push('<CustomObject xmlns="http://soap.sforce.com/2006/04/metadata">');
  parts.push(`    <deploymentStatus>${escapeXml(schema.deploymentStatus ?? "Deployed")}</deploymentStatus>`);
  if (schema.description) {
    parts.push(`    <description>${escapeXml(schema.description)}</description>`);
  }
  parts.push(`    <enableActivities>${schema.enableActivities ?? true}</enableActivities>`);
  parts.push("    <enableBulkApi>true</enableBulkApi>");
  parts.push("    <enableFeeds>false</enableFeeds>");
  parts.push("    <enableHistory>false</enableHistory>");
  parts.push(`    <enableReports>${schema.enableReports ?? true}</enableReports>`);
  parts.push(`    <enableSearch>${schema.enableSearch ?? true}</enableSearch>`);
  parts.push("    <enableSharing>true</enableSharing>");
  parts.push("    <enableStreamingApi>true</enableStreamingApi>");

  for (const field of schema.fields) {
    parts.push(fieldXml(field));
  }

  parts.push(`    <label>${escapeXml(schema.objectLabel)}</label>`);
  parts.push("    <nameField>");
  if (schema.nameField.type === "AutoNumber") {
    parts.push(`        <displayFormat>${escapeXml(schema.nameField.displayFormat ?? "AUTO-{0000}")}</displayFormat>`);
  }
  parts.push(`        <label>${escapeXml(schema.nameField.label)}</label>`);
  parts.push(`        <type>${escapeXml(schema.nameField.type)}</type>`);
  parts.push("    </nameField>");
  parts.push(`    <pluralLabel>${escapeXml(schema.objectPluralLabel)}</pluralLabel>`);
  parts.push(`    <sharingModel>${escapeXml(schema.sharingModel ?? "ReadWrite")}</sharingModel>`);
  parts.push("</CustomObject>");

  return parts.join("\n");
}

export function buildPackageXml(schema: SalesforceObjectSchema, version = "60.0") {
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<Package xmlns="http://soap.sforce.com/2006/04/metadata">',
    "    <types>",
    `        <members>${escapeXml(schema.objectApiName)}</members>`,
    "        <name>CustomObject</name>",
    "    </types>",
    `    <version>${escapeXml(version)}</version>`,
    "</Package>"
  ].join("\n");
}

export function buildMetadataZip(schema: SalesforceObjectSchema) {
  const zip = new AdmZip();
  zip.addFile(
    `objects/${schema.objectApiName}.object`,
    Buffer.from(buildCustomObjectXml(schema), "utf8")
  );
  zip.addFile(
    "package.xml",
    Buffer.from(buildPackageXml(schema, process.env.SALESFORCE_API_VERSION || "60.0"), "utf8")
  );
  return zip.toBuffer();
}
