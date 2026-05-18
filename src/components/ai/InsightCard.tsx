"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp, BarChart3, FileText, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";

interface InsightReport {
  id: string;
  type: string;
  entityId: string | null;
  content: string;
  createdAt: string | Date;
}

const TYPE_CONFIG = {
  tasting_analysis: {
    label: "Tasting Analysis",
    icon: <BarChart3 className="size-3.5" />,
    color: "bg-blue-500/10 text-blue-600 border-blue-200",
  },
  menu_review: {
    label: "Menu Review",
    icon: <FileText className="size-3.5" />,
    color: "bg-violet-500/10 text-violet-600 border-violet-200",
  },
  compliance_summary: {
    label: "Compliance Summary",
    icon: <ShieldCheck className="size-3.5" />,
    color: "bg-emerald-500/10 text-emerald-600 border-emerald-200",
  },
};

export function InsightCard({ report }: { report: InsightReport }) {
  const [expanded, setExpanded] = useState(false);
  const config = TYPE_CONFIG[report.type as keyof typeof TYPE_CONFIG];
  const preview = report.content.slice(0, 180);
  const isLong = report.content.length > 180;

  return (
    <Card className="gap-3">
      <CardContent className="px-4 py-3 space-y-2">
        <div className="flex items-center justify-between gap-2">
          <div className={cn("flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-medium", config?.color)}>
            {config?.icon}
            {config?.label ?? report.type}
          </div>
          <span className="text-[11px] text-muted-foreground">
            {new Date(report.createdAt).toLocaleDateString(undefined, {
              month: "short",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
        </div>

        <div className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
          {expanded ? report.content : preview}
          {!expanded && isLong && <span className="text-muted-foreground">...</span>}
        </div>

        {isLong && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setExpanded(!expanded)}
            className="h-7 px-2 text-xs"
          >
            {expanded ? (
              <>
                <ChevronUp /> Show less
              </>
            ) : (
              <>
                <ChevronDown /> Show full report
              </>
            )}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
