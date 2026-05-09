"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  clearSalesforceSettings,
  readSalesforceSettings,
  writeSalesforceSettings
} from "@/lib/client/salesforceSettings";
import type { SalesforceRuntimeConfig } from "@/lib/types/schema";

type SettingsMode = "username-password" | "access-token" | "sf-cli";

function modeFromConfig(config: SalesforceRuntimeConfig | null): SettingsMode {
  if (config?.instanceUrl || config?.accessToken) return "access-token";
  if (config?.targetOrg && !config?.username && !config?.password) return "sf-cli";
  return "username-password";
}

export default function SettingsPage() {
  const [mode, setMode] = useState<SettingsMode>("username-password");
  const [saved, setSaved] = useState(false);
  const [form, setForm] = useState<SalesforceRuntimeConfig>({
    loginUrl: "https://login.salesforce.com",
    username: "",
    password: "",
    securityToken: "",
    instanceUrl: "",
    accessToken: "",
    targetOrg: "",
    apiVersion: "60.0"
  });

  useEffect(() => {
    const config = readSalesforceSettings();
    if (!config) return;

    setForm((current) => ({
      ...current,
      ...config
    }));
    setMode(modeFromConfig(config));
  }, []);

  function updateField(field: keyof SalesforceRuntimeConfig, value: string) {
    setSaved(false);
    setForm((current) => ({
      ...current,
      [field]: value
    }));
  }

  function handleSave() {
    const payload =
      mode === "username-password"
        ? {
            loginUrl: form.loginUrl?.trim(),
            username: form.username?.trim(),
            password: form.password ?? "",
            securityToken: form.securityToken ?? "",
            targetOrg: form.targetOrg?.trim(),
            apiVersion: form.apiVersion?.trim()
          }
        : mode === "access-token"
          ? {
            instanceUrl: form.instanceUrl?.trim(),
            accessToken: form.accessToken?.trim(),
            apiVersion: form.apiVersion?.trim()
            }
          : {
              targetOrg: form.targetOrg?.trim(),
              apiVersion: form.apiVersion?.trim()
            };

    writeSalesforceSettings(payload);
    setSaved(true);
  }

  function handleClear() {
    clearSalesforceSettings();
    setSaved(false);
    setMode("username-password");
    setForm({
      loginUrl: "https://login.salesforce.com",
      username: "",
      password: "",
      securityToken: "",
      instanceUrl: "",
      accessToken: "",
      targetOrg: "",
      apiVersion: "60.0"
    });
  }

  return (
    <main className="admin-shell">
      <div className="admin-frame">
        <header className="admin-topbar">
          <div>
            <div className="brand-caption">Salesforce Settings</div>
            <h1 className="brand-title">Connection Runtime</h1>
          </div>
          <div className="topbar-actions">
            <Link href="/" className="nav-button">
              Back
            </Link>
          </div>
        </header>

        <section className="settings-layout">
          <div className="admin-panel">
            <div className="panel-kicker">Mode</div>
            <h2 className="panel-title">Baglanti Tipi</h2>

            <div className="mode-switch">
              <button
                type="button"
                onClick={() => setMode("username-password")}
                className={`mode-button ${mode === "username-password" ? "mode-button-active" : ""}`}
              >
                Username + Password
              </button>
              <button
                type="button"
                onClick={() => setMode("access-token")}
                className={`mode-button ${mode === "access-token" ? "mode-button-active" : ""}`}
              >
                Instance URL + Access Token
              </button>
              <button
                type="button"
                onClick={() => setMode("sf-cli")}
                className={`mode-button ${mode === "sf-cli" ? "mode-button-active" : ""}`}
              >
                sf CLI / Target Org
              </button>
            </div>

            <div className="form-stack">
              {mode === "username-password" ? (
                <>
                  <label className="field-block">
                    <span className="field-label">Login URL</span>
                    <input
                      value={form.loginUrl ?? ""}
                      onChange={(event) => updateField("loginUrl", event.target.value)}
                      className="text-field"
                      placeholder="https://login.salesforce.com"
                    />
                  </label>

                  <label className="field-block">
                    <span className="field-label">Username</span>
                    <input
                      value={form.username ?? ""}
                      onChange={(event) => updateField("username", event.target.value)}
                      className="text-field"
                      placeholder="user@example.com"
                    />
                  </label>

                  <label className="field-block">
                    <span className="field-label">Password</span>
                    <input
                      type="password"
                      value={form.password ?? ""}
                      onChange={(event) => updateField("password", event.target.value)}
                      className="text-field"
                      placeholder="Password"
                    />
                  </label>

                  <label className="field-block">
                    <span className="field-label">Security Token</span>
                    <input
                      value={form.securityToken ?? ""}
                      onChange={(event) => updateField("securityToken", event.target.value)}
                      className="text-field"
                      placeholder="Security token"
                    />
                  </label>

                  <label className="field-block">
                    <span className="field-label">sf Target Org (Opsiyonel Fallback)</span>
                    <input
                      value={form.targetOrg ?? ""}
                      onChange={(event) => updateField("targetOrg", event.target.value)}
                      className="text-field"
                      placeholder="my-org-alias veya user@example.com"
                    />
                  </label>
                </>
              ) : mode === "access-token" ? (
                <>
                  <label className="field-block">
                    <span className="field-label">Instance URL</span>
                    <input
                      value={form.instanceUrl ?? ""}
                      onChange={(event) => updateField("instanceUrl", event.target.value)}
                      className="text-field"
                      placeholder="https://your-domain.my.salesforce.com"
                    />
                  </label>

                  <label className="field-block">
                    <span className="field-label">Access Token</span>
                    <input
                      type="password"
                      value={form.accessToken ?? ""}
                      onChange={(event) => updateField("accessToken", event.target.value)}
                      className="text-field"
                      placeholder="Access token"
                    />
                  </label>
                </>
              ) : (
                <label className="field-block">
                  <span className="field-label">sf Target Org</span>
                  <input
                    value={form.targetOrg ?? ""}
                    onChange={(event) => updateField("targetOrg", event.target.value)}
                    className="text-field"
                    placeholder="my-org-alias veya user@example.com"
                  />
                </label>
              )}

              <label className="field-block">
                <span className="field-label">API Version</span>
                <input
                  value={form.apiVersion ?? ""}
                  onChange={(event) => updateField("apiVersion", event.target.value)}
                  className="text-field"
                  placeholder="60.0"
                />
              </label>
            </div>

            <div className="button-stack button-stack-inline">
              <button onClick={handleSave} className="primary-button">
                Save Session
              </button>
              <button onClick={handleClear} className="secondary-button">
                Clear
              </button>
            </div>

            {saved && <div className="message-box message-success">Ayarlar sessionStorage icine kaydedildi.</div>}
          </div>

          <div className="admin-panel">
            <div className="panel-kicker">Guide</div>
            <h2 className="panel-title">Nereden Alinir</h2>

            <div className="help-stack">
              <details className="help-box" open>
                <summary>Login URL</summary>
                <p>Production icin genelde `https://login.salesforce.com`, sandbox icin `https://test.salesforce.com` kullanilir.</p>
              </details>

              <details className="help-box">
                <summary>Security Token</summary>
                <p>Salesforce icinde Settings veya My Personal Information altindan security token reset edilerek e-postaya gonderilir.</p>
              </details>

              <details className="help-box">
                <summary>Access Token</summary>
                <p>Connected App veya OAuth akisi ile alinir. Token modunda genelde `instanceUrl` ile birlikte kullanilir.</p>
              </details>

              <details className="help-box">
                <summary>sf Target Org</summary>
                <p>`sf org login web --alias my-org` ile login olduktan sonra burada alias veya username girilebilir. SOAP login kapali org'larda en pratik secenek budur.</p>
              </details>

              <details className="help-box">
                <summary>Instance URL</summary>
                <p>Salesforce oturumu acildiktan sonra adres cubugundaki org domain kullanilir. Ornek: `https://your-domain.my.salesforce.com`.</p>
              </details>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
