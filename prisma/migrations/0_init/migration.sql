-- CreateEnum
CREATE TYPE "WeekStart" AS ENUM ('MONDAY', 'SUNDAY');

-- CreateEnum
CREATE TYPE "Frequency" AS ENUM ('ONCE', 'DAILY', 'WEEKLY', 'CUSTOM_WEEKLY');

-- CreateEnum
CREATE TYPE "CompletionStatus" AS ENUM ('PENDING', 'COMPLETED', 'SKIPPED');

-- CreateEnum
CREATE TYPE "MealType" AS ENUM ('BREAKFAST', 'LUNCH', 'DINNER');

-- CreateEnum
CREATE TYPE "MealPlanType" AS ENUM ('HOME_COOKED', 'RESTAURANT', 'TAKEOUT', 'LEFTOVERS', 'OTHER');

-- CreateTable
CREATE TABLE "Household" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "timezone" TEXT NOT NULL DEFAULT 'Asia/Jerusalem',
    "weekStartsOn" "WeekStart" NOT NULL DEFAULT 'SUNDAY',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Household_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FamilyMember" (
    "id" TEXT NOT NULL,
    "householdId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT,
    "emoji" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FamilyMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChoreCategory" (
    "id" TEXT NOT NULL,
    "householdId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isMealCategory" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChoreCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChoreTemplate" (
    "id" TEXT NOT NULL,
    "householdId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "defaultTime" TEXT,
    "timeSlotLabel" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isMeal" BOOLEAN NOT NULL DEFAULT false,
    "mealType" "MealType",
    "seedKey" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChoreTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RecurrenceRule" (
    "id" TEXT NOT NULL,
    "choreTemplateId" TEXT NOT NULL,
    "frequency" "Frequency" NOT NULL DEFAULT 'WEEKLY',
    "interval" INTEGER NOT NULL DEFAULT 1,
    "daysOfWeek" INTEGER[],
    "startDate" DATE NOT NULL,
    "endDate" DATE,
    "time" TEXT,
    "timezone" TEXT NOT NULL DEFAULT 'Asia/Jerusalem',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RecurrenceRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AssignmentRule" (
    "id" TEXT NOT NULL,
    "recurrenceRuleId" TEXT NOT NULL,
    "familyMemberId" TEXT,
    "effectiveFrom" DATE NOT NULL,
    "effectiveUntil" DATE,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AssignmentRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChoreOccurrenceOverride" (
    "id" TEXT NOT NULL,
    "choreTemplateId" TEXT NOT NULL,
    "occurrenceDate" DATE NOT NULL,
    "recurrenceRuleId" TEXT,
    "assignedMemberId" TEXT,
    "hasAssignment" BOOLEAN NOT NULL DEFAULT false,
    "nameOverride" TEXT,
    "timeOverride" TEXT,
    "isCancelled" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChoreOccurrenceOverride_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChoreCompletion" (
    "id" TEXT NOT NULL,
    "choreTemplateId" TEXT NOT NULL,
    "occurrenceDate" DATE NOT NULL,
    "recurrenceRuleId" TEXT,
    "status" "CompletionStatus" NOT NULL DEFAULT 'PENDING',
    "completedAt" TIMESTAMP(3),
    "completedByMemberId" TEXT,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChoreCompletion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MealPlan" (
    "id" TEXT NOT NULL,
    "choreTemplateId" TEXT NOT NULL,
    "occurrenceDate" DATE NOT NULL,
    "recurrenceRuleId" TEXT,
    "mealType" "MealType" NOT NULL,
    "planType" "MealPlanType",
    "assignedMemberId" TEXT,
    "description" TEXT,
    "recipeUrl" TEXT,
    "restaurantName" TEXT,
    "restaurantUrl" TEXT,
    "takeoutProvider" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MealPlan_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FamilyMember_householdId_idx" ON "FamilyMember"("householdId");

-- CreateIndex
CREATE INDEX "FamilyMember_householdId_isActive_idx" ON "FamilyMember"("householdId", "isActive");

-- CreateIndex
CREATE INDEX "ChoreCategory_householdId_idx" ON "ChoreCategory"("householdId");

