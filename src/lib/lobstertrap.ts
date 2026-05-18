import OpenAI from "openai";

const DENY_PREFIX = "[ChefPro AI Shield]";

export function isLobsterTrapEnabled(): boolean {
  return !!process.env.LOBSTER_TRAP_URL;
}

export async function inspectPrompt(
  prompt: string
): Promise<{ allowed: boolean; denyMessage?: string }> {
  if (!isLobsterTrapEnabled()) return { allowed: true };

  const client = new OpenAI({
    baseURL: `${process.env.LOBSTER_TRAP_URL}/v1`,
    apiKey: process.env.GEMINI_API_KEY ?? process.env.GOOGLE_AI_API_KEY ?? "",
  });

  try {
    const resp = await client.chat.completions.create({
      model: "gemini-2.0-flash",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 1,
    });
    const content = resp.choices[0]?.message?.content ?? "";
    if (content.startsWith(DENY_PREFIX)) {
      return { allowed: false, denyMessage: content };
    }
    return { allowed: true };
  } catch (err) {
    const isNetworkError =
      err instanceof Error &&
      (err.message.includes("ECONNREFUSED") ||
        err.message.includes("fetch failed") ||
        err.message.includes("network"));

    if (isNetworkError) {
      console.warn("[LobsterTrap] Proxy unreachable — proceeding without inspection");
      return { allowed: true };
    }

    if (err instanceof OpenAI.APIError) {
      const msg = err.message ?? "";
      if (msg.includes(DENY_PREFIX)) {
        return { allowed: false, denyMessage: msg };
      }
      console.warn(`[LobsterTrap] Proxy returned ${err.status} — proceeding without inspection`);
      return { allowed: true };
    }

    // All other errors (timeout, EHOSTUNREACH, malformed response) — fail open
    console.warn("[LobsterTrap] Unexpected error — proceeding without inspection", err);
    return { allowed: true };
  }
}
