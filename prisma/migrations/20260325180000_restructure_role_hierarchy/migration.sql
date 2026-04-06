-- Migrate any ops_admin users to ops before removing the enum value
UPDATE "User" SET "role" = 'ops' WHERE "role" = 'ops_admin';

-- Remove ops_admin from the Role enum
ALTER TYPE "Role" RENAME TO "Role_old";
CREATE TYPE "Role" AS ENUM ('fte', 'ops', 'kitchen_admin', 'kitchen_admin_manager', 'chef', 'foh');
ALTER TABLE "User" ALTER COLUMN "role" DROP DEFAULT;
ALTER TABLE "User" ALTER COLUMN "role" TYPE "Role" USING ("role"::text::"Role");
ALTER TABLE "User" ALTER COLUMN "role" SET DEFAULT 'chef';
ALTER TABLE "RoleSubtype" ALTER COLUMN "role" TYPE "Role" USING ("role"::text::"Role");
DROP TYPE "Role_old";

-- Add rank and parentSubtypeCode columns to RoleSubtype
ALTER TABLE "RoleSubtype" ADD COLUMN "rank" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "RoleSubtype" ADD COLUMN "parentSubtypeCode" TEXT;

-- Add unique constraint on code (needed for the self-relation)
CREATE UNIQUE INDEX "RoleSubtype_code_key" ON "RoleSubtype"("code");

-- Add self-referential FK for hierarchy
ALTER TABLE "RoleSubtype" ADD CONSTRAINT "RoleSubtype_parentSubtypeCode_fkey" FOREIGN KEY ("parentSubtypeCode") REFERENCES "RoleSubtype"("code") ON DELETE SET NULL ON UPDATE CASCADE;

-- Rename cafe_chef subtype to fte_chef
UPDATE "RoleSubtype" SET "code" = 'fte_chef', "label" = 'FTE Chef' WHERE "role" = 'fte' AND "code" = 'cafe_chef';
