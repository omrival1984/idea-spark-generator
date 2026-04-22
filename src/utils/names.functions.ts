import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const DIRECTIONS = [
  "Clean & Professional",
  "Creative & Brandable",
  "Bold & Innovative",
] as const;

const NameSchema = z.object({
  direction: z.string(),
  name: z.string(),
  reason: z.string(),
});

const NamesArraySchema = z.array(NameSchema);

const SingleNameSchema = z.object({
  name: z.string(),
  reason: z.string(),
});

async function callGateway(messages: Array<{ role: string; content: string }>) {
  const apiKey = process.env.LOVABLE_API_KEY;
  if (!apiKey) throw new Error("LOVABLE_API_KEY is not configured");

  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-3-flash-preview",
      messages,
      response_format: { type: "json_object" },
    }),
  });

  if (response.status === 429) {
    throw new Error("Rate limit reached. Please try again in a moment.");
  }
  if (response.status === 402) {
    throw new Error("AI credits exhausted. Please add credits to your workspace.");
  }
  if (!response.ok) {
    const text = await response.text();
    console.error("AI gateway error:", response.status, text);
    throw new Error("AI request failed. Please try again.");
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error("Empty response from AI");
  return content as string;
}

function extractJson(text: string): unknown {
  // Strip code fences if present
  const cleaned = text
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    // Try to find first JSON object/array in the text
    const match = cleaned.match(/[\[{][\s\S]*[\]}]/);
    if (match) return JSON.parse(match[0]);
    throw new Error("AI returned malformed JSON");
  }
}

export const generateNames = createServerFn({ method: "POST" })
  .inputValidator((input: { idea: string }) => {
    const schema = z.object({ idea: z.string().min(1).max(2000) });
    return schema.parse(input);
  })
  .handler(async ({ data }) => {
    const prompt = `You are a world-class startup naming expert.

Generate 3 app names based on this idea: ${data.idea}

Each name must match a different direction:
1. Clean & Professional
2. Creative & Brandable
3. Bold & Innovative

Return ONLY a JSON object with a "names" key containing an array, in this exact format:
{
  "names": [
    { "direction": "Clean & Professional", "name": "...", "reason": "..." },
    { "direction": "Creative & Brandable", "name": "...", "reason": "..." },
    { "direction": "Bold & Innovative", "name": "...", "reason": "..." }
  ]
}

The "reason" must be a single concise sentence.`;

    const content = await callGateway([
      { role: "system", content: "You are a world-class startup naming expert. Always respond with valid JSON." },
      { role: "user", content: prompt },
    ]);

    const parsed = extractJson(content) as { names?: unknown };
    const namesRaw = Array.isArray(parsed) ? parsed : parsed.names;
    const names = NamesArraySchema.parse(namesRaw);

    // Ensure exactly 3, mapped to expected directions in order
    const ordered = DIRECTIONS.map((dir, i) => {
      const found = names.find((n) => n.direction === dir);
      return found ?? { direction: dir, name: names[i]?.name ?? "Untitled", reason: names[i]?.reason ?? "" };
    });

    return { names: ordered };
  });

export const refineName = createServerFn({ method: "POST" })
  .inputValidator((input: { idea: string; direction: string; refinementType: string }) => {
    const schema = z.object({
      idea: z.string().min(1).max(2000),
      direction: z.string().min(1).max(100),
      refinementType: z.string().min(1).max(100),
    });
    return schema.parse(input);
  })
  .handler(async ({ data }) => {
    const prompt = `You are refining an app name direction.

App idea: ${data.idea}
Direction: ${data.direction}
Refinement: ${data.refinementType}

Generate 1 improved name with reason. Return ONLY a JSON object:
{ "name": "...", "reason": "..." }

The "reason" must be a single concise sentence.`;

    const content = await callGateway([
      { role: "system", content: "You are a world-class startup naming expert. Always respond with valid JSON." },
      { role: "user", content: prompt },
    ]);

    const parsed = extractJson(content);
    const result = SingleNameSchema.parse(parsed);
    return { direction: data.direction, ...result };
  });
