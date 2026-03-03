/**
 * Seed importer: parses the Bldg 21 spreadsheet and loads historical
 * tasting data into ChefPro's canonical model.
 *
 * Run via: npx tsx scripts/seed-importer.ts
 */
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pgLib from "pg";
import * as XLSX from "xlsx";
import path from "path";

const pool = new pgLib.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

interface ImportResult {
  locationsCreated: number;
  sessionsCreated: number;
  itemsCreated: number;
  errors: string[];
}

function parseExcelDate(raw: string | number): Date | null {
  if (typeof raw === "number") {
    const epoch = new Date(1899, 11, 30);
    epoch.setDate(epoch.getDate() + raw);
    return epoch;
  }
  const cleaned = raw.replace(/^DATE\s*/i, "").trim();
  if (!cleaned) return null;

  const slashMatch = cleaned.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (slashMatch) {
    const [, m, d, y] = slashMatch;
    const year = y.length === 2 ? 2000 + parseInt(y) : parseInt(y);
    return new Date(year, parseInt(m) - 1, parseInt(d));
  }

  const dotMatch = cleaned.match(/^(\d{1,2})\.(\d{1,2})\.(\d{2,4})$/);
  if (dotMatch) {
    const [, m, d, y] = dotMatch;
    const year = y.length === 2 ? 2000 + parseInt(y) : parseInt(y);
    return new Date(year, parseInt(m) - 1, parseInt(d));
  }

  return null;
}

function normalizeCompliance(raw: string): "compliant" | "non_compliant" | "not_checked" {
  const lower = raw.toLowerCase().trim();
  if (lower === "compliant") return "compliant";
  if (lower.includes("non-compliant") || lower.includes("needed adjustment"))
    return "non_compliant";
  return "not_checked";
}

