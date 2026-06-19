import { useState, useMemo, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useAuth } from '../auth'
import * as api from '../api'
import ListView from '../views/ListView'
import BoardView from '../views/BoardView'
import CalendarView from '../views/CalendarView'
import TableView from '../views/TableView'
import ViewControls from './ViewControls'
import TaskModal from './TaskModal'
import CustomizeModal from './CustomizeModal'
import { PRIORITIES } from './Bits'
import { playDone } from '../sound'

const VIEWS = [['list', 'List'], ['board', 'Board'], ['calendar', 'Calendar'], ['table', 'Table']]
const PR_RANK = { urgent: 0, high: 1, normal: 2, low: 3 }

export const normTask = (t) => ({
  ...t,
  assignees: (t.task_assignees || []).map((a) => a.user_id),
  commentCount: t.task_comments?.[0]?.count || 0,
})

// Floating action bar shown when one or more tasks are selected.
function BulkBar({ count, statuses, members, moveLists = [], onStatus, onAssign, onPriority, onMove, onDelete, onClear }) {
  return (
    <div className="bulkbar">
      <span className="bulkbar-count">{count} selected</span>
      <select className="bulkbar-sel" value="" onChange={(e) => onStatus(e.target.value)}>
        <option value="" disabled>Set status…</option>
        {statuses.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
      </select>
      <select className="bulkbar-sel" value="" onChange={(e) => onPriority(e.target.value || null)}>
        <option value="" disabled>Set priority…</option>
        {PRIORITIES.map((p) => <option key={p.k} value={p.k}>{p.n}</option>)}
        <option value="">No priority</option>
      </select>
      <select className="bulkbar-sel" value="" onChange={(e) => onAssign(e.target.value)}>
        <option value="" disabled>Assign to…</option>
        {members.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
      </select>
      {moveLists.length > 1 && (
        <select className="bulkbar-sel" value="" onChange={(e) => onMove(e.target.value)}>
          <option value="" disabled>Move to…</option>
          {moveLists.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
        </select>
      )}
      <button className="btn danger sm" onClick={onDelete}>🗑 Delete</button>
      <button className="bulkbar-x" onClick={onClear} title="Clear selection">✕</button>
    </div>
  )
}

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
  const [selected, setSelected] = useState(() => new Set())

  useEffect(() => { setRows((tasks || []).map(normTask)) }, [tasks])
  // drop selections for tasks that no longer exist after a reload
  useEffect(() => {
    setSelected((sel) => {
      if (!sel.size) return sel
      const ids = new Set(rows.map((r) => r.id))
      const next = new Set([...sel].filter((id) => ids.has(id)))
      return next.size === sel.size ? sel : next
    })
  }, [rows])

  // Deep-link: /list/:id?task=<id> opens that task (e.g. from global search).
  const [params, setParams] = useSearchParams()
  useEffect(() => {
    const tid = params.get('task')
    if (!tid) return
    const t = rows.find((x) => x.id === tid)
    if (t) {
      setEditing(t)
      const next = new URLSearchParams(params); next.delete('task'); setParams(next, { replace: true })
    }
  }, [params, rows, setParams])

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
  const isDoneType = (id) => { const ty = statuses.find((s) => s.id === id)?.type; return ty === 'done' || ty === 'closed' }
  async function changeStatus(taskId, status_id) {
    const t = rows.find((x) => x.id === taskId)
    if (!t || t.status_id === status_id) return
    const st = statuses.find((s) => s.id === status_id)
    const nowDone = st?.type === 'done' || st?.type === 'closed'
    setRows((rs) => rs.map((x) => x.id === taskId ? { ...x, status_id } : x))
    await api.updateTask(taskId, { status_id, completed_at: nowDone ? new Date().toISOString() : null })
    await api.logActivity([{ task_id: taskId, actor_id: user.id, field: 'status', from_val: stName(t.status_id), to_val: stName(status_id) }])
    if (nowDone && !isDoneType(t.status_id)) {
      playDone()                                                       // completion chime
      if (t.move_to_list && t.move_to_list !== t.list_id) {           // relocate → lands as "To Do" in the destination
        const todo = statuses.find((s) => s.type === 'todo') || statuses[0]
        await api.updateTask(t.id, { list_id: t.move_to_list, status_id: todo?.id || null, completed_at: null })
        reload && reload()
      }
      if (t.recurrence?.freq) { await api.rollRecurringTask(t, statuses); reload && reload() }  // spawn next instance
    }
  }

  // ----- bulk actions on selected tasks -----
  const toggleSelect = (id) => setSelected((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n })
  const selectMany = (ids, on) => setSelected((s) => { const n = new Set(s); ids.forEach((id) => on ? n.add(id) : n.delete(id)); return n })
  const clearSel = () => setSelected(new Set())
  const selIds = () => [...selected]

  async function bulkStatus(status_id) {
    if (!status_id) return
    const st = statuses.find((s) => s.id === status_id)
    const ids = selIds(), done = st?.type === 'done' || st?.type === 'closed'
    if (done) playDone()                                               // completion chime (once for the batch)
    setRows((rs) => rs.map((x) => selected.has(x.id) ? { ...x, status_id } : x))
    await Promise.all(ids.map((id) => {
      const t = rows.find((x) => x.id === id)
      return api.updateTask(id, { status_id, completed_at: done ? new Date().toISOString() : null })
        .then(() => api.logActivity([{ task_id: id, actor_id: user.id, field: 'status', from_val: stName(t?.status_id), to_val: stName(status_id) }]))
        .then(() => (done && !isDoneType(t?.status_id) && t?.move_to_list && t.move_to_list !== t.list_id)
          ? api.updateTask(id, { list_id: t.move_to_list, status_id: (statuses.find((s) => s.type === 'todo') || statuses[0])?.id || null, completed_at: null })
          : null)
        .then(() => (done && !isDoneType(t?.status_id) && t?.recurrence?.freq) ? api.rollRecurringTask(t, statuses) : null)
    }))
    clearSel(); reload && reload()
  }
  async function bulkAssign(userId) {
    if (!userId) return
    const ids = selIds()
    await Promise.all(ids.map((id) => {
      const t = rows.find((x) => x.id === id); if (!t) return Promise.resolve()
      return api.setAssignees(id, [...new Set([...t.assignees, userId])])
    }))
    clearSel(); reload && reload()
  }
  async function bulkPriority(priority) {
    const ids = selIds()
    setRows((rs) => rs.map((x) => selected.has(x.id) ? { ...x, priority } : x))
    await Promise.all(ids.map((id) => api.updateTask(id, { priority })))
    clearSel(); reload && reload()
  }
  async function bulkMove(list_id) {
    if (!list_id) return
    const ids = selIds()
    await Promise.all(ids.map((id) => api.updateTask(id, { list_id })))
    clearSel(); reload && reload()
  }
  async function bulkDelete() {
    const ids = selIds()
    if (!ids.length || !window.confirm(`Delete ${ids.length} task${ids.length > 1 ? 's' : ''}? This cannot be undone.`)) return
    await Promise.all(ids.map((id) => api.deleteTask(id)))
    clearSel(); reload && reload()
  }
  // move-to lists: within the current space (so statuses stay valid); fall back to all workspace lists
  const moveLists = space ? lists.filter((l) => l.space_id === space.id) : lists

  const selectProps = { selected, onToggleSelect: toggleSelect, onSelectMany: selectMany }

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
        listMap={listMap} showList={multiList} {...selectProps}
        onOpen={setEditing} onQuickAdd={quickAdd} onChangeStatus={changeStatus} />}
      {view === 'board' && <BoardView tasks={visible} statuses={statuses} members={members}
        listMap={listMap} showList={multiList}
        onOpen={setEditing} onQuickAdd={quickAdd} onChangeStatus={changeStatus} />}
      {view === 'calendar' && <CalendarView tasks={visible} statuses={statuses}
        onOpen={setEditing} onCreateOn={(d) => setEditing({ list_id: defaultListId, status_id: defaultStatus, due_date: d })} />}
      {view === 'table' && <TableView tasks={visible} statuses={statuses} members={members} fields={fields}
        listMap={listMap} showList={multiList} {...selectProps} onOpen={setEditing} />}

      {selected.size > 0 && (
        <BulkBar count={selected.size} statuses={statuses} members={members} moveLists={moveLists}
          onStatus={bulkStatus} onAssign={bulkAssign} onPriority={bulkPriority} onMove={bulkMove}
          onDelete={bulkDelete} onClear={clearSel} />
      )}

      {editing && (
        <TaskModal task={editing} listId={editing.list_id || defaultListId} statuses={statuses} members={members} fields={fields}
          lists={lists} allTasks={rows} onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); reload && reload() }} reload={reload} />
      )}
      {customizing && space && (
        <CustomizeModal space={space} statuses={statuses} fields={fields}
          onClose={() => setCustomizing(false)} onSaved={() => { setCustomizing(false); onConfigChanged && onConfigChanged() }} />
      )}
    </>
  )
}
