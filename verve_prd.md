# Verve — Product Requirements Document (PRD)

> **Version:** 1.0 | **Date:** 2026-06-28 | **Status:** In Development

---

## 1. Problem Statement

Modern professionals are drowning in cognitive overhead. Managing tasks, calendars, meetings, deadlines, and daily priorities across fragmented tools — Notion, Google Calendar, Todoist, Slack, Gmail — forces people to spend hours each week doing work *about* work: manually scheduling, re-scheduling, prioritizing, and tracking.

The core problems are:

1. **Scheduling is manual and painful.** When a meeting moves, users must manually cascade-reschedule everything else. There is no intelligent assistant that understands context and proposes the best new arrangement.

2. **Task management is disconnected from time.** Most task managers show *what* to do but not *when* to do it. There is no bridge between a to-do list and available calendar time.

3. **Context switching destroys productivity.** Bouncing between a task manager, a calendar, email, and a communication tool to plan a single day costs hours of focus. Professionals need a single surface.

4. **AI tools are generic, not personal.** Existing AI assistants lack knowledge of a user's personal schedule, habits, work style, and preferences. They cannot make actionable scheduling decisions — they can only suggest.

5. **Priorities get lost.** Without a system that automatically surfaces critical work based on deadlines, context, and availability, users constantly react to the loudest notification rather than their most important work.

---

## 2. Vision

> **"Verve is the operating system for your professional time. Tell it what matters — it handles when it happens."**

Verve is an AI-native productivity platform that unifies task management, calendar scheduling, and workflow automation into a single, intelligent surface. Unlike passive to-do apps or dumb calendar tools, Verve understands your habits, goals, and constraints — and automatically builds, maintains, and defends your ideal day.

The long-term vision is a world where knowledge workers spend **zero time scheduling** and **100% of their time executing**. Verve acts as a chief-of-staff: accepting new work, finding the optimal time to complete it, resolving conflicts, and adapting in real-time when plans change.

---

## 3. Target Audience

### Primary: Individual Knowledge Workers
- Startup founders, product managers, engineers, consultants, freelancers
- 25–45 years old
- Use 3+ productivity tools simultaneously
- Feel constantly behind despite working long hours
- Value speed, keyboard efficiency, and deep work

### Secondary: Small Teams (2–15 people)
- Remote-first teams needing shared scheduling intelligence
- Teams where meeting coordination consumes disproportionate time
- Companies evaluating replacing fragmented tool stacks

### Anti-persona
- Enterprise organizations needing on-premise data residency (not targeted in v1)
- Users who prefer purely manual control with no AI assistance

---

## 4. Core Value Propositions

| Value Proposition | How Verve Delivers |
|---|---|
| Zero scheduling effort | AI parses natural-language task input and auto-schedules within the upcoming week |
| Single pane of glass | Tasks, calendar, routines, and AI assistant in one unified app |
| Keyboard-first speed | Comprehensive shortcut system — every action reachable without a mouse |
| Adaptive intelligence | AI learns user habits via memory layer; gets smarter with every interaction |
| Real-time resilience | When plans change, Verve automatically proposes rescheduling |

---

## 5. Feature Catalog

### 5.1 Core Features (MVP — Shipped)

#### 🗂️ Task Management
- **Kanban Board View** — Drag-and-drop task board with columns: `Not Started`, `In Progress`, `Completed`, `Missed`, `Cancelled`
- **List View** — Compact sortable list with priority indicators and due dates
- **Task Cards** — Rich cards showing priority, category, estimated duration, schedule, and status
- **Priority Levels** — Four-tier priority system: Critical, High, Medium, Low (settable via keyboard `1–4`)
- **Subtasks** — Hierarchical subtask creation and tracking within each task
- **Categories** — User-defined task categories with color coding
- **Bulk Operations** — Multi-select tasks for bulk status change, priority update, unschedule, or delete
- **Keyboard Shortcuts** — Full keyboard navigation, editing, and management (25+ shortcuts)

