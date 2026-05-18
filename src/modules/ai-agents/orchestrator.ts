import {
  createAgentChat,
  generateAgentText,
  getResponseText,
  toFunctionResponseContent,
} from "./client";
import { runTastingIntelligenceAgent } from "./agents/tasting-intelligence";
import { runMenuReviewAgent } from "./agents/menu-review";
import { runOpsAssistantAgent } from "./agents/ops-assistant";
import { MENU_REVIEW_PROMPT, OPS_ASSISTANT_PROMPT, TASTING_INTELLIGENCE_PROMPT } from "./prompts";
import { CHEFPRO_TOOLS, executeTool, type ToolContext } from "./tools";
import type { AgentName } from "./types";

interface HistoryMessage {
  role: "user" | "model";
  parts: Array<{ text: string }>;
}

interface PendingFunctionCall {
  id?: string;
  name: string;
  args: Record<string, unknown>;
}

const ROUTER_PROMPT = `You are a routing classifier for the ChefPro Ops AI system.
Given a user message, respond with ONLY one of these agent names (no other text):
- tasting-intelligence: for questions about tasting sessions, dish ratings, chef performance, rating trends, temperature compliance
- menu-review: for questions about menu signage packets, reviewing menus, packet status, amendments, item completeness
- ops-assistant: for general operational questions, closing verification, temperature logs, daily overviews, location stats, or anything that doesn't clearly fit the above

Respond with just the agent name.`;

async function classifyIntent(message: string): Promise<AgentName> {
  try {
    const raw = (await generateAgentText(`User message: "${message}"`, ROUTER_PROMPT))
      .trim()
      .toLowerCase();
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
  context: ToolContext,
  forcedAgent?: AgentName
): Promise<{ response: string; agentUsed: AgentName }> {
  const agentUsed = forcedAgent ?? (await classifyIntent(message));

  const history: HistoryMessage[] = conversationHistory.map((m) => ({
    role: m.role,
    parts: [{ text: m.content }],
  }));

  let response: string;
  switch (agentUsed) {
    case "tasting-intelligence":
      response = await runTastingIntelligenceAgent(message, history, context);
      break;
    case "menu-review":
      response = await runMenuReviewAgent(message, history, context);
      break;
    default:
      response = await runOpsAssistantAgent(message, history, context);
  }

  return { response, agentUsed };
}

export async function* runOrchestratorStream(
  message: string,
  conversationHistory: Array<{ role: "user" | "model"; content: string }>,
  context: ToolContext
): AsyncGenerator<string> {
  const agentUsed = await classifyIntent(message);
  yield `data: ${JSON.stringify({ type: "agent", agent: agentUsed })}\n\n`;

  const history: HistoryMessage[] = conversationHistory.map((m) => ({
    role: m.role,
    parts: [{ text: m.content }],
  }));

  const { systemPrompt, tools } = getAgentConfig(agentUsed);
  const chat = createAgentChat({ history, tools, systemInstruction: systemPrompt });
  const streamResult = await chat.sendMessageStream({ message });

  let pendingFunctionCalls: PendingFunctionCall[] = [];

  for await (const chunk of streamResult) {
    const text = getResponseText(chunk);
    if (text) {
      yield `data: ${JSON.stringify({ type: "text", text })}\n\n`;
    }
    for (const functionCall of chunk.functionCalls ?? []) {
      pendingFunctionCalls.push({
        id: functionCall.id,
        name: functionCall.name ?? "",
        args: (functionCall.args as Record<string, unknown>) ?? {},
      });
    }
  }

  while (pendingFunctionCalls.length > 0) {
    yield `data: ${JSON.stringify({ type: "tool_calls", tools: pendingFunctionCalls.map((f) => f.name) })}\n\n`;

    const toolResults = await Promise.all(
      pendingFunctionCalls.map(async (fc) => ({
        id: fc.id,
        name: fc.name,
        response: {
          result: await executeTool(fc.name, fc.args, context),
        },
      }))
    );

    pendingFunctionCalls = [];

    const followUp = await chat.sendMessageStream({
      message: toFunctionResponseContent(toolResults) as never,
    });
    for await (const chunk of followUp) {
      const text = getResponseText(chunk);
      if (text) {
        yield `data: ${JSON.stringify({ type: "text", text })}\n\n`;
      }
      for (const functionCall of chunk.functionCalls ?? []) {
        pendingFunctionCalls.push({
          id: functionCall.id,
          name: functionCall.name ?? "",
          args: (functionCall.args as Record<string, unknown>) ?? {},
        });
      }
    }
  }

  yield `data: ${JSON.stringify({ type: "done", agentUsed })}\n\n`;
}

function getAgentConfig(agent: AgentName) {
  const systemPrompts: Record<AgentName, string> = {
    "tasting-intelligence": TASTING_INTELLIGENCE_PROMPT,
    "menu-review": MENU_REVIEW_PROMPT,
    "ops-assistant": OPS_ASSISTANT_PROMPT,
  };

  return {
    systemPrompt: systemPrompts[agent],
    tools: CHEFPRO_TOOLS,
  };
}
