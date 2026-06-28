import {
  pgTable, pgEnum, uuid, text, boolean, integer,
  smallint, decimal, timestamp, date, time, jsonb,
  index, uniqueIndex, customType
} from 'drizzle-orm/pg-core'
import { sql } from 'drizzle-orm'

// ── Custom Types ──────────────────────────────────────────────
const vector = customType<{ data: number[]; driverData: string }>({
  dataType() {
    return 'vector(384)'
  },
  toDriver(value: number[]): string {
    return JSON.stringify(value)
  },
  fromDriver(value: string): number[] {
    return JSON.parse(value)
  }
})

// ── Enums ─────────────────────────────────────────────────────
export const userPlanEnum       = pgEnum('user_plan',       ['free', 'pro', 'enterprise'])
export const taskStatusEnum     = pgEnum('task_status',     ['not_started', 'in_progress', 'completed', 'missed', 'cancelled'])
export const taskPriorityEnum   = pgEnum('task_priority',   ['critical', 'high', 'medium', 'low'])
export const syncOperationEnum  = pgEnum('sync_operation',  ['INSERT', 'UPDATE', 'DELETE'])
export const aiRequestTypeEnum  = pgEnum('ai_request_type', ['generate_routine', 'extract_questions', 'reschedule', 'extract_email', 'parse_task', 'assistant_plan', 'assistant_execute'])
export const oauthProviderEnum  = pgEnum('oauth_provider',  ['google', 'github', 'apple', 'microsoft'])
export const externalProviderEnum = pgEnum('external_provider', ['google_calendar', 'gmail', 'chrome_extension', 'slack', 'outlook', 'zoom'])
export const userRoleEnum       = pgEnum('user_role',       ['viewer', 'admin', 'superadmin'])

// ── users ─────────────────────────────────────────────────────
export const users = pgTable('users', {
  id:                          uuid('id').primaryKey().defaultRandom(),
  email:                       text('email').notNull().unique(),
  email_verified:              boolean('email_verified').notNull().default(false),
  email_verification_token:    text('email_verification_token'),
  password_hash:               text('password_hash'),
  full_name:                   text('full_name').notNull(),
  avatar_url:                  text('avatar_url'),
  timezone:                    text('timezone').notNull().default('UTC'),
  locale:                      text('locale').notNull().default('en'),
  plan:                        userPlanEnum('plan').notNull().default('free'),
  plan_expires_at:             timestamp('plan_expires_at', { withTimezone: true }),
  ai_requests_used_today:      integer('ai_requests_used_today').notNull().default(0),
  ai_budget_reset_date:        date('ai_budget_reset_date').notNull().default(sql`CURRENT_DATE`),
  onboarding_completed:        boolean('onboarding_completed').notNull().default(false),
  onboarding_step:             integer('onboarding_step').notNull().default(0),
  onboarding_started_at:       timestamp('onboarding_started_at', { withTimezone: true }),
  onboarding_completed_at:     timestamp('onboarding_completed_at', { withTimezone: true }),
  onboarding_skipped_steps:    jsonb('onboarding_skipped_steps').notNull().default(sql`'[]'::jsonb`),
  grind_type:                  text('grind_type').notNull().default('9-to-5 Professional'),
  wake_time:                   time('wake_time').notNull().default(sql`'09:00:00'::time`),
  sleep_time:                  time('sleep_time').notNull().default(sql`'22:00:00'::time`),
  daily_commitment_minutes:    integer('daily_commitment_minutes').notNull().default(120),
  primary_focus_areas:         jsonb('primary_focus_areas').notNull().default(sql`'[]'::jsonb`),
  priority_preference:         text('priority_preference').notNull().default('balanced'),
  password_reset_token:        text('password_reset_token'),
  password_reset_expires:      timestamp('password_reset_expires', { withTimezone: true }),
  last_active_at:              timestamp('last_active_at', { withTimezone: true }),
  last_synced_at:              timestamp('last_synced_at', { withTimezone: true }),
  preferences:                 jsonb('preferences').notNull().default({}),
  role:                        userRoleEnum('role').notNull().default('viewer'),
  created_at:                  timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updated_at:                  timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  deleted_at:                  timestamp('deleted_at', { withTimezone: true }),
}, (t) => ({
  emailIdx:       uniqueIndex('idx_users_email_active').on(t.email).where(sql`${t.deleted_at} IS NULL`),
  resetTokenIdx:  index('idx_users_reset_token').on(t.password_reset_token).where(sql`${t.password_reset_token} IS NOT NULL`),
  onboardingStepIdx: index('idx_users_onboarding_step').on(t.onboarding_step).where(sql`${t.onboarding_step} > 0`),
}))

