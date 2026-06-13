# S Link — project briefing for Claude Code

**S Link is a HYBRID app** (live as v2): a ClickUp-style general work-management tool **plus** a
construction-finance layer (costs, invoices/مستخلصات, dashboards, reports). The decision (2026-06)
was to keep BOTH — not a pure ClickUp clone and not pure construction. The earlier
"pure ClickUp, rebuild from scratch" plan was superseded; the live code is the source of truth.
The original construction-only app (v1.0.0) is preserved untouched in `legacy_v1/` for reference.

## Goal
A ClickUp-Free-style work manager (hierarchy, tasks, views, collaboration) fused with a construction
finance/reporting suite, hostable on free tiers. Plain JS, minimal deps, ClickUp-style purple accent,
**light + dark themes**.

## Stack
- Frontend: **React + Vite** (plain JS, no TypeScript), SPA, React Router.
- Backend: **Supabase** — Postgres + Auth (email/password) + (later) Storage + Realtime + RLS.
  No custom server; all access is the Supabase JS client from the browser.
- Hosting: Netlify / Cloudflare Pages (free).

## Environment
`.env` (gitignored) at project root:
```
VITE_SUPABASE_URL=https://<ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon public key>
```
**Database:** the new schema CONFLICTS with the old v1 tables. Either (recommended) point `.env` at a
**fresh Supabase project** and run `supabase/schema.sql`, OR run `supabase/reset.sql` first (wipes old
data) then `schema.sql` on the existing project. `npm install` then `npm run dev` to run.

## Hierarchy (the ClickUp model)
`Workspace → Space → Folder → List → Task → Subtask`. A list lives in a Space, optionally inside a Folder.
**Statuses are per-Space** (custom status sets); tasks reference a status by id. On signup a profile is
created (trigger); on first login the app bootstraps a Workspace + a "Team Space" (seeded statuses) + a
starter List (`ensureWorkspace` in api.js).

## File map (live = v2 hybrid)
```
supabase/schema.sql       Full schema: hierarchy tables, statuses, tasks (+ recurrence), RLS, helper fns, signup trigger.
supabase/reset.sql        DANGER: drops old+new objects so schema.sql can re-apply on an existing project.
supabase/migration_*.sql  Idempotent add-ons: phase2 (fields/watchers/deps), phase4 (notifications), finance,
                          cost_calc, collab_history, list_colors, fix_workspace, recurring (tasks.recurrence jsonb).
src/supabaseClient.js     Supabase client from env.
src/auth.jsx              AuthProvider: session + profile; signUp/signIn/signOut.
src/theme.jsx             ThemeProvider: light/dark, persisted in localStorage, applied as data-theme on <html>.
src/workspace.jsx         WorkspaceProvider: loads current workspace + spaces/folders/lists/members tree; refresh().
src/api.js                All DB calls + DEFAULT_STATUSES + ensureWorkspace() bootstrap; searchTasks(),
                          recurring helpers (RECUR_FREQS, nextDate, rollRecurringTask); finance/invoice calls.
src/finance.js            Finance math helpers (expense/invoice calculations).
src/notifications.jsx     NotificationsProvider: realtime notifications; unread; markRead/markAll; buildNotifs().
src/App.jsx               Routes: /login + Layout-wrapped / · /inbox · /dashboard · /costs · /invoices · /reports ·
                          /space/:spaceId · /user/:userId · /list/:listId.
src/components/
  Sidebar.jsx             Hierarchy nav (spaces → folders → lists) + create space/folder/list modal.
  Layout.jsx              Sidebar + topbar (Cmd-K search trigger, dark-mode toggle, avatar) + <Outlet/> + footer.
  CommandPalette.jsx      Global Cmd/Ctrl-K palette: jump to pages, spaces, lists, members, tasks (debounced search).
  Modal.jsx               Reusable modal.
  TaskModal.jsx           Full task editor: status, priority, assignees, dates, time estimate, REPEAT (recurrence),
                          tags, custom fields, checklist, subtasks, dependencies, watchers, comments, history.
  TaskViews.jsx           View host: List/Board/Calendar/Table switcher, filter/sort/group, quick-add, change-status,
                          BULK actions (multi-select bar: status/priority/assign/delete), ?task= deep-link, recurrence roll.
  CustomizeModal.jsx      Per-space settings: edit/add/remove statuses + custom field definitions.
  Charts.jsx              Pie/bar/line chart primitives for the dashboard.
  Toaster.jsx             Toast pop-ups (realtime notifications).
  Bits.jsx                Shared: PRIORITIES, STATUS_TYPES, FIELD_TYPES, RATE_BASES, Avatar, MoneyInput, fmt helpers.
  ViewControls.jsx        Toolbar: search, group-by (list view), sort, assignee/priority filters.
src/pages/
  Login.jsx               Email/password sign in + sign up.
  Home.jsx                "My Work" dashboard (overdue/today/next-7/later/unassigned for current user).
  Inbox.jsx               Notifications feed; click → open the task's list; mark read / mark all.
  ListPage.jsx            Loads one list → TaskViews. SpacePage.jsx = all tasks in a space. UserPage.jsx = a member's tasks.
  DashboardPage.jsx       Finance KPIs + charts (budget/spent/claimed/received, by category/month).
  CostsPage.jsx           Cost categories + expense calculator (flat / per unit / per day / per hour).
  InvoicesPage.jsx        Bilingual (AR/EN) payment certificates (مستخلصات): retention, advance, VAT, net.
  ReportsPage.jsx         Bilingual report builder (daily / cost+invoice / project), print-to-PDF.
src/views/
  ListView.jsx            Tasks grouped by status/assignee/priority/none, inline quick-add, bulk checkboxes, 🔁 recurring tag.
  BoardView.jsx           Kanban columns per status, drag-drop to change status, inline add.
  CalendarView.jsx        Month grid by due date; click a day to create, a task to open.
  TableView.jsx           Spreadsheet rows incl. custom-field columns + bulk checkboxes.
legacy_v1/                The old construction-only app (v1.0.0), preserved. Not built.
```

