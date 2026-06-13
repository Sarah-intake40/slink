import { useEffect, useState } from 'react'
import { useAuth } from '../auth'
import * as api from '../api'
import { buildNotifs } from '../notifications'
import Modal from './Modal'
import { PRIORITIES, Avatar, todayISO, uid, fmtDuration } from './Bits'

export default function TaskModal({ task, listId, statuses, members, fields = [], allTasks, onClose, onSaved, reload }) {
  const { user } = useAuth()
  const isNew = !task.id
  const doneStatus = statuses.find((s) => s.type === 'done') || statuses[statuses.length - 1]
  const [f, setF] = useState({
    name: task.name || '',
    description: task.description || '',
    status_id: task.status_id || statuses[0]?.id || null,
    priority: task.priority || '',
    start_date: task.start_date || '',
    due_date: task.due_date || '',
    time_estimate: task.time_estimate || '',
    tags: Array.isArray(task.tags) ? task.tags : [],
    assignees: task.assignees || [],
    checklist: Array.isArray(task.checklist) ? task.checklist : [],
    custom: task.custom && typeof task.custom === 'object' ? { ...task.custom } : {},
  })
  const [comments, setComments] = useState([])
  const [newComment, setNewComment] = useState('')
  const [tagInput, setTagInput] = useState('')
  const [checkInput, setCheckInput] = useState('')
  const [subs, setSubs] = useState([])
  const [subInput, setSubInput] = useState('')
  const [watchers, setWatchers] = useState([])
  const [deps, setDeps] = useState([])
  const [depPick, setDepPick] = useState({ id: '', type: 'waiting_on' })
  const [activity, setActivity] = useState([])
  const [showHistory, setShowHistory] = useState(false)
  const [busy, setBusy] = useState(false)
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value })

  useEffect(() => {
    if (task.id) {
      api.getComments(task.id).then(({ data }) => setComments(data || []))
      api.getWatchers(task.id).then(({ data }) => setWatchers((data || []).map((w) => w.user_id)))
      api.getActivity(task.id).then(({ data }) => setActivity(data || []))
      refreshSubs(); refreshDeps()
    }
  }, [task.id])
  async function refreshSubs() { if (task.id) { const { data } = await api.getSubtasks(task.id); setSubs(data || []) } }
  async function refreshDeps() { if (task.id) { const { data } = await api.getDependencies(task.id); setDeps(data || []) } }

  const nameOf = (id) => members.find((m) => m.id === id)?.name || 'User'
  const taskName = (id) => (allTasks || []).find((t) => t.id === id)?.name || 'task'

  const toggleAssignee = (id) => setF((p) => ({ ...p, assignees: p.assignees.includes(id) ? p.assignees.filter((x) => x !== id) : [...p.assignees, id] }))
  const addTag = (raw) => { const t = raw.trim(); if (t && !f.tags.includes(t)) setF({ ...f, tags: [...f.tags, t] }); setTagInput('') }
  const removeTag = (t) => setF({ ...f, tags: f.tags.filter((x) => x !== t) })
  const allTags = [...new Set((allTasks || []).flatMap((t) => t.tags || []))].filter((t) => !f.tags.includes(t)).slice(0, 8)
  const setCustom = (fid, v) => setF((p) => ({ ...p, custom: { ...p.custom, [fid]: v } }))

  // checklist
  const addCheck = () => { if (!checkInput.trim()) return; setF({ ...f, checklist: [...f.checklist, { id: uid(), text: checkInput.trim(), done: false }] }); setCheckInput('') }
  const toggleCheck = (id) => setF({ ...f, checklist: f.checklist.map((c) => c.id === id ? { ...c, done: !c.done } : c) })
  const removeCheck = (id) => setF({ ...f, checklist: f.checklist.filter((c) => c.id !== id) })
  const checkDone = f.checklist.filter((c) => c.done).length

  // subtasks
  async function addSub() {
    if (!subInput.trim()) return
    await api.createTask({ list_id: listId, parent_id: task.id, name: subInput.trim(), status_id: statuses[0]?.id || null, created_by: user.id })
    setSubInput(''); refreshSubs(); reload && reload()
  }
  async function toggleSub(s) {
    const isDone = statuses.find((x) => x.id === s.status_id)?.type === 'done'
    await api.updateTask(s.id, { status_id: isDone ? statuses[0]?.id : doneStatus?.id }); refreshSubs(); reload && reload()
  }
  async function removeSub(s) { if (confirm('Delete subtask?')) { await api.deleteTask(s.id); refreshSubs(); reload && reload() } }
  const subDone = subs.filter((s) => statuses.find((x) => x.id === s.status_id)?.type === 'done').length

  // watchers
  async function toggleWatch(id) {
    if (watchers.includes(id)) { await api.removeWatcher(task.id, id); setWatchers(watchers.filter((x) => x !== id)) }
    else { await api.addWatcher(task.id, id); setWatchers([...watchers, id]) }
  }

  // dependencies
  async function addDep() {
    if (!depPick.id) return
    if (depPick.type === 'blocking') await api.addDependency(depPick.id, task.id, 'waiting_on')
    else await api.addDependency(task.id, depPick.id, depPick.type)
    setDepPick({ id: '', type: 'waiting_on' }); refreshDeps()
  }
  async function dropDep(id) { await api.removeDependency(id); refreshDeps() }
  const waitingOn = deps.filter((d) => d.type === 'waiting_on' && d.task_id === task.id)
  const blocking = deps.filter((d) => d.type === 'waiting_on' && d.depends_on === task.id)
  const linked = deps.filter((d) => d.type === 'links')

  async function save() {
    if (!f.name.trim()) return alert('Task name is required')
    setBusy(true)
    const st = statuses.find((s) => s.id === f.status_id)
    const payload = {
      list_id: listId, name: f.name.trim(), description: f.description || null,
      status_id: f.status_id, priority: f.priority || null,
      start_date: f.start_date || null, due_date: f.due_date || null,
      time_estimate: f.time_estimate ? Number(f.time_estimate) : null,
      tags: f.tags, checklist: f.checklist, custom: f.custom,
      completed_at: (st?.type === 'done' || st?.type === 'closed') ? new Date().toISOString() : null,
    }
    let id = task.id
    if (isNew) {
      const { data, error } = await api.createTask({ ...payload, created_by: user.id })
      if (error) { setBusy(false); return alert(error.message) }
      id = data.id
    } else {
      const { error } = await api.updateTask(task.id, payload)
      if (error) { setBusy(false); return alert(error.message) }
    }
    await api.setAssignees(id, f.assignees)
    // notify newly-added assignees
    const added = f.assignees.filter((a) => !(task.assignees || []).includes(a))
    await api.notify(buildNotifs(added, { actorId: user.id, type: 'assigned', task_id: id, list_id: listId, body: f.name.trim() }))
    // history log (Jira-style)
    const stName = (sid) => statuses.find((s) => s.id === sid)?.name || '—'
    const nm = (uidv) => members.find((m) => m.id === uidv)?.name || 'User'
    const acts = []
    if (isNew) acts.push({ field: 'created', to_val: f.name.trim() })
    else {
      if (task.status_id !== f.status_id) acts.push({ field: 'status', from_val: stName(task.status_id), to_val: stName(f.status_id) })
      if ((task.priority || '') !== (f.priority || '')) acts.push({ field: 'priority', from_val: task.priority || 'none', to_val: f.priority || 'none' })
      if ((task.due_date || '') !== (f.due_date || '')) acts.push({ field: 'due_date', from_val: task.due_date || '—', to_val: f.due_date || '—' })
      if ((task.start_date || '') !== (f.start_date || '')) acts.push({ field: 'start_date', from_val: task.start_date || '—', to_val: f.start_date || '—' })
      if ((task.name || '') !== f.name.trim()) acts.push({ field: 'name', from_val: task.name, to_val: f.name.trim() })
      const oldA = [...(task.assignees || [])].sort().join(','), newA = [...f.assignees].sort().join(',')
      if (oldA !== newA) acts.push({ field: 'assignee', from_val: (task.assignees || []).map(nm).join(', ') || 'none', to_val: f.assignees.map(nm).join(', ') || 'none' })
    }
    if (acts.length) await api.logActivity(acts.map((a) => ({ ...a, task_id: id, actor_id: user.id })))
    setBusy(false); onSaved()
  }
  async function remove() { if (confirm('Delete this task' + (subs.length ? ' and its subtasks' : '') + '?')) { await api.deleteTask(task.id); onSaved() } }
  async function postComment() {
    if (!newComment.trim()) return
    const body = newComment.trim()
    await api.addComment(task.id, user.id, body); setNewComment('')
    // notify watchers + assignees
    await api.notify(buildNotifs([...watchers, ...f.assignees], { actorId: user.id, type: 'comment', task_id: task.id, list_id: listId, body }))
    const { data } = await api.getComments(task.id); setComments(data || [])
  }

  const otherTasks = (allTasks || []).filter((t) => t.id !== task.id && !t.parent_id)

  return (
    <Modal wide kicker={isNew ? 'NEW TASK' : 'TASK'} title={isNew ? 'Create task' : f.name} onClose={onClose}>
      <div className="field"><label>Name</label>
        <input autoFocus value={f.name} onChange={set('name')} placeholder="Task name" /></div>

      <div className="row2">
        <div className="field"><label>Status</label>
          <select value={f.status_id || ''} onChange={set('status_id')}>
            {statuses.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select></div>
        <div className="field"><label>Priority</label>
          <select value={f.priority} onChange={set('priority')}>
            <option value="">None</option>
            {PRIORITIES.map((p) => <option key={p.k} value={p.k}>{p.n}</option>)}
          </select></div>
      </div>

      <div className="row2">
        <div className="field"><label>Start date</label><input type="date" value={f.start_date || ''} onChange={set('start_date')} /></div>
        <div className="field"><label>Due date</label><input type="date" value={f.due_date || ''} onChange={set('due_date')} /></div>
      </div>

      <div className="field"><label>Time estimate (minutes){f.time_estimate ? ` · ${fmtDuration(f.time_estimate)}` : ''}</label>
        <input type="number" value={f.time_estimate} onChange={set('time_estimate')} placeholder="e.g. 90" /></div>

      <div className="field"><label>Assignees</label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {members.map((m) => (
            <button key={m.id} type="button" className={'assignee-chip' + (f.assignees.includes(m.id) ? ' on' : '')} onClick={() => toggleAssignee(m.id)}>
              <Avatar name={m.name} size={20} /> {m.name}
            </button>
          ))}
          {!members.length && <span style={{ color: 'var(--mut)', fontSize: 12.5 }}>No members yet.</span>}
        </div>
      </div>

      <div className="field"><label>Tags</label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: f.tags.length ? 8 : 0 }}>
          {f.tags.map((t) => <span key={t} className="tagchip on">{t}<button onClick={() => removeTag(t)} style={{ marginLeft: 4 }}>×</button></span>)}
        </div>
        <input value={tagInput} onChange={(e) => setTagInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addTag(tagInput) } }} placeholder="Type a tag and press Enter" />
        {allTags.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
            {allTags.map((t) => <button key={t} type="button" className="tagchip" onClick={() => addTag(t)}>+ {t}</button>)}
          </div>
        )}
      </div>

      {/* Custom fields */}
      {fields.length > 0 && (
        <div style={{ borderTop: '1px solid var(--line)', paddingTop: 14, display: 'flex', flexDirection: 'column', gap: 13 }}>
          <SectionLabel>Custom fields</SectionLabel>
          {fields.map((fl) => <FieldInput key={fl.id} field={fl} value={f.custom[fl.id]} members={members} onChange={(v) => setCustom(fl.id, v)} />)}
        </div>
      )}

      <div className="field"><label>Description</label>
        <textarea rows="3" value={f.description} onChange={set('description')} placeholder="Add details…" /></div>

      {/* Checklist */}
      <Section title={`Checklist ${f.checklist.length ? `(${checkDone}/${f.checklist.length})` : ''}`}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 8 }}>
          {f.checklist.map((c) => (
            <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input type="checkbox" checked={c.done} onChange={() => toggleCheck(c.id)} style={{ width: 'auto' }} />
              <span style={{ flex: 1, fontSize: 13, textDecoration: c.done ? 'line-through' : 'none', color: c.done ? 'var(--mut)' : 'var(--ink)' }}>{c.text}</span>
              <button className="x" style={{ width: 24, height: 24 }} onClick={() => removeCheck(c.id)}>×</button>
            </div>
          ))}
          {!f.checklist.length && <Empty>No items.</Empty>}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <input value={checkInput} onChange={(e) => setCheckInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addCheck() } }} placeholder="Add checklist item…" style={{ flex: 1 }} />
          <button className="btn sm" onClick={addCheck}>Add</button>
        </div>
      </Section>

      {/* Subtasks */}
      <Section title={`Subtasks ${subs.length ? `(${subDone}/${subs.length})` : ''}`}>
        {isNew ? <Empty>Save the task first to add subtasks.</Empty> : (
          <>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 8 }}>
              {subs.map((s) => {
                const done = statuses.find((x) => x.id === s.status_id)?.type === 'done'
                return (
                  <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <input type="checkbox" checked={done} onChange={() => toggleSub(s)} style={{ width: 'auto' }} />
                    <span style={{ flex: 1, fontSize: 13, textDecoration: done ? 'line-through' : 'none', color: done ? 'var(--mut)' : 'var(--ink)' }}>{s.name}</span>
                    <button className="x" style={{ width: 24, height: 24 }} onClick={() => removeSub(s)}>×</button>
                  </div>
                )
              })}
              {!subs.length && <Empty>No subtasks.</Empty>}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <input value={subInput} onChange={(e) => setSubInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addSub() } }} placeholder="Add subtask…" style={{ flex: 1 }} />
              <button className="btn sm" onClick={addSub}>Add</button>
            </div>
          </>
        )}
      </Section>

      {/* Dependencies */}
      {!isNew && (
        <Section title="Dependencies">
          <DepList label="Waiting on" rows={waitingOn} idKey="depends_on" taskName={taskName} onDrop={dropDep} />
          <DepList label="Blocking" rows={blocking} idKey="task_id" taskName={taskName} onDrop={dropDep} />
          <DepList label="Linked" rows={linked} idKey={(d) => (d.task_id === task.id ? 'depends_on' : 'task_id')} taskName={taskName} onDrop={dropDep} />
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <select value={depPick.type} onChange={(e) => setDepPick({ ...depPick, type: e.target.value })} style={{ flex: '0 0 130px' }}>
              <option value="waiting_on">Waiting on</option>
              <option value="blocking">Blocking</option>
              <option value="links">Linked</option>
            </select>
            <select value={depPick.id} onChange={(e) => setDepPick({ ...depPick, id: e.target.value })} style={{ flex: 1 }}>
              <option value="">Select a task…</option>
              {otherTasks.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
            <button className="btn sm" onClick={addDep}>Add</button>
          </div>
        </Section>
      )}

      {/* Watchers */}
      {!isNew && (
        <Section title={`Watchers (${watchers.length})`}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {members.map((m) => (
              <button key={m.id} type="button" className={'assignee-chip' + (watchers.includes(m.id) ? ' on' : '')} onClick={() => toggleWatch(m.id)}>
                <Avatar name={m.name} size={20} /> {m.name}
              </button>
            ))}
          </div>
        </Section>
      )}

      {/* Comments */}
      {!isNew && (
        <Section title={`Comments (${comments.length})`}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 10 }}>
            {comments.map((c) => (
              <div key={c.id} className="comment">
                <Avatar name={c.profiles?.full_name} size={30} />
                <div className="bub">
                  <div><span className="who2">{c.profiles?.full_name || 'User'}</span>
                    <span className="when">{new Date(c.created_at).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</span></div>
                  <div style={{ marginTop: 3, fontSize: 13 }}>{c.body}</div>
                </div>
              </div>
            ))}
            {!comments.length && <Empty>No comments yet.</Empty>}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <input placeholder="Write a comment…" value={newComment} onChange={(e) => setNewComment(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && postComment()}
              style={{ flex: 1, border: '1px solid var(--line2)', borderRadius: 10, padding: '9px 12px' }} />
            <button className="btn sm" onClick={postComment}>Send</button>
          </div>
        </Section>
      )}

      {/* History (Jira-style activity log) */}
      {!isNew && (
        <div className="field" style={{ borderTop: '1px solid var(--line)', paddingTop: 14 }}>
          <button className="hist-toggle" onClick={() => setShowHistory((v) => !v)}>
            🕘 History ({activity.length}) <span style={{ color: 'var(--mut2)' }}>{showHistory ? '▾' : '▸'}</span>
          </button>
          {showHistory && (
            <div className="hist">
              {activity.map((a) => (
                <div key={a.id} className="hist-row">
                  <span className="hist-dot" />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 12.5 }}><b>{a.actor?.full_name || 'Someone'}</b> {describeActivity(a)}</div>
                    <div style={{ color: 'var(--mut2)', fontSize: 11 }}>{new Date(a.created_at).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</div>
                  </div>
                </div>
              ))}
              {!activity.length && <span style={{ color: 'var(--mut)', fontSize: 12.5 }}>No history yet.</span>}
            </div>
          )}
        </div>
      )}

      <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
        <button className="btn" onClick={save} disabled={busy}>{isNew ? 'Create task' : 'Save'}</button>
        {!isNew && <button className="btn danger" onClick={remove}>Delete</button>}
        <button className="btn ghost" style={{ marginLeft: 'auto' }} onClick={onClose}>Close</button>
      </div>
    </Modal>
  )
}