// ── oauth_identities ──────────────────────────────────────────
export const oauthIdentities = pgTable('oauth_identities', {
  id:              uuid('id').primaryKey().defaultRandom(),
  user_id:         uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  provider:        oauthProviderEnum('provider').notNull(),
  provider_uid:    text('provider_uid').notNull(),
  access_token:    text('access_token'),
  refresh_token:   text('refresh_token'),
  token_expires_at: timestamp('token_expires_at', { withTimezone: true }),
  raw_profile:     jsonb('raw_profile'),
  created_at:      timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updated_at:      timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  providerUidUniq: uniqueIndex('idx_oauth_provider_uid').on(t.provider, t.provider_uid),
}))

// ── sessions ──────────────────────────────────────────────────
export const sessions = pgTable('sessions', {
  id:             uuid('id').primaryKey().defaultRandom(),
  user_id:        uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  token_hash:     text('token_hash').notNull().unique(),
  csrf_token:     text('csrf_token').notNull(),
  ip_address:     text('ip_address'),
  user_agent:     text('user_agent'),
  browser_name:   text('browser_name'),
  os_name:        text('os_name'),
  last_active_at: timestamp('last_active_at', { withTimezone: true }).notNull().defaultNow(),
  expires_at:     timestamp('expires_at', { withTimezone: true }).notNull(),
  revoked_at:     timestamp('revoked_at', { withTimezone: true }),
  created_at:     timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  tokenHashIdx:    uniqueIndex('idx_sessions_token_hash').on(t.token_hash),
  userActiveIdx:   index('idx_sessions_user_active').on(t.user_id, t.expires_at).where(sql`${t.revoked_at} IS NULL`),
}))

