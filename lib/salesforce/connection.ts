import { Connection } from "jsforce";

export async function getSalesforceConnection(): Promise<Connection> {
  const version = process.env.SALESFORCE_API_VERSION || "60.0";

  const instanceUrl = process.env.SALESFORCE_INSTANCE_URL;
  const accessToken = process.env.SALESFORCE_ACCESS_TOKEN;

  if (instanceUrl && accessToken) {
    return new Connection({
      instanceUrl,
      accessToken,
      version
    });
  }

  const loginUrl = process.env.SALESFORCE_LOGIN_URL || "https://login.salesforce.com";
  const username = process.env.SALESFORCE_USERNAME;
  const password = process.env.SALESFORCE_PASSWORD;
  const securityToken = process.env.SALESFORCE_SECURITY_TOKEN || "";

  if (!username || !password) {
    throw new Error(
      "Salesforce bağlantısı için SALESFORCE_USERNAME ve SALESFORCE_PASSWORD gerekli. Alternatif olarak SALESFORCE_INSTANCE_URL + SALESFORCE_ACCESS_TOKEN kullan."
    );
  }

  const conn = new Connection({
    loginUrl,
    version
  });

  await conn.login(username, `${password}${securityToken}`);

  return conn;
}
