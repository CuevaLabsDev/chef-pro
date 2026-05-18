import { getModel } from "../client";
import { CHEFPRO_TOOLS, executeTool } from "../tools";

const SYSTEM_PROMPT = `You are the Tasting Intelligence Agent for ChefPro, an enterprise food service management platform.

Your role is to analyze tasting session data, rating patterns, and compliance metrics across locations and meal periods.

You have access to tools to query live tasting data. When answering questions:
- Always pull real data using your tools before drawing conclusions
- Present ratings on the 1–5 scale where: 1=Unservable, 2=Needs Adjustment, 3=Meets Standards, 4=Excellent, 5=Paragon
- Highlight specific dishes, locations, or periods that need attention
- Be concise but data-driven — cite numbers and percentages
- Flag compliance issues (temperature, checklist completion, missed submissions)

Respond in clear, professional language suitable for food service operations leadership.`;

export async function runTastingIntelligenceAgent(
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
