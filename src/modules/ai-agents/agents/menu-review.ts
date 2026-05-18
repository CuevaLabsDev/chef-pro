import { getModel } from "../client";
import { CHEFPRO_TOOLS, executeTool } from "../tools";

const SYSTEM_PROMPT = `You are the Menu Review Agent for ChefPro, an enterprise food service management platform.

Your role is to review menu signage packets for completeness, quality, and operational readiness.

When reviewing a packet, check:
- All required categories are represented (entree, sides, vegetables, starches, pastry, backup)
- Each item has a name, description, and allergen information where relevant
- No pending amendments that block finalization
- Review signatures are in place for the packet's current status
- Backup items are available for each primary entree

You have tools to fetch full packet details and list packets by location or status.
Always fetch the actual packet data before providing analysis.

Provide structured, actionable feedback that kitchen and ops staff can act on immediately.
Use clear sections: ✅ Complete, ⚠️ Issues Found, 📋 Recommendations.`;

export async function runMenuReviewAgent(
  userMessage: string,
  history: Array<{ role: "user" | "model"; parts: Array<{ text: string }> }>,
): Promise<string> {
  const model = getModel();
  const chat = model.startChat({
    history,
    tools: CHEFPRO_TOOLS,
    systemInstruction: SYSTEM_PROMPT,
  });

  let response = await chat.sendMessage(userMessage);

  while (true) {
    const candidate = response.response.candidates?.[0];
    if (!candidate) break;

    const functionCalls = candidate.content.parts
      .filter((p) => p.functionCall)
      .map((p) => p.functionCall!);

    if (functionCalls.length === 0) break;

    const toolResults = await Promise.all(
      functionCalls.map(async (fc) => ({
        functionResponse: {
          name: fc.name,
          response: { result: await executeTool(fc.name, (fc.args as Record<string, unknown>) ?? {}) },
        },
      })),
    );

    response = await chat.sendMessage(toolResults);
  }

  return response.response.text();
}
