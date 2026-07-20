-- Add optional ISO weekday scope to assignment rules so a recurring assignment
-- can apply to just one weekday (e.g. every Monday) instead of every firing day.
ALTER TABLE "AssignmentRule" ADD COLUMN "dayOfWeek" INTEGER;