#### 📅 Calendar Integration
- **Week / Day / Month Views** — Toggle between calendar views with `Alt+1/2/3`
- **Unscheduled Tasks Panel** — Sidebar showing all tasks without a scheduled time; drag onto calendar to schedule
- **Timeblock Overlay** — Visual time-block system overlaid on the calendar for deep-work sessions
- **Google Calendar Sync** — Bidirectional sync of Google Calendar events with conflict detection
- **Scheduling Gate** — Pressing `u` on any selected task instantly unschedules it

#### 🤖 AI Features
- **AI Task Parsing** — Natural language input parsed into structured tasks with date, priority, and category extraction
- **AI Rescheduling** — When a task is missed or a conflict is detected, AI proposes the next best available slot within 7 days
- **AI Routine Generation** — During onboarding, AI generates a personalized daily routine from user goals and preferences
- **AI Omnibox** — Command palette with AI intent understanding for complex multi-step operations
- **AI Assistant (Plan + Execute)** — Conversational AI that can plan multi-step task sequences and execute them
- **Memory Layer** — AI retains user preferences, work patterns, and past decisions to improve future suggestions
- **Daily AI Budget** — 100 AI requests/day per user; transactionally enforced to prevent abuse

#### 📋 Templates
- **Task Templates** — Save recurring task structures (title, priority, category, subtasks, duration) as reusable templates
- **Template Library** — Browse, search, filter, duplicate, edit, and apply templates
- **Default Templates** — Mark a template as default for one-click task creation
- **Public Templates** — Templates can be marked public for sharing

#### 🔄 Routines
- **Routine Management** — Create and manage named routines (e.g., "Morning Focus Block", "Weekly Review")
- **AI-Generated Routines** — Onboarding generates personalized routines from user goals
- **Default Routine** — Set one routine as default for new task organization
- **Task-Routine Association** — All tasks belong to a routine for organizational structure

#### 📊 Dashboard
- **Daily Summary** — Today's tasks, upcoming schedule, and AI-generated suggestions
- **Stats Overview** — Tasks completed, focus time, and meeting count for the current period
- **Quick Actions** — One-click access to create tasks, view inbox, or open the assistant

#### 📥 Inbox
- **Unified Inbox** — All unprocessed tasks, external captures, and AI suggestions in one place
- **Priority-Sorted View** — Inbox automatically sorted by task priority
- **Chrome Extension Capture** — Tasks captured from Gmail, Slack, or any web page appear in the inbox

#### 🔔 Notifications
- **In-App Notifications** — Real-time alerts for schedule changes, AI completions, and overdue tasks
- **Notification Center** — Paginated history of all notifications with read/unread state

#### ⚙️ Settings & Profile
- **Theme Support** — Light and dark mode with system preference detection
- **Work Hours Configuration** — Set wake time, sleep time, and daily commitment minutes
- **Focus Area Preferences** — Define primary work categories for AI prioritization
- **Timezone** — Automatic timezone detection and manual override

#### 🔐 Authentication & Onboarding
- **Email + Password Auth** — Secure signup and login via Supabase Auth
- **Google OAuth** — One-click Google sign-in
- **7-Step Onboarding Flow** — Personalized setup: Profile → Goals → AI Routine Generation → Calendar Connect → First Task → Shortcuts → Success
- **Session Management** — JWT-based sessions with CSRF protection and secure cookie handling

---

### 5.2 Planned Features (Post-MVP)

#### 💳 Billing & Monetization (Phase 6 — Not Implemented)
- Subscription tiers: Free (100 AI req/day), Pro ($12/mo, 500 req/day), Enterprise (custom)
- Stripe Checkout + Customer Portal
- Usage-based AI overage billing

#### 📈 Analytics Dashboard (Planned)
- Task completion rate over time
- Focus time trends by category
- AI usage and scheduling accuracy metrics
- Weekly productivity score

#### 📆 Timeline View (Planned)
- Gantt-style horizontal timeline for long-horizon project planning
- Dependency visualization between tasks

#### 🔗 Extended Integrations (Planned)
- Slack: capture tasks from messages, receive schedule summaries
- Outlook Calendar: bidirectional sync
- Zoom: auto-create tasks from meeting transcripts
- Notion: push completed tasks as database entries