async function importWorkbook(filePath: string): Promise<ImportResult> {
  const result: ImportResult = {
    locationsCreated: 0,
    sessionsCreated: 0,
    itemsCreated: 0,
    errors: [],
  };

  const wb = XLSX.readFile(filePath);

  const defaultPeriod = await prisma.tastingPeriod.findFirst({
    where: { isActive: true },
    orderBy: { sortOrder: "asc" },
  });

  if (!defaultPeriod) {
    result.errors.push("No active tasting period found. Create periods before importing.");
    return result;
  }

  const ratingSchema = await prisma.ratingSchema.findFirst({
    where: { isActive: true },
    include: { questions: { orderBy: { sortOrder: "asc" } } },
  });

  if (!ratingSchema) {
    result.errors.push("No active rating schema found. Create a schema before importing.");
    return result;
  }

  let systemUser = await prisma.user.findFirst({
    where: { email: "system@chefpro.local" },
  });

  if (!systemUser) {
    systemUser = await prisma.user.create({
      data: {
        email: "system@chefpro.local",
        name: "System Import",
        passwordHash: "nologin",
        role: "chef",
        isActive: false,
      },
    });
  }

  for (const sheetName of wb.SheetNames) {
    if (sheetName === "STAR RATINGS SYSTEM") continue;

    console.log(`\nProcessing sheet: ${sheetName}`);
    const ws = wb.Sheets[sheetName];
    const rows: (string | number | null)[][] = XLSX.utils.sheet_to_json(ws, {
      header: 1,
      defval: null,
    });

    let location = await prisma.location.findUnique({ where: { name: sheetName } });
    if (!location) {
      location = await prisma.location.create({ data: { name: sheetName } });
      result.locationsCreated++;
      console.log(`  Created location: ${sheetName}`);
    }

    let currentDate: Date | null = null;
    let currentManager = "";
    let currentMenuName = "";
    let checklistMenu = false;
    let checklistSignage = false;
    let checklistCards = false;
    let pendingItems: {
      dishName: string;
      ratings: number[];
      compliance: string;
      adjustments: string;
      ranOutTime: string;
      serviceGap: number | null;
      backupNotes: string;
      fteNotes: string;
      sourceRow: number;
    }[] = [];

    async function flushSession() {
      if (!currentDate || pendingItems.length === 0) return;

      const meaningfulItems = pendingItems.filter(
        (item) =>
          item.dishName.trim() !== "" &&
          (item.ratings.some((r) => r > 0) || item.compliance !== "not_checked" || item.adjustments)
      );

      if (meaningfulItems.length === 0) {
        pendingItems = [];
        return;
      }

      try {
        const session = await prisma.tastingSession.create({
          data: {
            date: currentDate,
            locationId: location!.id,
            tastingPeriodId: defaultPeriod!.id,
            chefId: systemUser!.id,
            managerName: currentManager || undefined,
            menuName: currentMenuName || undefined,
            status: "submitted",
            submittedAt: currentDate,
            checklistMenuPackage: checklistMenu,
            checklistDigitalSignage: checklistSignage,
            checklistFoodCards: checklistCards,
            items: {
              create: meaningfulItems.map((item, idx) => ({
                dishName: item.dishName,
                sortOrder: idx,
                temperatureCompliance: normalizeCompliance(item.compliance),
                adjustmentsNeeded: item.adjustments || undefined,
                ranOutTime: item.ranOutTime || undefined,
                serviceGapMins: item.serviceGap ?? undefined,
                backupNotes: item.backupNotes || undefined,
                fteNotes: item.fteNotes || undefined,
                ratings: {
                  create: ratingSchema!.questions.slice(0, item.ratings.length).map((q, qi) => ({
                    questionId: q.id,
                    numericValue: item.ratings[qi] ?? 0,
                  })),
                },
              })),
            },
          },
        });
        result.sessionsCreated++;
        result.itemsCreated += meaningfulItems.length;
        console.log(
          `  Session ${session.id}: ${currentDate.toISOString().split("T")[0]} - ${meaningfulItems.length} items`
        );
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        result.errors.push(
          `${sheetName} row block near ${currentDate.toISOString().split("T")[0]}: ${msg}`
        );
      }

      pendingItems = [];
    }

    for (let rowIdx = 1; rowIdx < rows.length; rowIdx++) {
      const row = rows[rowIdx];
      if (!row) continue;

      const colA = String(row[0] ?? "").trim();
      const colB = String(row[1] ?? "").trim();
      const colC = parseFloat(String(row[2] ?? "0")) || 0;
      const colD = parseFloat(String(row[3] ?? "0")) || 0;
      const colE = parseFloat(String(row[4] ?? "0")) || 0;
      const colF = String(row[5] ?? "").trim();
      const colG = String(row[6] ?? "").trim();
      const colH = String(row[7] ?? "").trim();
      const colI = parseFloat(String(row[8] ?? "")) || null;
      const colJ = String(row[9] ?? "").trim();
      const colK = String(row[10] ?? "").trim();

      const colALower = colA.toLowerCase();

      if (
        colALower.startsWith("date") ||
        (typeof row[0] === "number" && (row[0] as number) > 40000)
      ) {
        await flushSession();
        currentDate = parseExcelDate(row[0] as string | number);
        currentManager = "";
        currentMenuName = "";
        checklistMenu = false;
        checklistSignage = false;
        checklistCards = false;
        continue;
      }

      if (colALower.includes("manager name")) {
        currentManager = colA.replace(/manager name:\s*/i, "").trim();
      }
      if (colALower.includes("menu name")) {
        currentMenuName = colA.replace(/menu name:\s*/i, "").trim();
      }
      if (colALower.includes("menu package")) {
        checklistMenu = colALower.includes("reviewed and signed");
      }
      if (colALower.includes("digital sign") || colALower.includes("sign boards")) {
        checklistSignage = colALower.includes("checked and confirmed");
      }
      if (colALower.includes("food cards") || colALower.includes("food card")) {
        checklistCards = colALower.includes("checked and conf");
      }

      if (colB && currentDate) {
        pendingItems.push({
          dishName: colB,
          ratings: [colC, colD, colE],
          compliance: colF,
          adjustments: colG,
          ranOutTime: colH,
          serviceGap: colI,
          backupNotes: colJ,
          fteNotes: colK,
          sourceRow: rowIdx + 1,
        });
      }
    }

    await flushSession();
  }

  return result;
}

async function main() {
  const filePath = path.resolve(
    __dirname,
    "..",
    "..",
    "Bldg 21 and Concepts Tasting Tracker 2026.xlsx"
  );

  console.log("ChefPro Seed Importer");
  console.log("=====================");
  console.log(`Source: ${filePath}`);
  console.log();

  const result = await importWorkbook(filePath);

  console.log("\n=== Import Summary ===");
  console.log(`Locations created: ${result.locationsCreated}`);
  console.log(`Sessions created:  ${result.sessionsCreated}`);
  console.log(`Items created:     ${result.itemsCreated}`);

  if (result.errors.length > 0) {
    console.log(`\nErrors (${result.errors.length}):`);
    result.errors.forEach((e) => console.log(`  - ${e}`));
  }

  await prisma.$disconnect();
  await pool.end();
}

main().catch((err) => {
  console.error("Import failed:", err);
  process.exit(1);
});
