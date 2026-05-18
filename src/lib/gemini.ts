import {
  GoogleGenAI,
  createPartFromBase64,
  createPartFromUri,
  type Content,
  type Part,
  type Tool,
} from "@google/genai";
import { z, type ZodType } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";

export const DEFAULT_GEMINI_MODEL = "gemini-3-flash-preview";

let geminiClient: GoogleGenAI | null = null;

export function getGeminiApiKey() {
  return process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY || "";
}

export function getGeminiModelName(modelName?: string) {
  return modelName || process.env.GEMINI_MODEL || DEFAULT_GEMINI_MODEL;
}

export function getGeminiClient() {
  if (!geminiClient) {
    const apiKey = getGeminiApiKey();
    if (!apiKey) throw new Error("GEMINI_API_KEY or GOOGLE_AI_API_KEY is not set");
    geminiClient = new GoogleGenAI({ apiKey });
  }
  return geminiClient;
}

export function createGeminiChat(opts: {
  history?: Content[];
  modelName?: string;
  systemInstruction?: string;
  tools?: Tool[];
}) {
  return getGeminiClient().chats.create({
    model: getGeminiModelName(opts.modelName),
    history: opts.history ?? [],
    config: {
      systemInstruction: opts.systemInstruction,
      tools: opts.tools,
    },
  });
}

export function inlineFilePart(buffer: Buffer, mimeType: string): Part {
  return createPartFromBase64(buffer.toString("base64"), mimeType);
}

export async function uploadGeminiFilePart(file: File): Promise<Part> {
  const buffer = Buffer.from(await file.arrayBuffer());
  const blob = new Blob([buffer], { type: file.type });
  const uploaded = await getGeminiClient().files.upload({
    file: blob,
    config: {
      mimeType: file.type,
      displayName: file.name,
    },
  });

  if (!uploaded.uri || !uploaded.mimeType) {
    throw new Error("Gemini file upload did not return a usable URI");
  }

  return createPartFromUri(uploaded.uri, uploaded.mimeType);
}

function toGeminiJsonSchema(schema: ZodType) {
  const converted = zodToJsonSchema(schema as never, {
    name: "response",
    $refStrategy: "none",
  }) as Record<string, unknown>;

  const definition = (converted.definitions as Record<string, unknown> | undefined)?.response;
  return definition ?? converted;
}

function parseJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    const match = text.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
    if (!match) throw new Error("Gemini response was not valid JSON");
    return JSON.parse(match[0]);
  }
}

export async function generateStructuredObject<T>(opts: {
  schema: ZodType<T>;
  contents: string | Part[];
  systemInstruction: string;
  modelName?: string;
  temperature?: number;
}) {
  const model = getGeminiModelName(opts.modelName);
  const responseJsonSchema = toGeminiJsonSchema(opts.schema);
  const client = getGeminiClient();

  const first = await client.models.generateContent({
    model,
    contents: opts.contents,
    config: {
      systemInstruction: opts.systemInstruction,
      temperature: opts.temperature ?? 0.1,
      responseMimeType: "application/json",
      responseJsonSchema,
    },
  });

  const firstText = first.text ?? "";
  const firstParsed = opts.schema.safeParse(parseJson(firstText));
  if (firstParsed.success) return firstParsed.data;

  const repair = await client.models.generateContent({
    model,
    contents: [
      {
        text: "Repair this Gemini response so it exactly matches the provided JSON schema. Return JSON only.",
      },
      { text: firstText },
      { text: `Validation error: ${z.prettifyError(firstParsed.error)}` },
    ],
    config: {
      temperature: 0,
      responseMimeType: "application/json",
      responseJsonSchema,
    },
  });

  const repairedText = repair.text ?? "";
  return opts.schema.parse(parseJson(repairedText));
}
