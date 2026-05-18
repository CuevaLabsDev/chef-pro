import { getModel } from "./client";
import { runTastingIntelligenceAgent } from "./agents/tasting-intelligence";
import { runMenuReviewAgent } from "./agents/menu-review";
import { runOpsAssistantAgent } from "./agents/ops-assistant";
import type { AgentName } from "./types";

interface HistoryMessage {
  role: "user" | "model";
  parts: Array<{ text: string }>;
}

const ROUTER_PROMPT = `You are a routing classifier for the ChefPro Ops AI system.
Given a user message, respond with ONLY one of these agent names (no other text):
- tasting-intelligence: for questions about tasting sessions, dish ratings, chef performance, rating trends, temperature compliance
- menu-review: for questions about menu signage packets, reviewing menus, packet status, amendments, item completeness
- ops-assistant: for general operational questions, daily overviews, location stats, or anything that doesn't clearly fit the above

Respond with just the agent name.`;

async function classifyIntent(message: string): Promise<AgentName> {
  try {
    const model = getModel();
    const result = await model.generateContent([
      { text: ROUTER_PROMPT },
      { text: `User message: "${message}"` },
    ]);
    const raw = result.response.text().trim().toLowerCase();
    if (raw.includes("tasting-intelligence")) return "tasting-intelligence";
    if (raw.includes("menu-review")) return "menu-review";
    return "ops-assistant";
  } catch {
    return "ops-assistant";
  }
}

export async function runOrchestrator(
  message: string,
  conversationHistory: Array<{ role: "user" | "model"; content: string }>,
): Promise<{ response: string; agentUsed: AgentName }> {
  const agentUsed = await classifyIntent(message);

  const history: HistoryMessage[] = conversationHistory.map((m) => ({
    role: m.role,
    parts: [{ text: m.content }],
  }));

  let response: string;
  switch (agentUsed) {
    case "tasting-intelligence":
      response = await runTastingIntelligenceAgent(message, history);
      break;
    case "menu-review":
      response = await runMenuReviewAgent(message, history);
      break;
    default:
      response = await runOpsAssistantAgent(message, history);
  }

  return { response, agentUsed };
}

export async function* runOrchestratorStream(
  message: string,
  conversationHistory: Array<{ role: "user" | "model"; content: string }>,
): AsyncGenerator<string> {
  const agentUsed = await classifyIntent(message);
  yield `data: ${JSON.stringify({ type: "agent", agent: agentUsed })}\n\n`;

  const history: HistoryMessage[] = conversationHistory.map((m) => ({
    role: m.role,
    parts: [{ text: m.content }],
  }));

  const model = getModel();
  const { systemPrompt, tools } = getAgentConfig(agentUsed);

  const chat = model.startChat({
    history,
    tools,
    systemInstruction: systemPrompt,
  });

  const streamResult = await chat.sendMessageStream(message);

  let fullText = "";
  let pendingFunctionCalls: Array<{ name: string; args: Record<string, unknown> }> = [];

  for await (const chunk of streamResult.stream) {
    const candidate = chunk.candidates?.[0];
    if (!candidate) continue;

    for (const part of candidate.content.parts) {
      if (part.text) {
        fullText += part.text;
        yield `data: ${JSON.stringify({ type: "text", text: part.text })}\n\n`;
      }
      if (part.functionCall) {
        pendingFunctionCalls.push({
          name: part.functionCall.name,
          args: (part.functionCall.args as Record<string, unknown>) ?? {},
        });
      }
    }
  }

  while (pendingFunctionCalls.length > 0) {
    yield `data: ${JSON.stringify({ type: "tool_calls", tools: pendingFunctionCalls.map((f) => f.name) })}\n\n`;

    const toolResults = await Promise.all(
      pendingFunctionCalls.map(async (fc) => ({
        functionResponse: {
          name: fc.name,
          response: { result: await import("./tools").then((m) => m.executeTool(fc.name, fc.args)) },
        },
      })),
    );

    pendingFunctionCalls = [];

    const followUp = await chat.sendMessageStream(toolResults);
    for await (const chunk of followUp.stream) {
      const candidate = chunk.candidates?.[0];
      if (!candidate) continue;
      for (const part of candidate.content.parts) {
        if (part.text) {
          fullText += part.text;
          yield `data: ${JSON.stringify({ type: "text", text: part.text })}\n\n`;
        }
        if (part.functionCall) {
          pendingFunctionCalls.push({
            name: part.functionCall.name,
            args: (part.functionCall.args as Record<string, unknown>) ?? {},
          });
        }
      }
    }
  }

  yield `data: ${JSON.stringify({ type: "done", agentUsed })}\n\n`;
}

function getAgentConfig(agent: AgentName) {
  const CHEFPRO_TOOLS = require("./tools").CHEFPRO_TOOLS;

  const systemPrompts: Record<AgentName, string> = {
    "tasting-intelligence": `You are the Tasting Intelligence Agent for ChefPro. Analyze tasting sessions, dish ratings, and compliance data. Use tools to fetch real data. Present ratings on the 1–5 scale where: 1=Unservable, 2=Needs Adjustment, 3=Meets Standards, 4=Excellent, 5=Paragon. Be concise and data-driven.`,
    "menu-review": `You are the Menu Review Agent for ChefPro. Review menu signage packets for completeness and quality. Check: all categories covered, descriptions present, allergens noted, amendments resolved, signatures in place. Use ✅ ⚠️ 📋 to structure feedback.`,
    "ops-assistant": `You are the ChefPro Ops Assistant. Answer operational questions using live data from your tools. For overviews, call get_dashboard_stats. Be concise, helpful, and flag any issues you spot. You are the knowledgeable ops partner for food service leadership.`,
  };

  return {
    systemPrompt: systemPrompts[agent],
    tools: CHEFPRO_TOOLS,
  };
}
