"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { clearSalesforceSettings, hasRuntimeSalesforceSettings, readSalesforceSettings } from "@/lib/client/salesforceSettings";
import type {
  ActivityLogEntry,
  AiProvider,
  SalesforceModelSchema,
  SalesforceObjectSchema,
  SalesforceRuntimeConfig
} from "@/lib/types/schema";
import { createActivityLogEntry, summarizePayload } from "@/lib/utils/activity";

type ApiMessage = {
  type: "success" | "error" | "info";
  text: string;
};

type WorkspaceParse =
  | { kind: "model"; model: SalesforceModelSchema }
  | { kind: "object"; schema: SalesforceObjectSchema }
  | null;

type TraceResponse = {
  trace?: ActivityLogEntry[];
  warnings?: string[];
  error?: string;
  schema?: SalesforceObjectSchema;
  model?: SalesforceModelSchema;
  normalizedModel?: SalesforceModelSchema;
  normalizedSchema?: SalesforceObjectSchema;
  deployPlan?: unknown;
  payloads?: unknown;
  salesforce?: unknown;
  result?: unknown;
};

function extractHtmlErrorMessage(payload: string) {
  const titleMatch = payload.match(/<title>(.*?)<\/title>/i);
  if (titleMatch?.[1]) return titleMatch[1].trim();

  const bodyText = payload
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  return bodyText.slice(0, 240) || "HTML error response alindi.";
}

const SAMPLE_JSON = {
  objectLabel: "Property Lead",
  objectPluralLabel: "Property Leads",
  objectApiName: "Property_Lead__c",
  description: "Sample object for Temas RE Custom Object Auto.",
  nameField: {
    label: "Lead Number",
    type: "AutoNumber",
    displayFormat: "PL-{00000}"
  },
  sharingModel: "Private",
  deploymentStatus: "Deployed",
  enableReports: true,
  enableActivities: true,
  enableSearch: true,
  fields: [
    { label: "Customer Name", apiName: "Customer_Name__c", type: "Text", length: 120, required: true },
    { label: "Phone", apiName: "Phone__c", type: "Phone" },
    { label: "Budget", apiName: "Budget__c", type: "Currency", precision: 18, scale: 2 },
    { label: "Lead Status", apiName: "Lead_Status__c", type: "Picklist", values: ["New", "Qualified", "Proposal", "Closed"] }
  ]
};

const SAMPLE_JSON_STRING = JSON.stringify(SAMPLE_JSON, null, 2);

const AI_PROVIDERS: Array<{ value: AiProvider; label: string; note: string }> = [
  { value: "openai", label: "OpenAI", note: "Varsayilan provider" },
  { value: "salesforce-einstein", label: "Salesforce Einstein", note: "Salesforce AI endpoint" },
  { value: "albert", label: "Albert", note: "Harici endpoint" },
  { value: "scala-llm", label: "Scala LLM", note: "Ozel model servisi" },
  { value: "fallback", label: "Fallback", note: "Kuralsal yedek uretim" }
];

function parseWorkspaceJson(value: string): WorkspaceParse {
  try {
    const parsed = JSON.parse(value);
    if (parsed && Array.isArray(parsed.objects)) {
      return { kind: "model", model: parsed as SalesforceModelSchema };
    }
    if (parsed && Array.isArray(parsed.fields)) {
      return { kind: "object", schema: parsed as SalesforceObjectSchema };
    }
    return null;
  } catch {
    return null;
  }
}

function objectList(workspace: WorkspaceParse) {
  if (!workspace) return [];
  if (workspace.kind === "model") return workspace.model.objects ?? [];
  return [workspace.schema];
}

function totalFieldCount(workspace: WorkspaceParse) {
  return objectList(workspace).reduce((total, object) => total + (object.fields?.length ?? 0), 0);
}

function activityTone(level: ActivityLogEntry["level"]) {
  if (level === "success") return "terminal-log terminal-log-success";
  if (level === "error") return "terminal-log terminal-log-error";
  return "terminal-log";
}