// ── web_push_subscriptions ────────────────────────────────────
export const webPushSubscriptions = pgTable('web_push_subscriptions', {
  id:           uuid('id').primaryKey().defaultRandom(),
  user_id:      uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  endpoint:     text('endpoint').notNull().unique(),
  p256dh_key:   text('p256dh_key').notNull(),
  auth_key:     text('auth_key').notNull(),
  browser:      text('browser'),
  active:       boolean('active').notNull().default(true),
  last_used_at: timestamp('last_used_at', { withTimezone: true }),
  created_at:   timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

// ── routines ──────────────────────────────────────────────────
export const routines = pgTable('routines', {
  id:                 uuid('id').primaryKey().defaultRandom(),
  user_id:            uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  title:              text('title').notNull(),
  goal:               text('goal'),
  color:              text('color').notNull().default('#3b82f6'),
  icon:               text('icon'),
  is_active:          boolean('is_active').notNull().default(true),
  is_default:         boolean('is_default').notNull().default(false),
  sort_order:         integer('sort_order').notNull().default(0),
  ai_generated_at:    timestamp('ai_generated_at', { withTimezone: true }),
  ai_model_used:      text('ai_model_used'),
  ai_prompt_version:  smallint('ai_prompt_version').notNull().default(1),
  client_id:          text('client_id').unique(),
  created_at:         timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updated_at:         timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  deleted_at:         timestamp('deleted_at', { withTimezone: true }),
}, (t) => ({
  userActiveIdx: index('idx_routines_user_active').on(t.user_id, t.is_active).where(sql`${t.deleted_at} IS NULL`),
  syncIdx:       index('idx_routines_sync').on(t.user_id, t.updated_at),
}))

// ── categories ────────────────────────────────────────────────
export const categories = pgTable('categories', {
  id:                 uuid('id').primaryKey().defaultRandom(),
  user_id:            uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  name:               text('name').notNull(),
  color:              text('color').notNull().default('#3b82f6'),
  created_at:         timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updated_at:         timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  deleted_at:         timestamp('deleted_at', { withTimezone: true }),
}, (t) => ({
  userActiveIdx: index('idx_categories_user_active').on(t.user_id).where(sql`${t.deleted_at} IS NULL`),
  syncIdx:       index('idx_categories_sync').on(t.user_id, t.updated_at),
}))

// ── tasks ─────────────────────────────────────────────────────
export const tasks = pgTable('tasks', {
  id:                           uuid('id').primaryKey().defaultRandom(),
  routine_id:                   uuid('routine_id').references(() => routines.id, { onDelete: 'cascade' }),
  user_id:                      uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  parent_task_id:               uuid('parent_task_id'),
  title:                        text('title').notNull(),
  description:                  text('description'),
  priority:                     taskPriorityEnum('priority').notNull().default('medium'),
  status:                       taskStatusEnum('status').notNull().default('not_started'),
  category:                     text('category'),
  scheduled_at:                 timestamp('scheduled_at', { withTimezone: true }),
  estimated_duration_minutes:   integer('estimated_duration_minutes').notNull().default(30),
  actual_duration_minutes:      integer('actual_duration_minutes'),
  target_week:                  integer('target_week'),
  target_day:                   text('target_day'),
  is_time_locked:               boolean('is_time_locked').notNull().default(false),
  ai_context:                   text('ai_context'),
  client_id:                    text('client_id'),
  order_index:                  integer('order_index').notNull().default(0),
  created_at:                   timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updated_at:                   timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  deleted_at:                   timestamp('deleted_at', { withTimezone: true }),
}, (t) => ({
  syncPullIdx:  index('idx_tasks_sync_pull').on(t.user_id, t.updated_at).where(sql`${t.deleted_at} IS NULL`),
  calendarIdx:  index('idx_tasks_calendar').on(t.user_id, t.scheduled_at).where(sql`${t.deleted_at} IS NULL`),
  // RLS POLICY: ENABLE ROW LEVEL SECURITY
  // CREATE POLICY "tenant_isolation" ON "tasks" FOR ALL USING (user_id = current_setting('request.jwt.claim.sub', true)::uuid);
  statusIdx:    index('idx_tasks_status').on(t.user_id, t.status).where(sql`${t.deleted_at} IS NULL`),
  routineIdx:   index('idx_tasks_routine').on(t.routine_id).where(sql`${t.deleted_at} IS NULL`),
  missedIdx:    index('idx_tasks_missed').on(t.user_id, t.scheduled_at, t.status)
                  .where(sql`${t.status} = 'not_started' AND ${t.deleted_at} IS NULL`),
  parentTaskIdx: index('idx_tasks_parent_task_id').on(t.parent_task_id),
  orderIdx:     index('idx_tasks_order_index').on(t.parent_task_id, t.order_index),
  compoundIdx:  index('idx_tasks_user_scheduled_parent').on(t.user_id, t.scheduled_at, t.parent_task_id),
}))

// Self-reference foreign key constraint for parent_task_id will be added via migration

// ── task_recurrences ──────────────────────────────────────────
export const taskRecurrences = pgTable('task_recurrences', {
  id:                   uuid('id').primaryKey().defaultRandom(),
  task_id:              uuid('task_id').notNull().references(() => tasks.id, { onDelete: 'cascade' }),
  user_id:              uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  recurrence_rule:      text('recurrence_rule').notNull(),
  recurrence_parent_id: uuid('recurrence_parent_id'),
  created_at:           timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updated_at:           timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  taskIdx: uniqueIndex('idx_task_recurrences_task').on(t.task_id)
}))

// ── task_external_metadata ────────────────────────────────────
export const taskExternalMetadata = pgTable('task_external_metadata', {
  id:                   uuid('id').primaryKey().defaultRandom(),
  task_id:              uuid('task_id').notNull().references(() => tasks.id, { onDelete: 'cascade' }),
  user_id:              uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  external_provider:    externalProviderEnum('external_provider').notNull(),
  external_id:          text('external_id').notNull(),
  external_link:        text('external_link'),
  source_metadata:      jsonb('source_metadata'),
  created_at:           timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updated_at:           timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  taskIdx: uniqueIndex('idx_task_external_metadata_task').on(t.task_id),
  extProviderIdx: index('idx_task_external_provider').on(t.external_provider, t.external_id)
}))

// ── task_completions ──────────────────────────────────────────
export const taskCompletions = pgTable('task_completions', {
  id:                      uuid('id').primaryKey().defaultRandom(),
  task_id:                 uuid('task_id').notNull().references(() => tasks.id, { onDelete: 'cascade' }),
  user_id:                 uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  routine_id:              uuid('routine_id').notNull().references(() => routines.id, { onDelete: 'cascade' }),
  status:                  taskStatusEnum('status').notNull(),
  completed_at:            timestamp('completed_at', { withTimezone: true }).notNull().defaultNow(),
  timer_started_at:        timestamp('timer_started_at', { withTimezone: true }),
  timer_ended_at:          timestamp('timer_ended_at', { withTimezone: true }),
  actual_duration_minutes: integer('actual_duration_minutes'),
  was_on_time:             boolean('was_on_time'),
  minutes_variance:        integer('minutes_variance'),
  scheduled_at:            timestamp('scheduled_at', { withTimezone: true }).notNull(),
  day_of_week:             smallint('day_of_week').notNull(),
  week_number:             smallint('week_number').notNull(),
  hour_of_day:             smallint('hour_of_day').notNull(),
  priority:                taskPriorityEnum('priority').notNull(),
  category:                text('category'),
  created_at:              timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updated_at:              timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  weeklyIdx:   index('idx_completions_weekly').on(t.user_id, t.week_number, t.day_of_week),
  dateIdx:     index('idx_completions_date').on(t.user_id, t.scheduled_at),
}))

