import { getSalesforceConnection } from "@/lib/salesforce/connection";
import { buildMetadataPayloads } from "@/lib/salesforce/metadataPayloadBuilder";
import type { SalesforceModelSchema, SalesforceObjectSchema } from "@/lib/types/schema";
import {
  validateAndNormalizeModelSchema,
  validateAndNormalizeObjectSchema
} from "@/lib/validation/schemaValidator";

function chunk<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];

  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }

  return chunks;
}

function normalizeMetadataResult(result: unknown) {
  if (Array.isArray(result)) {
    return result;
  }

  return [result];
}

function errorLooksLikeAlreadyExists(errorPayload: unknown) {
  const text = JSON.stringify(errorPayload).toLowerCase();

  return (
    text.includes("already exists") ||
    text.includes("already in use") ||
    text.includes("duplicate") ||
    text.includes("duplicate_developer_name") ||
    text.includes("entity already exists") ||
    text.includes("a duplicate value was found")
  );
}

function assertMetadataSuccess(result: unknown, label: string) {
  const results = normalizeMetadataResult(result);
  const failed = results.filter((item) => {
    const maybe = item as { success?: boolean };
    return maybe.success !== true;
  });

  if (failed.length > 0) {
    throw new Error(`${label} oluşturulamadı: ${JSON.stringify(failed, null, 2)}`);
  }
}

async function createOrUpdateMetadata(params: {
  conn: unknown;
  type: "CustomObject" | "CustomField";
  metadata: Record<string, unknown> | Record<string, unknown>[];
  label: string;
  onDuplicate?: "update" | "skip";
}) {
  const metadataApi = (params.conn as { metadata: { create: Function; update: Function } }).metadata;
  const createResult = await metadataApi.create(params.type, params.metadata);
  const normalizedCreateResult = normalizeMetadataResult(createResult);
  const failed = normalizedCreateResult.filter((item) => {
    const maybe = item as { success?: boolean };
    return maybe.success !== true;
  });

  if (failed.length === 0) {
    return {
      operation: "create" as const,
      result: createResult
    };
  }

  const metadataItems = Array.isArray(params.metadata) ? params.metadata : [params.metadata];
  const duplicateEntries: Record<string, unknown>[] = [];
  const nonDuplicateFailures: unknown[] = [];

  for (const [index, item] of normalizedCreateResult.entries()) {
    const maybe = item as { success?: boolean };
    if (maybe.success === true) {
      continue;
    }

    if (errorLooksLikeAlreadyExists(item)) {
      duplicateEntries.push(metadataItems[index]);
    } else {
      nonDuplicateFailures.push(item);
    }
  }

  if (nonDuplicateFailures.length > 0) {
    throw new Error(`${params.label} oluşturulamadı: ${JSON.stringify(nonDuplicateFailures, null, 2)}`);
  }

  if (duplicateEntries.length === 0) {
    throw new Error(`${params.label} oluşturulamadı: ${JSON.stringify(failed, null, 2)}`);
  }

  if ((params.onDuplicate ?? "update") === "skip") {
    return {
      operation: "skip" as const,
      result: null,
      createError: failed
    };
  }

  const updatePayload = Array.isArray(params.metadata) ? duplicateEntries : duplicateEntries[0];
  const updateResult = await metadataApi.update(params.type, updatePayload);
  assertMetadataSuccess(updateResult, `${params.label} güncellenemedi`);

  return {
    operation: "update" as const,
    result: updateResult,
    createError: failed
  };
}

function sortObjectsByDeployOrder(model: SalesforceModelSchema) {
  const byName = new Map(model.objects.map((object) => [object.objectApiName, object]));
  const ordered: SalesforceObjectSchema[] = [];

  for (const name of model.deployOrder) {
    const object = byName.get(name);
    if (object) ordered.push(object);
  }

  for (const object of model.objects) {
    if (!ordered.some((item) => item.objectApiName === object.objectApiName)) {
      ordered.push(object);
    }
  }

  return ordered;
}

function hasMasterDetailField(object: SalesforceObjectSchema) {
  return object.fields.some((field) => field.type === "MasterDetail");
}

function shouldUseTemporaryReadWrite(object: SalesforceObjectSchema) {
  return (
    !object.isStandardObject &&
    object.sharingModel === "ControlledByParent" &&
    hasMasterDetailField(object)
  );
}

function fieldDeployPhase(fieldMetadata: Record<string, unknown>) {
  const type = String(fieldMetadata.type ?? "");

  if (type === "Lookup" || type === "MasterDetail") {
    return 1;
  }

  if (Object.prototype.hasOwnProperty.call(fieldMetadata, "formula") || type === "Summary") {
    return 3;
  }

  return 2;
}