function describeActivity(a) {
  switch (a.field) {
    case 'created': return 'created this task'
    case 'status': return <>changed status from <b>{a.from_val}</b> to <b>{a.to_val}</b></>
    case 'assignee': return <>set assignees to <b>{a.to_val}</b></>
    case 'priority': return <>set priority to <b>{a.to_val}</b></>
    case 'due_date': return <>changed due date to <b>{a.to_val}</b></>
    case 'start_date': return <>changed start date to <b>{a.to_val}</b></>
    case 'name': return <>renamed it to <b>{a.to_val}</b></>
    default: return 'updated the task'
  }
}

const SectionLabel = ({ children }) => (
  <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--mut)', textTransform: 'uppercase', letterSpacing: '.5px' }}>{children}</div>
)
const Empty = ({ children }) => <span style={{ color: 'var(--mut)', fontSize: 12.5 }}>{children}</span>
const Section = ({ title, children }) => (
  <div className="field" style={{ borderTop: '1px solid var(--line)', paddingTop: 14 }}>
    <label>{title}</label>{children}
  </div>
)

function DepList({ label, rows, idKey, taskName, onDrop }) {
  if (!rows.length) return null
  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{ fontSize: 11, color: 'var(--mut)', fontWeight: 600, marginBottom: 4 }}>{label}</div>
      {rows.map((d) => {
        const key = typeof idKey === 'function' ? idKey(d) : idKey
        return (
          <div key={d.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0' }}>
            <span style={{ flex: 1, fontSize: 13 }}>🔗 {taskName(d[key])}</span>
            <button className="x" style={{ width: 24, height: 24 }} onClick={() => onDrop(d.id)}>×</button>
          </div>
        )
      })}
    </div>
  )
}