-- CreateIndex
CREATE INDEX "ChoreCategory_householdId_sortOrder_idx" ON "ChoreCategory"("householdId", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "ChoreCategory_householdId_name_key" ON "ChoreCategory"("householdId", "name");

-- CreateIndex
CREATE INDEX "ChoreTemplate_householdId_idx" ON "ChoreTemplate"("householdId");

-- CreateIndex
CREATE INDEX "ChoreTemplate_householdId_isActive_idx" ON "ChoreTemplate"("householdId", "isActive");

-- CreateIndex
CREATE INDEX "ChoreTemplate_categoryId_idx" ON "ChoreTemplate"("categoryId");

-- CreateIndex
CREATE UNIQUE INDEX "ChoreTemplate_householdId_seedKey_key" ON "ChoreTemplate"("householdId", "seedKey");

-- CreateIndex
CREATE INDEX "RecurrenceRule_choreTemplateId_idx" ON "RecurrenceRule"("choreTemplateId");

-- CreateIndex
CREATE INDEX "RecurrenceRule_choreTemplateId_isActive_idx" ON "RecurrenceRule"("choreTemplateId", "isActive");

-- CreateIndex
CREATE INDEX "AssignmentRule_recurrenceRuleId_idx" ON "AssignmentRule"("recurrenceRuleId");

-- CreateIndex
CREATE INDEX "AssignmentRule_recurrenceRuleId_effectiveFrom_idx" ON "AssignmentRule"("recurrenceRuleId", "effectiveFrom");

-- CreateIndex
CREATE INDEX "ChoreOccurrenceOverride_choreTemplateId_idx" ON "ChoreOccurrenceOverride"("choreTemplateId");

-- CreateIndex
CREATE INDEX "ChoreOccurrenceOverride_occurrenceDate_idx" ON "ChoreOccurrenceOverride"("occurrenceDate");

-- CreateIndex
CREATE UNIQUE INDEX "ChoreOccurrenceOverride_choreTemplateId_occurrenceDate_key" ON "ChoreOccurrenceOverride"("choreTemplateId", "occurrenceDate");

-- CreateIndex
CREATE INDEX "ChoreCompletion_choreTemplateId_idx" ON "ChoreCompletion"("choreTemplateId");

-- CreateIndex
CREATE INDEX "ChoreCompletion_occurrenceDate_idx" ON "ChoreCompletion"("occurrenceDate");

-- CreateIndex
CREATE UNIQUE INDEX "ChoreCompletion_choreTemplateId_occurrenceDate_key" ON "ChoreCompletion"("choreTemplateId", "occurrenceDate");

-- CreateIndex
CREATE INDEX "MealPlan_choreTemplateId_idx" ON "MealPlan"("choreTemplateId");

-- CreateIndex
CREATE INDEX "MealPlan_occurrenceDate_idx" ON "MealPlan"("occurrenceDate");

-- CreateIndex
CREATE UNIQUE INDEX "MealPlan_choreTemplateId_occurrenceDate_key" ON "MealPlan"("choreTemplateId", "occurrenceDate");

-- AddForeignKey
ALTER TABLE "FamilyMember" ADD CONSTRAINT "FamilyMember_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "Household"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChoreCategory" ADD CONSTRAINT "ChoreCategory_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "Household"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChoreTemplate" ADD CONSTRAINT "ChoreTemplate_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "Household"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChoreTemplate" ADD CONSTRAINT "ChoreTemplate_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "ChoreCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecurrenceRule" ADD CONSTRAINT "RecurrenceRule_choreTemplateId_fkey" FOREIGN KEY ("choreTemplateId") REFERENCES "ChoreTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssignmentRule" ADD CONSTRAINT "AssignmentRule_recurrenceRuleId_fkey" FOREIGN KEY ("recurrenceRuleId") REFERENCES "RecurrenceRule"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssignmentRule" ADD CONSTRAINT "AssignmentRule_familyMemberId_fkey" FOREIGN KEY ("familyMemberId") REFERENCES "FamilyMember"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChoreOccurrenceOverride" ADD CONSTRAINT "ChoreOccurrenceOverride_choreTemplateId_fkey" FOREIGN KEY ("choreTemplateId") REFERENCES "ChoreTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChoreOccurrenceOverride" ADD CONSTRAINT "ChoreOccurrenceOverride_assignedMemberId_fkey" FOREIGN KEY ("assignedMemberId") REFERENCES "FamilyMember"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChoreCompletion" ADD CONSTRAINT "ChoreCompletion_choreTemplateId_fkey" FOREIGN KEY ("choreTemplateId") REFERENCES "ChoreTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChoreCompletion" ADD CONSTRAINT "ChoreCompletion_completedByMemberId_fkey" FOREIGN KEY ("completedByMemberId") REFERENCES "FamilyMember"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MealPlan" ADD CONSTRAINT "MealPlan_choreTemplateId_fkey" FOREIGN KEY ("choreTemplateId") REFERENCES "ChoreTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MealPlan" ADD CONSTRAINT "MealPlan_assignedMemberId_fkey" FOREIGN KEY ("assignedMemberId") REFERENCES "FamilyMember"("id") ON DELETE SET NULL ON UPDATE CASCADE;

