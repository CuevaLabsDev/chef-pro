import { Type, type FunctionDeclaration, type Tool } from "@google/genai";
import { prisma } from "@/lib/db";
import { hasPermission } from "@/modules/identity-access/service";
import type { EffectiveUserContext } from "@/modules/identity-access/types";

// ─── Tool Declarations (sent to Gemini) ──────────────────────────────────────

const declarations: FunctionDeclaration[] = [
  {
    name: "get_tasting_sessions",
    description:
      "Retrieve tasting sessions with dish ratings and compliance data. Use to analyze chef performance, rating trends, or compliance gaps.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        locationId: { type: Type.STRING, description: "Filter by location ID" },
        dateFrom: { type: Type.STRING, description: "Start date (YYYY-MM-DD)" },
        dateTo: { type: Type.STRING, description: "End date (YYYY-MM-DD)" },
        status: {
          type: Type.STRING,
          description: "Filter by status: draft, submitted, reviewed, locked",
        },
      },
    },
  },
  {
    name: "get_rating_patterns",
    description:
      "Get aggregated average ratings per dish and location. Use to identify top-performing or underperforming dishes.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        locationId: { type: Type.STRING, description: "Filter by location ID" },
        periodId: { type: Type.STRING, description: "Filter by tasting period ID" },
        dateFrom: { type: Type.STRING, description: "Start date (YYYY-MM-DD)" },
        dateTo: { type: Type.STRING, description: "End date (YYYY-MM-DD)" },
      },
    },
  },
  {
    name: "get_compliance_summary",
    description:
      "Get compliance metrics: submission rates, deadline adherence, temperature compliance, and checklist completion rates.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        locationId: { type: Type.STRING, description: "Filter by location ID" },
        dateFrom: { type: Type.STRING, description: "Start date (YYYY-MM-DD)" },
        dateTo: { type: Type.STRING, description: "End date (YYYY-MM-DD)" },
      },
    },
  },
  {
    name: "get_menu_packet",
    description:
      "Retrieve a complete menu signage packet with all items, amendments, and review signatures. Use for detailed menu review.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        packetId: { type: Type.STRING, description: "The packet ID to retrieve" },
      },
      required: ["packetId"],
    },
  },
  {
    name: "get_location_packets",
    description: "List menu signage packets, optionally filtered by location or status.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        locationId: { type: Type.STRING, description: "Filter by location ID" },
        status: {
          type: Type.STRING,
          description:
            "Filter by status: draft, published, for_final_review, finalized_for_service",
        },
        limit: { type: Type.NUMBER, description: "Max results (default 10)" },
      },
    },
  },
  {
    name: "get_dashboard_stats",
    description:
      "Get today's operational overview: session counts, submission rates, recent activity, and pending items.",
    parameters: { type: Type.OBJECT, properties: {} },
  },
  {
    name: "get_locations",
    description: "Get all locations with their campus information.",
    parameters: { type: Type.OBJECT, properties: {} },
  },
  {
    name: "get_operational_audits",
    description:
      "Retrieve AI-assisted closing verification and temperature log audits, including potential issues that need manager review.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        locationId: { type: Type.STRING, description: "Filter by location ID" },
        dateFrom: { type: Type.STRING, description: "Start date (YYYY-MM-DD)" },
        dateTo: { type: Type.STRING, description: "End date (YYYY-MM-DD)" },
        type: { type: Type.STRING, description: "Filter by closing or temperature_log" },
        status: { type: Type.STRING, description: "Filter by audit status" },
      },
    },
  },
  {
    name: "get_operational_risks",
    description:
      "Summarize current AI-assisted operational risks from tastings, closing photos, temperature logs, and open compliance issues.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        locationId: { type: Type.STRING, description: "Filter by location ID" },
        dateFrom: { type: Type.STRING, description: "Start date (YYYY-MM-DD)" },
        dateTo: { type: Type.STRING, description: "End date (YYYY-MM-DD)" },
      },
    },
  },
];

export const CHEFPRO_TOOLS: Tool[] = [{ functionDeclarations: declarations }];

// ─── Tool Implementations ────────────────────────────────────────────────────

type ToolArgs = Record<string, unknown>;
export interface ToolContext {
  user: EffectiveUserContext;
}

export async function executeTool(
  name: string,
  args: ToolArgs,
  context: ToolContext
): Promise<unknown> {
  switch (name) {
    case "get_tasting_sessions":
      return getTastingSessions(args, context);
    case "get_rating_patterns":
      return getRatingPatterns(args, context);
    case "get_compliance_summary":
      return getComplianceSummary(args, context);
    case "get_menu_packet":
      return getMenuPacket(args, context);
    case "get_location_packets":
      return getLocationPackets(args, context);
    case "get_dashboard_stats":
      return getDashboardStats(context);
    case "get_locations":
      return getLocations(context);
    case "get_operational_audits":
      return getOperationalAudits(args, context);
    case "get_operational_risks":
      return getOperationalRisks(args, context);
    default:
      return { error: `Unknown tool: ${name}` };
  }
}