// ── tombstones ────────────────────────────────────────────────
export const tombstones = pgTable('tombstones', {
  id:           uuid('id').primaryKey().defaultRandom(),
  user_id:      uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  table_name:   text('table_name').notNull(),
  record_id:    uuid('record_id').notNull(),
  deleted_at:   timestamp('deleted_at', { withTimezone: true }).notNull().defaultNow(),
  deleted_by_session_id: uuid('deleted_by_session_id').references(() => sessions.id, { onDelete: 'set null' }),
  expires_at:   timestamp('expires_at', { withTimezone: true }).notNull()
                  .default(sql`NOW() + INTERVAL '90 days'`),
}, (t) => ({
  userPullIdx:  index('idx_tombstones_user_pull').on(t.user_id, t.deleted_at),
  cleanupIdx:   index('idx_tombstones_cleanup').on(t.expires_at),
  uniq:         uniqueIndex('idx_tombstones_unique').on(t.table_name, t.record_id),
}))

// ── ai_request_log ────────────────────────────────────────────
export const aiRequestLog = pgTable('ai_request_log', {
  id:               uuid('id').primaryKey().defaultRandom(),
  user_id:          uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
  request_type:     aiRequestTypeEnum('request_type').notNull(),
  openrouter_model: text('openrouter_model').notNull(),
  requested_model:  text('requested_model').notNull(),
  fallback_used:    boolean('fallback_used').notNull().default(false),
  input_tokens:     integer('input_tokens').notNull().default(0),
  output_tokens:    integer('output_tokens').notNull().default(0),
  cost_usd:         decimal('cost_usd', { precision: 12, scale: 8 }),
  latency_ms:       integer('latency_ms'),
  success:          boolean('success').notNull().default(true),
  error_code:       text('error_code'),
  created_at:       timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  userDateIdx: index('idx_ai_log_user_date').on(t.user_id, t.created_at),
}))

// ── notification_schedules ────────────────────────────────────
export const notificationSchedules = pgTable('notification_schedules', {
  id:               uuid('id').primaryKey().defaultRandom(),
  user_id:          uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  task_id:          uuid('task_id').references(() => tasks.id, { onDelete: 'cascade' }),
  subscription_id:  uuid('subscription_id').references(() => webPushSubscriptions.id, { onDelete: 'cascade' }),
  scheduled_for:    timestamp('scheduled_for', { withTimezone: true }).notNull(),
  title:            text('title').notNull(),
  body:             text('body').notNull(),
  icon_url:         text('icon_url'),
  action_url:       text('action_url'),
  payload:          jsonb('payload'),
  sent_at:          timestamp('sent_at', { withTimezone: true }),
  failed_at:        timestamp('failed_at', { withTimezone: true }),
  failure_reason:   text('failure_reason'),
  cancelled_at:     timestamp('cancelled_at', { withTimezone: true }),
  created_at:       timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  dispatchIdx: index('idx_notif_dispatch').on(t.scheduled_for)
                 .where(sql`${t.sent_at} IS NULL AND ${t.cancelled_at} IS NULL AND ${t.failed_at} IS NULL`),
}))

// ── subscriptions ─────────────────────────────────────────────
export const subscriptions = pgTable('subscriptions', {
  id:                      uuid('id').primaryKey().defaultRandom(),
  user_id:                 uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }).unique(),
  stripe_customer_id:      text('stripe_customer_id').unique(),
  stripe_subscription_id:  text('stripe_subscription_id').unique(),
  plan:                    userPlanEnum('plan').notNull().default('free'),
  status:                  text('status').notNull().default('active'),
  current_period_start:    timestamp('current_period_start', { withTimezone: true }),
  current_period_end:      timestamp('current_period_end', { withTimezone: true }),
  cancel_at_period_end:    boolean('cancel_at_period_end').notNull().default(false),
  trial_ends_at:           timestamp('trial_ends_at', { withTimezone: true }),
  created_at:              timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updated_at:              timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