## Conventions
- Theme tokens are CSS variables in `src/styles.css` (`--accent` = ClickUp purple `#7B68EE`). Dark mode = a
  `[data-theme="dark"]` token override block; prefer tokens over hardcoded colors so both themes adapt.
- Plain JS + function components + hooks. Keep deps minimal.
- Tasks carry jsonb columns (tags/custom/checklist) + recurrence to avoid migrations; finance lives in its own tables.
- Footer credit on every page: `© copyrights a7mdabdelsalam`.

## Roadmap (hybrid: ClickUp-Free work mgmt + construction finance)
1. **DONE — Hierarchy + List/Board views**: workspace/space/folder/list/task, custom statuses, multi-assignees,
   priority, dates, tags, subtasks, comments.
2. **DONE — Task core**: editable statuses + custom fields (per space), checklist, time estimate, watchers,
   dependencies, **recurring tasks** ✅ (`migration_recurring.sql`). Still TODO: due-date reminders.
3. **Views**: Calendar ✅ + Table ✅ + filter/sort/group ✅. Still TODO: Gantt/Timeline, saved views, "Everything" view.
4. **Collaboration**: notifications + Inbox ✅ (realtime). Still TODO: @mentions, Docs, Chat view, Whiteboards.
5. **Time & planning**: native time tracking, Goals, Sprints. Finance dashboards/reports ✅ (construction layer).
6. **Productivity**: **global search / Cmd-K ✅**, **bulk actions ✅**, **dark mode ✅**. Still TODO: templates,
   automations, import/export, full mobile/responsive.

## Construction finance layer (kept, per hybrid decision)
- Pages: Dashboard (KPI + charts), Costs (categories + expense calculator), Invoices (bilingual مستخلصات
  certificates: retention/advance/VAT), Reports (bilingual, print-to-PDF). Tables: cost_categories, expenses,
  invoices (see `migration_finance.sql` / `migration_cost_calc.sql`). Math in `src/finance.js`.

## Notes / decisions
- Owner chose (2026-06): **HYBRID** — keep ClickUp-style work management AND the construction finance suite.
  (Reverses the earlier "pure ClickUp clone" note.) FULL hierarchy; collaboration early.
- **Recurring tasks require `migration_recurring.sql` to be run** on the live DB (adds `tasks.recurrence`).
- RLS = any workspace member can read/write everything in the workspace; role refinement (guest/private spaces) later.
- `jspdf`/`xlsx` are in package.json; reports use print-to-PDF (jsPDF available for richer exports later).
