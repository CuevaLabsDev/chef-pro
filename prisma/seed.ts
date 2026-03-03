/**
 * Seeds the database with initial configuration.
 * Run via: npx tsx prisma/seed.ts
 */
import { PrismaClient } from "@prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import bcrypt from "bcryptjs";
import path from "path";
import {
  DEFAULT_SUBTYPE_DEFINITIONS,
  PERMISSION_CATALOG,
} from "../src/modules/identity-access/rbac-config";

const dbPath = path.join(process.cwd(), "chefpro.db");
const adapter = new PrismaBetterSqlite3({ url: `file:${dbPath}` });
const prisma = new PrismaClient({ adapter });

const LOCATIONS = [
  "Urban Breakfast Hot Line",
  "Urban Lunch",
  "Urban FOH Deli, salad, beverage",
  "Harvest",
  "Qinghua Wok",
  "Mezze",
  "Cafe Cart",
  "Urban Pastry",
  "Urban Dinner",
];

async function main() {
  console.log("Seeding ChefPro database...\n");

  const locations = [];
  for (const name of LOCATIONS) {
    const loc = await prisma.location.upsert({
      where: { name },
      update: {},
      create: { name },
    });
    locations.push(loc);
    console.log(`  Location: ${loc.name}`);
  }

  const periods = [
    { name: "Breakfast", sortOrder: 0 },
    { name: "Lunch", sortOrder: 1 },
    { name: "Dinner", sortOrder: 2 },
  ];

  const createdPeriods = [];
  for (const p of periods) {
    const period = await prisma.tastingPeriod.upsert({
      where: { name: p.name },
      update: {},
      create: { name: p.name, sortOrder: p.sortOrder },
    });
    createdPeriods.push(period);
    console.log(`  Period: ${period.name}`);
  }

  const existingSchema = await prisma.ratingSchema.findFirst({
    where: { isActive: true },
  });

  if (!existingSchema) {
    const schema = await prisma.ratingSchema.create({
      data: {
        name: "Standard Tasting v1",
        isActive: true,
        questions: {
          create: [
            {
              label: "Flavor / Aroma",
              type: "star",
              scaleMin: 1,
              scaleMax: 5,
              isRequired: true,
              sortOrder: 0,
            },
            {
              label: "Texture",
              type: "star",
              scaleMin: 1,
              scaleMax: 5,
              isRequired: true,
              sortOrder: 1,
            },
            {
              label: "Presentation",
              type: "star",
              scaleMin: 1,
              scaleMax: 5,
              isRequired: true,
              sortOrder: 2,
            },
          ],
        },
      },
      include: { questions: true },
    });
    console.log(`  Schema: ${schema.name} (${schema.questions.length} questions)`);
  } else {
    console.log(`  Schema: already exists (${existingSchema.name})`);
  }

  const passwordHash = await bcrypt.hash("chefpro123", 12);
  const permissionRecords = await Promise.all(
    PERMISSION_CATALOG.map((permission) =>
      prisma.permission.upsert({
        where: { key: permission.key },
        update: {
          name: permission.name,
          description: permission.description,
        },
        create: {
          key: permission.key,
          name: permission.name,
          description: permission.description,
        },
      })
    )
  );
  const permissionByKey = new Map(
    permissionRecords.map((permission) => [permission.key, permission.id])
  );

  const subtypeIdByRoleCode = new Map<string, string>();
  for (const subtype of DEFAULT_SUBTYPE_DEFINITIONS) {
    const savedSubtype = await prisma.roleSubtype.upsert({
      where: {
        role_code: { role: subtype.role, code: subtype.code },
      },
      update: {
        label: subtype.label,
        isActive: true,
      },
      create: {
        role: subtype.role,
        code: subtype.code,
        label: subtype.label,
      },
    });
    subtypeIdByRoleCode.set(`${subtype.role}:${subtype.code}`, savedSubtype.id);

    await prisma.roleSubtypePermission.deleteMany({
      where: {
        subtypeId: savedSubtype.id,
        permission: { key: { notIn: subtype.permissionKeys } },
      },
    });

    for (const permissionKey of subtype.permissionKeys) {
      const permissionId = permissionByKey.get(permissionKey);
      if (!permissionId) continue;

      await prisma.roleSubtypePermission.upsert({
        where: {
          subtypeId_permissionId: {
            subtypeId: savedSubtype.id,
            permissionId,
          },
        },
        update: { isAllowed: true },
        create: {
          subtypeId: savedSubtype.id,
          permissionId,
          isAllowed: true,
        },
      });
    }
  }
  console.log(
    `  RBAC: ${permissionRecords.length} permissions, ${subtypeIdByRoleCode.size} subtypes`
  );

  const allLocationAccess = locations.map((location) => ({
    locationId: location.id,
  }));

  const chef = await prisma.user.upsert({
    where: { email: "chef@chefpro.demo" },
    update: {
      name: "Demo Chef",
      passwordHash,
      role: "chef",
      roleSubtypeId: subtypeIdByRoleCode.get("chef:sous"),
      locationAccess: {
        deleteMany: {},
        create: allLocationAccess,
      },
      isActive: true,
    },
    create: {
      email: "chef@chefpro.demo",
      name: "Demo Chef",
      passwordHash,
      role: "chef",
      roleSubtypeId: subtypeIdByRoleCode.get("chef:sous"),
      locationAccess: {
        create: allLocationAccess,
      },
    },
  });
  console.log(`  User: ${chef.email} (chef/sous)`);

  const kitchenAdmin = await prisma.user.upsert({
    where: { email: "kitchen@chefpro.demo" },
    update: {
      name: "Demo Kitchen Admin",
      passwordHash,
      role: "kitchen_admin",
      roleSubtypeId: subtypeIdByRoleCode.get("kitchen_admin:kitchen_admin"),
      locationAccess: {
        deleteMany: {},
        create: allLocationAccess,
      },
      isActive: true,
    },
    create: {
      email: "kitchen@chefpro.demo",
      name: "Demo Kitchen Admin",
      passwordHash,
      role: "kitchen_admin",
      roleSubtypeId: subtypeIdByRoleCode.get("kitchen_admin:kitchen_admin"),
      locationAccess: {
        create: allLocationAccess,
      },
    },
  });
  console.log(`  User: ${kitchenAdmin.email} (kitchen_admin)`);

  const foh = await prisma.user.upsert({
    where: { email: "foh@chefpro.demo" },
    update: {
      name: "Demo FOH Manager",
      passwordHash,
      role: "foh",
      roleSubtypeId: subtypeIdByRoleCode.get("foh:foh_manager"),
      locationAccess: {
        deleteMany: {},
        create: allLocationAccess,
      },
      isActive: true,
    },
    create: {
      email: "foh@chefpro.demo",
      name: "Demo FOH Manager",
      passwordHash,
      role: "foh",
      roleSubtypeId: subtypeIdByRoleCode.get("foh:foh_manager"),
      locationAccess: {
        create: allLocationAccess,
      },
    },
  });
  console.log(`  User: ${foh.email} (foh/foh_manager)`);

  const ops = await prisma.user.upsert({
    where: { email: "ops@chefpro.demo" },
    update: {
      name: "Demo Ops",
      passwordHash,
      role: "ops",
      roleSubtypeId: subtypeIdByRoleCode.get("ops:ops"),
      locationAccess: {
        deleteMany: {},
        create: allLocationAccess,
      },
      isActive: true,
    },
    create: {
      email: "ops@chefpro.demo",
      name: "Demo Ops",
      passwordHash,
      role: "ops",
      roleSubtypeId: subtypeIdByRoleCode.get("ops:ops"),
      locationAccess: {
        create: allLocationAccess,
      },
    },
  });
  console.log(`  User: ${ops.email} (ops)`);

  const fte = await prisma.user.upsert({
    where: { email: "fte@chefpro.demo" },
    update: {
      name: "Demo FTE Ops",
      passwordHash,
      role: "fte",
      roleSubtypeId: subtypeIdByRoleCode.get("fte:fte_ops"),
      locationAccess: {
        deleteMany: {},
        create: allLocationAccess,
      },
      isActive: true,
    },
    create: {
      email: "fte@chefpro.demo",
      name: "Demo FTE Ops",
      passwordHash,
      role: "fte",
      roleSubtypeId: subtypeIdByRoleCode.get("fte:fte_ops"),
      locationAccess: {
        create: allLocationAccess,
      },
    },
  });
  console.log(`  User: ${fte.email} (fte/fte_ops)`);

  const weekdays = "1,2,3,4,5";
  const deadlineTimes: Record<string, string> = {
    Breakfast: "09:30",
    Lunch: "13:00",
    Dinner: "19:00",
  };

  for (const loc of locations) {
    for (const period of createdPeriods) {
      const time = deadlineTimes[period.name] ?? "12:00";
      await prisma.deadlineRule.upsert({
        where: {
          locationId_tastingPeriodId: {
            locationId: loc.id,
            tastingPeriodId: period.id,
          },
        },
        update: {},
        create: {
          locationId: loc.id,
          tastingPeriodId: period.id,
          deadlineTime: time,
          daysOfWeek: weekdays,
        },
      });
    }
  }
  console.log(`  Deadline rules: ${locations.length * createdPeriods.length} created/verified`);

  console.log("\nSeed complete!");
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
