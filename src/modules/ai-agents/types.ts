export type AgentRole = "user" | "model";

export type AgentName = "tasting-intelligence" | "menu-review" | "ops-assistant";

export interface ChatMessage {
  role: AgentRole;
  content: string;
  metadata?: Record<string, unknown>;
  createdAt?: Date;
}

export interface ChatSession {
  id: string;
  userId: string;
  title: string | null;
  createdAt: Date;
  updatedAt: Date;
  messages: ChatMessage[];
}

export interface InsightReport {
  id: string;
  type: InsightType;
  entityId: string | null;
  entityType: string | null;
  content: string;
  metadata: Record<string, unknown> | null;
  generatedBy: string;
  createdAt: Date;
}

export type InsightType = "tasting_analysis" | "menu_review" | "compliance_summary";

export interface GenerateChatOptions {
  userId: string;
  sessionId: string | null;
  message: string;
  locationIds?: string[];
}

export interface GenerateInsightOptions {
  userId: string;
  type: InsightType;
  entityId?: string;
  locationIds?: string[];
}
