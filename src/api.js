import { supabase } from './supabaseClient'

// ---------- profiles ----------
export const getProfile = (id) => supabase.from('profiles').select('*').eq('id', id).single()
export const updateProfile = (id, p) => supabase.from('profiles').update(p).eq('id', id)

// ---------- workspaces ----------
export const getMyWorkspaces = () =>
  supabase.from('workspace_members').select('role, workspaces(*)').order('created_at')
export const createWorkspace = (w) => supabase.from('workspaces').insert(w).select().single()
export const updateWorkspace = (id, w) => supabase.from('workspaces').update(w).eq('id', id)
export const addWorkspaceMember = (workspace_id, user_id, role = 'member') =>
  supabase.from('workspace_members').upsert({ workspace_id, user_id, role })
export const getWorkspaceMembers = (wid) =>
  supabase.from('workspace_members').select('role, user_id, profiles(id, full_name, avatar_url, email)').eq('workspace_id', wid)
export const findProfileByEmail = (email) =>
  supabase.from('profiles').select('id, full_name, email').ilike('email', email.trim()).maybeSingle()
export const removeWorkspaceMember = (workspace_id, user_id) =>
  supabase.from('workspace_members').delete().match({ workspace_id, user_id })

// ---------- spaces / folders / lists ----------
export const getSpaces = (wid) =>
  supabase.from('spaces').select('*').eq('workspace_id', wid).eq('archived', false).order('sort').order('created_at')
export const createSpace = (s) => supabase.from('spaces').insert(s).select().single()
export const updateSpace = (id, s) => supabase.from('spaces').update(s).eq('id', id)
export const deleteSpace = (id) => supabase.from('spaces').delete().eq('id', id)

export const getFolders = (wid) =>
  supabase.from('folders').select('*, spaces!inner(workspace_id)').eq('spaces.workspace_id', wid).eq('archived', false).order('sort')
export const createFolder = (f) => supabase.from('folders').insert(f).select().single()
export const updateFolder = (id, f) => supabase.from('folders').update(f).eq('id', id)
export const deleteFolder = (id) => supabase.from('folders').delete().eq('id', id)

export const getLists = (wid) =>
  supabase.from('lists').select('*, spaces!inner(workspace_id)').eq('spaces.workspace_id', wid).eq('archived', false).order('sort')
export const getList = (id) => supabase.from('lists').select('*').eq('id', id).single()
export const createList = (l) => supabase.from('lists').insert(l).select().single()
export const updateList = (id, l) => supabase.from('lists').update(l).eq('id', id)
export const deleteList = (id) => supabase.from('lists').delete().eq('id', id)

// ---------- statuses ----------
export const getStatuses = (spaceId) =>
  supabase.from('statuses').select('*').eq('space_id', spaceId).order('sort')
export const getStatusesInSpaces = (spaceIds) =>
  supabase.from('statuses').select('*').in('space_id', spaceIds).order('sort')
export const createStatus = (s) => supabase.from('statuses').insert(s).select().single()
export const updateStatus = (id, s) => supabase.from('statuses').update(s).eq('id', id)
export const deleteStatus = (id) => supabase.from('statuses').delete().eq('id', id)

// ---------- tasks ----------
const TASK_SELECT = '*, task_assignees(user_id), task_comments(count)'
export const getTasks = (listId) =>
  supabase.from('tasks').select(TASK_SELECT).eq('list_id', listId).order('sort').order('created_at')
export const getTasksInLists = (listIds) =>
  supabase.from('tasks').select(TASK_SELECT).in('list_id', listIds).order('sort').order('created_at')
export const getSubtasks = (parentId) =>
  supabase.from('tasks').select(TASK_SELECT).eq('parent_id', parentId).order('created_at')
export const createTask = (t) => supabase.from('tasks').insert(t).select(TASK_SELECT).single()
export const updateTask = (id, t) => supabase.from('tasks').update(t).eq('id', id).select(TASK_SELECT).single()
export const deleteTask = (id) => supabase.from('tasks').delete().eq('id', id)

export const setAssignees = async (taskId, userIds) => {
  await supabase.from('task_assignees').delete().eq('task_id', taskId)
  if (userIds.length) await supabase.from('task_assignees').insert(userIds.map((user_id) => ({ task_id: taskId, user_id })))
}

// ---------- custom fields (per space) ----------
export const getTaskFields = (spaceId) =>
  supabase.from('task_fields').select('*').eq('space_id', spaceId).order('sort').order('created_at')
export const createTaskField = (x) => supabase.from('task_fields').insert(x).select().single()
export const updateTaskField = (id, x) => supabase.from('task_fields').update(x).eq('id', id)
export const deleteTaskField = (id) => supabase.from('task_fields').delete().eq('id', id)

// ---------- watchers ----------
export const getWatchers = (taskId) =>
  supabase.from('task_watchers').select('user_id').eq('task_id', taskId)
export const addWatcher = (task_id, user_id) =>
  supabase.from('task_watchers').upsert({ task_id, user_id })
