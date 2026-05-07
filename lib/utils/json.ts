export function extractJsonObject(text: string): unknown {
  const trimmed = text.trim();

  try {
    return JSON.parse(trimmed);
  } catch {
    // Continue with fenced / embedded extraction.
  }

  const fencedMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fencedMatch?.[1]) {
    return JSON.parse(fencedMatch[1]);
  }

  const firstBrace = trimmed.indexOf("{");
  const lastBrace = trimmed.lastIndexOf("}");

  if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
    throw new Error("AI yanıtında JSON obje bulunamadı.");
  }

  return JSON.parse(trimmed.slice(firstBrace, lastBrace + 1));
}
