"use client";

import { useState } from "react";
import { AiChatPanel } from "@/components/ai/AiChatPanel";
import { InsightCard } from "@/components/ai/InsightCard";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardTitle } from "@/components/ui/card";
import {
  Bot,
  BarChart3,
  FileText,
  ShieldCheck,
  Loader2,
  Sparkles,
  MessageSquare,
} from "lucide-react";
import { toast } from "sonner";

type InsightType = "tasting_analysis" | "menu_review" | "compliance_summary";

interface InsightReport {
  id: string;
  type: string;
  entityId: string | null;
  content: string;
  createdAt: string;
}

const INSIGHT_TYPES: Array<{
  type: InsightType;
  label: string;
  description: string;
  icon: React.ReactNode;
}> = [
  {
    type: "tasting_analysis",
    label: "Tasting Analysis",
    description: "Rating trends, top dishes, chef performance across locations",
    icon: <BarChart3 className="size-5" />,
  },
  {
    type: "menu_review",
    label: "Menu Review",
    description: "Packet completeness, missing items, pending amendments",
    icon: <FileText className="size-5" />,
  },
  {
    type: "compliance_summary",
    label: "Compliance Summary",
    description: "Submission rates, deadline adherence, temperature compliance",
    icon: <ShieldCheck className="size-5" />,
  },
];

export default function AiAssistantPage() {
  const [activeTab, setActiveTab] = useState<"chat" | "insights">("chat");
  const [generatingInsight, setGeneratingInsight] = useState<InsightType | null>(null);
  const [reports, setReports] = useState<InsightReport[]>([]);
  const [loadedReports, setLoadedReports] = useState(false);

  const generateInsight = async (type: InsightType) => {
    setGeneratingInsight(type);
    try {
      const res = await fetch("/api/ai/insights", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type }),
      });
      if (!res.ok) {
        const errorBody = (await res.json().catch(() => null)) as {
          error?: unknown;
          retryAfterSeconds?: unknown;
        } | null;
        const errorMessage =
          typeof errorBody?.error === "string" ? errorBody.error : "Failed to generate insight";
        const retryMessage =
          res.status === 429 && typeof errorBody?.retryAfterSeconds === "number"
            ? `${errorMessage} (${errorBody.retryAfterSeconds}s)`
            : errorMessage;
        throw new Error(retryMessage);
      }
      const report: InsightReport = await res.json();
      setReports((prev) => [report, ...prev]);
      setActiveTab("insights");
      toast.success("Insight report generated");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to generate insight report";
      console.error("Failed to generate insight report", err);
      toast.error(message);
    } finally {
      setGeneratingInsight(null);
    }
  };

  const loadReports = async () => {
    if (loadedReports) return;
    try {
      const res = await fetch("/api/ai/insights");
      if (res.ok) {
        const data = await res.json();
        setReports(data);
        setLoadedReports(true);
      }
    } catch {
      // silent
    }
  };

  const handleTabChange = (tab: "chat" | "insights") => {
    setActiveTab(tab);
    if (tab === "insights") loadReports();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10">
          <Bot className="size-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">AI Assistant</h1>
          <p className="text-sm text-muted-foreground">
            Multi-agent system powered by Gemini · Tasting Intelligence · Menu Review · Ops
            Assistant
          </p>
        </div>
      </div>

      {/* Tab Bar */}
      <div className="flex gap-1 rounded-lg bg-muted p-1 w-fit">
        <button
          onClick={() => handleTabChange("chat")}
          className={`flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-all ${
            activeTab === "chat"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <MessageSquare className="size-4" />
          Chat
        </button>
        <button
          onClick={() => handleTabChange("insights")}
          className={`flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-all ${
            activeTab === "insights"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Sparkles className="size-4" />
          Insights
          {reports.length > 0 && (
            <span className="ml-1 rounded-full bg-primary/15 px-1.5 py-0.5 text-[10px] font-semibold text-primary">
              {reports.length}
            </span>
          )}
        </button>
      </div>

      {activeTab === "chat" && (
        <div className="rounded-xl border border-border bg-card overflow-hidden h-[600px]">
          <AiChatPanel />
        </div>
      )}

      {activeTab === "insights" && (
        <div className="space-y-6">
          {/* Generate buttons */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {INSIGHT_TYPES.map(({ type, label, description, icon }) => (
              <Card key={type} className="gap-3 hover:border-primary/40 transition-colors">
                <CardContent className="px-4 py-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      {icon}
                    </div>
                    <CardTitle className="text-sm">{label}</CardTitle>
                  </div>
                  <p className="text-xs text-muted-foreground">{description}</p>
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full"
                    onClick={() => generateInsight(type)}
                    disabled={generatingInsight !== null}
                  >
                    {generatingInsight === type ? (
                      <>
                        <Loader2 className="animate-spin" /> Generating...
                      </>
                    ) : (
                      <>
                        <Sparkles /> Generate
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Reports list */}
          {reports.length > 0 ? (
            <div className="space-y-3">
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                Recent Reports
              </h2>
              {reports.map((report) => (
                <InsightCard key={report.id} report={report} />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-center gap-3">
              <Sparkles className="size-8 text-muted-foreground/40" />
              <div>
                <div className="text-sm font-medium">No reports yet</div>
                <div className="text-xs text-muted-foreground mt-1">
                  Generate an insight report above to get started
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
