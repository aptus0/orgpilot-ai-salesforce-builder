"use client";

import { useMemo, useState } from "react";
import type { AiProvider, SalesforceModelSchema, SalesforceObjectSchema } from "@/lib/types/schema";

type ApiMessage = {
  type: "success" | "error" | "info";
  text: string;
};

type WorkspaceParse =
  | { kind: "model"; model: SalesforceModelSchema }
  | { kind: "object"; schema: SalesforceObjectSchema }
  | null;

const AI_PROVIDERS: Array<{ value: AiProvider; label: string; note: string }> = [
  { value: "openai", label: "OpenAI", note: "Hazır LLM provider" },
  { value: "salesforce-einstein", label: "Salesforce AI / Einstein Adapter", note: "Endpoint env ile bağlanır" },
  { value: "albert", label: "ALBERT / External AI Adapter", note: "Harici AI endpoint" },
  { value: "scala-llm", label: "Scala LLM Service", note: "Kendi model servisin" },
  { value: "fallback", label: "Rule-based Fallback", note: "API key gerekmez" }
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

function FieldBadge({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-700">
      {children}
    </span>
  );
}

function objectList(workspace: WorkspaceParse) {
  if (!workspace) return [];
  if (workspace.kind === "model") return workspace.model.objects ?? [];
  return [workspace.schema];
}

function totalFieldCount(workspace: WorkspaceParse) {
  return objectList(workspace).reduce((total, object) => total + (object.fields?.length ?? 0), 0);
}

export default function HomePage() {
  const [objectName, setObjectName] = useState("Loan Application");
  const [businessContext, setBusinessContext] = useState(
    "US lending / SmartCredit 360 için compliance-aware Salesforce data modeli üret. FCRA, ECOA, TILA, HMDA, BSA/AML ve FDCPA alanlarını dikkate al."
  );
  const [aiProvider, setAiProvider] = useState<AiProvider>("openai");
  const [workspaceJson, setWorkspaceJson] = useState("");
  const [messages, setMessages] = useState<ApiMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [deploying, setDeploying] = useState(false);
  const [dryRun, setDryRun] = useState(true);
  const [deployResult, setDeployResult] = useState<unknown>(null);

  const workspace = useMemo(() => parseWorkspaceJson(workspaceJson), [workspaceJson]);
  const objects = objectList(workspace);
  const criticalRules = workspace?.kind === "model"
    ? workspace.model.complianceRules?.filter((rule) => rule.severity === "critical") ?? []
    : [];

  async function generateSchema() {
    setLoading(true);
    setDeployResult(null);
    setMessages([{ type: "info", text: "AI provider üzerinden schema oluşturuluyor..." }]);

    try {
      const response = await fetch("/api/ai/generate-schema", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          objectName,
          businessContext,
          aiProvider
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error ?? "Schema üretilemedi.");
      }

      setWorkspaceJson(JSON.stringify(data.schema, null, 2));

      const warningMessages: ApiMessage[] = (data.warnings ?? []).map((warning: string) => ({
        type: "info",
        text: warning
      }));

      setMessages([
        {
          type: "success",
          text: data.usedAI
            ? `${data.provider} ile schema önerisi oluşturuldu.`
            : `${data.provider ?? "fallback"} ile güvenli fallback schema oluşturuldu.`
        },
        ...warningMessages
      ]);
    } catch (error) {
      setMessages([
        {
          type: "error",
          text: error instanceof Error ? error.message : "Bilinmeyen hata oluştu."
        }
      ]);
    } finally {
      setLoading(false);
    }
  }

  async function loadSmartCreditTemplate() {
    setLoading(true);
    setDeployResult(null);
    setMessages([{ type: "info", text: "SmartCredit 360 industry template yükleniyor..." }]);

    try {
      const response = await fetch("/api/templates/smartcredit360");
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error ?? "Template yüklenemedi.");
      }

      setWorkspaceJson(JSON.stringify(data.model, null, 2));
      setMessages([
        {
          type: "success",
          text: "SmartCredit 360 US Lending veri modeli yüklendi. Önce Dry Run ile deploy planını kontrol et."
        },
        ...(data.warnings ?? []).map((warning: string) => ({
          type: "info" as const,
          text: warning
        }))
      ]);
    } catch (error) {
      setMessages([
        {
          type: "error",
          text: error instanceof Error ? error.message : "Template yüklenirken hata oluştu."
        }
      ]);
    } finally {
      setLoading(false);
    }
  }

  async function deployWorkspace() {
    const parsed = parseWorkspaceJson(workspaceJson);

    if (!parsed) {
      setMessages([{ type: "error", text: "JSON geçerli bir schema/model değil." }]);
      return;
    }

    setDeploying(true);
    setDeployResult(null);
    setMessages([
      {
        type: "info",
        text: dryRun
          ? "Dry run çalışıyor; Salesforce'a yazılmayacak."
          : "Salesforce Metadata API deploy başlatıldı."
      }
    ]);

    try {
      const endpoint = parsed.kind === "model"
        ? "/api/salesforce/deploy-model"
        : "/api/salesforce/deploy-object";
      const payload = parsed.kind === "model"
        ? { model: parsed.model, dryRun }
        : { schema: parsed.schema, dryRun };

      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error ?? "Deploy başarısız oldu.");
      }

      setDeployResult(data);
      setMessages([
        {
          type: "success",
          text: dryRun
            ? "Dry run başarılı. Deploy planı ve payload aşağıda."
            : "Salesforce metadata oluşturma işlemi tamamlandı."
        },
        ...(data.warnings ?? []).map((warning: string) => ({
          type: "info" as const,
          text: warning
        }))
      ]);
    } catch (error) {
      setMessages([
        {
          type: "error",
          text: error instanceof Error ? error.message : "Bilinmeyen deploy hatası."
        }
      ]);
    } finally {
      setDeploying(false);
    }
  }

  return (
    <main className="min-h-screen px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <section className="mb-8 overflow-hidden rounded-[2rem] border border-white/70 bg-white/85 p-8 shadow-soft backdrop-blur">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="mb-4 inline-flex rounded-full border border-blue-100 bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-700">
                Salesforce AI Metadata Builder • Industry Templates • Multi-AI Adapter
              </div>
              <h1 className="text-4xl font-black tracking-tight text-slate-950 sm:text-5xl">
                OrgPilot AI Pro
              </h1>
              <p className="mt-4 max-w-3xl text-lg leading-8 text-slate-600">
                Tek obje üretiminden profesyonel veri modeline geçtik. SmartCredit 360 gibi sektör template'lerini,
                AI provider katmanını, compliance notlarını ve Salesforce Metadata API deploy akışını tek ekranda yönet.
              </p>
            </div>

            <div className="grid gap-3 rounded-3xl bg-slate-950 p-5 text-white sm:min-w-[360px]">
              <div className="text-sm text-slate-300">Profesyonel Akış</div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <span className="rounded-2xl bg-white/10 px-3 py-2">1. Template / AI</span>
                <span className="rounded-2xl bg-white/10 px-3 py-2">2. Validator</span>
                <span className="rounded-2xl bg-white/10 px-3 py-2">3. Dry Run Plan</span>
                <span className="rounded-2xl bg-white/10 px-3 py-2">4. Metadata Deploy</span>
              </div>
            </div>
          </div>
        </section>

        <div className="grid gap-6 lg:grid-cols-[430px_1fr]">
          <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-soft">
            <h2 className="text-xl font-bold text-slate-950">Model Oluştur / Yükle</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Hazır SmartCredit 360 US template'ini yükleyebilir veya tek bir yeni obje için AI schema üretebilirsin.
            </p>

            <button
              onClick={loadSmartCreditTemplate}
              disabled={loading}
              className="mt-5 w-full rounded-2xl bg-emerald-600 px-5 py-3 font-bold text-white shadow-lg shadow-emerald-600/20 transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              SmartCredit 360 US Template Yükle
            </button>

            <div className="my-6 h-px bg-slate-200" />

            <label className="block text-sm font-semibold text-slate-700">AI Provider</label>
            <select
              value={aiProvider}
              onChange={(event) => setAiProvider(event.target.value as AiProvider)}
              className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100"
            >
              {AI_PROVIDERS.map((provider) => (
                <option key={provider.value} value={provider.value}>
                  {provider.label}
                </option>
              ))}
            </select>
            <div className="mt-2 text-xs leading-5 text-slate-500">
              {AI_PROVIDERS.find((provider) => provider.value === aiProvider)?.note}
            </div>

            <label className="mt-5 block text-sm font-semibold text-slate-700">Obje İsmi</label>
            <input
              value={objectName}
              onChange={(event) => setObjectName(event.target.value)}
              className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100"
              placeholder="Loan Application"
            />

            <label className="mt-5 block text-sm font-semibold text-slate-700">İş Bağlamı / Not</label>
            <textarea
              value={businessContext}
              onChange={(event) => setBusinessContext(event.target.value)}
              rows={6}
              className="mt-2 w-full resize-none rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100"
              placeholder="Bu obje hangi uygulamada kullanılacak?"
            />

            <button
              onClick={generateSchema}
              disabled={loading || !objectName.trim()}
              className="mt-5 w-full rounded-2xl bg-blue-600 px-5 py-3 font-bold text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "İşlem Yapılıyor..." : "AI ile Tek Obje Schema Oluştur"}
            </button>

            <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
              ABD kredi/veri regülasyonları ciddi konudur. Bu araç metadata hızlandırır; gerçek production kullanımı için hukuk, compliance ve security review şarttır.
            </div>

            {messages.length > 0 && (
              <div className="mt-5 grid gap-2">
                {messages.map((message, index) => (
                  <div
                    key={`${message.type}-${index}`}
                    className={[
                      "rounded-2xl px-4 py-3 text-sm leading-6",
                      message.type === "success" ? "border border-emerald-200 bg-emerald-50 text-emerald-800" : "",
                      message.type === "error" ? "border border-red-200 bg-red-50 text-red-800" : "",
                      message.type === "info" ? "border border-slate-200 bg-slate-50 text-slate-700" : ""
                    ].join(" ")}
                  >
                    {message.text}
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="grid gap-6">
            <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-soft">
              <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                <div>
                  <h2 className="text-xl font-bold text-slate-950">Workspace JSON</h2>
                  <p className="mt-2 text-sm text-slate-600">
                    Burada tek object schema veya çoklu object model düzenlenebilir. Deploy öncesi backend tekrar normalize/validate eder.
                  </p>
                </div>

                <div className="flex flex-wrap gap-3">
                  <FieldBadge>{workspace?.kind === "model" ? "Model" : workspace?.kind === "object" ? "Single Object" : "No JSON"}</FieldBadge>
                  <FieldBadge>{objects.length} object</FieldBadge>
                  <FieldBadge>{totalFieldCount(workspace)} field</FieldBadge>
                  {criticalRules.length > 0 && <FieldBadge>{criticalRules.length} critical rule</FieldBadge>}
                  <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700">
                    <input
                      type="checkbox"
                      checked={dryRun}
                      onChange={(event) => setDryRun(event.target.checked)}
                      className="h-4 w-4"
                    />
                    Dry Run
                  </label>
                </div>
              </div>

              <textarea
                value={workspaceJson}
                onChange={(event) => setWorkspaceJson(event.target.value)}
                rows={22}
                className="mt-5 w-full rounded-2xl border border-slate-200 bg-slate-950 px-4 py-4 font-mono text-sm leading-6 text-slate-100 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                placeholder="SmartCredit 360 template yükle veya AI ile schema oluştur."
                spellCheck={false}
              />

              <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                <button
                  onClick={deployWorkspace}
                  disabled={deploying || !workspace}
                  className="rounded-2xl bg-slate-950 px-5 py-3 font-bold text-white shadow-lg shadow-slate-950/20 transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {deploying ? "İşlem Yapılıyor..." : dryRun ? "Dry Run Çalıştır" : "Salesforce'a Deploy Et"}
                </button>

                {!workspace && workspaceJson && (
                  <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    JSON formatı geçerli ama beklenen model/schema yapısı değil.
                  </div>
                )}
              </div>
            </div>

            {workspace && (
              <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-soft">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <h2 className="text-2xl font-black text-slate-950">
                      {workspace.kind === "model" ? workspace.model.modelName : workspace.schema.objectLabel}
                    </h2>
                    <p className="mt-1 font-mono text-sm text-blue-700">
                      {workspace.kind === "model" ? workspace.model.modelApiName : workspace.schema.objectApiName}
                    </p>
                    {workspace.kind === "model" && (
                      <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">{workspace.model.description}</p>
                    )}
                  </div>
                </div>

                <div className="mt-5 grid gap-4 lg:grid-cols-2">
                  {objects.map((object) => (
                    <div key={object.objectApiName} className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="font-bold text-slate-950">{object.objectLabel}</div>
                          <div className="mt-1 font-mono text-xs text-slate-500">{object.objectApiName}</div>
                        </div>
                        <FieldBadge>{object.isStandardObject ? "Standard" : "Custom"}</FieldBadge>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <FieldBadge>{object.fields?.length ?? 0} fields</FieldBadge>
                        <FieldBadge>{object.sharingModel ?? "ReadWrite"}</FieldBadge>
                        {object.nameField?.type === "AutoNumber" && <FieldBadge>Auto Number</FieldBadge>}
                      </div>
                      <div className="mt-4 grid gap-2">
                        {(object.fields ?? []).slice(0, 6).map((field) => (
                          <div key={field.apiName} className="flex items-center justify-between gap-3 rounded-2xl bg-white px-3 py-2 text-xs">
                            <span className="font-medium text-slate-800">{field.label}</span>
                            <span className="font-mono text-slate-500">{field.type}</span>
                          </div>
                        ))}
                        {(object.fields?.length ?? 0) > 6 && (
                          <div className="text-xs text-slate-500">+{(object.fields?.length ?? 0) - 6} field daha...</div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {workspace.kind === "model" && (workspace.model.complianceRules?.length ?? 0) > 0 && (
                  <div className="mt-6 rounded-3xl border border-amber-200 bg-amber-50 p-5">
                    <h3 className="font-bold text-amber-950">Compliance Guardrails</h3>
                    <div className="mt-3 grid gap-3 lg:grid-cols-2">
                      {workspace.model.complianceRules?.map((rule) => (
                        <div key={rule.code} className="rounded-2xl bg-white/80 p-4 text-sm leading-6 text-amber-950">
                          <div className="font-bold">{rule.code} — {rule.title}</div>
                          <p className="mt-1">{rule.description}</p>
                          <div className="mt-2 font-mono text-xs text-amber-800">{rule.severity}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {deployResult !== null && (
              <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-soft">
                <h2 className="text-xl font-bold text-slate-950">Deploy / Dry Run Sonucu</h2>
                <pre className="mt-4 max-h-[620px] overflow-auto rounded-2xl bg-slate-950 p-4 text-xs leading-6 text-slate-100">
                  {JSON.stringify(deployResult, null, 2)}
                </pre>
              </div>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}
