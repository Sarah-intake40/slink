import { useState, useMemo, useEffect } from 'react'
import { useAuth } from '../auth'
import * as api from '../api'
import ListView from '../views/ListView'
import BoardView from '../views/BoardView'
import CalendarView from '../views/CalendarView'
import TableView from '../views/TableView'
import ViewControls from './ViewControls'
import TaskModal from './TaskModal'
import CustomizeModal from './CustomizeModal'

const VIEWS = [['list', 'List'], ['board', 'Board'], ['calendar', 'Calendar'], ['table', 'Table']]
const PR_RANK = { urgent: 0, high: 1, normal: 2, low: 3 }

export const normTask = (t) => ({
  ...t,
  assignees: (t.task_assignees || []).map((a) => a.user_id),
  commentCount: t.task_comments?.[0]?.count || 0,
})

export default function TaskViews({ tasks, statuses, fields, members, lists = [], defaultListId, space, reload, onConfigChanged, header }) {
  const { user } = useAuth()
  const [rows, setRows] = useState(() => (tasks || []).map(normTask))
  const listMap = useMemo(() => Object.fromEntries(lists.map((l) => [l.id, l])), [lists])
  const multiList = useMemo(() => new Set(rows.map((t) => t.list_id)).size > 1, [rows])
  const [view, setView] = useState('list')
  const [editing, setEditing] = useState(null)
  const [customizing, setCustomizing] = useState(false)
  const [q, setQ] = useState('')
  const [fAssignee, setFAssignee] = useState('')
  const [fPriority, setFPriority] = useState('')
  const [sortBy, setSortBy] = useState('manual')
  const [groupBy, setGroupBy] = useState('status')

  useEffect(() => { setRows((tasks || []).map(normTask)) }, [tasks])

  const defaultStatus = statuses[0]?.id || null
  const stName = (id) => statuses.find((s) => s.id === id)?.name || '—'

  const visible = useMemo(() => {
    let v = rows.filter((t) => !t.parent_id)
    if (q) v = v.filter((t) => t.name.toLowerCase().includes(q.toLowerCase()))
    if (fAssignee) v = v.filter((t) => t.assignees.includes(fAssignee))
    if (fPriority) v = v.filter((t) => t.priority === fPriority)
    const cmp = {
      manual: (a, b) => (a.sort - b.sort) || (a.created_at < b.created_at ? -1 : 1),
      due: (a, b) => (a.due_date || '9999').localeCompare(b.due_date || '9999'),
      priority: (a, b) => (PR_RANK[a.priority] ?? 9) - (PR_RANK[b.priority] ?? 9),
      name: (a, b) => a.name.localeCompare(b.name),
      created: (a, b) => (a.created_at < b.created_at ? -1 : 1),
    }[sortBy]
    return [...v].sort(cmp)
  }, [rows, q, fAssignee, fPriority, sortBy])

  async function quickAdd(name, status_id) {
    if (!name.trim() || !defaultListId) return
    const { data } = await api.createTask({ list_id: defaultListId, name: name.trim(), status_id: status_id || defaultStatus, created_by: user.id, sort: rows.length })
    if (data) await api.logActivity([{ task_id: data.id, actor_id: user.id, field: 'created', to_val: name.trim() }])
    reload && reload()
  }
  async function changeStatus(taskId, status_id) {
    const t = rows.find((x) => x.id === taskId)
    if (!t || t.status_id === status_id) return
    const st = statuses.find((s) => s.id === status_id)
    setRows((rs) => rs.map((x) => x.id === taskId ? { ...x, status_id } : x))
    await api.updateTask(taskId, { status_id, completed_at: st?.type === 'done' || st?.type === 'closed' ? new Date().toISOString() : null })
    await api.logActivity([{ task_id: taskId, actor_id: user.id, field: 'status', from_val: stName(t.status_id), to_val: stName(status_id) }])
  }

  return (
    <>
      <div className="list-head">
        <div>{header?.crumb && <div className="crumb">{header.crumb}</div>}<h2>{header?.title}</h2></div>
        <div className="view-tabs">
          {VIEWS.map(([k, label]) => <button key={k} className={view === k ? 'on' : ''} onClick={() => setView(k)}>{label}</button>)}
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
          {space && <button className="btn ghost" onClick={() => setCustomizing(true)}>⚙ Customize</button>}
          {defaultListId && <button className="btn" onClick={() => setEditing({ list_id: defaultListId, status_id: defaultStatus })}>+ Task</button>}
        </div>
      </div>

      <ViewControls view={view} members={members} q={q} setQ={setQ}
        fAssignee={fAssignee} setFAssignee={setFAssignee} fPriority={fPriority} setFPriority={setFPriority}
        sortBy={sortBy} setSortBy={setSortBy} groupBy={groupBy} setGroupBy={setGroupBy} />

      {view === 'list' && <ListView tasks={visible} statuses={statuses} members={members} groupBy={groupBy}
        listMap={listMap} showList={multiList}
        onOpen={setEditing} onQuickAdd={quickAdd} onChangeStatus={changeStatus} />}
      {view === 'board' && <BoardView tasks={visible} statuses={statuses} members={members}
        listMap={listMap} showList={multiList}
        onOpen={setEditing} onQuickAdd={quickAdd} onChangeStatus={changeStatus} />}
      {view === 'calendar' && <CalendarView tasks={visible} statuses={statuses}
        onOpen={setEditing} onCreateOn={(d) => setEditing({ list_id: defaultListId, status_id: defaultStatus, due_date: d })} />}
      {view === 'table' && <TableView tasks={visible} statuses={statuses} members={members} fields={fields}
        listMap={listMap} showList={multiList} onOpen={setEditing} />}

      {editing && (
        <TaskModal task={editing} listId={editing.list_id || defaultListId} statuses={statuses} members={members} fields={fields}
          allTasks={rows} onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); reload && reload() }} reload={reload} />
      )}
      {customizing && space && (
        <CustomizeModal space={space} statuses={statuses} fields={fields}
          onClose={() => setCustomizing(false)} onSaved={() => { setCustomizing(false); onConfigChanged && onConfigChanged() }} />
      )}
    </>
  )
}
