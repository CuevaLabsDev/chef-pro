-- CreateEnum
CREATE TYPE "Role" AS ENUM ('fte', 'ops', 'ops_admin', 'kitchen_admin', 'kitchen_admin_manager', 'chef', 'foh');

-- CreateEnum
CREATE TYPE "PacketItemCategory" AS ENUM ('entree', 'vegetarian_entree', 'vegan_entree', 'starches', 'vegetables', 'sides', 'pastry', 'back_up');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'chef',
    "roleSubtypeId" TEXT,
    "roleLabel" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserLocationAccess" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserLocationAccess_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Permission" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Permission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RoleSubtype" (
    "id" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "code" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RoleSubtype_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RoleSubtypePermission" (
    "id" TEXT NOT NULL,
    "subtypeId" TEXT NOT NULL,
    "permissionId" TEXT NOT NULL,
    "isAllowed" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RoleSubtypePermission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserPermissionOverride" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "permissionId" TEXT NOT NULL,
    "isAllowed" BOOLEAN NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserPermissionOverride_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KitchenAdminManagerAssignment" (
    "id" TEXT NOT NULL,
    "managerId" TEXT NOT NULL,
    "kitchenAdminId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "KitchenAdminManagerAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Campus" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Campus_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Building" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "campusId" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Building_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Location" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "buildingId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Location_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TastingPeriod" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "TastingPeriod_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DeadlineRule" (
    "id" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "tastingPeriodId" TEXT NOT NULL,
    "deadlineTime" TEXT NOT NULL,
    "packetDueTime" TEXT,
    "tastingStart" TEXT,
    "tastingEnd" TEXT,
    "serviceStart" TEXT,
    "daysOfWeek" INTEGER[] DEFAULT ARRAY[1, 2, 3, 4, 5]::INTEGER[],
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DeadlineRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RatingSchema" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RatingSchema_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RatingQuestion" (
    "id" TEXT NOT NULL,
    "schemaId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "description" TEXT,
    "type" TEXT NOT NULL DEFAULT 'star',
    "scaleMin" INTEGER,
    "scaleMax" INTEGER,
    "options" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "isRequired" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL,

    CONSTRAINT "RatingQuestion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TastingSession" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "locationId" TEXT NOT NULL,
    "tastingPeriodId" TEXT NOT NULL,
    "chefId" TEXT,
    "managerName" TEXT,
    "menuName" TEXT,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "checklistMenuPackage" BOOLEAN NOT NULL DEFAULT false,
    "checklistDigitalSignage" BOOLEAN NOT NULL DEFAULT false,
    "checklistFoodCards" BOOLEAN NOT NULL DEFAULT false,
    "checklistNotes" TEXT,
    "submittedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TastingSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TastingItem" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "dishName" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL,
    "temperatureCompliance" TEXT NOT NULL DEFAULT 'not_checked',
    "adjustmentsNeeded" TEXT,
    "ranOutTime" TEXT,
    "serviceGapMins" INTEGER,
    "backupNotes" TEXT,
    "fteNotes" TEXT,
    "photoUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TastingItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RatingResponse" (
    "id" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "numericValue" DOUBLE PRECISION,
    "textValue" TEXT,

    CONSTRAINT "RatingResponse_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MenuSignagePacket" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "locationId" TEXT NOT NULL,
    "meal" TEXT NOT NULL,
    "theme" TEXT,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "checklistMenuPackage" BOOLEAN NOT NULL DEFAULT false,
    "checklistDigitalSignage" BOOLEAN NOT NULL DEFAULT false,
    "checklistFoodCards" BOOLEAN NOT NULL DEFAULT false,
    "checklistNotes" TEXT,
    "backupReady" BOOLEAN NOT NULL DEFAULT false,
    "backupUsed" BOOLEAN NOT NULL DEFAULT false,
    "backupNotes" TEXT,
    "createdById" TEXT NOT NULL,
    "assignedChefId" TEXT,
    "publishedById" TEXT,
    "publishedAt" TIMESTAMP(3),
    "readyForFinalReviewById" TEXT,
    "readyForFinalReviewAt" TIMESTAMP(3),
    "finalizedForServiceById" TEXT,
    "finalizedForServiceAt" TIMESTAMP(3),
    "tastingSessionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MenuSignagePacket_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MenuSignageItem" (
    "id" TEXT NOT NULL,
    "packetId" TEXT NOT NULL,
    "category" "PacketItemCategory" NOT NULL,
    "itemName" TEXT NOT NULL,
    "ingredients" TEXT NOT NULL,
    "theme" TEXT,
    "dietTags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "allergenTags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "sortOrder" INTEGER NOT NULL,
    "isReadyForService" BOOLEAN NOT NULL DEFAULT false,
    "wasUsed" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MenuSignageItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PacketReviewSignature" (
    "id" TEXT NOT NULL,
    "packetId" TEXT NOT NULL,
    "signerId" TEXT NOT NULL,
    "signerNameInput" TEXT NOT NULL,
    "signerRole" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PacketReviewSignature_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PacketAmendment" (
    "id" TEXT NOT NULL,
    "packetId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "itemId" TEXT,
    "requestedById" TEXT NOT NULL,
    "resolvedById" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PacketAmendment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReviewAction" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "reviewerId" TEXT NOT NULL,
    "fromStatus" TEXT NOT NULL,
    "toStatus" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReviewAction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditEvent" (
    "id" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "actorName" TEXT NOT NULL,
    "fieldName" TEXT,
    "oldValue" TEXT,
    "newValue" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NotificationEvent" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "recipientId" TEXT NOT NULL,
    "channel" TEXT NOT NULL DEFAULT 'in_app',
    "subject" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "relatedEntityType" TEXT,
    "relatedEntityId" TEXT,
    "sentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NotificationEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PushSubscription" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "p256dh" TEXT NOT NULL,
    "auth" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PushSubscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExportJob" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "format" TEXT NOT NULL,
    "filters" JSONB NOT NULL DEFAULT '{}',
    "requestedById" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'queued',
    "fileUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "ExportJob_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "UserLocationAccess_userId_locationId_key" ON "UserLocationAccess"("userId", "locationId");

-- CreateIndex
CREATE UNIQUE INDEX "Permission_key_key" ON "Permission"("key");

-- CreateIndex
CREATE UNIQUE INDEX "RoleSubtype_role_code_key" ON "RoleSubtype"("role", "code");

-- CreateIndex
CREATE UNIQUE INDEX "RoleSubtypePermission_subtypeId_permissionId_key" ON "RoleSubtypePermission"("subtypeId", "permissionId");

-- CreateIndex
CREATE UNIQUE INDEX "UserPermissionOverride_userId_permissionId_key" ON "UserPermissionOverride"("userId", "permissionId");

-- CreateIndex
CREATE INDEX "KitchenAdminManagerAssignment_managerId_idx" ON "KitchenAdminManagerAssignment"("managerId");

-- CreateIndex
CREATE INDEX "KitchenAdminManagerAssignment_kitchenAdminId_idx" ON "KitchenAdminManagerAssignment"("kitchenAdminId");

-- CreateIndex
CREATE UNIQUE INDEX "KitchenAdminManagerAssignment_managerId_kitchenAdminId_key" ON "KitchenAdminManagerAssignment"("managerId", "kitchenAdminId");

-- CreateIndex
CREATE UNIQUE INDEX "Campus_name_key" ON "Campus"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Building_campusId_name_key" ON "Building"("campusId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "Location_name_key" ON "Location"("name");

-- CreateIndex
CREATE UNIQUE INDEX "TastingPeriod_name_key" ON "TastingPeriod"("name");

-- CreateIndex
CREATE UNIQUE INDEX "DeadlineRule_locationId_tastingPeriodId_key" ON "DeadlineRule"("locationId", "tastingPeriodId");

-- CreateIndex
CREATE UNIQUE INDEX "TastingSession_date_locationId_tastingPeriodId_chefId_key" ON "TastingSession"("date", "locationId", "tastingPeriodId", "chefId");

-- CreateIndex
CREATE UNIQUE INDEX "RatingResponse_itemId_questionId_key" ON "RatingResponse"("itemId", "questionId");

-- CreateIndex
CREATE UNIQUE INDEX "MenuSignagePacket_tastingSessionId_key" ON "MenuSignagePacket"("tastingSessionId");

-- CreateIndex
CREATE INDEX "MenuSignagePacket_locationId_date_idx" ON "MenuSignagePacket"("locationId", "date");

-- CreateIndex
CREATE INDEX "MenuSignagePacket_status_idx" ON "MenuSignagePacket"("status");

-- CreateIndex
CREATE UNIQUE INDEX "MenuSignagePacket_date_locationId_meal_key" ON "MenuSignagePacket"("date", "locationId", "meal");

-- CreateIndex
CREATE INDEX "MenuSignageItem_packetId_category_idx" ON "MenuSignageItem"("packetId", "category");

-- CreateIndex
CREATE INDEX "PacketReviewSignature_packetId_createdAt_idx" ON "PacketReviewSignature"("packetId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "PacketReviewSignature_packetId_signerId_key" ON "PacketReviewSignature"("packetId", "signerId");

-- CreateIndex
CREATE INDEX "PacketAmendment_packetId_status_idx" ON "PacketAmendment"("packetId", "status");

-- CreateIndex
CREATE INDEX "PacketAmendment_packetId_createdAt_idx" ON "PacketAmendment"("packetId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditEvent_entityType_entityId_idx" ON "AuditEvent"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "AuditEvent_actorId_idx" ON "AuditEvent"("actorId");

-- CreateIndex
CREATE INDEX "AuditEvent_createdAt_idx" ON "AuditEvent"("createdAt");

-- CreateIndex
CREATE INDEX "NotificationEvent_recipientId_status_idx" ON "NotificationEvent"("recipientId", "status");

-- CreateIndex
CREATE INDEX "NotificationEvent_createdAt_idx" ON "NotificationEvent"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "PushSubscription_endpoint_key" ON "PushSubscription"("endpoint");

-- CreateIndex
CREATE INDEX "PushSubscription_userId_idx" ON "PushSubscription"("userId");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_roleSubtypeId_fkey" FOREIGN KEY ("roleSubtypeId") REFERENCES "RoleSubtype"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserLocationAccess" ADD CONSTRAINT "UserLocationAccess_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserLocationAccess" ADD CONSTRAINT "UserLocationAccess_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoleSubtypePermission" ADD CONSTRAINT "RoleSubtypePermission_subtypeId_fkey" FOREIGN KEY ("subtypeId") REFERENCES "RoleSubtype"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoleSubtypePermission" ADD CONSTRAINT "RoleSubtypePermission_permissionId_fkey" FOREIGN KEY ("permissionId") REFERENCES "Permission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserPermissionOverride" ADD CONSTRAINT "UserPermissionOverride_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserPermissionOverride" ADD CONSTRAINT "UserPermissionOverride_permissionId_fkey" FOREIGN KEY ("permissionId") REFERENCES "Permission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KitchenAdminManagerAssignment" ADD CONSTRAINT "KitchenAdminManagerAssignment_managerId_fkey" FOREIGN KEY ("managerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KitchenAdminManagerAssignment" ADD CONSTRAINT "KitchenAdminManagerAssignment_kitchenAdminId_fkey" FOREIGN KEY ("kitchenAdminId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Building" ADD CONSTRAINT "Building_campusId_fkey" FOREIGN KEY ("campusId") REFERENCES "Campus"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Location" ADD CONSTRAINT "Location_buildingId_fkey" FOREIGN KEY ("buildingId") REFERENCES "Building"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeadlineRule" ADD CONSTRAINT "DeadlineRule_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeadlineRule" ADD CONSTRAINT "DeadlineRule_tastingPeriodId_fkey" FOREIGN KEY ("tastingPeriodId") REFERENCES "TastingPeriod"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RatingQuestion" ADD CONSTRAINT "RatingQuestion_schemaId_fkey" FOREIGN KEY ("schemaId") REFERENCES "RatingSchema"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TastingSession" ADD CONSTRAINT "TastingSession_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TastingSession" ADD CONSTRAINT "TastingSession_tastingPeriodId_fkey" FOREIGN KEY ("tastingPeriodId") REFERENCES "TastingPeriod"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TastingSession" ADD CONSTRAINT "TastingSession_chefId_fkey" FOREIGN KEY ("chefId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TastingItem" ADD CONSTRAINT "TastingItem_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "TastingSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RatingResponse" ADD CONSTRAINT "RatingResponse_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "TastingItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RatingResponse" ADD CONSTRAINT "RatingResponse_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "RatingQuestion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MenuSignagePacket" ADD CONSTRAINT "MenuSignagePacket_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MenuSignagePacket" ADD CONSTRAINT "MenuSignagePacket_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MenuSignagePacket" ADD CONSTRAINT "MenuSignagePacket_assignedChefId_fkey" FOREIGN KEY ("assignedChefId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MenuSignagePacket" ADD CONSTRAINT "MenuSignagePacket_publishedById_fkey" FOREIGN KEY ("publishedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MenuSignagePacket" ADD CONSTRAINT "MenuSignagePacket_readyForFinalReviewById_fkey" FOREIGN KEY ("readyForFinalReviewById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MenuSignagePacket" ADD CONSTRAINT "MenuSignagePacket_finalizedForServiceById_fkey" FOREIGN KEY ("finalizedForServiceById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MenuSignagePacket" ADD CONSTRAINT "MenuSignagePacket_tastingSessionId_fkey" FOREIGN KEY ("tastingSessionId") REFERENCES "TastingSession"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MenuSignageItem" ADD CONSTRAINT "MenuSignageItem_packetId_fkey" FOREIGN KEY ("packetId") REFERENCES "MenuSignagePacket"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PacketReviewSignature" ADD CONSTRAINT "PacketReviewSignature_packetId_fkey" FOREIGN KEY ("packetId") REFERENCES "MenuSignagePacket"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PacketReviewSignature" ADD CONSTRAINT "PacketReviewSignature_signerId_fkey" FOREIGN KEY ("signerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PacketAmendment" ADD CONSTRAINT "PacketAmendment_packetId_fkey" FOREIGN KEY ("packetId") REFERENCES "MenuSignagePacket"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PacketAmendment" ADD CONSTRAINT "PacketAmendment_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "MenuSignageItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PacketAmendment" ADD CONSTRAINT "PacketAmendment_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PacketAmendment" ADD CONSTRAINT "PacketAmendment_resolvedById_fkey" FOREIGN KEY ("resolvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReviewAction" ADD CONSTRAINT "ReviewAction_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "TastingSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReviewAction" ADD CONSTRAINT "ReviewAction_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditEvent" ADD CONSTRAINT "AuditEvent_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotificationEvent" ADD CONSTRAINT "NotificationEvent_recipientId_fkey" FOREIGN KEY ("recipientId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PushSubscription" ADD CONSTRAINT "PushSubscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExportJob" ADD CONSTRAINT "ExportJob_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
