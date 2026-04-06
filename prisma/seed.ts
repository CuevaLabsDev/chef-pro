/**
 * Seeds the database with permissions, role subtypes, and demo users.
 * Run via: npx tsx prisma/seed.ts
 */
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";
import {
  DEFAULT_SUBTYPE_DEFINITIONS,
  PERMISSION_CATALOG,
} from "../src/modules/identity-access/rbac-config";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

async function main() {
  console.log("Seeding ChefPro database...\n");

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
        rank: subtype.rank,
        parentSubtypeCode: subtype.parentSubtypeCode,
        isActive: true,
      },
      create: {
        role: subtype.role,
        code: subtype.code,
        label: subtype.label,
        rank: subtype.rank,
        parentSubtypeCode: subtype.parentSubtypeCode,
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

  await prisma.user.upsert({
    where: { email: "chef@chefpro.demo" },
    update: {
      name: "Demo Chef",
      passwordHash,
      role: "chef",
      roleSubtypeId: subtypeIdByRoleCode.get("chef:sous"),
      isActive: true,
    },
    create: {
      email: "chef@chefpro.demo",
      name: "Demo Chef",
      passwordHash,
      role: "chef",
      roleSubtypeId: subtypeIdByRoleCode.get("chef:sous"),
    },
  });
  console.log("  User: chef@chefpro.demo (chef/sous)");

  await prisma.user.upsert({
    where: { email: "kitchen@chefpro.demo" },
    update: {
      name: "Demo Kitchen Admin",
      passwordHash,
      role: "kitchen_admin",
      roleSubtypeId: subtypeIdByRoleCode.get("kitchen_admin:kitchen_admin"),
      isActive: true,
    },
    create: {
      email: "kitchen@chefpro.demo",
      name: "Demo Kitchen Admin",
      passwordHash,
      role: "kitchen_admin",
      roleSubtypeId: subtypeIdByRoleCode.get("kitchen_admin:kitchen_admin"),
    },
  });
  console.log("  User: kitchen@chefpro.demo (kitchen_admin)");

  await prisma.user.upsert({
    where: { email: "kitchen.manager@chefpro.demo" },
    update: {
      name: "Demo Kitchen Admin Manager",
      passwordHash,
      role: "kitchen_admin_manager",
      roleSubtypeId: subtypeIdByRoleCode.get("kitchen_admin_manager:kitchen_admin_manager"),
      isActive: true,
    },
    create: {
      email: "kitchen.manager@chefpro.demo",
      name: "Demo Kitchen Admin Manager",
      passwordHash,
      role: "kitchen_admin_manager",
      roleSubtypeId: subtypeIdByRoleCode.get("kitchen_admin_manager:kitchen_admin_manager"),
    },
  });
  console.log("  User: kitchen.manager@chefpro.demo (kitchen_admin_manager)");

  await prisma.user.upsert({
    where: { email: "foh@chefpro.demo" },
    update: {
      name: "Demo FOH Manager",
      passwordHash,
      role: "foh",
      roleSubtypeId: subtypeIdByRoleCode.get("foh:foh_manager"),
      isActive: true,
    },
    create: {
      email: "foh@chefpro.demo",
      name: "Demo FOH Manager",
      passwordHash,
      role: "foh",
      roleSubtypeId: subtypeIdByRoleCode.get("foh:foh_manager"),
    },
  });
  console.log("  User: foh@chefpro.demo (foh/foh_manager)");

  await prisma.user.upsert({
    where: { email: "ops@chefpro.demo" },
    update: {
      name: "Demo Ops",
      passwordHash,
      role: "ops",
      roleSubtypeId: subtypeIdByRoleCode.get("ops:ops"),
      isActive: true,
    },
    create: {
      email: "ops@chefpro.demo",
      name: "Demo Ops",
      passwordHash,
      role: "ops",
      roleSubtypeId: subtypeIdByRoleCode.get("ops:ops"),
    },
  });
  console.log("  User: ops@chefpro.demo (ops)");

  await prisma.user.upsert({
    where: { email: "fte@chefpro.demo" },
    update: {
      name: "Demo FTE Ops",
      passwordHash,
      role: "fte",
      roleSubtypeId: subtypeIdByRoleCode.get("fte:fte_ops"),
      isActive: true,
    },
    create: {
      email: "fte@chefpro.demo",
      name: "Demo FTE Ops",
      passwordHash,
      role: "fte",
      roleSubtypeId: subtypeIdByRoleCode.get("fte:fte_ops"),
    },
  });
  console.log("  User: fte@chefpro.demo (fte/fte_ops)");

  await prisma.user.upsert({
    where: { email: "fte.chef@chefpro.demo" },
    update: {
      name: "Demo FTE Chef",
      passwordHash,
      role: "fte",
      roleSubtypeId: subtypeIdByRoleCode.get("fte:fte_chef"),
      isActive: true,
    },
    create: {
      email: "fte.chef@chefpro.demo",
      name: "Demo FTE Chef",
      passwordHash,
      role: "fte",
      roleSubtypeId: subtypeIdByRoleCode.get("fte:fte_chef"),
    },
  });
  console.log("  User: fte.chef@chefpro.demo (fte/fte_chef)");

  await prisma.user.upsert({
    where: { email: "assistant.ops@chefpro.demo" },
    update: {
      name: "Demo Assistant Ops",
      passwordHash,
      role: "ops",
      roleSubtypeId: subtypeIdByRoleCode.get("ops:assistant_ops"),
      isActive: true,
    },
    create: {
      email: "assistant.ops@chefpro.demo",
      name: "Demo Assistant Ops",
      passwordHash,
      role: "ops",
      roleSubtypeId: subtypeIdByRoleCode.get("ops:assistant_ops"),
    },
  });
  console.log("  User: assistant.ops@chefpro.demo (ops/assistant_ops)");

  await prisma.user.upsert({
    where: { email: "exec.chef@chefpro.demo" },
    update: {
      name: "Demo Executive Chef",
      passwordHash,
      role: "chef",
      roleSubtypeId: subtypeIdByRoleCode.get("chef:executive"),
      isActive: true,
    },
    create: {
      email: "exec.chef@chefpro.demo",
      name: "Demo Executive Chef",
      passwordHash,
      role: "chef",
      roleSubtypeId: subtypeIdByRoleCode.get("chef:executive"),
    },
  });
  console.log("  User: exec.chef@chefpro.demo (chef/executive)");

  console.log("\nSeed complete!");
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
