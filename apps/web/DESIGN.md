# Verve Web Redesign — Design System Documentation

## Overview
Focal's design system is built on **Next.js**, **Tailwind CSS v3**, **shadcn/ui** (Radix UI), and **Framer Motion**. It uses an Optimistic UI pattern driven by **TanStack Query**.

## Color Tokens & Theming (`globals.css`)
We use a CSS variable approach mapped through `tailwind.config.ts`.
*   **Light Mode Accent**: Royal Blue (`#2563EB`) → `hsl(221 83% 53%)` mapped to `hsl(var(--primary))`
*   **Dark Mode Accent**: Royal Blue (`#3B82F6`) → `hsl(221 83% 65%)` mapped to `hsl(var(--primary))`

### Core Surfaces
*   `bg-background`: Main app background (`hsl(210 20% 94%)` light / `hsl(240 6% 6%)` dark)
*   `bg-card`: Elevated surfaces like widgets and modals (`#FFFFFF` light / `hsl(240 6% 9%)` dark)
*   `bg-sidebar`: Dedicated sidebar surface

### Semantic Status Colors
Used in Kanban boards and indicators.
*   `todo`: Slate (`hsl(215 16% 47%)`)
*   `progress`: Blue (`hsl(221 83% 53%)`)
*   `review`: Golden/Orange (`hsl(38 92% 50%)`)
*   `done`: Green (`hsl(142 71% 45%)`)

## Typography
*   **Font**: `Geist Sans` (primary) and `Geist Mono` (code/numbers).
*   Anti-aliased and optimized for legibility.

## Layout Components
*   **`AppShell`**: Root wrapper orchestrating `Sidebar`, main content, and `AIPanel`.
*   **`Sidebar`**: 3-state navigation (rail `56px`, compact `200px`, full `260px`).
    *   State is persisted in `localStorage`.
    *   Animated using `framer-motion` layout constraints.
*   **`TopHeader`**: Consistent top navigation with breadcrumbs, page title, and animated view-switcher tabs.
*   **`AIPanel`**: Slide-in Gemini-style assistant using `AnimatePresence`.

## UI Primitives
Built with `shadcn/ui`.
*   **Buttons, Dialogs, Sheets, Dropdowns, Selects, Inputs, Textareas, Skeletons**.
*   **`Icon` Wrapper**: Standardizes all `lucide-react` icons.
    *   Usage: `<Icon icon={Home} size="md" />`
    *   Sizes: `sm` (16px), `md` (20px), `lg` (24px).
    *   Stroke Width: `1.5px`.

## Advanced Components
*   **`TaskBoard`**: Kanban board powered by `@dnd-kit`. Supports optimistic dragging.
*   **`CalendarView`**: Uses `react-big-calendar` with `date-fns` localizer. Styled via `calendar-overrides.css`.
*   **`DashboardContent`**: Features highly visual metric cards (gradients) and an interactive Unified Inbox.

## Animation Guidelines
*   **Micro-interactions**: Scale down on tap (`scale: 0.98`), slight scale up on hover (`scale: 1.02`).
*   **Transitions**: Use spring animations (`type: "spring", stiffness: 300, damping: 30`) for layout changes (like Sidebar toggle).
*   **Enter/Exit**: Use `AnimatePresence` with opacity and slight translation (`y: 10`) for smooth mounting/unmounting.

## Data Fetching & Optimistic UI
*   Data layer uses **Supabase** + **TanStack Query**.
*   Mutations (e.g. dragging a task) instantly update the React State inside `onMutate` and rollback `onError`.
*   **RealtimeSync**: Subscribes to Supabase Postgres changes and calls `queryClient.invalidateQueries` to keep the UI perfectly synced across tabs.
