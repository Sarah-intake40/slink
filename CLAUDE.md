# S Link — project briefing for Claude Code

**S Link is being rebuilt as a ClickUp clone** (general work-management app), from scratch.
The previous construction-management app (v1.0.0) is preserved untouched in `legacy_v1/` for reference.

## Goal
A faithful clone of **ClickUp's free-plan capabilities**, hostable on free tiers. Built phase by phase
(see Roadmap). Plain JS, minimal deps, cool light theme with a ClickUp-style purple accent.

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

## File map (current = Phase 1)
```
supabase/schema.sql       Full ClickUp schema: hierarchy tables, statuses, tasks, RLS, helper fns, signup trigger.
supabase/reset.sql        DANGER: drops old+new objects so schema.sql can re-apply on an existing project.
src/supabaseClient.js     Supabase client from env.
src/auth.jsx              AuthProvider: session + profile; signUp/signIn/signOut.
src/workspace.jsx         WorkspaceProvider: loads current workspace + spaces/folders/lists/members tree; refresh().
src/api.js                All DB calls + DEFAULT_STATUSES + ensureWorkspace()/seedSpaceStatuses() bootstrap.
src/notifications.jsx     NotificationsProvider: loads + realtime-subscribes notifications; unread; markRead/markAll;
                          buildNotifs() helper (dedupes, drops actor).
src/App.jsx               Routes: /login, and Layout-wrapped / (Home), /inbox, /list/:listId.
src/components/
  Sidebar.jsx             Hierarchy nav (spaces → folders → lists) + create space/folder/list modal.
  Layout.jsx              Sidebar + topbar + <Outlet/> + footer.
  Modal.jsx               Reusable modal.
  TaskModal.jsx           Full task editor: status, priority, multi-assignees, dates, time estimate, tags,
                          custom fields, checklist, subtasks, dependencies, watchers, comments.
  CustomizeModal.jsx      Per-space settings: edit/add/remove statuses + custom field definitions.
  Bits.jsx                Shared: PRIORITIES, STATUS_TYPES, FIELD_TYPES, Avatar, PriorityFlag, StatusDot, fmtDate,
                          fmtDuration, helpers.
  ViewControls.jsx        Toolbar: search, group-by (list view), sort, assignee/priority filters.
src/pages/
  Login.jsx               Email/password sign in + sign up.
  Home.jsx                Redirects to first list, or prompts to create a space/list.
  Inbox.jsx               Notifications feed; click → open the task's list; mark read / mark all.
  ListPage.jsx            Loads list + space statuses/fields + tasks; List/Board/Calendar/Table switcher +
                          ViewControls; filtering/sorting/grouping; hosts TaskModal + CustomizeModal.
src/views/
  ListView.jsx            Tasks grouped by status/assignee/priority/none, inline quick-add, meta.
  BoardView.jsx           Kanban columns per status, drag-drop to change status, inline add.
  CalendarView.jsx        Month grid by due date; click a day to create, a task to open.
  TableView.jsx           Spreadsheet rows including custom-field columns.
legacy_v1/                The old construction app (v1.0.0), preserved. Not built.
```

## Conventions
- Theme tokens are CSS variables in `src/styles.css` (`--accent` = ClickUp purple `#7B68EE`).
- Plain JS + function components + hooks. Keep deps minimal.
- Tasks carry Phase-2 columns already (tags/custom/checklist/time_estimate jsonb) to avoid later migrations.
- Footer credit on every page: `© copyrights a7mdabdelsalam`.

## Roadmap (build order; "all of ClickUp Free")
1. **DONE — Hierarchy + List/Board views**: workspace/space/folder/list/task, custom statuses, multi-assignees,
   priority, dates, tags, subtasks, comments.
2. **DONE (except recurring) — Task core**: editable statuses + custom fields (per space, via CustomizeModal),
   checklist UI, time estimate, watchers, dependencies (waiting-on / blocking / linked). `migration_phase2.sql`.
   Still TODO: **recurring tasks**, due-date reminders (reminders land with Phase-4 notifications).
3. **Views**: Calendar ✅ + Table ✅ + filter/sort/group ✅ done. Still TODO: Gantt/Timeline, saved views, "Everything" view.
4. **Collaboration** (prioritized early per owner): notifications + Inbox ✅ (realtime, assignment+comment alerts).
   Still TODO: @mentions, Docs, Chat view, Whiteboards.
5. **Time & planning**: native time tracking, estimates, Goals, Sprints, Dashboards/reporting.
6. **Productivity**: templates, basic automations, global search (Cmd-K), bulk actions, import/export, dark mode,
   mobile/responsive.

## Notes / decisions
- Owner chose: pure ClickUp clone (no construction features), FULL hierarchy, collaboration early, rebuild from scratch.
- RLS Phase 1 = any workspace member can read/write everything in the workspace; role refinement (guest/private
  spaces) comes later.
- `jspdf`/`xlsx` remain in package.json but are currently unused (were for v1 exports).
