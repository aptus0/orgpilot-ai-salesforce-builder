const TURKISH_CHAR_MAP: Record<string, string> = {
  ç: "c",
  Ç: "C",
  ğ: "g",
  Ğ: "G",
  ı: "i",
  I: "I",
  İ: "I",
  ö: "o",
  Ö: "O",
  ş: "s",
  Ş: "S",
  ü: "u",
  Ü: "U"
};

export function normalizeTurkishChars(value: string): string {
  return value
    .split("")
    .map((char) => TURKISH_CHAR_MAP[char] ?? char)
    .join("");
}

export function cleanLabel(value: unknown, fallback = "Custom Record"): string {
  const raw = typeof value === "string" ? value : fallback;
  const cleaned = raw.replace(/\s+/g, " ").trim();
  return cleaned.length > 0 ? cleaned : fallback;
}

export function toPascalWords(value: string): string {
  const normalized = normalizeTurkishChars(value)
    .replace(/[^a-zA-Z0-9]+/g, " ")
    .trim();

  if (!normalized) {
    return "CustomRecord";
  }

  const words = normalized
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1));

  return words.join("");
}

function wordsForApiName(value: string): string[] {
  const normalized = normalizeTurkishChars(value)
    .replace(/__c$/i, "")
    .replace(/[^a-zA-Z0-9_]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");

  if (!normalized) {
    return ["Custom", "Record"];
  }

  return normalized
    .split("_")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1));
}

export function toSalesforceApiName(value: string, suffix = "__c"): string {
  const words = wordsForApiName(value);
  let apiBase = words.join("_");

  if (/^[0-9]/.test(apiBase)) {
    apiBase = `X_${apiBase}`;
  }

  if (apiBase.endsWith("__c")) {
    return apiBase;
  }

  return `${apiBase}${suffix}`;
}

export function toRelationshipName(label: string): string {
  const pascal = toPascalWords(label).replace(/__c$/i, "");
  return /^[0-9]/.test(pascal) ? `X${pascal}` : pascal;
}

export function uniqueApiName(apiName: string, used: Set<string>): string {
  if (!used.has(apiName)) {
    used.add(apiName);
    return apiName;
  }

  const base = apiName.replace(/__c$/i, "");
  let index = 2;
  let candidate = `${base}_${index}__c`;

  while (used.has(candidate)) {
    index += 1;
    candidate = `${base}_${index}__c`;
  }

  used.add(candidate);
  return candidate;
}

export function pluralizeLabel(label: string): string {
  const cleaned = cleanLabel(label);
  if (cleaned.toLowerCase().endsWith("s")) {
    return cleaned;
  }
  return `${cleaned}s`;
}