function canViewAllLocations(context: ToolContext) {
  return (
    context.user.role === "fte" ||
    hasPermission(context.user, "config.manage") ||
    hasPermission(context.user, "compliance.manage")
  );
}

function getScopedLocationFilter(args: ToolArgs, context: ToolContext) {
  const requested = typeof args.locationId === "string" ? args.locationId : undefined;
  if (canViewAllLocations(context)) return requested ? { equals: requested } : undefined;
  if (requested && !context.user.locationIds.includes(requested)) return { in: ["__forbidden__"] };
  return { in: context.user.locationIds.length > 0 ? context.user.locationIds : ["__none__"] };
}

async function getTastingSessions(args: ToolArgs, context: ToolContext) {
  const where: Record<string, unknown> = {};
  const locationFilter = getScopedLocationFilter(args, context);
  if (locationFilter) where.locationId = locationFilter;
  if (args.status) where.status = args.status;
  if (args.dateFrom || args.dateTo) {
    where.date = {
      ...(args.dateFrom ? { gte: new Date(args.dateFrom as string) } : {}),
      ...(args.dateTo ? { lte: new Date(args.dateTo as string) } : {}),
    };
  }

  const sessions = await prisma.tastingSession.findMany({
    where,
    orderBy: { date: "desc" },
    take: 50,
    include: {
      location: { select: { name: true } },
      tastingPeriod: { select: { name: true } },
      chef: { select: { name: true } },
      items: {
        include: {
          ratings: {
            include: { question: { select: { label: true } } },
          },
        },
      },
    },
  });

  return sessions.map((s) => ({
    id: s.id,
    date: s.date,
    status: s.status,
    location: s.location.name,
    period: s.tastingPeriod.name,
    chef: s.chef?.name ?? "Unknown",
    checklistComplete: s.checklistMenuPackage && s.checklistDigitalSignage && s.checklistFoodCards,
    itemCount: s.items.length,
    items: s.items.map((item) => ({
      dishName: item.dishName,
      temperatureCompliance: item.temperatureCompliance,
      adjustmentsNeeded: item.adjustmentsNeeded,
      ratings: item.ratings.map((r) => ({
        question: r.question.label,
        value: r.numericValue,
      })),
    })),
  }));
}

async function getRatingPatterns(args: ToolArgs, context: ToolContext) {
  const where: Record<string, unknown> = {};
  const locationFilter = getScopedLocationFilter(args, context);
  if (locationFilter) where.session = { locationId: locationFilter };
  if (args.dateFrom || args.dateTo) {
    where.session = {
      ...(where.session as object),
      date: {
        ...(args.dateFrom ? { gte: new Date(args.dateFrom as string) } : {}),
        ...(args.dateTo ? { lte: new Date(args.dateTo as string) } : {}),
      },
    };
  }

  const items = await prisma.tastingItem.findMany({
    where,
    include: {
      ratings: { include: { question: { select: { label: true } } } },
      session: {
        select: {
          date: true,
          location: { select: { name: true } },
          tastingPeriod: { select: { name: true } },
        },
      },
    },
    take: 500,
  });

  const dishMap = new Map<string, { total: number; count: number; location: string }>();
  for (const item of items) {
    const numericRatings = item.ratings.filter((r) => r.numericValue !== null);
    if (numericRatings.length === 0) continue;
    const avg =
      numericRatings.reduce((s, r) => s + (r.numericValue ?? 0), 0) / numericRatings.length;
    const key = `${item.dishName}|${item.session.location.name}`;
    const existing = dishMap.get(key);
    if (existing) {
      existing.total += avg;
      existing.count += 1;
    } else {
      dishMap.set(key, { total: avg, count: 1, location: item.session.location.name });
    }
  }

  return Array.from(dishMap.entries())
    .map(([key, v]) => ({
      dishName: key.split("|")[0],
      location: v.location,
      avgRating: Math.round((v.total / v.count) * 100) / 100,
      sampleCount: v.count,
    }))
    .sort((a, b) => b.avgRating - a.avgRating);
}

