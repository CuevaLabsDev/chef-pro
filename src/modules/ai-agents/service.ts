import { prisma } from "@/lib/db";
import { Prisma } from "@prisma/client";
import type { InsightType } from "./types";
import type { AgentName } from "./types";

export async function createChatSession(userId: string, title?: string) {
  return prisma.aiChatSession.create({
    data: { userId, title: title ?? null },
  });
}

export async function getChatSession(sessionId: string, userId: string) {
  return prisma.aiChatSession.findFirst({
    where: { id: sessionId, userId },
    include: {
      messages: { orderBy: { createdAt: "asc" } },
    },
  });
}

export async function listChatSessions(userId: string) {
  return prisma.aiChatSession.findMany({
    where: { userId },
    orderBy: { updatedAt: "desc" },
    take: 20,
    include: { _count: { select: { messages: true } } },
  });
}

export async function appendMessages(
  sessionId: string,
  messages: Array<{ role: string; content: string; metadata?: Record<string, unknown> }>,
) {
  await prisma.aiChatMessage.createMany({
    data: messages.map((m) => ({
      sessionId,
      role: m.role,
      content: m.content,
      metadata: m.metadata ? (m.metadata as Prisma.InputJsonValue) : Prisma.JsonNull,
    })),
  });
  await prisma.aiChatSession.update({
    where: { id: sessionId },
    data: { updatedAt: new Date() },
  });
}

export async function generateSessionTitle(firstMessage: string): Promise<string> {
  const truncated = firstMessage.slice(0, 80);
  return truncated.length < firstMessage.length ? `${truncated}...` : truncated;
}

export async function saveInsightReport(opts: {
  userId: string;
  type: InsightType;
  entityId?: string;
  entityType?: string;
  content: string;
  metadata?: Record<string, unknown>;
}) {
  return prisma.aiInsightReport.create({
    data: {
      generatedBy: opts.userId,
      type: opts.type,
      entityId: opts.entityId ?? null,
      entityType: opts.entityType ?? null,
      content: opts.content,
      metadata: opts.metadata ? (opts.metadata as Prisma.InputJsonValue) : Prisma.JsonNull,
    },
  });
}

export async function listInsightReports(userId: string, type?: InsightType) {
  return prisma.aiInsightReport.findMany({
    where: { generatedBy: userId, ...(type ? { type } : {}) },
    orderBy: { createdAt: "desc" },
    take: 20,
  });
}

export function buildConversationHistory(
  messages: Array<{ role: string; content: string }>,
): Array<{ role: "user" | "model"; content: string }> {
  return messages
    .filter((m) => m.role === "user" || m.role === "model")
    .map((m) => ({ role: m.role as "user" | "model", content: m.content }));
}

export function getAgentLabel(agent: AgentName): string {
  switch (agent) {
    case "tasting-intelligence":
      return "Tasting Intelligence";
    case "menu-review":
      return "Menu Review";
    case "ops-assistant":
      return "Ops Assistant";
  }
}
