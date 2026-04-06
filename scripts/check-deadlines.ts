/**
 * Scheduled job: checks for missed tasting deadlines and fires notifications.
 * Run via: npx tsx scripts/check-deadlines.ts
 * In production, schedule with cron or a managed job runner.
 */
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import { v4 as uuidv4 } from "uuid";

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const dayOfWeek = today.getDay();
  const currentTime = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

  const rules = await prisma.deadlineRule.findMany({
    where: {
      isActive: true,
      daysOfWeek: { has: dayOfWeek },
    },
    include: { location: true, tastingPeriod: true },
  });

  let missedCount = 0;

  for (const rule of rules) {
    if (rule.deadlineTime > currentTime) continue;

    const existing = await prisma.tastingSession.findFirst({
      where: {
        date: today,
        locationId: rule.locationId,
        tastingPeriodId: rule.tastingPeriodId,
        status: { not: "draft" },
      },
    });

    if (existing) continue;

    const entityRef = `${rule.locationId}-${rule.tastingPeriodId}-${today.toISOString().split("T")[0]}`;

    const alreadyNotified = await prisma.notificationEvent.findFirst({
      where: {
        type: "deadline_missed",
        relatedEntityId: entityRef,
        createdAt: { gte: today },
      },
    });

    if (alreadyNotified) continue;

    const admins = await prisma.user.findMany({
      where: { role: { in: ["ops", "fte"] }, isActive: true },
    });

    for (const admin of admins) {
      await prisma.notificationEvent.create({
        data: {
          id: uuidv4(),
          type: "deadline_missed",
          recipientId: admin.id,
          channel: "in_app",
          subject: `Missed deadline: ${rule.location.name} / ${rule.tastingPeriod.name}`,
          body: `No tasting was submitted for ${rule.location.name} (${rule.tastingPeriod.name}) by ${rule.deadlineTime} today.`,
          status: "sent",
          sentAt: now,
          relatedEntityType: "DeadlineRule",
          relatedEntityId: entityRef,
        },
      });
    }

    missedCount++;
    console.log(
      `MISSED: ${rule.location.name} / ${rule.tastingPeriod.name} (deadline ${rule.deadlineTime})`
    );
  }

  console.log(`Checked ${rules.length} rules, found ${missedCount} missed deadline(s).`);

  await prisma.$disconnect();
  await pool.end();
}

main().catch((err) => {
  console.error("Deadline checker failed:", err);
  process.exit(1);
});