#### 📱 Mobile App (In Progress)
- Native iOS/Android app for on-the-go task capture and schedule review
- Push notifications for schedule changes

#### 👥 Team Collaboration (Future)
- Shared routines and task boards
- Team availability view for scheduling meetings without conflicts
- Delegated task assignment with AI workload balancing

---

## 6. User Stories (Priority Ordered)

### Must-Have (MVP)
1. As a user, I can create a task by typing a natural language sentence so I don't need to fill in multiple form fields.
2. As a user, I can drag an unscheduled task onto the calendar so it gets a time block automatically.
3. As a user, I can press `Ctrl+K` to open the command palette and execute any action without navigating menus.
4. As a user, I receive an AI suggestion when a task is overdue so I can quickly reschedule it.
5. As a user, I can see all my tasks in a Kanban board and drag them between status columns.
6. As a user, I can connect my Google Calendar so my external events appear alongside my Verve tasks.
7. As a user, I complete onboarding in under 5 minutes and immediately have a personalized routine.

### Should-Have
8. As a user, I can save a recurring task structure as a template and apply it with one click.
9. As a user, I can mark tasks as time-locked so the AI never moves them when rescheduling.
10. As a user, I can capture a task from any website using the Chrome extension without leaving the page.

### Nice-to-Have
11. As a team lead, I can share my routine with team members as a template.
12. As a user, I can view my productivity analytics to understand how I spend my time each week.
13. As a user, I can upgrade to a Pro plan to get more AI requests per day.

---

## 7. Success Metrics

| Metric | Definition | Target (6 months) |
|---|---|---|
| D7 Retention | % users active on day 7 after signup | > 40% |
| Task Creation Rate | Avg tasks created per active user per day | > 3 |
| AI Scheduling Adoption | % tasks scheduled via AI vs manual | > 50% |
| Onboarding Completion | % users completing all 7 onboarding steps | > 70% |
| Time-to-First-Task | Time from signup to first task created | < 3 minutes |
| API Error Rate | % API requests returning 5xx | < 0.1% |
| P95 API Latency | 95th percentile response time | < 500ms |
| AI Budget Utilization | Avg AI requests used per user per day | 20–60 (free tier) |

---

## 8. Technical Constraints & Non-Functional Requirements

### Performance
- All API responses < 200ms P50, < 500ms P95 (excluding AI inference)
- AI responses < 10 seconds P95
- Frontend initial page load < 2 seconds on 4G

### Security
- SOC 2 Type II readiness by enterprise launch
- All data encrypted at rest (Supabase AES-256) and in transit (TLS 1.3)
- GDPR-compliant: right to deletion, data export, and consent management

### Scalability
- Backend must horizontally scale to 10,000 concurrent users without architecture changes
- AI budget system must be race-condition-free under 100% concurrent load

### Availability
- 99.9% uptime SLA (< 8.7 hours downtime/year)
- Zero-downtime deployments via rolling updates

### Accessibility
- WCAG 2.1 AA compliance for all core flows by public launch

---

## 9. Out of Scope (v1)

- On-premise or self-hosted deployment
- AI model fine-tuning or custom model hosting
- Video conferencing features (beyond Zoom task capture)
- Multi-workspace / organization management
- Client-facing project portals

---

## 10. Risks & Mitigations

| Risk | Probability | Impact | Mitigation |
|---|---|---|---|
| OpenRouter AI latency degrades UX | Medium | High | Add request timeouts; fallback model list; async task parsing |
| Supabase Realtime drops connections | Low | Medium | Re-subscribe on visibility change; optimistic UI reduces perceived lag |
| AI budget abuse via scripted requests | Medium | High | Per-IP rate limits + stricter per-route AI limits (5/min) |
| Billing not ready for monetization | High (current) | Critical | Prioritize Stripe integration in next sprint |
| Low test coverage causes regressions | High (current) | High | Mandate 60%+ coverage before public beta |

---

*This PRD is a living document. Sections will be updated as the product evolves through beta and into general availability.*
