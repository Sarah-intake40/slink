import { supabase } from './supabaseClient'

// ---- profiles / team ----
export const getProfiles = () => supabase.from('profiles').select('*').order('full_name')
export const updateRole = (id, role) => supabase.from('profiles').update({ role }).eq('id', id)

// ---- projects ----
export const getProjects = () => supabase.from('projects').select('*').order('created_at', { ascending: false })
export const getProject = (id) => supabase.from('projects').select('*').eq('id', id).single()
export const createProject = (p) => supabase.from('projects').insert(p).select().single()
export const updateProject = (id, p) => supabase.from('projects').update(p).eq('id', id).select().single()
export const deleteProject = (id) => supabase.from('projects').delete().eq('id', id)

// ---- members ----
export const getMembers = (pid) =>
  supabase.from('project_members').select('*, profiles(full_name, role)').eq('project_id', pid)
export const addMember = (project_id, user_id, role) =>
  supabase.from('project_members').upsert({ project_id, user_id, role })
export const removeMember = (project_id, user_id) =>
  supabase.from('project_members').delete().match({ project_id, user_id })

// ---- tasks ----
export const getTasks = (pid) => supabase.from('tasks').select('*').eq('project_id', pid).order('start_date')
export const getSubtasks = (parentId) => supabase.from('tasks').select('*').eq('parent_id', parentId).order('created_at')
export const createTask = (t) => supabase.from('tasks').insert(t).select().single()
export const updateTask = (id, t) => supabase.from('tasks').update(t).eq('id', id).select().single()
export const deleteTask = (id) => supabase.from('tasks').delete().eq('id', id)

// ---- task custom fields (per project) ----
export const getTaskFields = (pid) =>
  supabase.from('task_fields').select('*').eq('project_id', pid).order('sort').order('created_at')
export const createTaskField = (x) => supabase.from('task_fields').insert(x).select().single()
export const updateTaskField = (id, x) => supabase.from('task_fields').update(x).eq('id', id)
export const deleteTaskField = (id) => supabase.from('task_fields').delete().eq('id', id)

// ---- comments ----
export const getComments = (tid) =>
  supabase.from('task_comments').select('*, profiles(full_name)').eq('task_id', tid).order('created_at')
export const addComment = (task_id, author, body) =>
  supabase.from('task_comments').insert({ task_id, author, body })

// ---- budget categories (per-project, editable) ----
export const getCategories = (pid) =>
  supabase.from('budget_categories').select('*').eq('project_id', pid).order('sort').order('created_at')
export const createCategory = (c) => supabase.from('budget_categories').insert(c).select().single()
export const updateCategory = (id, c) => supabase.from('budget_categories').update(c).eq('id', id)
export const deleteCategory = (id) => supabase.from('budget_categories').delete().eq('id', id)

// ---- budget + expenses ----
export const getBudgetLines = (pid) => supabase.from('budget_lines').select('*').eq('project_id', pid)
export const setBudgetLine = (project_id, category, amount) =>
  supabase.from('budget_lines').upsert({ project_id, category, amount })
export const getExpenses = (pid) =>
  supabase.from('expenses').select('*, profiles(full_name)').eq('project_id', pid).order('spent_on', { ascending: false })
export const createExpense = (e) => supabase.from('expenses').insert(e)
export const deleteExpense = (id) => supabase.from('expenses').delete().eq('id', id)

// ---- records ----
export const getRecords = (pid) => supabase.from('records').select('*').eq('project_id', pid).order('created_at', { ascending: false })
export const createRecord = (r) => supabase.from('records').insert(r)
export const updateRecord = (id, r) => supabase.from('records').update(r).eq('id', id)
export const deleteRecord = (id) => supabase.from('records').delete().eq('id', id)

// ---- payment certificates (المستخلصات) ----
export const getCertificates = (pid) =>
  supabase.from('payment_certificates').select('*, profiles(full_name)').eq('project_id', pid).order('seq', { ascending: true })
export const createCertificate = (c) => supabase.from('payment_certificates').insert(c).select().single()
export const updateCertificate = (id, c) => supabase.from('payment_certificates').update(c).eq('id', id).select().single()
export const deleteCertificate = (id) => supabase.from('payment_certificates').delete().eq('id', id)

// ---- attachments / storage ----
export const getAttachments = (pid) =>
  supabase.from('attachments').select('*, profiles(full_name)').eq('project_id', pid).order('created_at', { ascending: false })
export async function uploadDrawing(pid, file, uploaderId) {
  const path = `${pid}/${Date.now()}-${file.name}`
  const up = await supabase.storage.from('drawings').upload(path, file)
  if (up.error) return up
  const kb = file.size / 1024
  const size = kb > 1024 ? (kb / 1024).toFixed(1) + ' MB' : Math.round(kb) + ' KB'
  return supabase.from('attachments').insert({
    project_id: pid, file_name: file.name, file_path: path, file_size: size, uploaded_by: uploaderId,
  })
}
export const drawingUrl = (path) => supabase.storage.from('drawings').createSignedUrl(path, 3600)
export const deleteAttachment = async (id, path) => {
  await supabase.storage.from('drawings').remove([path])
  return supabase.from('attachments').delete().eq('id', id)
}
