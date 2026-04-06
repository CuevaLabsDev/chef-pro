-- CreateEnum
CREATE TYPE "CountSheetStatus" AS ENUM ('draft', 'submitted');

-- CreateTable
CREATE TABLE "CountSheetTemplate" (
    "id" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "tastingPeriodId" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CountSheetTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CountSheetSection" (
    "id" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "group" TEXT,
    "fields" JSONB NOT NULL,
    "sortOrder" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "CountSheetSection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DailyCountSheet" (
    "id" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "status" "CountSheetStatus" NOT NULL DEFAULT 'draft',
    "submittedById" TEXT,
    "submittedAt" TIMESTAMP(3),
    "amendedById" TEXT,
    "amendedAt" TIMESTAMP(3),
    "amendReason" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DailyCountSheet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DailyCountEntry" (
    "id" TEXT NOT NULL,
    "sheetId" TEXT NOT NULL,
    "sectionId" TEXT NOT NULL,
    "values" JSONB NOT NULL DEFAULT '{}',

    CONSTRAINT "DailyCountEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CountSheetTemplate_locationId_tastingPeriodId_key" ON "CountSheetTemplate"("locationId", "tastingPeriodId");

-- CreateIndex
CREATE UNIQUE INDEX "CountSheetSection_templateId_sortOrder_key" ON "CountSheetSection"("templateId", "sortOrder");

-- CreateIndex
CREATE INDEX "DailyCountSheet_date_idx" ON "DailyCountSheet"("date");

-- CreateIndex
CREATE UNIQUE INDEX "DailyCountSheet_templateId_date_key" ON "DailyCountSheet"("templateId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "DailyCountEntry_sheetId_sectionId_key" ON "DailyCountEntry"("sheetId", "sectionId");

-- AddForeignKey
ALTER TABLE "CountSheetTemplate" ADD CONSTRAINT "CountSheetTemplate_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CountSheetTemplate" ADD CONSTRAINT "CountSheetTemplate_tastingPeriodId_fkey" FOREIGN KEY ("tastingPeriodId") REFERENCES "TastingPeriod"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CountSheetSection" ADD CONSTRAINT "CountSheetSection_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "CountSheetTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailyCountSheet" ADD CONSTRAINT "DailyCountSheet_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "CountSheetTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailyCountSheet" ADD CONSTRAINT "DailyCountSheet_submittedById_fkey" FOREIGN KEY ("submittedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailyCountSheet" ADD CONSTRAINT "DailyCountSheet_amendedById_fkey" FOREIGN KEY ("amendedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailyCountEntry" ADD CONSTRAINT "DailyCountEntry_sheetId_fkey" FOREIGN KEY ("sheetId") REFERENCES "DailyCountSheet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailyCountEntry" ADD CONSTRAINT "DailyCountEntry_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "CountSheetSection"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
