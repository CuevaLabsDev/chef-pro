-- CreateTable
CREATE TABLE "OperationalAudit" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "auditDate" DATE NOT NULL,
    "submittedById" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'processing',
    "summary" TEXT,
    "ruleSet" JSONB NOT NULL DEFAULT '{}',
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "modelName" TEXT,
    "promptVersion" TEXT NOT NULL,
    "schemaVersion" TEXT NOT NULL,
    "errorMessage" TEXT,
    "needsHumanReview" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OperationalAudit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OperationalAuditAsset" (
    "id" TEXT NOT NULL,
    "auditId" TEXT NOT NULL,
    "bucket" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "fileType" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "uploadedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OperationalAuditAsset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClosingPhoto" (
    "id" TEXT NOT NULL,
    "auditId" TEXT NOT NULL,
    "assetId" TEXT,
    "category" TEXT NOT NULL,
    "cleanlinessScore" DOUBLE PRECISION,
    "assessment" TEXT,
    "visibleFindings" JSONB NOT NULL DEFAULT '[]',
    "confidence" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClosingPhoto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TemperatureLog" (
    "id" TEXT NOT NULL,
    "auditId" TEXT NOT NULL,
    "sourceAssetId" TEXT,
    "generatedPdfAssetId" TEXT,
    "extractedBy" TEXT,
    "summary" TEXT,
    "documentDate" DATE,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TemperatureLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TemperatureEntry" (
    "id" TEXT NOT NULL,
    "temperatureLogId" TEXT NOT NULL,
    "entryTime" TEXT,
    "stationName" TEXT,
    "itemName" TEXT,
    "holdingType" TEXT NOT NULL DEFAULT 'unknown',
    "temperatureRaw" TEXT,
    "temperatureF" DOUBLE PRECISION,
    "unit" TEXT,
    "initials" TEXT,
    "notes" TEXT,
    "confidence" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "complianceStatus" TEXT NOT NULL DEFAULT 'needs_review',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TemperatureEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ComplianceIssue" (
    "id" TEXT NOT NULL,
    "auditId" TEXT NOT NULL,
    "closingPhotoId" TEXT,
    "temperatureEntryId" TEXT,
    "severity" TEXT NOT NULL DEFAULT 'medium',
    "status" TEXT NOT NULL DEFAULT 'open',
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "recommendation" TEXT,
    "confidence" DOUBLE PRECISION,
    "ruleCode" TEXT,
    "resolvedById" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ComplianceIssue_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "OperationalAudit_locationId_auditDate_idx" ON "OperationalAudit"("locationId", "auditDate");

-- CreateIndex
CREATE INDEX "OperationalAudit_type_status_idx" ON "OperationalAudit"("type", "status");

-- CreateIndex
CREATE INDEX "OperationalAudit_submittedById_idx" ON "OperationalAudit"("submittedById");

-- CreateIndex
CREATE INDEX "OperationalAuditAsset_auditId_idx" ON "OperationalAuditAsset"("auditId");

-- CreateIndex
CREATE INDEX "OperationalAuditAsset_uploadedById_idx" ON "OperationalAuditAsset"("uploadedById");

-- CreateIndex
CREATE UNIQUE INDEX "OperationalAuditAsset_bucket_storageKey_key" ON "OperationalAuditAsset"("bucket", "storageKey");

-- CreateIndex
CREATE UNIQUE INDEX "ClosingPhoto_assetId_key" ON "ClosingPhoto"("assetId");

-- CreateIndex
CREATE INDEX "ClosingPhoto_auditId_category_idx" ON "ClosingPhoto"("auditId", "category");

-- CreateIndex
CREATE UNIQUE INDEX "TemperatureLog_auditId_key" ON "TemperatureLog"("auditId");

-- CreateIndex
CREATE INDEX "TemperatureLog_sourceAssetId_idx" ON "TemperatureLog"("sourceAssetId");

-- CreateIndex
CREATE INDEX "TemperatureLog_generatedPdfAssetId_idx" ON "TemperatureLog"("generatedPdfAssetId");

-- CreateIndex
CREATE INDEX "TemperatureEntry_temperatureLogId_idx" ON "TemperatureEntry"("temperatureLogId");

-- CreateIndex
CREATE INDEX "TemperatureEntry_complianceStatus_idx" ON "TemperatureEntry"("complianceStatus");

-- CreateIndex
CREATE INDEX "ComplianceIssue_auditId_status_idx" ON "ComplianceIssue"("auditId", "status");

-- CreateIndex
CREATE INDEX "ComplianceIssue_severity_status_idx" ON "ComplianceIssue"("severity", "status");

-- CreateIndex
CREATE INDEX "ComplianceIssue_resolvedById_idx" ON "ComplianceIssue"("resolvedById");

-- AddForeignKey
ALTER TABLE "OperationalAudit" ADD CONSTRAINT "OperationalAudit_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OperationalAudit" ADD CONSTRAINT "OperationalAudit_submittedById_fkey" FOREIGN KEY ("submittedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OperationalAuditAsset" ADD CONSTRAINT "OperationalAuditAsset_auditId_fkey" FOREIGN KEY ("auditId") REFERENCES "OperationalAudit"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OperationalAuditAsset" ADD CONSTRAINT "OperationalAuditAsset_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClosingPhoto" ADD CONSTRAINT "ClosingPhoto_auditId_fkey" FOREIGN KEY ("auditId") REFERENCES "OperationalAudit"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClosingPhoto" ADD CONSTRAINT "ClosingPhoto_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "OperationalAuditAsset"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TemperatureLog" ADD CONSTRAINT "TemperatureLog_auditId_fkey" FOREIGN KEY ("auditId") REFERENCES "OperationalAudit"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TemperatureLog" ADD CONSTRAINT "TemperatureLog_sourceAssetId_fkey" FOREIGN KEY ("sourceAssetId") REFERENCES "OperationalAuditAsset"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TemperatureLog" ADD CONSTRAINT "TemperatureLog_generatedPdfAssetId_fkey" FOREIGN KEY ("generatedPdfAssetId") REFERENCES "OperationalAuditAsset"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TemperatureEntry" ADD CONSTRAINT "TemperatureEntry_temperatureLogId_fkey" FOREIGN KEY ("temperatureLogId") REFERENCES "TemperatureLog"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComplianceIssue" ADD CONSTRAINT "ComplianceIssue_auditId_fkey" FOREIGN KEY ("auditId") REFERENCES "OperationalAudit"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComplianceIssue" ADD CONSTRAINT "ComplianceIssue_closingPhotoId_fkey" FOREIGN KEY ("closingPhotoId") REFERENCES "ClosingPhoto"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComplianceIssue" ADD CONSTRAINT "ComplianceIssue_temperatureEntryId_fkey" FOREIGN KEY ("temperatureEntryId") REFERENCES "TemperatureEntry"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComplianceIssue" ADD CONSTRAINT "ComplianceIssue_resolvedById_fkey" FOREIGN KEY ("resolvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- RBAC catalog upsert for deployments where seed is not run immediately.
INSERT INTO "Permission" ("id", "key", "name", "description", "createdAt")
VALUES
  ('perm_compliance_record', 'compliance.record', 'Record Compliance Evidence', 'Upload closing photos and temperature log evidence for assigned locations.', CURRENT_TIMESTAMP),
  ('perm_compliance_view', 'compliance.view', 'View Compliance Audits', 'View AI-assisted closing verification and temperature log audits.', CURRENT_TIMESTAMP),
  ('perm_compliance_manage', 'compliance.manage', 'Manage Compliance Audits', 'Reanalyze audits and update AI-assisted compliance issue status.', CURRENT_TIMESTAMP)
ON CONFLICT ("key") DO UPDATE
SET
  "name" = EXCLUDED."name",
  "description" = EXCLUDED."description";

INSERT INTO "RoleSubtypePermission" ("id", "subtypeId", "permissionId", "isAllowed", "createdAt", "updatedAt")
SELECT concat('rsp_', md5(rs."id" || p."id")), rs."id", p."id", true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "RoleSubtype" rs
JOIN "Permission" p ON p."key" IN ('compliance.record', 'compliance.view', 'compliance.manage')
WHERE rs."code" IN ('fte_ops', 'fte_chef', 'ops')
ON CONFLICT ("subtypeId", "permissionId") DO UPDATE
SET "isAllowed" = true, "updatedAt" = CURRENT_TIMESTAMP;

INSERT INTO "RoleSubtypePermission" ("id", "subtypeId", "permissionId", "isAllowed", "createdAt", "updatedAt")
SELECT concat('rsp_', md5(rs."id" || p."id")), rs."id", p."id", true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "RoleSubtype" rs
JOIN "Permission" p ON p."key" IN ('compliance.record', 'compliance.view')
WHERE rs."code" IN ('executive')
ON CONFLICT ("subtypeId", "permissionId") DO UPDATE
SET "isAllowed" = true, "updatedAt" = CURRENT_TIMESTAMP;

INSERT INTO "RoleSubtypePermission" ("id", "subtypeId", "permissionId", "isAllowed", "createdAt", "updatedAt")
SELECT concat('rsp_', md5(rs."id" || p."id")), rs."id", p."id", true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "RoleSubtype" rs
JOIN "Permission" p ON p."key" = 'compliance.record'
WHERE rs."code" IN ('sr_sous', 'sous', 'jr_sous', 'foh_manager', 'assistant_foh')
ON CONFLICT ("subtypeId", "permissionId") DO UPDATE
SET "isAllowed" = true, "updatedAt" = CURRENT_TIMESTAMP;