function lineCount(value: string) {
  return value ? value.split("\n").length : 0;
}

function downloadTextFile(filename: string, content: string) {
  const blob = new Blob([content], { type: "application/json;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function workspaceDownloadName(workspace: WorkspaceParse, fallback: string) {
  if (!workspace) return fallback;

  const base =
    workspace.kind === "model"
      ? workspace.model.modelApiName || workspace.model.modelName
      : workspace.schema.objectApiName || workspace.schema.objectLabel;

  const cleaned = (base || "workspace")
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  return `${cleaned || "workspace"}.json`;
}

export default function HomePage() {
  const [objectName, setObjectName] = useState("Loan Application");
  const [businessContext, setBusinessContext] = useState("Loan intake, status, amount, approval lifecycle.");
  const [aiProvider, setAiProvider] = useState<AiProvider>("openai");
  const [workspaceJson, setWorkspaceJson] = useState("");
  const [messages, setMessages] = useState<ApiMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [deploying, setDeploying] = useState(false);
  const [dryRun, setDryRun] = useState(true);
  const [deployResult, setDeployResult] = useState<unknown>(null);
  const [activityOpen, setActivityOpen] = useState(true);
  const [activityLog, setActivityLog] = useState<ActivityLogEntry[]>([]);
  const [deployStatusId, setDeployStatusId] = useState("");
  const [salesforceConfig, setSalesforceConfig] = useState<SalesforceRuntimeConfig | null>(null);

  const workspace = useMemo(() => parseWorkspaceJson(workspaceJson), [workspaceJson]);
  const objects = objectList(workspace);
  const workspaceLabel = workspace?.kind === "model" ? "Model" : workspace?.kind === "object" ? "Object" : "Bos";
  const totalObjects = objects.length;
  const totalFields = totalFieldCount(workspace);
  const hasCustomSettings = hasRuntimeSalesforceSettings(salesforceConfig);
  const editorLineCount = lineCount(workspaceJson);

  useEffect(() => {
    const runtimeConfig = readSalesforceSettings();
    setSalesforceConfig(runtimeConfig);

    if (runtimeConfig) {
      setActivityLog((current) => [
        createActivityLogEntry({
          source: "client",
          level: "info",
          action: "settings",
          message: "Session Salesforce ayarlari yuklendi.",
          requestMode: "settings",
          detail: summarizePayload(runtimeConfig)
        }),
        ...current
      ]);
    }
  }, []);

  function pushLogs(entries: ActivityLogEntry[]) {
    if (!entries.length) return;
    setActivityLog((current) => [...entries.slice().reverse(), ...current]);
  }

  function pushClientLog(entry: Omit<ActivityLogEntry, "id" | "timestamp">) {
    pushLogs([createActivityLogEntry(entry)]);
  }

  async function requestJson<T extends TraceResponse>(params: {
    endpoint: string;
    method?: "GET" | "POST";
    action: ActivityLogEntry["action"];
    requestMode: ActivityLogEntry["requestMode"];
    body?: Record<string, unknown>;
  }): Promise<T> {
    pushClientLog({
      source: "client",
      level: "info",
      action: params.action,
      message: `${params.endpoint} cagrildi.`,
      endpoint: params.endpoint,
      requestMode: params.requestMode,
      detail: params.body ? summarizePayload(params.body) : undefined
    });

    const response = await fetch(params.endpoint, {
      method: params.method ?? "GET",
      headers: params.body
        ? {
            "Content-Type": "application/json",
            Accept: "application/json"
          }
        : {
            Accept: "application/json"
          },
      body: params.body ? JSON.stringify(params.body) : undefined
    });

    const contentType = response.headers.get("content-type") || "";
    const raw = await response.text();
    let data: T | { error?: string; trace?: ActivityLogEntry[] };

    if (contentType.includes("application/json")) {
      try {
        data = JSON.parse(raw) as T;
      } catch {
        throw new Error("API JSON yerine bozuk bir response dondu.");
      }
    } else {
      const detail = extractHtmlErrorMessage(raw);
      pushClientLog({
        source: "client",
        level: "error",
        action: params.action,
        message: `${params.endpoint} JSON yerine HTML dondu.`,
        endpoint: params.endpoint,
        requestMode: params.requestMode,
        detail
      });
      throw new Error(`Sunucu JSON yerine HTML dondu: ${detail}`);
    }

    pushLogs(Array.isArray(data?.trace) ? data.trace : []);

    if (!response.ok) {
      pushClientLog({
        source: "client",
        level: "error",
        action: params.action,
        message: data?.error ?? "Istek basarisiz oldu.",
        endpoint: params.endpoint,
        requestMode: params.requestMode
      });
      throw new Error(data?.error ?? "Istek basarisiz oldu.");
    }

    pushClientLog({
      source: "client",
      level: "success",
      action: params.action,
      message: `${params.endpoint} basarili dondu.`,
      endpoint: params.endpoint,
      requestMode: params.requestMode
    });

    return data as T;
  }

  async function generateSchema() {
    setLoading(true);
    setDeployResult(null);
    setMessages([{ type: "info", text: "Schema olusturuluyor..." }]);

    try {
      const data = await requestJson<TraceResponse>({
        endpoint: "/api/ai/generate-schema",
        method: "POST",
        action: "generate-schema",
        requestMode: "schema",
        body: {
          objectName,
          businessContext,
          aiProvider
        }
      });

      if (!data.schema) {
        throw new Error("Schema yaniti bos.");
      }

      setWorkspaceJson(JSON.stringify(data.schema, null, 2));
      setMessages([
        { type: "success", text: "Schema hazirlandi." },
        ...((data.warnings ?? []).map((warning) => ({ type: "info" as const, text: warning })))
      ]);
    } catch (error) {
      setMessages([{ type: "error", text: error instanceof Error ? error.message : "Schema uretilemedi." }]);
    } finally {
      setLoading(false);
    }
  }

  async function loadSmartCreditTemplate() {
    setLoading(true);
    setDeployResult(null);
    setMessages([{ type: "info", text: "Template yukleniyor..." }]);

    try {
      const data = await requestJson<TraceResponse>({
        endpoint: "/api/templates/smartcredit360",
        action: "load-template",
        requestMode: "template"
      });

      if (!data.model) {
        throw new Error("Template modeli bos.");
      }

      setWorkspaceJson(JSON.stringify(data.model, null, 2));
      setMessages([
        { type: "success", text: "Template yuklendi." },
        ...((data.warnings ?? []).map((warning) => ({ type: "info" as const, text: warning })))
      ]);
    } catch (error) {
      setMessages([{ type: "error", text: error instanceof Error ? error.message : "Template yuklenemedi." }]);
    } finally {
      setLoading(false);
    }
  }

  async function loadEnterpriseRealtorTemplate() {
    setLoading(true);
    setDeployResult(null);
    setMessages([{ type: "info", text: "Realtor template yukleniyor..." }]);

    try {
      const data = await requestJson<TraceResponse>({
        endpoint: "/api/templates/enterprise-realtor-management",
        action: "load-template",
        requestMode: "template"
      });

      if (!data.model) {
        throw new Error("Template modeli bos.");
      }

      setWorkspaceJson(JSON.stringify(data.model, null, 2));
      setMessages([
        { type: "success", text: "Enterprise Realtor template yuklendi." },
        ...((data.warnings ?? []).map((warning) => ({ type: "info" as const, text: warning })))
      ]);
    } catch (error) {
      setMessages([{ type: "error", text: error instanceof Error ? error.message : "Template yuklenemedi." }]);
    } finally {
      setLoading(false);
    }
  }

  async function deployWorkspace() {
    const parsed = parseWorkspaceJson(workspaceJson);

    if (!parsed) {
      setMessages([{ type: "error", text: "JSON schema veya model formatinda degil." }]);
      return;
    }

    setDeploying(true);
    setDeployResult(null);
    setMessages([{ type: "info", text: dryRun ? "Dry run basladi." : "Deploy basladi." }]);

    try {
      const endpoint = parsed.kind === "model"
        ? "/api/salesforce/deploy-model"
        : "/api/salesforce/deploy-object";
      const data = await requestJson<TraceResponse>({
        endpoint,
        method: "POST",
        action: parsed.kind === "model" ? "deploy-model" : "deploy-object",
        requestMode: dryRun ? "dry-run" : "deploy",
        body: parsed.kind === "model"
          ? { model: parsed.model, dryRun, salesforceConfig }
          : { schema: parsed.schema, dryRun, salesforceConfig }
      });

      setDeployResult(data);
      setMessages([
        { type: "success", text: dryRun ? "Dry run tamamlandi." : "Deploy tamamlandi." },
        ...((data.warnings ?? []).map((warning) => ({ type: "info" as const, text: warning })))
      ]);
    } catch (error) {
      setMessages([{ type: "error", text: error instanceof Error ? error.message : "Deploy basarisiz." }]);
    } finally {
      setDeploying(false);
    }
  }

  async function inspectDeployStatus() {
    if (!deployStatusId.trim()) {
      setMessages([{ type: "error", text: "Deploy status icin process id gir." }]);
      return;
    }

    try {
      const data = await requestJson<TraceResponse>({
        endpoint: "/api/salesforce/deploy-status",
        method: "POST",
        action: "deploy-status",
        requestMode: "status",
        body: {
          id: deployStatusId.trim(),
          salesforceConfig
        }
      });

      setDeployResult(data);
      setMessages([{ type: "success", text: "Deploy status alindi." }]);
    } catch (error) {
      setMessages([{ type: "error", text: error instanceof Error ? error.message : "Deploy status okunamadi." }]);
    }
  }

  function resetRuntimeSettings() {
    clearSalesforceSettings();
    setSalesforceConfig(null);
    pushClientLog({
      source: "client",
      level: "info",
      action: "settings",
      message: "Session Salesforce ayarlari temizlendi.",
      requestMode: "settings"
    });
  }

  function formatWorkspaceJson() {
    try {
      const parsed = JSON.parse(workspaceJson);
      setWorkspaceJson(JSON.stringify(parsed, null, 2));
      setMessages([{ type: "success", text: "JSON formatlandi." }]);
    } catch {
      setMessages([{ type: "error", text: "Format icin gecerli JSON gerekli." }]);
    }
  }

  async function copyWorkspaceJson() {
    try {
      await navigator.clipboard.writeText(workspaceJson || SAMPLE_JSON_STRING);
      setMessages([{ type: "success", text: "JSON panoya kopyalandi." }]);
    } catch {
      setMessages([{ type: "error", text: "JSON kopyalanamadi." }]);
    }
  }

  function loadSampleJson() {
    setWorkspaceJson(SAMPLE_JSON_STRING);
    setMessages([{ type: "info", text: "Ornek JSON editor'e yuklendi." }]);
  }

  function downloadSampleJson() {
    downloadTextFile("sample-salesforce-object.json", SAMPLE_JSON_STRING);
    setMessages([{ type: "info", text: "Ornek JSON indirildi." }]);
  }

  function downloadWorkspace() {
    downloadTextFile(workspaceDownloadName(workspace, "workspace.json"), workspaceJson || SAMPLE_JSON_STRING);
    setMessages([{ type: "info", text: "Workspace JSON indirildi." }]);
  }

  return (
    <main className="admin-shell">
      <div className="admin-frame admin-frame-compact">
        <header className="admin-topbar admin-topbar-compact">
          <div className="brand-mark">
            <div className="brand-logo brand-logo-soft">
              <img
                src="/branding/softinnovas-logo.png"
                alt="Softinnovas"
                className="h-10 w-10 object-contain"
              />
            </div>
            <div>
              <div className="brand-caption">Temas RE Workspace</div>
              <h1 className="brand-title brand-title-compact">Temas RE Custom Object Auto</h1>
            </div>
          </div>

          <div className="topbar-actions topbar-actions-wrap">
            <span className={`status-pill ${hasCustomSettings ? "status-pill-active" : ""}`}>
              {hasCustomSettings ? "Session Settings" : "ENV Mode"}
            </span>
            <Link href="/settings" className="nav-button">
              Settings
            </Link>
          </div>
        </header>

        <section className="workspace-grid workspace-grid-compact">
          <aside className="admin-panel admin-panel-compact">
            <div className="panel-head">
              <div>
                <div className="panel-kicker">Build Panel</div>
                <h2 className="panel-title panel-title-small">Schema</h2>
              </div>
              <div className="button-stack button-stack-inline">
                <button
                  onClick={loadSmartCreditTemplate}
                  disabled={loading}
                  className="secondary-button"
                >
                  Credit Template
                </button>
                <button
                  onClick={loadEnterpriseRealtorTemplate}
                  disabled={loading}
                  className="secondary-button"
                >
                  Realtor Template
                </button>
              </div>
            </div>

            <div className="form-stack form-stack-tight">
              <label className="field-block">
                <span className="field-label">Provider</span>
                <select
                  value={aiProvider}
                  onChange={(event) => setAiProvider(event.target.value as AiProvider)}
                  className="text-field"
                >
                  {AI_PROVIDERS.map((provider) => (
                    <option key={provider.value} value={provider.value}>
                      {provider.label}
                    </option>
                  ))}
                </select>
                <span className="inline-meta">
                  {AI_PROVIDERS.find((provider) => provider.value === aiProvider)?.note}
                </span>
              </label>

              <label className="field-block">
                <span className="field-label">Object Name</span>
                <input
                  value={objectName}
                  onChange={(event) => setObjectName(event.target.value)}
                  className="text-field"
                  placeholder="Loan Application"
                />
              </label>

              <label className="field-block">
                <span className="field-label">Description</span>
                <textarea
                  value={businessContext}
                  onChange={(event) => setBusinessContext(event.target.value)}
                  rows={5}
                  className="text-field text-area"
                  placeholder="Kisa is tanimi"
                />
              </label>

              <label className="toggle-row">
                <span>Dry Run</span>
                <input
                  type="checkbox"
                  checked={dryRun}
                  onChange={(event) => setDryRun(event.target.checked)}
                  className="h-4 w-4"
                />
              </label>
            </div>

            <div className="button-stack button-stack-tight">
              <button
                onClick={generateSchema}
                disabled={loading || !objectName.trim()}
                className="primary-button"
              >
                {loading ? "Calisiyor..." : "Schema Olustur"}
              </button>

              <button
                onClick={deployWorkspace}
                disabled={deploying || !workspace}
                className="dark-button"
              >
                {deploying ? "Gonderiliyor..." : dryRun ? "Dry Run" : "Deploy"}
              </button>
            </div>

            <div className="settings-inline">
              <div>
                <div className="field-label">Salesforce Connection</div>
                <div className="inline-meta">
                  {hasCustomSettings ? "Session ayari aktif" : "ENV fallback aktif"}
                </div>
              </div>
              <div className="inline-actions">
                <Link href="/settings" className="tiny-link">
                  Duzenle
                </Link>
                {hasCustomSettings && (
                  <button onClick={resetRuntimeSettings} className="tiny-link danger-link">
                    Temizle
                  </button>
                )}
              </div>
            </div>

            {messages.length > 0 && (
              <div className="message-stack">
                {messages.map((message, index) => (
                  <div key={`${message.type}-${index}`} className={`message-box message-${message.type}`}>
                    {message.text}
                  </div>
                ))}
              </div>
            )}
          </aside>

          <section className="admin-panel admin-panel-compact">
            <div className="panel-head panel-head-spread panel-head-mobile">
              <div>
                <div className="panel-kicker">Workspace JSON</div>
                <h2 className="panel-title panel-title-small">Terminal Editor</h2>
              </div>

              <div className="workspace-meta workspace-meta-wrap">
                <span className="meta-pill">{workspaceLabel}</span>
                <span className="meta-pill">{totalObjects} object</span>
                <span className="meta-pill">{totalFields} field</span>
              </div>
            </div>

            <div className="editor-shell editor-shell-terminal">
              <div className="editor-bar editor-bar-terminal">
                <div className="terminal-chrome">
                  <span className="terminal-dot terminal-dot-red" />
                  <span className="terminal-dot terminal-dot-yellow" />
                  <span className="terminal-dot terminal-dot-green" />
                </div>
                <div className="editor-title-group">
                  <span>workspace.json</span>
                  <span>{workspace ? "Editable" : "Ready for input"}</span>
                </div>
                <div className="editor-actions">
                  <button onClick={formatWorkspaceJson} className="terminal-action-button">Format</button>
                  <button onClick={copyWorkspaceJson} className="terminal-action-button">Copy</button>
                  <button onClick={loadSampleJson} className="terminal-action-button">Sample</button>
                  <button onClick={downloadSampleJson} className="terminal-action-button">Sample Download</button>
                  <button onClick={downloadWorkspace} className="terminal-action-button">Download</button>
                </div>
              </div>

              <textarea
                value={workspaceJson}
                onChange={(event) => setWorkspaceJson(event.target.value)}
                rows={24}
                className="editor-area editor-area-terminal"
                placeholder="Schema veya model JSON yapisini buraya gir."
                spellCheck={false}
              />

              <div className="editor-footer">
                <span>{editorLineCount} line</span>
                <span>UTF-8 JSON</span>
                <span>{workspace ? "Valid structure detected" : "Use Sample to see the expected format"}</span>
              </div>
            </div>

            <div className="result-head result-head-mobile">
              <div>
                <div className="field-label">Deploy Result</div>
                <div className="inline-meta">Dry run, deploy veya status yaniti</div>
              </div>
              <div className="status-form status-form-mobile">
                <input
                  value={deployStatusId}
                  onChange={(event) => setDeployStatusId(event.target.value)}
                  className="text-field compact-input"
                  placeholder="Async process id"
                />
                <button onClick={inspectDeployStatus} className="secondary-button">
                  Status
                </button>
              </div>
            </div>

            <pre className="result-console result-console-terminal">
              {JSON.stringify(deployResult ?? { info: "Henuz sonuc yok." }, null, 2)}
            </pre>
          </section>
        </section>

        <section className="activity-panel">
          <button className="activity-toggle" onClick={() => setActivityOpen((current) => !current)}>
            <span>Activity Console</span>
            <span>{activityOpen ? "Hide" : "Show"}</span>
          </button>

          {activityOpen && (
            <div className="activity-body">
              {activityLog.length === 0 ? (
                <div className="terminal-empty">Henuz log yok.</div>
              ) : (
                activityLog.map((entry) => (
                  <div key={entry.id} className={activityTone(entry.level)}>
                    <div className="terminal-row">
                      <span className="terminal-time">{new Date(entry.timestamp).toLocaleTimeString("tr-TR")}</span>
                      <span className="terminal-action">{entry.action}</span>
                      {entry.endpoint && <span className="terminal-endpoint">{entry.endpoint}</span>}
                    </div>
                    <div className="terminal-message">{entry.message}</div>
                    {(entry.connectionMode || entry.detail) && (
                      <div className="terminal-detail">
                        {entry.connectionMode ? `connection=${entry.connectionMode}` : ""}
                        {entry.connectionMode && entry.detail ? " • " : ""}
                        {entry.detail ?? ""}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          )}
        </section>

        <footer className="partner-footer">
          <img
            src="/branding/softinnovas-wordmark.png"
            alt="Softinnovas"
            className="partner-wordmark-image"
          />
          <p className="partner-copy">
            Salesforce metadata operasyonlari icin teknoloji partnerliginde gelistirildi.
          </p>
        </footer>
      </div>
    </main>
  );
}
