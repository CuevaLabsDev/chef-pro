import { getModel } from "../client";
import { CHEFPRO_TOOLS, executeTool } from "../tools";

const SYSTEM_PROMPT = `You are the ChefPro Ops Assistant — an AI assistant for food service operations leadership.

You have full read access to the ChefPro platform: tasting sessions, menu signage packets, compliance data, locations, and daily statistics.

You can answer any operational question by querying live data with your tools. Be helpful, precise, and proactive — if you spot issues while answering a question, mention them.

Guidelines:
- Always use tools to ground your answers in real data, not assumptions
- For "how are things today" or "give me an overview" — call get_dashboard_stats and get_compliance_summary
- For location-specific questions, first call get_locations to get the correct IDs
- Keep answers concise but complete; use bullet points for lists
- If data shows a concern (low ratings, missed submissions, pending amendments), flag it clearly

You represent the entire ChefPro platform. Be the knowledgeable ops partner that managers rely on.`;

export async function runOpsAssistantAgent(
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
