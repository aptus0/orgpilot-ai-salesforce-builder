import type { ActivityLogEntry, ConnectionMode } from "@/lib/types/schema";

export function createActivityLogEntry(params: {
  source: ActivityLogEntry["source"];
  level: ActivityLogEntry["level"];
  action: ActivityLogEntry["action"];
  message: string;
  endpoint?: string;
  requestMode?: ActivityLogEntry["requestMode"];
  connectionMode?: ConnectionMode;
  detail?: string;
}): ActivityLogEntry {
  return {
    id: `${params.action}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    timestamp: new Date().toISOString(),
    source: params.source,
    level: params.level,
    action: params.action,
    message: params.message,
    endpoint: params.endpoint,
    requestMode: params.requestMode,
    connectionMode: params.connectionMode,
    detail: params.detail
  };
}

export function summarizePayload(payload: unknown) {
  try {
    const text = JSON.stringify(payload);
    return text.length > 260 ? `${text.slice(0, 257)}...` : text;
  } catch {
    return "Payload ozetlenemedi.";
  }
}