export async function deployObjectSchema(params: {
  schema: SalesforceObjectSchema;
  dryRun?: boolean;
}) {
  const normalized = validateAndNormalizeObjectSchema(params.schema);
  const model: SalesforceModelSchema = {
    modelName: normalized.schema.objectLabel,
    modelApiName: normalized.schema.objectApiName.replace(/__c$/i, ""),
    deployOrder: [normalized.schema.objectApiName],
    objects: [normalized.schema]
  };

  const result = await deployModelSchema({
    model,
    dryRun: params.dryRun
  });

  return {
    ...result,
    normalizedSchema: normalized.schema
  };
}

export async function deployModelSchema(params: {
  model: SalesforceModelSchema;
  dryRun?: boolean;
}) {
  const normalized = validateAndNormalizeModelSchema(params.model);
  const orderedObjects = sortObjectsByDeployOrder(normalized.model);
  const payloads = orderedObjects.map((object) => ({
    object,
    payloads: buildMetadataPayloads(object),
    useTemporaryReadWrite: shouldUseTemporaryReadWrite(object)
  }));

  const dryRunPayload = payloads.map((item) => ({
    objectApiName: item.object.objectApiName,
    isStandardObject: Boolean(item.object.isStandardObject),
    objectMetadata:
      item.useTemporaryReadWrite && item.payloads.objectMetadata
        ? {
            ...item.payloads.objectMetadata,
            sharingModel: "ReadWrite"
          }
        : item.payloads.objectMetadata,
    finalObjectMetadata:
      item.useTemporaryReadWrite && item.payloads.objectMetadata
        ? item.payloads.objectMetadata
        : null,
    fieldMetadata: item.payloads.fieldMetadata
  }));

  if (params.dryRun) {
    return {
      dryRun: true,
      warnings: normalized.warnings,
      normalizedModel: normalized.model,
      deployPlan: orderedObjects.map((object) => ({
        objectApiName: object.objectApiName,
        objectLabel: object.objectLabel,
        isStandardObject: Boolean(object.isStandardObject),
        fieldCount: object.fields.length,
        action: object.isStandardObject
          ? "Create/update custom fields on standard object"
          : shouldUseTemporaryReadWrite(object)
            ? "Create custom object with temporary ReadWrite sharing, create custom fields, then update sharing to ControlledByParent"
            : "Create custom object, then create custom fields"
      })),
      payloads: dryRunPayload
    };
  }

  const conn = await getSalesforceConnection();
  const objectResults: unknown[] = [];
  const fieldResults: unknown[] = [];
  const objectUpdateResults: unknown[] = [];

  for (const item of payloads) {
    if (!item.object.isStandardObject && item.payloads.objectMetadata) {
      const objectMetadata = item.useTemporaryReadWrite
        ? {
            ...item.payloads.objectMetadata,
            sharingModel: "ReadWrite" as const
          }
        : item.payloads.objectMetadata;
      const objectResult = await createOrUpdateMetadata({
        conn,
        type: "CustomObject",
        metadata: objectMetadata,
        label: `Custom Object ${item.object.objectApiName}`,
        onDuplicate: item.useTemporaryReadWrite ? "skip" : "update"
      });
      objectResults.push({
        objectApiName: item.object.objectApiName,
        operation: objectResult.operation,
        result: objectResult.result,
        createError: objectResult.createError ?? null
      });
    }
  }

  for (const item of payloads) {
    const phases = [1, 2, 3] as const;

    for (const phase of phases) {
      const phaseFields = item.payloads.fieldMetadata.filter(
        (fieldMetadata) => fieldDeployPhase(fieldMetadata) === phase
      );

      for (const fieldChunk of chunk(phaseFields, 10)) {
        const result = await createOrUpdateMetadata({
          conn,
          type: "CustomField",
          metadata: fieldChunk,
          label: `Custom Field ${item.object.objectApiName}`
        });
        fieldResults.push({
          objectApiName: item.object.objectApiName,
          phase,
          operation: result.operation,
          result: normalizeMetadataResult(result.result),
          createError: result.createError ?? null
        });
      }
    }
  }

  for (const item of payloads) {
    if (!item.useTemporaryReadWrite || !item.payloads.objectMetadata) {
      continue;
    }

    const updateResult = await (conn.metadata as any).update(
      "CustomObject",
      item.payloads.objectMetadata
    );
    assertMetadataSuccess(
      updateResult,
      `Custom Object ${item.object.objectApiName} sharing model update`
    );
    objectUpdateResults.push({
      objectApiName: item.object.objectApiName,
      result: updateResult
    });
  }

  return {
    dryRun: false,
    warnings: normalized.warnings,
    normalizedModel: normalized.model,
    salesforce: {
      objectResults,
      fieldResults,
      objectUpdateResults
    }
  };
}

export async function checkDeployStatus(asyncProcessId: string) {
  const conn = await getSalesforceConnection();
  return (conn.metadata as any).checkDeployStatus(asyncProcessId, true);
}