async function getComplianceSummary(args: ToolArgs, context: ToolContext) {
  const where: Record<string, unknown> = {};
  const locationFilter = getScopedLocationFilter(args, context);
  if (locationFilter) where.locationId = locationFilter;
  if (args.dateFrom || args.dateTo) {
    where.date = {
      ...(args.dateFrom ? { gte: new Date(args.dateFrom as string) } : {}),
      ...(args.dateTo ? { lte: new Date(args.dateTo as string) } : {}),
    };
  }

  const sessions = await prisma.tastingSession.findMany({
    where,
    include: {
      location: { select: { name: true } },
      items: { select: { temperatureCompliance: true } },
    },
  });

  const total = sessions.length;
  const submitted = sessions.filter((s) => s.status !== "draft").length;
  const checklistComplete = sessions.filter(
    (s) => s.checklistMenuPackage && s.checklistDigitalSignage && s.checklistFoodCards
  ).length;
  const allItems = sessions.flatMap((s) => s.items);
  const tempCompliant = allItems.filter((i) => i.temperatureCompliance === "compliant").length;

  const byLocation = new Map<string, { total: number; submitted: number }>();
  for (const s of sessions) {
    const loc = s.location.name;
    const existing = byLocation.get(loc) ?? { total: 0, submitted: 0 };
    existing.total += 1;
    if (s.status !== "draft") existing.submitted += 1;
    byLocation.set(loc, existing);
  }

  return {
    totalSessions: total,
    submittedSessions: submitted,
    submissionRate: total > 0 ? Math.round((submitted / total) * 100) : 0,
    checklistCompletionRate: total > 0 ? Math.round((checklistComplete / total) * 100) : 0,
    temperatureComplianceRate:
      allItems.length > 0 ? Math.round((tempCompliant / allItems.length) * 100) : 0,
    byLocation: Array.from(byLocation.entries()).map(([name, v]) => ({
      location: name,
      total: v.total,
      submitted: v.submitted,
      submissionRate: v.total > 0 ? Math.round((v.submitted / v.total) * 100) : 0,
    })),
  };
}

async function getMenuPacket(args: ToolArgs, context: ToolContext) {
  const packet = await prisma.menuSignagePacket.findUnique({
    where: { id: args.packetId as string },
    include: {
      location: { select: { name: true } },
      items: { orderBy: [{ category: "asc" }, { sortOrder: "asc" }] },
      amendments: {
        include: { requestedBy: { select: { name: true } } },
        orderBy: { createdAt: "desc" },
      },
      reviewSignatures: {
        include: { signer: { select: { name: true, role: true } } },
      },
    },
  });

  if (!packet) return { error: "Packet not found" };
  if (!canViewAllLocations(context) && !context.user.locationIds.includes(packet.locationId)) {
    return { error: "Packet not found" };
  }

  const itemsByCategory = packet.items.reduce(
    (acc, item) => {
      if (!acc[item.category]) acc[item.category] = [];
      acc[item.category].push({
        name: item.itemName,
        ingredients: item.ingredients,
        allergenTags: item.allergenTags,
        dietTags: item.dietTags,
        isReadyForService: item.isReadyForService,
      });
      return acc;
    },
    {} as Record<string, unknown[]>
  );

  return {
    id: packet.id,
    meal: packet.meal,
    date: packet.date,
    status: packet.status,
    location: packet.location.name,
    totalItems: packet.items.length,
    itemsByCategory,
    pendingAmendments: packet.amendments.filter((a) => a.status === "pending").length,
    amendments: packet.amendments.map((a) => ({
      type: a.type,
      reason: a.reason,
      description: a.description,
      status: a.status,
      requestedBy: a.requestedBy.name,
    })),
    reviewSignatures: packet.reviewSignatures.map((s) => ({
      signer: s.signer.name,
      role: s.signer.role,
      signedAt: s.createdAt,
    })),
  };
}

async function getLocationPackets(args: ToolArgs, context: ToolContext) {
  const where: Record<string, unknown> = {};
  const locationFilter = getScopedLocationFilter(args, context);
  if (locationFilter) where.locationId = locationFilter;
  if (args.status) where.status = args.status;

  const packets = await prisma.menuSignagePacket.findMany({
    where,
    orderBy: { date: "desc" },
    take: (args.limit as number) ?? 10,
    include: {
      location: { select: { name: true } },
      _count: { select: { items: true, amendments: true } },
    },
  });

  return packets.map((p) => ({
    id: p.id,
    meal: p.meal,
    date: p.date,
    status: p.status,
    location: p.location.name,
    itemCount: p._count.items,
    amendmentCount: p._count.amendments,
  }));
}

async function getDashboardStats(context: ToolContext) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const locationFilter = getScopedLocationFilter({}, context);
  const locationWhere = locationFilter ? { locationId: locationFilter } : {};

  const [totalSessions, submittedToday, pendingPackets, recentAmendments] = await Promise.all([
    prisma.tastingSession.count({
      where: { ...locationWhere, date: { gte: today, lt: tomorrow } },
    }),
    prisma.tastingSession.count({
      where: { ...locationWhere, date: { gte: today, lt: tomorrow }, status: { not: "draft" } },
    }),
    prisma.menuSignagePacket.count({
      where: { ...locationWhere, status: { in: ["draft", "published"] } },
    }),
    prisma.packetAmendment.count({
      where: {
        status: "pending",
        ...(locationFilter ? { packet: { locationId: locationFilter } } : {}),
      },
    }),
  ]);

  return {
    today: today.toISOString().split("T")[0],
    tastingSessionsToday: totalSessions,
    submittedToday,
    pendingPackets,
    pendingAmendments: recentAmendments,
  };
}

