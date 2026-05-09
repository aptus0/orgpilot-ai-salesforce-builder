import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { Connection } from "jsforce";
import type { ConnectionMode, SalesforceRuntimeConfig } from "@/lib/types/schema";

const execFileAsync = promisify(execFile);

function normalizeRuntimeConfig(config?: SalesforceRuntimeConfig) {
  return {
    apiVersion: config?.apiVersion?.trim(),
    instanceUrl: config?.instanceUrl?.trim(),
    accessToken: config?.accessToken?.trim(),
    loginUrl: config?.loginUrl?.trim(),
    username: config?.username?.trim(),
    password: config?.password ?? "",
    securityToken: config?.securityToken ?? "",
    targetOrg: config?.targetOrg?.trim()
  };
}

function createTokenConnection(instanceUrl: string, accessToken: string, version: string) {
  return new Connection({
    instanceUrl,
    accessToken,
    version
  });
}

function isSoapLoginDisabledError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  return (
    message.includes("SOAP API login() is disabled by default in this org") ||
    message.includes("INVALID_OPERATION")
  );
}

function uniqueValues(values: Array<string | undefined>) {
  return [...new Set(values.map((value) => value?.trim()).filter(Boolean) as string[])];
}

async function getSfCliConnection(
  candidates: string[],
  version: string
): Promise<{ conn: Connection; connectionMode: ConnectionMode; targetOrg: string } | null> {
  for (const targetOrg of candidates) {
    try {
      const args = ["org", "display", "--json", "--target-org", targetOrg, "--api-version", version];
      const { stdout } = await execFileAsync("sf", args, { timeout: 20_000 });
      const parsed = JSON.parse(stdout) as {
        result?: {
          accessToken?: string;
          instanceUrl?: string;
          username?: string;
          alias?: string;
        };
      };

      const instanceUrl = parsed.result?.instanceUrl?.trim();
      const accessToken = parsed.result?.accessToken?.trim();

      if (!instanceUrl || !accessToken) continue;

      return {
        conn: createTokenConnection(instanceUrl, accessToken, version),
        connectionMode: "sf-cli",
        targetOrg: parsed.result?.alias || parsed.result?.username || targetOrg
      };
    } catch {
      continue;
    }
  }

  return null;
}

export async function getSalesforceConnection(
  config?: SalesforceRuntimeConfig
): Promise<{ conn: Connection; connectionMode: ConnectionMode }> {
  const normalizedConfig = normalizeRuntimeConfig(config);
  const version = normalizedConfig.apiVersion || process.env.SALESFORCE_API_VERSION || "60.0";

  if (normalizedConfig.instanceUrl && normalizedConfig.accessToken) {
    return {
      conn: createTokenConnection(normalizedConfig.instanceUrl, normalizedConfig.accessToken, version),
      connectionMode: "access-token"
    };
  }

  const instanceUrl = process.env.SALESFORCE_INSTANCE_URL;
  const accessToken = process.env.SALESFORCE_ACCESS_TOKEN;

  if (instanceUrl && accessToken) {
    return {
      conn: createTokenConnection(instanceUrl, accessToken, version),
      connectionMode: "env"
    };
  }

  const cliCandidates = uniqueValues([
    normalizedConfig.targetOrg,
    process.env.SALESFORCE_TARGET_ORG,
    normalizedConfig.username,
    process.env.SALESFORCE_USERNAME
  ]);

  const loginUrl = normalizedConfig.loginUrl || process.env.SALESFORCE_LOGIN_URL || "https://login.salesforce.com";
  const username = normalizedConfig.username || process.env.SALESFORCE_USERNAME;
  const password = normalizedConfig.password || process.env.SALESFORCE_PASSWORD;
  const securityToken = normalizedConfig.securityToken || process.env.SALESFORCE_SECURITY_TOKEN || "";

  if (!username || !password) {
    const cliConnection = await getSfCliConnection(cliCandidates, version);
    if (cliConnection) {
      return {
        conn: cliConnection.conn,
        connectionMode: cliConnection.connectionMode
      };
    }

    throw new Error(
      "Salesforce baglantisi icin username/password, instanceUrl/accessToken veya sf CLI target org gerekli."
    );
  }

  const conn = new Connection({
    loginUrl,
    version
  });

  try {
    await conn.login(username, `${password}${securityToken}`);

    return {
      conn,
      connectionMode: config ? "username-password" : "env"
    };
  } catch (error) {
    if (!isSoapLoginDisabledError(error)) {
      throw error;
    }

    const cliConnection = await getSfCliConnection(cliCandidates, version);
    if (cliConnection) {
      return {
        conn: cliConnection.conn,
        connectionMode: cliConnection.connectionMode
      };
    }

    throw new Error(
      "SOAP login bu org'da kapali. Settings ekraninda `sf CLI / Target Org` kullanin veya `Instance URL + Access Token` girin."
    );
  }
}
