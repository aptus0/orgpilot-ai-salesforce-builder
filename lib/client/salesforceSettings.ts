"use client";

import type { SalesforceRuntimeConfig } from "@/lib/types/schema";

export const SALESFORCE_SETTINGS_KEY = "temas-salesforce-runtime-config";

export function readSalesforceSettings(): SalesforceRuntimeConfig | null {
  if (typeof window === "undefined") return null;

  const raw = window.sessionStorage.getItem(SALESFORCE_SETTINGS_KEY);
  if (!raw) return null;

  try {
    return JSON.parse(raw) as SalesforceRuntimeConfig;
  } catch {
    return null;
  }
}

export function writeSalesforceSettings(config: SalesforceRuntimeConfig) {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(SALESFORCE_SETTINGS_KEY, JSON.stringify(config));
}

export function clearSalesforceSettings() {
  if (typeof window === "undefined") return;
  window.sessionStorage.removeItem(SALESFORCE_SETTINGS_KEY);
}

export function hasRuntimeSalesforceSettings(config: SalesforceRuntimeConfig | null) {
  if (!config) return false;

  return Boolean(
    (config.instanceUrl && config.accessToken) ||
    (config.username && config.password) ||
    config.targetOrg
  );
}
