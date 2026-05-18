import { createAgentChat, getResponseText, toFunctionResponseContent } from "../client";
import { TASTING_INTELLIGENCE_PROMPT } from "../prompts";
import { CHEFPRO_TOOLS, executeTool, type ToolContext } from "../tools";

export async function runTastingIntelligenceAgent(
  userMessage: string,
  history: Array<{ role: "user" | "model"; parts: Array<{ text: string }> }>,
  context: ToolContext
): Promise<string> {
  const chat = createAgentChat({
    history,
    tools: CHEFPRO_TOOLS,
    systemInstruction: TASTING_INTELLIGENCE_PROMPT,
  });

  let response = await chat.sendMessage({ message: userMessage });

  while (true) {
    const functionCalls = response.functionCalls ?? [];
    if (functionCalls.length === 0) break;

    const toolResults = await Promise.all(
      functionCalls.map(async (fc) => ({
        id: fc.id,
        name: fc.name ?? "",
        response: {
          result: await executeTool(
            fc.name ?? "",
            (fc.args as Record<string, unknown>) ?? {},
            context
          ),
        },
      }))
    );

    response = await chat.sendMessage({ message: toFunctionResponseContent(toolResults) as never });
  }

  return getResponseText(response);
}
