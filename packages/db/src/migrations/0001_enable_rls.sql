-- Enable RLS on all tables
ALTER TABLE "users" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "oauth_identities" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "sessions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "subscriptions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "routines" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "tasks" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "task_completions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "tombstones" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "web_push_subscriptions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "notification_schedules" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "audit_log" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ai_request_log" ENABLE ROW LEVEL SECURITY;

-- Create policies for "users"
CREATE POLICY "Users can read own data" ON "users" FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own data" ON "users" FOR UPDATE USING (auth.uid() = id);

-- Create policies for other tables (using user_id)
CREATE POLICY "Users can read own oauth_identities" ON "oauth_identities" FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own oauth_identities" ON "oauth_identities" FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own oauth_identities" ON "oauth_identities" FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own oauth_identities" ON "oauth_identities" FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can read own sessions" ON "sessions" FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own sessions" ON "sessions" FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own sessions" ON "sessions" FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own sessions" ON "sessions" FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can read own subscriptions" ON "subscriptions" FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can read own routines" ON "routines" FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own routines" ON "routines" FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own routines" ON "routines" FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own routines" ON "routines" FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can read own tasks" ON "tasks" FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own tasks" ON "tasks" FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own tasks" ON "tasks" FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own tasks" ON "tasks" FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can read own task_completions" ON "task_completions" FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own task_completions" ON "task_completions" FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own task_completions" ON "task_completions" FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own task_completions" ON "task_completions" FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can read own tombstones" ON "tombstones" FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own tombstones" ON "tombstones" FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can read own web_push_subscriptions" ON "web_push_subscriptions" FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own web_push_subscriptions" ON "web_push_subscriptions" FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own web_push_subscriptions" ON "web_push_subscriptions" FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own web_push_subscriptions" ON "web_push_subscriptions" FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can read own notification_schedules" ON "notification_schedules" FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own notification_schedules" ON "notification_schedules" FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own notification_schedules" ON "notification_schedules" FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own notification_schedules" ON "notification_schedules" FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can read own audit_log" ON "audit_log" FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can read own ai_request_log" ON "ai_request_log" FOR SELECT USING (auth.uid() = user_id);