// ── calendar_sync_state ───────────────────────────────────────
export const calendarSyncState = pgTable('calendar_sync_state', {
  id:                 uuid('id').primaryKey().defaultRandom(),
  user_id:            uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  provider:           oauthProviderEnum('provider').notNull(),
  sync_token:         text('sync_token'),
  webhook_channel_id: text('webhook_channel_id'),
  webhook_expiration: timestamp('webhook_expiration', { withTimezone: true }),
  last_synced_at:     timestamp('last_synced_at', { withTimezone: true }),
  created_at:         timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updated_at:         timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  userProviderIdx: uniqueIndex('idx_sync_state_user_provider').on(t.user_id, t.provider),
}))

// ── audit_log ─────────────────────────────────────────────────
export const auditLog = pgTable('audit_log', {
  id:           uuid('id').primaryKey().defaultRandom(),
  user_id:      uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
  session_id:   uuid('session_id').references(() => sessions.id, { onDelete: 'set null' }),
  event_type:   text('event_type').notNull(),
  ip_address:   text('ip_address'),
  user_agent:   text('user_agent'),
  success:      boolean('success').notNull().default(true),
  metadata:     jsonb('metadata'),
  created_at:   timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  userIdx: index('idx_audit_user').on(t.user_id, t.created_at),
  ipIdx:   index('idx_audit_ip').on(t.ip_address, t.created_at),
}))

// ── onboarding_analytics ───────────────────────────────────────
export const onboardingAnalytics = pgTable('onboarding_analytics', {
  id:           uuid('id').primaryKey().defaultRandom(),
  user_id:      uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  step_number:  integer('step_number').notNull(),
  action:       text('action').notNull(),
  duration_ms:  integer('duration_ms'),
  metadata:     jsonb('metadata').notNull().default(sql`'{}'::jsonb`),
  created_at:   timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  userIdx:      index('idx_onboarding_analytics_user').on(t.user_id),
  stepIdx:      index('idx_onboarding_analytics_step').on(t.step_number),
  createdAtIdx: index('idx_onboarding_analytics_created_at').on(t.created_at),
}))

// ── user_memory_embeddings ────────────────────────────────────
export const userMemoryEmbeddings = pgTable('user_memory_embeddings', {
  id:           uuid('id').primaryKey().defaultRandom(),
  user_id:      uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  content:      text('content').notNull(),
  embedding:    vector('embedding').notNull(),
  source:       text('source'),
  created_at:   timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  userIdx: index('idx_memory_user').on(t.user_id),
}))

// ── time_blocks ───────────────────────────────────────────────
export const timeBlocks = pgTable('time_blocks', {
  id:           uuid('id').primaryKey().defaultRandom(),
  user_id:      uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  task_id:      uuid('task_id').references(() => tasks.id, { onDelete: 'cascade' }),
  start_time:   timestamp('start_time', { withTimezone: true }).notNull(),
  end_time:     timestamp('end_time', { withTimezone: true }).notNull(),
  color:        text('color').notNull().default('#7C3AED'),
  label:        text('label'),
  created_at:   timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updated_at:   timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  userIdx:      index('idx_time_blocks_user_id').on(t.user_id),
  startTimeIdx: index('idx_time_blocks_start_time').on(t.start_time),
  taskIdx:      index('idx_time_blocks_task_id').on(t.task_id),
}))

// ── task_templates ────────────────────────────────────────────
export const taskTemplates = pgTable('task_templates', {
  id:                      uuid('id').primaryKey().defaultRandom(),
  user_id:                 uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  name:                    text('name').notNull(),
  description:             text('description'),
  default_priority:        taskPriorityEnum('default_priority').notNull().default('medium'),
  default_category:        text('default_category'),
  default_duration_minutes: integer('default_duration_minutes').notNull().default(30),
  is_public:               boolean('is_public').notNull().default(false),
  is_default:              boolean('is_default').notNull().default(false),
  usage_count:             integer('usage_count').notNull().default(0),
  created_at:              timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updated_at:              timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  userIdx:      index('idx_task_templates_user_id').on(t.user_id),
  publicIdx:    index('idx_task_templates_public').on(t.is_public),
}))

// ── template_subtasks ──────────────────────────────────────────
export const templateSubtasks = pgTable('template_subtasks', {
  id:                      uuid('id').primaryKey().defaultRandom(),
  template_id:             uuid('template_id').notNull().references(() => taskTemplates.id, { onDelete: 'cascade' }),
  title:                   text('title').notNull(),
  order_index:             integer('order_index').notNull(),
  default_duration_minutes: integer('default_duration_minutes').notNull().default(15),
  created_at:              timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  templateIdx:  index('idx_template_subtasks_template_id').on(t.template_id),
  orderIdx:     index('idx_template_subtasks_order').on(t.template_id, t.order_index),
}))