function FieldInput({ field, value, members, onChange }) {
  const t = field.type
  if (t === 'checkbox') {
    return <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 600 }}>
      <input type="checkbox" checked={!!value} onChange={(e) => onChange(e.target.checked)} style={{ width: 'auto' }} /> {field.name}
    </label>
  }
  return (
    <div className="field">
      <label>{field.name}</label>
      {t === 'text' && <input value={value || ''} onChange={(e) => onChange(e.target.value)} />}
      {t === 'url' && <input type="url" value={value || ''} onChange={(e) => onChange(e.target.value)} placeholder="https://" />}
      {(t === 'number' || t === 'money' || t === 'percent') && <input type="number" value={value ?? ''} onChange={(e) => onChange(e.target.value)} />}
      {t === 'date' && <input type="date" value={value || ''} onChange={(e) => onChange(e.target.value)} />}
      {t === 'select' && (
        <select value={value || ''} onChange={(e) => onChange(e.target.value)}>
          <option value="">—</option>
          {(field.options || []).map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
      )}
      {t === 'person' && (
        <select value={value || ''} onChange={(e) => onChange(e.target.value)}>
          <option value="">Unassigned</option>
          {members.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
        </select>
      )}
      {t === 'multiselect' && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {(field.options || []).map((o) => {
            const arr = Array.isArray(value) ? value : []
            const on = arr.includes(o)
            return <button key={o} type="button" className={'tagchip' + (on ? ' on' : '')}
              onClick={() => onChange(on ? arr.filter((x) => x !== o) : [...arr, o])}>{o}</button>
          })}
          {!(field.options || []).length && <Empty>No options defined.</Empty>}
        </div>
      )}
    </div>
  )
}
