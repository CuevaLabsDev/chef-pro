/**
 * Demo seed data for ChefPro hackathon demo.
 * MPK campus: MPK-21 (existing), MPK-20 + MPK-22 (new).
 * Idempotent — safe to re-run against an existing DB.
 */
import type { PrismaClient } from "@prisma/client";
import { Prisma } from "@prisma/client";

// ─── Constants ────────────────────────────────────────────────────────────────

const DEMO_PERIOD_START = new Date("2026-04-19T12:00:00.000Z");
const DAYS = 30;

function demoDay(index: number): Date {
  const d = new Date(DEMO_PERIOD_START);
  d.setUTCDate(d.getUTCDate() + index);
  return d;
}

function isWeekday(d: Date) {
  const day = d.getUTCDay();
  return day >= 1 && day <= 5;
}

// Deterministic pseudo-random based on seed integer
function seededRandom(seed: number): number {
  const x = Math.sin(seed + 1) * 10000;
  return x - Math.floor(x);
}

function getRating(dayNumber: number, itemSeed: number): number {
  let base: number;
  let slope: number;
  if (dayNumber <= 10) {
    base = 2.5;
    slope = 0.04;
  } else if (dayNumber <= 20) {
    base = 3.3;
    slope = 0.05;
  } else {
    base = 4.0;
    slope = 0.04;
  }
  const jitter = (seededRandom(dayNumber * 37 + itemSeed) - 0.5) * 0.6;
  return Math.min(5, Math.max(1, base + slope * (dayNumber - 1) + jitter));
}

function getTempCompliance(dayNumber: number, itemSeed: number): string {
  const r = seededRandom(dayNumber * 13 + itemSeed + 100);
  if (dayNumber <= 10) {
    if (r < 0.4) return "not_checked";
    if (r < 0.8) return "compliant";
    return "non_compliant";
  } else if (dayNumber <= 20) {
    if (r < 0.2) return "not_checked";
    if (r < 0.9) return "compliant";
    return "non_compliant";
  } else {
    if (r < 0.05) return "not_checked";
    if (r < 0.98) return "compliant";
    return "non_compliant";
  }
}

function getAdjustmentsNeeded(dayNumber: number, itemSeed: number): string | null {
  const r = seededRandom(dayNumber * 7 + itemSeed + 200);
  const threshold = dayNumber <= 10 ? 0.5 : dayNumber <= 20 ? 0.25 : 0.1;
  if (r >= threshold) return null;
  const msgs = [
    "Season more aggressively",
    "Sauce too thin — needs reduction",
    "Temp check failed — reheated",
    "Portion size inconsistent",
    "Plating needs attention",
    "Hold temp borderline — monitor closely",
  ];
  return msgs[Math.floor(r * msgs.length)];
}

function getChecklistComplete(dayNumber: number, itemSeed: number): boolean {
  const r = seededRandom(dayNumber * 11 + itemSeed + 300);
  const passRate = dayNumber <= 10 ? 0.6 : dayNumber <= 20 ? 0.8 : 1.0;
  return r < passRate;
}

// ─── Dish name pools ──────────────────────────────────────────────────────────

const DISHES = {
  entree: [
    "Herb-Roasted Chicken Quarter",
    "Slow-Braised Beef Short Rib",
    "Citrus-Glazed Salmon",
    "Chicken Marsala",
    "Grilled NY Strip",
    "Beef Burgundy Stew",
    "Pork Tenderloin with Apple Jus",
  ],
  vegetarian_entree: [
    "Roasted Portobello & Quinoa Stack",
    "Eggplant Parmesan",
    "Stuffed Bell Pepper (Lentil & Rice)",
    "Butternut Squash Lasagna",
    "Chickpea Tikka Masala",
  ],
  vegan_entree: [
    "Moroccan Spiced Chickpeas",
    "Black Bean & Sweet Potato Burrito Bowl",
    "Thai Basil Tofu Stir-Fry",
  ],
  starches: [
    "Garlic Mashed Potatoes",
    "Steamed Jasmine Rice",
    "Penne Marinara",
    "Mac & Cheese",
    "Roasted Red Potatoes",
  ],
  vegetables: ["Roasted Seasonal Medley", "Steamed Broccoli", "Glazed Carrots", "Sautéed Spinach"],
};

// Simple dishes for secondary locations
const SECONDARY_DISHES: Record<string, string[]> = {
  Metropolitan: [
    "Chicken Piccata",
    "Pan-Seared Tilapia",
    "Spaghetti Bolognese",
    "Veggie Fried Rice",
    "Lemon Herb Falafel Wrap",
  ],
  Hawker: [
    "Grilled Chicken Breast",
    "Smash Burgers",
    "Turkey Meatball Sub",
    "Black Bean Burger",
    "Kimchi Fried Rice",
  ],
  Urban: [
    "Avocado Toast with Poached Egg",
    "Breakfast Burrito",
    "Veggie Quiche",
    "Greek Yogurt Parfait",
    "Blueberry Scone",
  ],
};

// ─── Main export ──────────────────────────────────────────────────────────────