async function getLocations(context: ToolContext) {
  const locationFilter = getScopedLocationFilter({}, context);
  const locations = await prisma.location.findMany({
    where: locationFilter ? { id: locationFilter } : undefined,
    include: { building: { include: { campus: { select: { name: true } } } } },
    orderBy: { name: "asc" },
  });

  return locations.map((l) => ({
    id: l.id,
    name: l.name,
    building: l.building?.name ?? null,
    campus: l.building?.campus.name ?? null,
  }));
}

async function getOperationalAudits(args: ToolArgs, context: ToolContext) {
  if (
    !hasPermission(context.user, "compliance.view") &&
    !hasPermission(context.user, "compliance.manage")
  ) {
    return { error: "Not authorized to view compliance audits" };
  }

  const locationFilter = getScopedLocationFilter(args, context);
  const where: Record<string, unknown> = {};
  if (locationFilter) where.locationId = locationFilter;
  if (args.type) where.type = args.type;
  if (args.status) where.status = args.status;
  if (args.dateFrom || args.dateTo) {
    where.auditDate = {
      ...(args.dateFrom ? { gte: new Date(args.dateFrom as string) } : {}),
      ...(args.dateTo ? { lte: new Date(args.dateTo as string) } : {}),
    };
  }

  const audits = await prisma.operationalAudit.findMany({
    where,
    orderBy: { auditDate: "desc" },
    take: 30,
    include: {
      location: { select: { name: true } },
      submittedBy: { select: { name: true } },
      closingPhotos: { select: { category: true, cleanlinessScore: true, confidence: true } },
      temperatureLog: {
        select: {
          entries: {
            select: {
              stationName: true,
              itemName: true,
              holdingType: true,
              temperatureF: true,
              complianceStatus: true,
              confidence: true,
            },
            take: 20,
          },
        },
      },
      issues: {
        where: { status: { in: ["open", "acknowledged"] } },
        select: { severity: true, type: true, title: true, confidence: true },
        take: 20,
      },
    },
  });

  return audits.map((audit) => ({
    id: audit.id,
    type: audit.type,
    date: audit.auditDate,
    status: audit.status,
    location: audit.location.name,
    submittedBy: audit.submittedBy.name,
    summary: audit.summary,
    needsHumanReview: audit.needsHumanReview,
    closingPhotoCount: audit.closingPhotos.length,
    temperatureEntryCount: audit.temperatureLog?.entries.length ?? 0,
    openIssueCount: audit.issues.length,
    issues: audit.issues,
  }));
}

async function getOperationalRisks(args: ToolArgs, context: ToolContext) {
  if (
    !hasPermission(context.user, "compliance.view") &&
    !hasPermission(context.user, "compliance.manage")
  ) {
    return { error: "Not authorized to view operational risks" };
  }

  const today = new Date();
  const dateFrom = args.dateFrom ? new Date(args.dateFrom as string) : today;
  const dateTo = args.dateTo ? new Date(args.dateTo as string) : today;
  const locationFilter = getScopedLocationFilter(args, context);

  const [audits, issues, tastingCompliance] = await Promise.all([
    prisma.operationalAudit.findMany({
      where: {
        ...(locationFilter ? { locationId: locationFilter } : {}),
        auditDate: { gte: dateFrom, lte: dateTo },
      },
      include: { location: { select: { name: true } } },
      take: 50,
    }),
    prisma.complianceIssue.findMany({
      where: {
        status: { in: ["open", "acknowledged"] },
        audit: {
          ...(locationFilter ? { locationId: locationFilter } : {}),
          auditDate: { gte: dateFrom, lte: dateTo },
        },
      },
      include: { audit: { include: { location: { select: { name: true } } } } },
      orderBy: [{ severity: "desc" }, { createdAt: "desc" }],
      take: 30,
    }),
    getComplianceSummary(args, context),
  ]);

  return {
    dateFrom: dateFrom.toISOString().split("T")[0],
    dateTo: dateTo.toISOString().split("T")[0],
    auditCount: audits.length,
    auditsNeedingReview: audits.filter((a) => a.needsHumanReview).length,
    openIssues: issues.map((issue) => ({
      severity: issue.severity,
      type: issue.type,
      title: issue.title,
      location: issue.audit.location.name,
      auditType: issue.audit.type,
      confidence: issue.confidence,
    })),
    tastingCompliance,
  };
}
