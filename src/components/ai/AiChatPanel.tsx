"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Send, Bot, User, Loader2, Zap, BarChart3, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

interface Message {
  role: "user" | "model";
  content: string;
  agentUsed?: string;
  streaming?: boolean;
}

interface StreamEvent {
  type: "session" | "agent" | "text" | "tool_calls" | "done" | "error";
  sessionId?: string;
  agent?: string;
  text?: string;
  tools?: string[];
  agentUsed?: string;
  error?: string;
}

const AGENT_LABELS: Record<string, string> = {
  "tasting-intelligence": "Tasting Intelligence",
  "menu-review": "Menu Review",
  "ops-assistant": "Ops Assistant",
};

const AGENT_ICONS: Record<string, React.ReactNode> = {
  "tasting-intelligence": <BarChart3 className="size-3" />,
  "menu-review": <FileText className="size-3" />,
  "ops-assistant": <Zap className="size-3" />,
};

const SUGGESTED_PROMPTS = [
  "Give me today's operational overview",
  "How did tasting sessions perform this week?",
  "Review the latest menu packet",
];

export function AiChatPanel({ initialSessionId }: { initialSessionId?: string }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(initialSessionId ?? null);
  const [activeAgent, setActiveAgent] = useState<string | null>(null);
  const [toolsInProgress, setToolsInProgress] = useState<string[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0 });
  }, []);

  useEffect(() => {
    if (messages.length > 0) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  const sendMessage = useCallback(
    async (text: string) => {
      if (!text.trim() || isStreaming) return;
      setInput("");
      setIsStreaming(true);
      setActiveAgent(null);
      setToolsInProgress([]);

      const userMessage: Message = { role: "user", content: text };
      setMessages((prev) => [...prev, userMessage]);

      const assistantMessage: Message = { role: "model", content: "", streaming: true };
      setMessages((prev) => [...prev, assistantMessage]);

      try {
        const res = await fetch("/api/ai/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: text,
            ...(sessionId ? { sessionId } : {}),
          }),
        });

        if (!res.ok) {
          let detail = `Request failed (${res.status})`;
          try {
            const body = (await res.json()) as { error?: string | { message?: string } };
            if (typeof body.error === "string") detail = body.error;
            else if (res.status === 403) detail = "You don't have access to the AI assistant.";
            else if (res.status === 401) detail = "Please sign in again.";
          } catch {
            // response body wasn't JSON
          }
          throw new Error(detail);
        }

        const reader = res.body!.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";

          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            try {
              const event: StreamEvent = JSON.parse(line.slice(6));
              switch (event.type) {
                case "session":
                  setSessionId(event.sessionId!);
                  break;
                case "agent":
                  setActiveAgent(event.agent!);
                  break;
                case "text":
                  setMessages((prev) => {
                    const updated = [...prev];
                    const last = updated[updated.length - 1];
                    if (last?.role === "model") {
                      updated[updated.length - 1] = {
                        ...last,
                        content: last.content + event.text!,
                      };
                    }
                    return updated;
                  });
                  setToolsInProgress([]);
                  break;
                case "tool_calls":
                  setToolsInProgress(event.tools ?? []);
                  break;
                case "done":
                  setMessages((prev) => {
                    const updated = [...prev];
                    const last = updated[updated.length - 1];
                    if (last?.role === "model") {
                      updated[updated.length - 1] = {
                        ...last,
                        streaming: false,
                        agentUsed: event.agentUsed,
                      };
                    }
                    return updated;
                  });
                  break;
                case "error":
                  setMessages((prev) => {
                    const updated = [...prev];
                    const last = updated[updated.length - 1];
                    if (last?.role === "model") {
                      updated[updated.length - 1] = {
                        ...last,
                        content: `Error: ${event.error}`,
                        streaming: false,
                      };
                    }
                    return updated;
                  });
                  break;
              }
            } catch {
              // malformed JSON line, skip
            }
          }
        }
      } catch (err) {
        const message =
          err instanceof Error && err.message
            ? err.message
            : "Something went wrong. Please try again.";
        setMessages((prev) => {
          const updated = [...prev];
          const last = updated[updated.length - 1];
          if (last?.role === "model") {
            updated[updated.length - 1] = {
              ...last,
              content: message,
              streaming: false,
            };
          }
          return updated;
        });
      } finally {
        setIsStreaming(false);
        setActiveAgent(null);
        setToolsInProgress([]);
        textareaRef.current?.focus();
      }
    },
    [isStreaming, sessionId]
  );

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-border px-4 py-3">
        <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10">
          <Bot className="size-4 text-primary" />
        </div>
        <div>
          <div className="text-sm font-semibold">ChefPro AI Assistant</div>
          <div className="text-xs text-muted-foreground">
            {isStreaming && activeAgent ? (
              <span className="flex items-center gap-1">
                <Loader2 className="size-3 animate-spin" />
                {AGENT_LABELS[activeAgent] ?? "Thinking"} agent is working...
                {toolsInProgress.length > 0 && (
                  <span className="text-primary"> · querying {toolsInProgress.join(", ")}</span>
                )}
              </span>
            ) : (
              "Powered by Gemini · Multi-agent system"
            )}
          </div>
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {messages.length === 0 && (
          <div className="flex flex-col items-center gap-6 py-8 text-center">
            <div className="flex size-16 items-center justify-center rounded-2xl bg-primary/10">
              <Bot className="size-8 text-primary" />
            </div>
            <div>
              <div className="text-lg font-semibold">ChefPro Ops AI</div>
              <div className="mt-1 text-sm text-muted-foreground max-w-xs">
                Ask me about tasting performance, menu packets, compliance metrics, or get a daily
                operations overview.
              </div>
            </div>
            <div className="grid grid-cols-1 gap-2 w-full max-w-sm">
              {SUGGESTED_PROMPTS.map((p) => (
                <button
                  key={p}
                  onClick={() => sendMessage(p)}
                  className="rounded-lg border border-border bg-card px-3 py-2 text-left text-xs hover:bg-accent transition-colors"
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div
            key={i}
            className={cn("flex gap-3", msg.role === "user" ? "justify-end" : "justify-start")}
          >
            {msg.role === "model" && (
              <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/10 mt-0.5">
                <Bot className="size-3.5 text-primary" />
              </div>
            )}

            <div
              className={cn(
                "max-w-[80%] rounded-xl px-4 py-2.5 text-sm",
                msg.role === "user"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-foreground"
              )}
            >
              {msg.role === "model" && msg.content === "" && msg.streaming ? (
                <div className="flex gap-1 items-center py-1">
                  <span className="size-1.5 rounded-full bg-muted-foreground animate-bounce [animation-delay:0ms]" />
                  <span className="size-1.5 rounded-full bg-muted-foreground animate-bounce [animation-delay:150ms]" />
                  <span className="size-1.5 rounded-full bg-muted-foreground animate-bounce [animation-delay:300ms]" />
                </div>
              ) : (
                <MessageContent content={msg.content} />
              )}

              {msg.role === "model" && !msg.streaming && msg.agentUsed && (
                <div className="mt-2 flex items-center gap-1 text-[10px] text-muted-foreground border-t border-border/50 pt-2">
                  {AGENT_ICONS[msg.agentUsed]}
                  <span>{AGENT_LABELS[msg.agentUsed] ?? msg.agentUsed} Agent</span>
                </div>
              )}
            </div>

            {msg.role === "user" && (
              <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-secondary mt-0.5">
                <User className="size-3.5" />
              </div>
            )}
          </div>
        ))}

        {messages.length > 0 && <div ref={bottomRef} />}
      </div>

      {/* Input */}
      <div className="border-t border-border px-4 py-3">
        <div className="flex flex-col gap-2">
          <div className="w-full">
            <Textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask about tasting performance, menu packets, compliance..."
              className="min-h-[120px] max-h-56 resize-none text-sm"
              rows={4}
              disabled={isStreaming}
            />
          </div>
          <div className="flex justify-end">
            <Button
              onClick={() => sendMessage(input)}
              disabled={!input.trim() || isStreaming}
              size="icon"
              className="shrink-0"
            >
              {isStreaming ? <Loader2 className="animate-spin" /> : <Send />}
            </Button>
          </div>
        </div>
        <div className="mt-1.5 text-[10px] text-muted-foreground text-center">
          Enter to send · Shift+Enter for new line
        </div>
      </div>
    </div>
  );
}

function MessageContent({ content }: { content: string }) {
  const lines = content.split("\n");
  return (
    <div className="space-y-1 whitespace-pre-wrap leading-relaxed">
      {lines.map((line, i) => {
        if (line.startsWith("## ")) {
          return (
            <div key={i} className="font-semibold text-sm mt-2 first:mt-0">
              {line.slice(3)}
            </div>
          );
        }
        if (line.startsWith("### ")) {
          return (
            <div key={i} className="font-medium text-xs mt-1.5 first:mt-0">
              {line.slice(4)}
            </div>
          );
        }
        if (line.startsWith("**") && line.endsWith("**")) {
          return (
            <div key={i} className="font-semibold">
              {line.slice(2, -2)}
            </div>
          );
        }
        if (line.startsWith("- ") || line.startsWith("• ")) {
          return (
            <div key={i} className="flex gap-1.5">
              <span className="mt-1 shrink-0 size-1 rounded-full bg-current opacity-60" />
              <span>{line.slice(2)}</span>
            </div>
          );
        }
        return <div key={i}>{line}</div>;
      })}
    </div>
  );
}