export async function seedDemoData(prisma: PrismaClient) {
  console.log("\n  --- Demo Data Seeding ---");

  // ── Resolve existing users ────────────────────────────────────────────────
  const users = await prisma.user.findMany({
    where: {
      email: {
        in: [
          "exec.chef@chefpro.demo",
          "chef@chefpro.demo",
          "fte.chef@chefpro.demo",
          "kitchen.manager@chefpro.demo",
          "kitchen@chefpro.demo",
          "ops@chefpro.demo",
          "fte@chefpro.demo",
          "assistant.ops@chefpro.demo",
          "foh@chefpro.demo",
        ],
      },
    },
    select: { id: true, email: true },
  });
  const uid = (email: string) => {
    const u = users.find((u) => u.email === email);
    if (!u) throw new Error(`User not found: ${email}`);
    return u.id;
  };

  // ── Step 1: TastingPeriods ────────────────────────────────────────────────
  const periods = await Promise.all([
    prisma.tastingPeriod.upsert({
      where: { name: "Breakfast" },
      update: { sortOrder: 1, isActive: true },
      create: { name: "Breakfast", sortOrder: 1 },
    }),
    prisma.tastingPeriod.upsert({
      where: { name: "Lunch" },
      update: { sortOrder: 2, isActive: true },
      create: { name: "Lunch", sortOrder: 2 },
    }),
    prisma.tastingPeriod.upsert({
      where: { name: "Dinner" },
      update: { sortOrder: 3, isActive: true },
      create: { name: "Dinner", sortOrder: 3 },
    }),
  ]);
  const periodId: Record<string, string> = {};
  for (const p of periods) periodId[p.name] = p.id;
  console.log("  Periods: Breakfast, Lunch, Dinner");

  // ── Step 2: Campus / Buildings / Locations ───────────────────────────────
  const campus = await prisma.campus.upsert({
    where: { name: "MPK" },
    update: { isActive: true },
    create: { name: "MPK" },
  });

  const [bldg21, bldg20, bldg22] = await Promise.all([
    prisma.building.upsert({
      where: { campusId_name: { campusId: campus.id, name: "MPK-21" } },
      update: { isActive: true },
      create: { campusId: campus.id, name: "MPK-21" },
    }),
    prisma.building.upsert({
      where: { campusId_name: { campusId: campus.id, name: "MPK-20" } },
      update: { isActive: true },
      create: { campusId: campus.id, name: "MPK-20" },
    }),
    prisma.building.upsert({
      where: { campusId_name: { campusId: campus.id, name: "MPK-22" } },
      update: { isActive: true },
      create: { campusId: campus.id, name: "MPK-22" },
    }),
  ]);

  const locationDefs = [
    // MPK-21 (existing — upsert is a no-op, just resolves IDs)
    { name: "Urban", buildingId: bldg21.id },
    { name: "Late Harvest", buildingId: bldg21.id },
    { name: "Mezze", buildingId: bldg21.id },
    // MPK-20 (new)
    {
      name: "Full Circle",
      buildingId: bldg20.id,
      description: "All-day dining, breakfast + lunch + dinner",
    },
    { name: "Next MPK-20", buildingId: bldg20.id, description: "Lunch + dinner, weekdays" },
    {
      name: "Hawker",
      buildingId: bldg20.id,
      description: "Lunch, weekdays — street food-inspired",
    },
    // MPK-22 (new)
    { name: "Bento", buildingId: bldg22.id, description: "Lunch + dinner, weekdays" },
    { name: "Next MPK-22", buildingId: bldg22.id, description: "Lunch + dinner, weekdays" },
    { name: "Biryani", buildingId: bldg22.id, description: "Lunch, weekdays" },
    { name: "Metropolitan", buildingId: bldg22.id, description: "Breakfast + lunch + dinner" },
  ];

  const locationId: Record<string, string> = {};
  for (const def of locationDefs) {
    const loc = await prisma.location.upsert({
      where: { name: def.name },
      update: { buildingId: def.buildingId, isActive: true },
      create: { name: def.name, buildingId: def.buildingId, description: def.description ?? null },
    });
    locationId[def.name] = loc.id;
  }
  console.log(`  Locations: ${Object.keys(locationId).join(", ")}`);

  // ── Step 3: UserLocationAccess ────────────────────────────────────────────
  const allLocationIds = Object.values(locationId);
  const userLocationMap: Array<{ email: string; locations: string[] }> = [
    { email: "exec.chef@chefpro.demo", locations: ["Full Circle", "Next MPK-20", "Hawker"] },
    { email: "chef@chefpro.demo", locations: ["Bento", "Next MPK-22", "Biryani", "Metropolitan"] },
    { email: "kitchen.manager@chefpro.demo", locations: ["Urban", "Late Harvest", "Mezze"] },
    { email: "fte.chef@chefpro.demo", locations: Object.keys(locationId) },
    { email: "kitchen@chefpro.demo", locations: Object.keys(locationId) },
    { email: "ops@chefpro.demo", locations: Object.keys(locationId) },
    { email: "fte@chefpro.demo", locations: Object.keys(locationId) },
    { email: "assistant.ops@chefpro.demo", locations: Object.keys(locationId) },
    { email: "foh@chefpro.demo", locations: Object.keys(locationId) },
  ];

  for (const entry of userLocationMap) {
    const userId = uid(entry.email);
    for (const locName of entry.locations) {
      await prisma.userLocationAccess.upsert({
        where: { userId_locationId: { userId, locationId: locationId[locName] } },
        update: {},
        create: { userId, locationId: locationId[locName] },
      });
    }
  }
  console.log("  UserLocationAccess: assigned");

  // ── Step 4: DeadlineRules ─────────────────────────────────────────────────
  const deadlineRules: Array<{
    locationName: string;
    periodName: string;
    deadlineTime: string;
    packetDueTime?: string;
    tastingStart?: string;
    tastingEnd?: string;
    serviceStart?: string;
    daysOfWeek: number[];
  }> = [
    // Full Circle — all 3 periods, 7 days
    {
      locationName: "Full Circle",
      periodName: "Breakfast",
      deadlineTime: "07:30",
      packetDueTime: "08:00",
      tastingStart: "06:45",
      tastingEnd: "07:30",
      serviceStart: "07:30",
      daysOfWeek: [1, 2, 3, 4, 5, 6, 7],
    },
    {
      locationName: "Full Circle",
      periodName: "Lunch",
      deadlineTime: "10:45",
      packetDueTime: "11:00",
      tastingStart: "10:00",
      tastingEnd: "10:45",
      serviceStart: "11:00",
      daysOfWeek: [1, 2, 3, 4, 5, 6, 7],
    },
    {
      locationName: "Full Circle",
      periodName: "Dinner",
      deadlineTime: "16:30",
      packetDueTime: "17:00",
      tastingStart: "15:45",
      tastingEnd: "16:30",
      serviceStart: "17:00",
      daysOfWeek: [1, 2, 3, 4, 5, 6, 7],
    },
    // Metropolitan — all 3 periods, weekdays
    {
      locationName: "Metropolitan",
      periodName: "Breakfast",
      deadlineTime: "07:45",
      packetDueTime: "08:15",
      tastingStart: "07:00",
      tastingEnd: "07:45",
      serviceStart: "08:00",
      daysOfWeek: [1, 2, 3, 4, 5],
    },
    {
      locationName: "Metropolitan",
      periodName: "Lunch",
      deadlineTime: "11:00",
      packetDueTime: "11:30",
      tastingStart: "10:15",
      tastingEnd: "11:00",
      serviceStart: "11:30",
      daysOfWeek: [1, 2, 3, 4, 5],
    },
    {
      locationName: "Metropolitan",
      periodName: "Dinner",
      deadlineTime: "17:00",
      packetDueTime: "17:30",
      tastingStart: "16:15",
      tastingEnd: "17:00",
      serviceStart: "17:15",
      daysOfWeek: [1, 2, 3, 4, 5],
    },
    // Hawker — lunch only
    {
      locationName: "Hawker",
      periodName: "Lunch",
      deadlineTime: "11:15",
      packetDueTime: "11:45",
      tastingStart: "10:30",
      tastingEnd: "11:15",
      serviceStart: "11:30",
      daysOfWeek: [1, 2, 3, 4, 5],
    },
    // Urban — lunch only
    {
      locationName: "Urban",
      periodName: "Lunch",
      deadlineTime: "11:00",
      packetDueTime: "11:30",
      tastingStart: "10:15",
      tastingEnd: "11:00",
      serviceStart: "11:30",
      daysOfWeek: [1, 2, 3, 4, 5],
    },
    // Late Harvest — lunch only
    {
      locationName: "Late Harvest",
      periodName: "Lunch",
      deadlineTime: "11:00",
      packetDueTime: "11:30",
      tastingStart: "10:15",
      tastingEnd: "11:00",
      serviceStart: "11:30",
      daysOfWeek: [1, 2, 3, 4, 5],
    },
    // Mezze — lunch only
    {
      locationName: "Mezze",
      periodName: "Lunch",
      deadlineTime: "11:00",
      packetDueTime: "11:30",
      tastingStart: "10:15",
      tastingEnd: "11:00",
      serviceStart: "11:30",
      daysOfWeek: [1, 2, 3, 4, 5],
    },
    // Bento — lunch + dinner
    {
      locationName: "Bento",
      periodName: "Lunch",
      deadlineTime: "11:15",
      packetDueTime: "11:45",
      tastingStart: "10:30",
      tastingEnd: "11:15",
      serviceStart: "11:30",
      daysOfWeek: [1, 2, 3, 4, 5],
    },
    {
      locationName: "Bento",
      periodName: "Dinner",
      deadlineTime: "17:00",
      packetDueTime: "17:30",
      tastingStart: "16:15",
      tastingEnd: "17:00",
      serviceStart: "17:15",
      daysOfWeek: [1, 2, 3, 4, 5],
    },
    // Next MPK-20 — lunch + dinner
    {
      locationName: "Next MPK-20",
      periodName: "Lunch",
      deadlineTime: "11:00",
      packetDueTime: "11:30",
      tastingStart: "10:15",
      tastingEnd: "11:00",
      serviceStart: "11:30",
      daysOfWeek: [1, 2, 3, 4, 5],
    },
    {
      locationName: "Next MPK-20",
      periodName: "Dinner",
      deadlineTime: "16:45",
      packetDueTime: "17:15",
      tastingStart: "16:00",
      tastingEnd: "16:45",
      serviceStart: "17:00",
      daysOfWeek: [1, 2, 3, 4, 5],
    },
    // Biryani — lunch only
    {
      locationName: "Biryani",
      periodName: "Lunch",
      deadlineTime: "11:30",
      packetDueTime: "12:00",
      tastingStart: "10:45",
      tastingEnd: "11:30",
      serviceStart: "11:45",
      daysOfWeek: [1, 2, 3, 4, 5],
    },
    // Next MPK-22 — lunch + dinner
    {
      locationName: "Next MPK-22",
      periodName: "Lunch",
      deadlineTime: "11:00",
      packetDueTime: "11:30",
      tastingStart: "10:15",
      tastingEnd: "11:00",
      serviceStart: "11:30",
      daysOfWeek: [1, 2, 3, 4, 5],
    },
    {
      locationName: "Next MPK-22",
      periodName: "Dinner",
      deadlineTime: "16:45",
      packetDueTime: "17:15",
      tastingStart: "16:00",
      tastingEnd: "16:45",
      serviceStart: "17:00",
      daysOfWeek: [1, 2, 3, 4, 5],
    },
  ];

  for (const rule of deadlineRules) {
    await prisma.deadlineRule.upsert({
      where: {
        locationId_tastingPeriodId: {
          locationId: locationId[rule.locationName],
          tastingPeriodId: periodId[rule.periodName],
        },
      },
      update: {
        deadlineTime: rule.deadlineTime,
        packetDueTime: rule.packetDueTime ?? null,
        tastingStart: rule.tastingStart ?? null,
        tastingEnd: rule.tastingEnd ?? null,
        serviceStart: rule.serviceStart ?? null,
        daysOfWeek: rule.daysOfWeek,
        isActive: true,
      },
      create: {
        locationId: locationId[rule.locationName],
        tastingPeriodId: periodId[rule.periodName],
        deadlineTime: rule.deadlineTime,
        packetDueTime: rule.packetDueTime ?? null,
        tastingStart: rule.tastingStart ?? null,
        tastingEnd: rule.tastingEnd ?? null,
        serviceStart: rule.serviceStart ?? null,
        daysOfWeek: rule.daysOfWeek,
      },
    });
  }
  console.log(`  DeadlineRules: ${deadlineRules.length} rules`);

  // ── Step 5: RatingSchema ──────────────────────────────────────────────────
  let schema = await prisma.ratingSchema.findFirst({
    where: { name: "Standard Dish Rating v1", version: 1 },
  });
  if (!schema) {
    schema = await prisma.ratingSchema.create({
      data: { name: "Standard Dish Rating v1", version: 1, isActive: true },
    });
  }
  const schemaId = schema.id;

  // Recreate questions for idempotency — delete responses first to avoid FK violation
  await prisma.ratingResponse.deleteMany({ where: { question: { schemaId } } });
  await prisma.ratingQuestion.deleteMany({ where: { schemaId } });
  const questionDefs = [
    {
      label: "Overall Quality",
      description: "1 = Unservable, 5 = Paragon",
      type: "star",
      scaleMin: 1,
      scaleMax: 5,
      sortOrder: 1,
    },
    {
      label: "Temperature Accuracy",
      description: "Was the dish served at the correct temperature?",
      type: "star",
      scaleMin: 1,
      scaleMax: 5,
      sortOrder: 2,
    },
    {
      label: "Portion Consistency",
      description: "Were portions consistent across the line?",
      type: "star",
      scaleMin: 1,
      scaleMax: 5,
      sortOrder: 3,
    },
    {
      label: "Presentation",
      description: "Visual appeal and plating standards",
      type: "star",
      scaleMin: 1,
      scaleMax: 5,
      sortOrder: 4,
    },
    {
      label: "Chef Notes",
      description: "Any adjustment notes or observations",
      type: "text",
      sortOrder: 5,
    },
  ];
  const questions = await prisma.ratingQuestion.createManyAndReturn({
    data: questionDefs.map((q) => ({ ...q, schemaId, isRequired: q.type === "star" })),
  });
  const starQuestions = questions.filter((q) => q.type === "star");
  console.log("  RatingSchema + Questions: seeded");

  // ── Step 6: CountSheetTemplates ───────────────────────────────────────────
  const countTemplateDefs = [
    { locationName: "Full Circle", periodName: "Lunch" },
    { locationName: "Metropolitan", periodName: "Lunch" },
  ];

  const countSectionFields =
    (Prisma.JsonNull as unknown) === null
      ? []
      : [
          { key: "initial", label: "Opening Count", type: "number", role: "initial" },
          { key: "served", label: "Portioned Out", type: "number", role: "addition" },
          { key: "remainder", label: "Remaining", type: "number", role: "remainder" },
        ];

  // Use literal array — Prisma.InputJsonValue
  const sectionFieldsJson = [
    { key: "initial", label: "Opening Count", type: "number", role: "initial" },
    { key: "served", label: "Portioned Out", type: "number", role: "addition" },
    { key: "remainder", label: "Remaining", type: "number", role: "remainder" },
  ] as Prisma.InputJsonValue;

  const notesFieldsJson = [
    { key: "notes", label: "Service Notes", type: "text", role: "label" },
  ] as Prisma.InputJsonValue;

  const sectionDefs = [
    { label: "Protein Station", group: "Hot Line", sortOrder: 1, fields: sectionFieldsJson },
    { label: "Vegetarian Station", group: "Hot Line", sortOrder: 2, fields: sectionFieldsJson },
    { label: "Vegan Station", group: "Hot Line", sortOrder: 3, fields: sectionFieldsJson },
    { label: "Starch Station", group: "Hot Line", sortOrder: 4, fields: sectionFieldsJson },
    { label: "Salad Bar", group: "Cold Stations", sortOrder: 5, fields: sectionFieldsJson },
    { label: "Dessert Station", group: "Desserts", sortOrder: 6, fields: sectionFieldsJson },
    { label: "Notes", group: "Notes", sortOrder: 7, fields: notesFieldsJson },
  ];

  const templateIds: Record<string, string> = {};
  const sectionIds: Record<string, string[]> = {}; // templateId -> sectionIds by sortOrder

  for (const def of countTemplateDefs) {
    const template = await prisma.countSheetTemplate.upsert({
      where: {
        locationId_tastingPeriodId: {
          locationId: locationId[def.locationName],
          tastingPeriodId: periodId[def.periodName],
        },
      },
      update: { isActive: true },
      create: {
        locationId: locationId[def.locationName],
        tastingPeriodId: periodId[def.periodName],
      },
    });
    templateIds[`${def.locationName}/${def.periodName}`] = template.id;

    const sections: string[] = [];
    for (const sec of sectionDefs) {
      const section = await prisma.countSheetSection.upsert({
        where: { templateId_sortOrder: { templateId: template.id, sortOrder: sec.sortOrder } },
        update: { label: sec.label, group: sec.group, fields: sec.fields, isActive: true },
        create: {
          templateId: template.id,
          label: sec.label,
          group: sec.group ?? null,
          fields: sec.fields,
          sortOrder: sec.sortOrder,
        },
      });
      sections.push(section.id);
    }
    sectionIds[template.id] = sections;
  }
  console.log("  CountSheetTemplates: Full Circle/Lunch, Metropolitan/Lunch");

  // ── Step 7: TastingSessions (30-day arc) ──────────────────────────────────
  const sessionTracks = [
    {
      locationName: "Full Circle",
      periodName: "Lunch",
      chefEmail: "exec.chef@chefpro.demo",
      weekdayOnly: false,
    },
    {
      locationName: "Metropolitan",
      periodName: "Lunch",
      chefEmail: "chef@chefpro.demo",
      weekdayOnly: true,
    },
    {
      locationName: "Hawker",
      periodName: "Lunch",
      chefEmail: "fte.chef@chefpro.demo",
      weekdayOnly: true,
    },
    {
      locationName: "Urban",
      periodName: "Lunch",
      chefEmail: "kitchen.manager@chefpro.demo",
      weekdayOnly: true,
    },
  ];

  let sessionCount = 0;
  const sessionIds: string[] = []; // for ReviewActions

  for (let i = 0; i < DAYS; i++) {
    const date = demoDay(i);
    const dayNumber = i + 1;

    for (const track of sessionTracks) {
      if (track.weekdayOnly && !isWeekday(date)) continue;

      const chefId = uid(track.chefEmail);
      const locId = locationId[track.locationName];
      const perId = periodId[track.periodName];

      let status: string;
      if (dayNumber <= 25) status = "locked";
      else if (dayNumber <= 27) status = "reviewed";
      else if (dayNumber <= 29) status = "submitted";
      else status = "draft";

      const clComplete = getChecklistComplete(dayNumber, i * 4);

      const session = await prisma.tastingSession.upsert({
        where: {
          date_locationId_tastingPeriodId_chefId: {
            date,
            locationId: locId,
            tastingPeriodId: perId,
            chefId,
          },
        },
        update: {
          status,
          checklistMenuPackage: clComplete,
          checklistDigitalSignage: clComplete,
          checklistFoodCards: clComplete,
        },
        create: {
          date,
          locationId: locId,
          tastingPeriodId: perId,
          chefId,
          status,
          menuName: `${track.locationName} Lunch Menu`,
          checklistMenuPackage: clComplete,
          checklistDigitalSignage: clComplete,
          checklistFoodCards: clComplete,
          submittedAt: status !== "draft" ? date : null,
        },
      });

      sessionIds.push(session.id);

      // TastingItems — delete + recreate for idempotency
      await prisma.ratingResponse.deleteMany({ where: { item: { sessionId: session.id } } });
      await prisma.tastingItem.deleteMany({ where: { sessionId: session.id } });

      let itemDefs: Array<{ dishName: string; sortOrder: number }>;
      if (track.locationName === "Full Circle") {
        const di = i % DISHES.entree.length;
        const vi = i % DISHES.vegetarian_entree.length;
        const vni = i % DISHES.vegan_entree.length;
        const si = i % DISHES.starches.length;
        const vegi = i % DISHES.vegetables.length;
        itemDefs = [
          { dishName: DISHES.entree[di], sortOrder: 1 },
          { dishName: DISHES.vegetarian_entree[vi], sortOrder: 2 },
          { dishName: DISHES.vegan_entree[vni], sortOrder: 3 },
          { dishName: DISHES.starches[si], sortOrder: 4 },
          { dishName: DISHES.vegetables[vegi], sortOrder: 5 },
        ];
      } else {
        const pool = SECONDARY_DISHES[track.locationName] ?? SECONDARY_DISHES["Hawker"];
        itemDefs = pool.slice(0, 3).map((dishName, idx) => ({ dishName, sortOrder: idx + 1 }));
      }

      for (const itemDef of itemDefs) {
        const seed = dayNumber * 100 + itemDef.sortOrder;
        const tempCompliance = getTempCompliance(dayNumber, seed);
        const adjustmentsNeeded = getAdjustmentsNeeded(dayNumber, seed);

        const item = await prisma.tastingItem.create({
          data: {
            sessionId: session.id,
            dishName: itemDef.dishName,
            sortOrder: itemDef.sortOrder,
            temperatureCompliance: tempCompliance,
            adjustmentsNeeded,
          },
        });

        // RatingResponses for star questions
        await prisma.ratingResponse.createMany({
          data: starQuestions.map((q) => ({
            itemId: item.id,
            questionId: q.id,
            numericValue: getRating(dayNumber, seed + q.sortOrder),
          })),
        });
      }

      sessionCount++;
    }
  }
  console.log(`  TastingSessions: ${sessionCount} sessions`);

  // ── Step 8: ReviewActions ─────────────────────────────────────────────────
  const assistantOpsId = uid("assistant.ops@chefpro.demo");
  const opsId = uid("ops@chefpro.demo");

  const reviewedOrLocked = await prisma.tastingSession.findMany({
    where: { id: { in: sessionIds }, status: { in: ["reviewed", "locked"] } },
    select: { id: true, status: true },
  });

  for (const s of reviewedOrLocked) {
    const existing = await prisma.reviewAction.findFirst({
      where: { sessionId: s.id, fromStatus: "submitted", toStatus: "reviewed" },
    });
    if (!existing) {
      await prisma.reviewAction.create({
        data: {
          sessionId: s.id,
          reviewerId: assistantOpsId,
          fromStatus: "submitted",
          toStatus: "reviewed",
        },
      });
    }
    if (s.status === "locked") {
      const existingLock = await prisma.reviewAction.findFirst({
        where: { sessionId: s.id, fromStatus: "reviewed", toStatus: "locked" },
      });
      if (!existingLock) {
        await prisma.reviewAction.create({
          data: { sessionId: s.id, reviewerId: opsId, fromStatus: "reviewed", toStatus: "locked" },
        });
      }
    }
  }
  console.log("  ReviewActions: seeded");

  // ── Step 9: DailyCountSheets ──────────────────────────────────────────────
  const fohId = uid("foh@chefpro.demo");
  const fcTemplateId = templateIds["Full Circle/Lunch"];

  if (fcTemplateId) {
    const today = new Date("2026-05-18");
    for (let i = 0; i < 14; i++) {
      const d = new Date(today);
      d.setUTCDate(d.getUTCDate() - (13 - i));
      if (d.getUTCDay() === 0 || d.getUTCDay() === 6) continue; // skip weekends

      const daysAgo = 13 - i;
      const isDraft = daysAgo < 2;
      const sheetDate = new Date(d.toISOString().split("T")[0]);

      const sheet = await prisma.dailyCountSheet.upsert({
        where: { templateId_date: { templateId: fcTemplateId, date: sheetDate } },
        update: {},
        create: {
          templateId: fcTemplateId,
          date: sheetDate,
          status: isDraft ? "draft" : "submitted",
          submittedById: isDraft ? null : fohId,
          submittedAt: isDraft ? null : d,
        },
      });

      for (const secId of sectionIds[fcTemplateId] ?? []) {
        const r1 = Math.floor(seededRandom(i * 7 + 1) * 20) + 75;
        const r2 = Math.floor(seededRandom(i * 7 + 2) * 15) + 60;
        const values = { initial: r1, served: r2, remainder: r1 - r2 } as Prisma.InputJsonValue;

        await prisma.dailyCountEntry.upsert({
          where: { sheetId_sectionId: { sheetId: sheet.id, sectionId: secId } },
          update: { values },
          create: { sheetId: sheet.id, sectionId: secId, values },
        });
      }
    }
    console.log("  DailyCountSheets: 14 sheets (Full Circle/Lunch)");
  }

  // ── Step 10: MenuSignagePackets ───────────────────────────────────────────
  const execChefId = uid("exec.chef@chefpro.demo");
  const kitchenMgrId = uid("kitchen.manager@chefpro.demo");
  const chefId = uid("chef@chefpro.demo");

  const packetDefs = [
    {
      key: "A",
      locationName: "Full Circle",
      meal: "Lunch",
      dateStr: "2026-05-14",
      status: "finalized_for_service",
      checklistComplete: true,
      backupReady: true,
      createdById: execChefId,
      assignedChefId: execChefId,
      publishedById: execChefId,
      publishedAt: new Date("2026-05-14T09:00:00.000Z"),
      readyForFinalReviewById: kitchenMgrId,
      readyForFinalReviewAt: new Date("2026-05-14T09:30:00.000Z"),
      finalizedForServiceById: opsId,
      finalizedForServiceAt: new Date("2026-05-14T10:00:00.000Z"),
    },
    {
      key: "B",
      locationName: "Full Circle",
      meal: "Dinner",
      dateStr: "2026-05-15",
      status: "for_final_review",
      checklistComplete: true,
      backupReady: true,
      createdById: execChefId,
      assignedChefId: execChefId,
      publishedById: execChefId,
      publishedAt: new Date("2026-05-15T09:00:00.000Z"),
      readyForFinalReviewById: kitchenMgrId,
      readyForFinalReviewAt: new Date("2026-05-15T09:30:00.000Z"),
    },
    {
      key: "C",
      locationName: "Metropolitan",
      meal: "Lunch",
      dateStr: "2026-05-16",
      status: "published",
      checklistComplete: false,
      createdById: chefId,
      assignedChefId: chefId,
      publishedById: chefId,
      publishedAt: new Date("2026-05-16T09:00:00.000Z"),
    },
    {
      key: "D",
      locationName: "Bento",
      meal: "Lunch",
      dateStr: "2026-05-17",
      status: "draft",
      checklistComplete: false,
      createdById: chefId,
      assignedChefId: chefId,
    },
    {
      key: "E",
      locationName: "Full Circle",
      meal: "Lunch",
      dateStr: "2026-05-18",
      status: "draft",
      checklistComplete: false,
      createdById: execChefId,
      assignedChefId: execChefId,
    },
  ];

  const packetIds: Record<string, string> = {};
  const packetItemIds: Record<string, string> = {}; // "packetKey:dishName" -> itemId (for amendments)

  for (const def of packetDefs) {
    const pdate = new Date(def.dateStr);
    const packet = await prisma.menuSignagePacket.upsert({
      where: {
        date_locationId_meal: {
          date: pdate,
          locationId: locationId[def.locationName],
          meal: def.meal,
        },
      },
      update: { status: def.status },
      create: {
        date: pdate,
        locationId: locationId[def.locationName],
        meal: def.meal,
        status: def.status,
        checklistMenuPackage: def.checklistComplete,
        checklistDigitalSignage: def.checklistComplete,
        checklistFoodCards: def.checklistComplete,
        backupReady: def.backupReady ?? false,
        createdById: def.createdById,
        assignedChefId: def.assignedChefId ?? null,
        publishedById: (def as { publishedById?: string }).publishedById ?? null,
        publishedAt: (def as { publishedAt?: Date }).publishedAt ?? null,
        readyForFinalReviewById:
          (def as { readyForFinalReviewById?: string }).readyForFinalReviewById ?? null,
        readyForFinalReviewAt:
          (def as { readyForFinalReviewAt?: Date }).readyForFinalReviewAt ?? null,
        finalizedForServiceById:
          (def as { finalizedForServiceById?: string }).finalizedForServiceById ?? null,
        finalizedForServiceAt:
          (def as { finalizedForServiceAt?: Date }).finalizedForServiceAt ?? null,
      },
    });
    packetIds[def.key] = packet.id;

    // Items — delete + recreate
    await prisma.menuSignageItem.deleteMany({ where: { packetId: packet.id } });

    const itemsForPacket: Array<{
      category:
        | "entree"
        | "vegetarian_entree"
        | "vegan_entree"
        | "starches"
        | "vegetables"
        | "sides"
        | "pastry"
        | "back_up";
      itemName: string;
      ingredients: string;
      dietTags?: string[];
      allergenTags?: string[];
    }> = [];

    if (def.key === "A") {
      itemsForPacket.push(
        {
          category: "entree",
          itemName: "Chicken Marsala",
          ingredients:
            "Chicken breast, marsala wine, mushrooms, shallots, chicken stock, butter, flour",
          dietTags: ["Non-Vegetarian"],
          allergenTags: ["Gluten", "Milk"],
        },
        {
          category: "vegetarian_entree",
          itemName: "Eggplant Parmesan",
          ingredients: "Eggplant, marinara sauce, mozzarella, parmesan, breadcrumbs, eggs",
          dietTags: ["Vegetarian"],
          allergenTags: ["Gluten", "Milk", "Eggs"],
        },
        {
          category: "vegan_entree",
          itemName: "Moroccan Spiced Chickpeas",
          ingredients:
            "Chickpeas, tomatoes, onion, garlic, cumin, coriander, paprika, cinnamon, olive oil",
          dietTags: ["Vegan"],
          allergenTags: [],
        },
        {
          category: "starches",
          itemName: "Garlic Mashed Potatoes",
          ingredients: "Yukon gold potatoes, roasted garlic, butter, cream, salt",
          dietTags: ["Vegetarian"],
          allergenTags: ["Milk"],
        },
        {
          category: "starches",
          itemName: "Mac & Cheese",
          ingredients: "Elbow pasta, cheddar, gruyère, milk, butter, flour",
          dietTags: ["Vegetarian"],
          allergenTags: ["Gluten", "Milk", "Eggs"],
        },
        {
          category: "vegetables",
          itemName: "Roasted Seasonal Medley",
          ingredients: "Zucchini, bell peppers, red onion, cherry tomatoes, olive oil, herbs",
          dietTags: ["Vegan"],
          allergenTags: [],
        },
        {
          category: "sides",
          itemName: "Steamed Jasmine Rice",
          ingredients: "Jasmine rice, water, salt",
          dietTags: ["Vegan"],
          allergenTags: [],
        },
        {
          category: "pastry",
          itemName: "Chocolate Lava Cake",
          ingredients: "Dark chocolate, butter, eggs, flour, sugar, vanilla",
          dietTags: ["Vegetarian"],
          allergenTags: ["Gluten", "Milk", "Eggs"],
        },
        {
          category: "back_up",
          itemName: "Grilled Cheese & Tomato Soup",
          ingredients: "Sourdough, cheddar, butter, tomatoes, onion, vegetable broth, cream",
          dietTags: ["Vegetarian"],
          allergenTags: ["Gluten", "Milk"],
        }
      );
    } else if (def.key === "B") {
      itemsForPacket.push(
        {
          category: "entree",
          itemName: "Slow-Braised Beef Short Rib",
          ingredients: "Beef short rib, red wine, beef stock, mirepoix, thyme, rosemary",
          dietTags: ["Non-Vegetarian"],
          allergenTags: [],
        },
        {
          category: "vegetarian_entree",
          itemName: "Butternut Squash Lasagna",
          ingredients: "Lasagna noodles, butternut squash, ricotta, sage, parmesan, béchamel",
          dietTags: ["Vegetarian"],
          allergenTags: ["Gluten", "Milk", "Eggs"],
        },
        {
          category: "vegan_entree",
          itemName: "Black Bean & Sweet Potato Burrito Bowl",
          ingredients: "Black beans, sweet potato, brown rice, corn, jalapeño, cilantro, lime",
          dietTags: ["Vegan"],
          allergenTags: [],
        },
        {
          category: "starches",
          itemName: "Steamed Jasmine Rice",
          ingredients: "Jasmine rice, water, salt",
          dietTags: ["Vegan"],
          allergenTags: [],
        },
        {
          category: "vegetables",
          itemName: "Glazed Carrots",
          ingredients: "Carrots, butter, brown sugar, thyme",
          dietTags: ["Vegetarian"],
          allergenTags: ["Milk"],
        },
        {
          category: "sides",
          itemName: "Roasted Red Potatoes",
          ingredients: "Red potatoes, olive oil, rosemary, garlic, salt",
          dietTags: ["Vegan"],
          allergenTags: [],
        },
        {
          category: "pastry",
          itemName: "Seasonal Fruit Crumble",
          ingredients: "Seasonal fruit, oats, flour, butter, brown sugar, cinnamon",
          dietTags: ["Vegetarian"],
          allergenTags: ["Gluten", "Milk"],
        },
        {
          category: "back_up",
          itemName: "Herb-Roasted Chicken Quarter",
          ingredients: "Chicken quarter, fresh herbs, garlic, olive oil, lemon",
          dietTags: ["Non-Vegetarian"],
          allergenTags: [],
        }
      );
    } else if (def.key === "C") {
      // Missing back_up — intentional for demo
      itemsForPacket.push(
        {
          category: "entree",
          itemName: "Chicken Piccata",
          ingredients: "Chicken breast, lemon, capers, white wine, butter, parsley",
          dietTags: ["Non-Vegetarian"],
          allergenTags: ["Gluten", "Milk"],
        },
        {
          category: "vegetarian_entree",
          itemName: "Caprese Stuffed Portobello",
          ingredients: "Portobello mushroom, mozzarella, tomato, basil, balsamic glaze",
          dietTags: ["Vegetarian"],
          allergenTags: ["Milk"],
        },
        {
          category: "vegan_entree",
          itemName: "Lemon Herb Falafel Wrap",
          ingredients: "Chickpeas, herbs, lemon, garlic, lavash, cucumber, tahini",
          dietTags: ["Vegan"],
          allergenTags: ["Gluten", "Sesame"],
        },
        {
          category: "starches",
          itemName: "Penne Marinara",
          ingredients: "Penne pasta, san marzano tomatoes, garlic, basil, olive oil",
          dietTags: ["Vegan"],
          allergenTags: ["Gluten"],
        },
        {
          category: "vegetables",
          itemName: "Steamed Broccoli",
          ingredients: "Broccoli, salt, olive oil",
          dietTags: ["Vegan"],
          allergenTags: [],
        },
        {
          category: "sides",
          itemName: "Steamed Jasmine Rice",
          ingredients: "Jasmine rice, water, salt",
          dietTags: ["Vegan"],
          allergenTags: [],
        }
      );
    } else if (def.key === "D") {
      itemsForPacket.push(
        {
          category: "entree",
          itemName: "Grilled Chicken Breast",
          ingredients: "Chicken breast, olive oil, herbs, garlic",
          dietTags: ["Non-Vegetarian"],
          allergenTags: [],
        },
        {
          category: "vegetarian_entree",
          itemName: "Veggie Fried Rice",
          ingredients: "Jasmine rice, eggs, scallions, soy sauce, sesame oil, carrots, peas",
          dietTags: ["Vegetarian"],
          allergenTags: ["Eggs", "Soy", "Sesame"],
        },
        {
          category: "vegan_entree",
          itemName: "Thai Basil Tofu Stir-Fry",
          ingredients: "Firm tofu, thai basil, bell peppers, garlic, chili, soy sauce",
          dietTags: ["Vegan"],
          allergenTags: ["Soy"],
        }
      );
    } else if (def.key === "E") {
      itemsForPacket.push(
        {
          category: "entree",
          itemName: "Herb-Roasted Chicken Quarter",
          ingredients: "Chicken quarter, fresh herbs, garlic, olive oil, lemon",
          dietTags: ["Non-Vegetarian"],
          allergenTags: [],
        },
        {
          category: "vegetarian_entree",
          itemName: "Roasted Portobello & Quinoa Stack",
          ingredients: "Portobello mushroom, quinoa, roasted peppers, feta, lemon vinaigrette",
          dietTags: ["Vegetarian"],
          allergenTags: ["Milk"],
        },
        {
          category: "vegan_entree",
          itemName: "Moroccan Spiced Chickpeas",
          ingredients:
            "Chickpeas, tomatoes, onion, garlic, cumin, coriander, paprika, cinnamon, olive oil",
          dietTags: ["Vegan"],
          allergenTags: [],
        },
        {
          category: "starches",
          itemName: "Steamed Jasmine Rice",
          ingredients: "Jasmine rice, water, salt",
          dietTags: ["Vegan"],
          allergenTags: [],
        },
        {
          category: "vegetables",
          itemName: "Sautéed Spinach",
          ingredients: "Baby spinach, garlic, olive oil, salt",
          dietTags: ["Vegan"],
          allergenTags: [],
        }
      );
    }

    for (let idx = 0; idx < itemsForPacket.length; idx++) {
      const itemDef = itemsForPacket[idx];
      const item = await prisma.menuSignageItem.create({
        data: {
          packetId: packet.id,
          category: itemDef.category,
          itemName: itemDef.itemName,
          ingredients: itemDef.ingredients,
          dietTags: itemDef.dietTags ?? [],
          allergenTags: itemDef.allergenTags ?? [],
          sortOrder: idx + 1,
          isReadyForService: def.status !== "draft",
        },
      });
      packetItemIds[`${def.key}:${itemDef.itemName}`] = item.id;
    }
  }
  console.log(`  MenuSignagePackets: ${Object.keys(packetIds).length} packets`);

  // ── Step 11: PacketReviewSignatures + Amendments ──────────────────────────
  // Packet A: 2 signatures
  for (const [signerId, signerNameInput, signerRole] of [
    [execChefId, "Demo Executive Chef", "Executive Chef"],
    [kitchenMgrId, "Demo Kitchen Admin Manager", "Kitchen Admin Manager"],
  ]) {
    await prisma.packetReviewSignature.upsert({
      where: { packetId_signerId: { packetId: packetIds["A"], signerId: signerId as string } },
      update: {},
      create: {
        packetId: packetIds["A"],
        signerId: signerId as string,
        signerNameInput: signerNameInput as string,
        signerRole: signerRole as string,
      },
    });
  }
  // Packet B: 1 signature
  await prisma.packetReviewSignature.upsert({
    where: { packetId_signerId: { packetId: packetIds["B"], signerId: execChefId } },
    update: {},
    create: {
      packetId: packetIds["B"],
      signerId: execChefId,
      signerNameInput: "Demo Executive Chef",
      signerRole: "Executive Chef",
    },
  });

  // Packet A: applied amendment
  const existingAmendA = await prisma.packetAmendment.findFirst({
    where: { packetId: packetIds["A"], status: "applied" },
  });
  if (!existingAmendA) {
    await prisma.packetAmendment.create({
      data: {
        packetId: packetIds["A"],
        type: "item_change",
        reason: "tasting_feedback",
        description:
          "Chicken Marsala substituted for Pork Tenderloin with Apple Jus — prep batch ran short",
        requestedById: execChefId,
        resolvedById: opsId,
        status: "applied",
        resolvedAt: new Date("2026-05-14T08:45:00.000Z"),
      },
    });
  }
  // Packet B: pending amendment
  const existingAmendB = await prisma.packetAmendment.findFirst({
    where: { packetId: packetIds["B"], status: "pending" },
  });
  if (!existingAmendB) {
    await prisma.packetAmendment.create({
      data: {
        packetId: packetIds["B"],
        type: "item_change",
        reason: "prep_change",
        description:
          "Pasta Primavera substituted for Butternut Squash Lasagna — oven failure during prep",
        requestedById: execChefId,
        status: "pending",
      },
    });
  }
  console.log("  PacketReviewSignatures + Amendments: seeded");

  // ── Step 12: OperationalAudits ────────────────────────────────────────────
  const ftechefId = uid("fte.chef@chefpro.demo");

  const ruleSet = {
    version: "fda-food-code-2022-defaults-v1",
    source: "FDA Food Code model-code defaults; local rules may vary",
    coldMaxF: 41,
    hotMinF: 135,
    minConfidence: 0.7,
  } as Prisma.InputJsonValue;

  // Audit 1: Hawker temperature log — violation
  let audit1 = await prisma.operationalAudit.findFirst({
    where: {
      locationId: locationId["Hawker"],
      auditDate: new Date("2026-05-03"),
      type: "temperature_log",
    },
  });
  if (!audit1) {
    audit1 = await prisma.operationalAudit.create({
      data: {
        type: "temperature_log",
        locationId: locationId["Hawker"],
        auditDate: new Date("2026-05-03"),
        submittedById: ftechefId,
        status: "needs_review",
        needsHumanReview: true,
        promptVersion: "temp-log-v2",
        schemaVersion: "1.0",
        summary:
          "AI extracted 8 temperature entries. 1 potential hot-holding threshold issue flagged for manager review. 2 entries require review for missing fields.",
        ruleSet,
        metadata: {} as Prisma.InputJsonValue,
        modelName: "gemini-2.0-flash",
      },
    });

    const tempLog = await prisma.temperatureLog.create({
      data: {
        auditId: audit1.id,
        extractedBy: "gemini-2.0-flash",
        summary: "8 entries extracted from handwritten log sheet. Confidence varies 0.71–0.94.",
        documentDate: new Date("2026-05-03"),
      },
    });

    const tempEntries = [
      {
        entryTime: "11:00",
        stationName: "Steam Well A",
        itemName: "Grilled Chicken Breast",
        holdingType: "hot",
        temperatureRaw: "148F",
        temperatureF: 148,
        initials: "M.R.",
        confidence: 0.93,
        complianceStatus: "compliant",
      },
      {
        entryTime: "11:00",
        stationName: "Cold Case",
        itemName: "Pre-made Salads",
        holdingType: "cold",
        temperatureRaw: "38F",
        temperatureF: 38,
        initials: "M.R.",
        confidence: 0.91,
        complianceStatus: "compliant",
      },
      {
        entryTime: "11:15",
        stationName: "Steam Well A",
        itemName: "Roasted Red Potatoes",
        holdingType: "hot",
        temperatureRaw: "141F",
        temperatureF: 141,
        initials: "M.R.",
        confidence: 0.89,
        complianceStatus: "compliant",
      },
      {
        entryTime: "11:15",
        stationName: "Steam Well B",
        itemName: "Turkey Meatball Sub",
        holdingType: "hot",
        temperatureRaw: "128F",
        temperatureF: 128,
        initials: "M.R.",
        confidence: 0.91,
        complianceStatus: "potential_issue",
      },
      {
        entryTime: "12:00",
        stationName: "Steam Well A",
        itemName: "Grilled Chicken Breast",
        holdingType: "hot",
        temperatureRaw: "152F",
        temperatureF: 152,
        initials: "J.K.",
        confidence: 0.94,
        complianceStatus: "compliant",
      },
      {
        entryTime: "12:00",
        stationName: "Steam Well B",
        itemName: "Turkey Meatball Sub",
        holdingType: "hot",
        temperatureRaw: "137F",
        temperatureF: 137,
        initials: "J.K.",
        confidence: 0.92,
        complianceStatus: "compliant",
      },
      {
        entryTime: "12:00",
        stationName: "Cold Case",
        itemName: "Pre-made Salads",
        holdingType: "cold",
        temperatureRaw: "39F",
        temperatureF: 39,
        initials: "J.K.",
        confidence: 0.9,
        complianceStatus: "compliant",
      },
      {
        entryTime: null,
        stationName: null,
        itemName: "Backup Broth",
        holdingType: "hot",
        temperatureRaw: null,
        temperatureF: null,
        initials: null,
        confidence: 0.71,
        complianceStatus: "needs_review",
      },
    ];

    const createdEntries = await Promise.all(
      tempEntries.map((e) =>
        prisma.temperatureEntry.create({
          data: { temperatureLogId: tempLog.id, ...e, unit: "F" },
        })
      )
    );

    // ComplianceIssues
    const entry4 = createdEntries[3]; // Turkey Meatball Sub 128F
    const entry8 = createdEntries[7]; // Backup Broth — missing fields

    await prisma.complianceIssue.create({
      data: {
        auditId: audit1.id,
        temperatureEntryId: entry4.id,
        severity: "high",
        status: "acknowledged",
        type: "temperature_threshold",
        title: "Temperature threshold potential issue",
        description:
          "AI read 128F for hot holding at Steam Well B, below the 135F default threshold.",
        recommendation: "Review the original log and local food safety rules before taking action.",
        confidence: 0.91,
        ruleCode: "TEMP_HOT_THRESHOLD",
      },
    });
    await prisma.complianceIssue.create({
      data: {
        auditId: audit1.id,
        temperatureEntryId: entry8.id,
        severity: "high",
        status: "open",
        type: "missing_temperature_field",
        title: "Temperature value needs manager review",
        description: "AI could not identify a temperature value for this log entry.",
        recommendation: "Verify the original log before treating this entry as complete.",
        confidence: 0.71,
        ruleCode: "TEMP_MISSING_VALUE",
      },
    });
    await prisma.complianceIssue.create({
      data: {
        auditId: audit1.id,
        temperatureEntryId: entry8.id,
        severity: "medium",
        status: "open",
        type: "missing_temperature_field",
        title: "Initials need manager review",
        description: "AI could not identify staff initials for this temperature log entry.",
        recommendation: "Confirm who completed the check and update the audit trail if needed.",
        confidence: 0.71,
        ruleCode: "TEMP_MISSING_INITIALS",
      },
    });
  }

  // Audit 2: Full Circle closing — happy path
  let audit2 = await prisma.operationalAudit.findFirst({
    where: {
      locationId: locationId["Full Circle"],
      auditDate: new Date("2026-05-10"),
      type: "closing",
    },
  });
  if (!audit2) {
    audit2 = await prisma.operationalAudit.create({
      data: {
        type: "closing",
        locationId: locationId["Full Circle"],
        auditDate: new Date("2026-05-10"),
        submittedById: fohId,
        status: "completed",
        needsHumanReview: false,
        promptVersion: "closing-v2",
        schemaVersion: "1.0",
        summary:
          "AI reviewed 5 closing photos. All stations clean. No compliance issues identified.",
        ruleSet,
        metadata: {} as Prisma.InputJsonValue,
        modelName: "gemini-2.0-flash",
      },
    });

    const closingPhotos = [
      {
        category: "station",
        cleanlinessScore: 0.94,
        assessment: "Prep surfaces clean and sanitized. Equipment properly stored.",
        confidence: 0.92,
      },
      {
        category: "line",
        cleanlinessScore: 0.91,
        assessment: "Service line cleared and wiped down. No food residue visible.",
        confidence: 0.89,
      },
      {
        category: "walk_in",
        cleanlinessScore: 0.96,
        assessment: "Walk-in cooler organized, items properly labeled and dated.",
        confidence: 0.93,
      },
      {
        category: "dish_area",
        cleanlinessScore: 0.88,
        assessment: "Dish pit clear, sanitizer buckets present and correctly positioned.",
        confidence: 0.87,
      },
      {
        category: "storage",
        cleanlinessScore: 0.93,
        assessment: "Dry storage organized. FIFO rotation visible. No pest entry points.",
        confidence: 0.91,
      },
    ];

    await prisma.closingPhoto.createMany({
      data: closingPhotos.map((p) => ({
        auditId: audit2!.id,
        category: p.category,
        cleanlinessScore: p.cleanlinessScore,
        assessment: p.assessment,
        confidence: p.confidence,
        visibleFindings: [] as Prisma.InputJsonValue,
      })),
    });
  }
  console.log("  OperationalAudits: Hawker (violation) + Full Circle (happy path)");

  // ── Step 13: AiInsightReports ─────────────────────────────────────────────
  const insightDefs = [
    {
      type: "tasting_analysis",
      entityType: "location",
      entityId: locationId["Full Circle"],
      content: `## Tasting Intelligence Report — Full Circle
**Period:** April 19 – May 18, 2026 · **Generated by:** ChefPro AI

### Executive Summary
Over the past 30 days, Full Circle has shown a **55% improvement** in average dish ratings, climbing from a period average of 2.8 in weeks 1–2 to **4.3 in weeks 4–5**. This is the strongest improvement trajectory across all MPK dining locations.

### Rating Trend
| Week | Avg Rating | Sessions Reviewed |
|------|-----------|------------------|
| Apr 19–25 | 2.8 | 7 |
| Apr 26–May 2 | 3.1 | 7 |
| May 3–9 | 3.7 | 7 |
| May 10–18 | 4.3 | 9 |

### Top Performing Dishes
1. **Herb-Roasted Chicken Quarter** — avg 4.6 over 8 tastings
2. **Eggplant Parmesan** — avg 4.4 over 6 tastings
3. **Moroccan Spiced Chickpeas** — avg 4.2 over 5 tastings

### Dishes Requiring Continued Attention
- **Garlic Mashed Potatoes** — avg 3.1 (temperature inconsistency flagged in weeks 1–2; improved to 4.0 in weeks 4–5 after technique correction)
- **Beef Burgundy Stew** — avg 3.4 (seasoning adjustments noted in 3 sessions; recommend standardizing reduce time)

### Compliance
- Temperature compliance rate: **91%** (up from 61% in week 1)
- Checklist completion rate: **97%** in the last 10 days
- 0 missed submissions in the last 14 days

### Recommendation
Continue current operational cadence. The protein station shows the strongest consistency. Recommend a focused review of starch station temperature management during high-volume service windows.`,
    },
    {
      type: "menu_review",
      entityType: "packet",
      entityId: packetIds["A"],
      content: `## Menu Review Report — Full Circle Lunch
**Date:** May 14, 2026 · **Status:** ✅ Finalized for Service

### Summary
All 8 required menu categories are present and complete. Allergen and diet tags verified across all items.

### ✅ Complete
- All 8 categories covered (Entree, Vegetarian Entree, Vegan Entree, Starches, Vegetables, Sides, Pastry, Back-Up)
- Ingredient lists present on all items
- Allergen tags verified: Gluten, Milk, Eggs flagged appropriately on Eggplant Parmesan and Mac & Cheese
- Backup item (Grilled Cheese & Tomato Soup) marked ready for service

### ⚠️ Issues Found (Resolved)
- 1 amendment applied: **Chicken Marsala** substituted for **Pork Tenderloin with Apple Jus** (tasting feedback — prep batch ran short). Amendment resolved and signage updated before service.

### 📋 Approval Chain
| Step | Actor | Time |
|------|-------|------|
| Published | Executive Chef | 09:00 |
| Ready for Final Review | Kitchen Admin Manager | 09:30 |
| Finalized for Service | Ops | 10:00 |

**Verdict: Ready for service. No outstanding issues.**`,
    },
    {
      type: "compliance_summary",
      entityType: "location",
      entityId: locationId["Hawker"],
      content: `## Compliance Summary — Hawker (MPK-20)
**Period:** May 1–18, 2026 · **Generated by:** ChefPro AI

### ⚠️ Active Issue: Temperature Log — May 3

AI-assisted temperature log analysis flagged a **potential hot-holding threshold issue** for manager review:

> **Steam Well B — Turkey Meatball Sub**
> AI extracted reading: **128°F**
> Minimum safe hot-holding threshold: **135°F** (FDA Food Code defaults)
> Status: **Acknowledged** — pending manager resolution

This is an AI-assisted potential issue. Review the original handwritten log against the threshold before taking action. Local food safety rules may apply.

### Overall Compliance Metrics
| Metric | Rate |
|--------|------|
| Session submission rate | 94% |
| Checklist completion | 89% |
| Temperature compliance (tasting entries) | 87% |
| Open compliance issues | 3 (1 high, 2 medium) |

### Trend
Temperature compliance has improved from 72% in the first week to 91% in the most recent week. The May 3 hot-holding flag is the only active high-severity issue in the current period.

### Recommendations
1. Manager should review and resolve the May 3 temperature log entry for Steam Well B
2. Consider a brief team reminder on hot-holding minimum temperatures
3. Continue daily temperature log submissions — 94% rate is strong`,
    },
  ];

  for (const def of insightDefs) {
    const existing = await prisma.aiInsightReport.findFirst({
      where: { generatedBy: opsId, type: def.type, entityId: def.entityId },
    });
    if (!existing) {
      await prisma.aiInsightReport.create({
        data: {
          type: def.type,
          entityType: def.entityType,
          entityId: def.entityId,
          content: def.content,
          generatedBy: opsId,
          metadata: {} as Prisma.InputJsonValue,
        },
      });
    }
  }
  console.log("  AiInsightReports: 3 reports seeded");

  // ── Step 14: AiChatSessions ───────────────────────────────────────────────
  const chatSessions = [
    {
      title: "Operational Risks Review",
      messages: [
        { role: "user", content: "Good morning — how are things looking across campus today?" },
        {
          role: "assistant",
          content: `Good morning! Here's a quick operational snapshot for Meta MPK Dining Services:\n\n**Today's Activity (May 18)**\n- 4 tasting sessions logged across 4 locations\n- 2 sessions submitted, 2 still in draft\n- 3 menu signage packets pending review\n\n**Active Alerts**\n- ⚠️ **Hawker (MPK-20)** has an unresolved temperature compliance issue from May 3 — a potential hot-holding issue at Steam Well B (128°F, below the 135°F threshold). This has been acknowledged but needs manager resolution.\n- 1 pending packet amendment at Full Circle for tonight's dinner service\n\n**Positive Signals**\n- Full Circle has had zero missed submissions for the past 14 days\n- Overall checklist completion campus-wide is at 94% for the week\n\nWould you like me to pull more detail on the Hawker compliance issue or review the pending amendment?`,
        },
        { role: "user", content: "Tell me more about the Hawker temperature issue" },
        {
          role: "assistant",
          content: `Here's the detail on **Hawker — Temperature Log, May 3, 2026**:\n\n**AI-Extracted Entry of Concern**\n| Field | Value |\n|-------|-------|\n| Station | Steam Well B |\n| Item | Turkey Meatball Sub |\n| Holding Type | Hot |\n| Temperature (AI read) | **128°F** |\n| Threshold | 135°F (FDA Food Code default) |\n| Severity | 🔴 High |\n| Status | Acknowledged |\n\n**Context**\nAI extracted 8 entries from the handwritten log. 6 were compliant. The 11:15 check at Steam Well B is the flagged entry. The same item was re-checked at 12:00 and read 137°F (compliant).\n\n**Recommended Action**\nReview the original log sheet for the 11:15 Steam Well B entry. If the 128°F reading is confirmed, document corrective action taken (e.g., product discarded or held above threshold). If the handwritten value was misread by AI, the issue can be dismissed with a note.\n\n*This is an AI-assisted potential issue — always verify against the source document before taking regulatory action.*`,
        },
        { role: "user", content: "What's been the rating trend at Full Circle this month?" },
        {
          role: "assistant",
          content: `**Full Circle — Lunch Rating Trend (April 19 – May 18)**\n\nRatings have shown strong and consistent improvement over the 30-day window:\n\n| Period | Avg Rating | Direction |\n|--------|-----------|----------|\n| Week 1 (Apr 19–25) | 2.8 | Baseline |\n| Week 2 (Apr 26–May 2) | 3.1 | ↑ +0.3 |\n| Week 3 (May 3–9) | 3.7 | ↑ +0.6 |\n| Week 4–5 (May 10–18) | 4.3 | ↑ +0.6 |\n\n**Top performers this period:**\n- Herb-Roasted Chicken Quarter (4.6 avg)\n- Eggplant Parmesan (4.4 avg)\n- Moroccan Spiced Chickpeas (4.2 avg)\n\nThe improvement correlates with increased checklist compliance and more consistent temperature checking, which picked up significantly after May 3. Executive Chef has maintained a 100% submission rate for the past 14 days.\n\nWould you like me to compare Full Circle's numbers against other MPK locations?`,
        },
      ],
    },
    {
      title: "Menu Packet Review — Full Circle Lunch May 14",
      messages: [
        { role: "user", content: "Can you review the Full Circle lunch packet for May 14?" },
        {
          role: "assistant",
          content: `I've pulled the packet for review. Here's my analysis:\n\n## Menu Review — Full Circle Lunch, May 14, 2026\n**Status:** ✅ Finalized for Service\n\n### All 8 categories covered\n- **Entree:** Chicken Marsala (Non-Vegetarian, contains Gluten/Milk)\n- **Vegetarian Entree:** Eggplant Parmesan (Vegetarian, contains Gluten/Milk/Eggs)\n- **Vegan Entree:** Moroccan Spiced Chickpeas (Vegan, no allergens)\n- **Starches:** Garlic Mashed Potatoes, Mac & Cheese\n- **Vegetables:** Roasted Seasonal Medley (Vegan)\n- **Sides:** Steamed Jasmine Rice (Vegan)\n- **Pastry:** Chocolate Lava Cake (Gluten/Milk/Eggs)\n- **Back-Up:** Grilled Cheese & Tomato Soup (ready, not used)\n\n### ⚠️ Amendment Applied\n1 amendment applied before finalization: **Chicken Marsala** substituted for **Pork Tenderloin with Apple Jus** — prep batch ran short (tasting feedback). Resolved and signage updated.\n\n### Approval Chain\n- Published by Executive Chef at 09:00\n- Ready for Final Review by Kitchen Admin Manager at 09:30\n- Finalized for Service by Ops at 10:00\n\n**No outstanding issues. Packet is ready for service.**`,
        },
        { role: "user", content: "Is the backup item in place?" },
        {
          role: "assistant",
          content:
            "Yes — **Grilled Cheese & Tomato Soup** is listed as the back-up item and is marked ready for service. The back-up was not needed during service.\n\nThe back-up was a good call given the Chicken Marsala substitution — having a simple, reliable fallback item in place gave the team a safety net during the last-minute protein swap.",
        },
      ],
    },
  ];

  for (const sessionDef of chatSessions) {
    const existing = await prisma.aiChatSession.findFirst({
      where: { userId: opsId, title: sessionDef.title },
    });
    if (!existing) {
      const session = await prisma.aiChatSession.create({
        data: { userId: opsId, title: sessionDef.title },
      });
      for (const msg of sessionDef.messages) {
        await prisma.aiChatMessage.create({
          data: { sessionId: session.id, role: msg.role, content: msg.content },
        });
      }
    }
  }
  console.log("  AiChatSessions: 2 sessions seeded");

  console.log("\n  Demo data seed complete.");
}
