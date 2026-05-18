import type { Content, GenerateContentResponse, Tool } from "@google/genai";
import {
  DEFAULT_GEMINI_MODEL,
  createGeminiChat,
  getGeminiClient,
  getGeminiModelName,
} from "@/lib/gemini";

export { DEFAULT_GEMINI_MODEL, getGeminiModelName };
export type { Content };

interface FunctionResponseInput {
  id?: string;
  name: string;
  response: Record<string, unknown>;
}

export function toSystemInstruction(text: string): string {
  return text;
}

export function createAgentChat(opts: {
  history?: Content[];
  tools?: Tool[];
  systemInstruction: string;
}) {
  return createGeminiChat(opts);
}

export async function generateAgentText(prompt: string, systemInstruction?: string) {
  const result = await getGeminiClient().models.generateContent({
    model: getGeminiModelName(),
    contents: prompt,
    config: { systemInstruction },
  });
  return getResponseText(result);
}

export function getResponseText(response: Pick<GenerateContentResponse, "candidates">): string {
  const parts = response.candidates?.[0]?.content?.parts ?? [];
  return parts
    .filter((part) => typeof part.text === "string" && !part.thought)
    .map((part) => part.text)
    .join("");
}

export function toFunctionResponseContent(functionResponses: FunctionResponseInput[]): Content {
  return {
    role: "user",
    parts: functionResponses.map((functionResponse) => ({
      functionResponse: {
        id: functionResponse.id ?? "",
        name: functionResponse.name,
        response: functionResponse.response,
      },
    })),
  };
}