export const removeWatcher = (task_id, user_id) =>
  supabase.from('task_watchers').delete().match({ task_id, user_id })

// ---------- dependencies ----------
export const getDependencies = (taskId) =>
  supabase.from('task_dependencies').select('*').or(`task_id.eq.${taskId},depends_on.eq.${taskId}`)
export const addDependency = (task_id, depends_on, type) =>
  supabase.from('task_dependencies').insert({ task_id, depends_on, type })
export const removeDependency = (id) => supabase.from('task_dependencies').delete().eq('id', id)

// ---------- comments ----------
export const getComments = (taskId) =>
  supabase.from('task_comments').select('*, profiles(full_name)').eq('task_id', taskId).order('created_at')
export const addComment = (task_id, author, body) =>
  supabase.from('task_comments').insert({ task_id, author, body })

// ---------- construction finance ----------
export const getCostCategories = (wid) =>
  supabase.from('cost_categories').select('*').eq('workspace_id', wid).order('sort').order('created_at')
export const createCostCategory = (c) => supabase.from('cost_categories').insert(c).select().single()
export const updateCostCategory = (id, c) => supabase.from('cost_categories').update(c).eq('id', id)
export const deleteCostCategory = (id) => supabase.from('cost_categories').delete().eq('id', id)

export const getExpenses = (wid) =>
  supabase.from('expenses').select('*, profiles(full_name)').eq('workspace_id', wid).order('spent_on', { ascending: false })
export const createExpense = (e) => supabase.from('expenses').insert(e)
export const updateExpense = (id, e) => supabase.from('expenses').update(e).eq('id', id)
export const deleteExpense = (id) => supabase.from('expenses').delete().eq('id', id)

export const getInvoices = (wid) =>
  supabase.from('invoices').select('*').eq('workspace_id', wid).order('seq')
export const createInvoice = (i) => supabase.from('invoices').insert(i).select().single()
export const updateInvoice = (id, i) => supabase.from('invoices').update(i).eq('id', id)
export const deleteInvoice = (id) => supabase.from('invoices').delete().eq('id', id)

// ---------- task activity (history) ----------
export const getActivity = (taskId) =>
  supabase.from('task_activity').select('*, actor:actor_id(full_name)').eq('task_id', taskId).order('created_at', { ascending: false })
export const logActivity = (rows) =>
  rows && rows.length ? supabase.from('task_activity').insert(rows) : Promise.resolve({})

// ---------- notifications ----------
export const getNotifications = (userId) =>
  supabase.from('notifications').select('*, actor:actor_id(full_name)').eq('user_id', userId).order('created_at', { ascending: false }).limit(100)
export const notify = (rows) => rows.length ? supabase.from('notifications').insert(rows) : Promise.resolve({})
export const markNotificationRead = (id) => supabase.from('notifications').update({ read: true }).eq('id', id)
export const markAllNotificationsRead = (userId) => supabase.from('notifications').update({ read: true }).eq('user_id', userId).eq('read', false)

// ---------- bootstrap ----------
// Default status set for a new space (ClickUp-style To Do / In Progress / Complete).
export const DEFAULT_STATUSES = [
  { name: 'To Do',       color: '#87909e', type: 'todo',   sort: 0 },
  { name: 'In Progress', color: '#4f86ff', type: 'active', sort: 1 },
  { name: 'Review',      color: '#f9a825', type: 'active', sort: 2 },
  { name: 'Complete',    color: '#22c55e', type: 'done',   sort: 3 },
]

export async function seedSpaceStatuses(spaceId) {
  const { data } = await supabase.from('statuses')
    .insert(DEFAULT_STATUSES.map((s) => ({ ...s, space_id: spaceId }))).select()
  return data || []
}

// Seed a starter Space (with statuses) + List into a workspace.
async function seedStarter(workspaceId) {
  const { data: space } = await createSpace({ workspace_id: workspaceId, name: 'Team Space', color: '#7B68EE', sort: 0 })
  if (space) {
    await seedSpaceStatuses(space.id)
    await createList({ space_id: space.id, name: 'To-dos', sort: 0 })
  }
}

// Ensure the user has a workspace (+ a starter space/list to land on).
// The DB trigger handle_new_workspace() adds the owner membership automatically.
export async function ensureWorkspace(user) {
  const { data: mine } = await getMyWorkspaces()
  if (mine && mine.length) {
    const wsId = mine[0].workspaces?.id
    if (wsId) {
      const { data: sp } = await getSpaces(wsId)
      if (!sp || !sp.length) await seedStarter(wsId)   // adopted/empty workspace → give it a space
    }
    return mine
  }

  const name = (user?.user_metadata?.full_name || user?.email || 'My') + "’s Workspace"
  const { data: ws, error } = await createWorkspace({ name, created_by: user.id })
  if (error || !ws) return mine || []
  await seedStarter(ws.id)
  return (await getMyWorkspaces()).data || []
}
