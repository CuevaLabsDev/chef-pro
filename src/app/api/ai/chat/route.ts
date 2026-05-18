import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/modules/identity-access/middleware";
import {
  runOrchestratorStream,
  createChatSession,
  getChatSession,
  appendMessages,
  buildConversationHistory,
  generateSessionTitle,
} from "@/modules/ai-agents";
import { z } from "zod";

const chatRequestSchema = z.object({
  message: z.string().min(1).max(2000),
  sessionId: z.string().optional(),
});

export async function POST(req: NextRequest) {
  const { error, user } = await requireAuth();
  if (error || !user) return error!;

  if (!["fte", "ops"].includes(user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = chatRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { message, sessionId: incomingSessionId } = parsed.data;

  let sessionId = incomingSessionId ?? null;
  let conversationHistory: Array<{ role: "user" | "model"; content: string }> = [];

  if (sessionId) {
    const session = await getChatSession(sessionId, user.id);
    if (!session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }
    conversationHistory = buildConversationHistory(session.messages);
  } else {
    const title = await generateSessionTitle(message);
    const session = await createChatSession(user.id, title);
    sessionId = session.id;
  }

  const encoder = new TextEncoder();
  let agentUsed = "ops-assistant";
  let fullResponse = "";

  const stream = new ReadableStream({
    async start(controller) {
      try {
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ type: "session", sessionId })}\n\n`),
        );

        for await (const chunk of runOrchestratorStream(message, conversationHistory)) {
          controller.enqueue(encoder.encode(chunk));

          try {
            const jsonStr = chunk.replace(/^data: /, "").trim();
            const parsed = JSON.parse(jsonStr);
            if (parsed.type === "text") fullResponse += parsed.text;
            if (parsed.type === "done") agentUsed = parsed.agentUsed;
          } catch {
            // not all chunks are JSON — ignore parse errors here
          }
        }

        await appendMessages(sessionId!, [
          { role: "user", content: message },
          {
            role: "model",
            content: fullResponse,
            metadata: { agentUsed },
          },
        ]);
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : "AI service error";
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ type: "error", error: errorMsg })}\n\n`),
        );
      } finally {
        controller.close();
      }
    },
  });

  return new NextResponse(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
