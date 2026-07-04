-- Recurrence Optimization Indexes
-- These indexes optimize the recurrence worker queries and notification cleanup

-- Compound index for recurrence worker optimization
-- Improves queries that filter by user_id, scheduled_at, and parent_task_id
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_tasks_recurrence_optimization" 
ON "tasks" USING btree ("user_id", "scheduled_at", "parent_task_id")
WHERE "deleted_at" IS NULL;

-- Index for notification cleanup
-- Improves deletion of un-sent notifications when tasks are updated
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_notifications_cleanup" 
ON "notification_schedules" USING btree ("task_id", "sent_at", "failed_at")
WHERE "sent_at" IS NULL AND "failed_at" IS NULL;

-- Index for recurrence rule lookups
-- Improves queries that filter recurrences by user
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_recurrences_user_active" 
ON "task_recurrences" USING btree ("user_id", "created_at");

-- Comment for understanding:
-- These indexes are critical for the recurrence worker performance optimization
-- They should significantly reduce query times as the user base grows