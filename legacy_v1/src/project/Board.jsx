import { useEffect, useState, useCallback } from 'react'
import { useAuth } from '../auth'
import * as api from '../api'
import Modal from '../components/Modal'
import {
  STATUSES, PRIORITIES, FIELD_TYPES, fieldTypeOf, stOf, prOf,
  fmtDate, todayISO, money, Avatar, MoneyInput,
} from '../components/Bits'

const uid = () => (crypto?.randomUUID ? crypto.randomUUID() : 'id' + Math.random().toString(36).slice(2))

export default function Board({ project, canEdit, onChange }) {
  const [tasks, setTasks] = useState([])
  const [members, setMembers] = useState([])
  const [fields, setFields] = useState([])
  const [editing, setEditing] = useState(null)
  const [managingFields, setManagingFields] = useState(false)
  const [dragId, setDragId] = useState(null)

  const load = useCallback(async () => {
    const [{ data }, { data: m }, { data: ff }] = await Promise.all([
      api.getTasks(project.id), api.getMembers(project.id), api.getTaskFields(project.id),
    ])
    setTasks(data || [])
    setMembers((m || []).map((x) => ({ id: x.user_id, name: x.profiles?.full_name || 'User' })))
    setFields(ff || [])
  }, [project.id])
  useEffect(() => { load() }, [load])

  const topLevel = tasks.filter((t) => !t.parent_id)
  const childrenOf = (id) => tasks.filter((t) => t.parent_id === id)
  const allTags = [...new Set(tasks.flatMap((t) => (Array.isArray(t.tags) ? t.tags : [])))].sort()

  async function drop(status) {
    if (!dragId) return
    const t = tasks.find((x) => x.id === dragId)
    if (t && t.status !== status) {
      setTasks(tasks.map((x) => x.id === dragId ? { ...x, status } : x))
      await api.updateTask(dragId, { status })
      onChange && onChange()
    }
    setDragId(null)
  }

  return (
    <>
      <div style={{ display: 'flex', marginBottom: 16, gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ color: 'var(--mut)', fontSize: 13 }}>
          {canEdit ? 'Drag cards between columns to update status.' : 'You have view / comment access.'}
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
          {canEdit && <button className="btn ghost" onClick={() => setManagingFields(true)}>⚙ Fields</button>}
          {canEdit && <button className="btn" onClick={() => setEditing({})}>+ New Task</button>}
        </div>
      </div>

      <div className="kanban">
        {STATUSES.map((s) => {
          const items = topLevel.filter((t) => t.status === s.k)
          return (
            <div key={s.k} className="col">
              <div className="col-h"><span className="bd" style={{ background: s.c }} />{s.n}<span className="n">{items.length}</span></div>
              <div className="col-body"
                onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add('over') }}
                onDragLeave={(e) => e.currentTarget.classList.remove('over')}
                onDrop={(e) => { e.currentTarget.classList.remove('over'); drop(s.k) }}>
                {items.map((t) => (
                  <TaskCard key={t.id} t={t} members={members} subs={childrenOf(t.id)}
                    onOpen={() => setEditing(t)} draggable={canEdit}
                    onDragStart={() => setDragId(t.id)} />
                ))}
                {!items.length && <div style={{ color: 'var(--mut)', fontSize: 12, textAlign: 'center', padding: '12px 0' }}>—</div>}
              </div>
              {canEdit && <button className="addbtn" onClick={() => setEditing({ status: s.k })}>+ Add task</button>}
            </div>
          )
        })}
      </div>

      {editing && (
        <TaskModal task={editing} project={project} members={members} fields={fields} allTags={allTags}
          subtasks={editing.id ? childrenOf(editing.id) : []} canEdit={canEdit}
          onClose={() => setEditing(null)} reload={load}
          onSaved={() => { setEditing(null); load(); onChange && onChange() }} />
      )}
      {managingFields && (
        <FieldsModal project={project} fields={fields}
          onClose={() => setManagingFields(false)} onSaved={() => { setManagingFields(false); load() }} />
      )}
    </>
  )
}

function TaskCard({ t, members, subs, onOpen, draggable, onDragStart }) {
  const st = stOf(t.status), pr = prOf(t.priority)
  const who = members.find((m) => m.id === t.assignee)?.name
  const tags = Array.isArray(t.tags) ? t.tags : []
  const checklist = Array.isArray(t.checklist) ? t.checklist : []
  const checkDone = checklist.filter((c) => c.done).length
  const subDone = subs.filter((s) => s.status === 'done').length
  return (
    <div className="tcard" draggable={draggable} onClick={onOpen}
      onDragStart={(e) => { onDragStart(); e.currentTarget.classList.add('drag') }}
      onDragEnd={(e) => e.currentTarget.classList.remove('drag')}
      style={{ borderLeftColor: st.c }}>
      {t.is_milestone && <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--insp)', letterSpacing: 1, marginBottom: 5 }}>◆ MILESTONE</div>}
      <div className="tt">{t.title}</div>
      {tags.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 7 }}>
          {tags.map((tg) => <span key={tg} className="tagchip">{tg}</span>)}
        </div>
      )}
      <div className="meta">
        <span className="tag">{fmtDate(t.due_date)}</span>
        <span className={pr.cls} style={{ fontWeight: 700 }}>● {pr.n}</span>
        {subs.length > 0 && <span className="tag" title="Subtasks">▣ {subDone}/{subs.length}</span>}
        {checklist.length > 0 && <span className="tag" title="Checklist">☑ {checkDone}/{checklist.length}</span>}
        {who && <span style={{ marginLeft: 'auto' }}><Avatar name={who} size={22} /></span>}
      </div>
    </div>
  )
}

// ---------- custom field input ----------
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
      {t === 'number' && <input type="number" value={value ?? ''} onChange={(e) => onChange(e.target.value)} />}
      {t === 'percent' && <input type="number" value={value ?? ''} onChange={(e) => onChange(e.target.value)} placeholder="0–100" />}
      {t === 'money' && <MoneyInput value={value ?? ''} onChange={onChange} placeholder="0" />}
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
            return (
              <button key={o} type="button" className={'tagchip' + (on ? ' on' : '')}
                onClick={() => onChange(on ? arr.filter((x) => x !== o) : [...arr, o])}>{o}</button>
            )
          })}
          {!(field.options || []).length && <span style={{ color: 'var(--mut)', fontSize: 12 }}>No options defined.</span>}
        </div>
      )}
    </div>
  )
}

function TaskModal({ task, project, members, fields, allTags, subtasks, canEdit, onClose, onSaved, reload }) {
  const { user } = useAuth()
  const isNew = !task.id
  const [f, setF] = useState({
    title: task.title || '', description: task.description || '',
    status: task.status || 'not', priority: task.priority || 'med',
    assignee: task.assignee || '', start_date: task.start_date || todayISO(),
    due_date: task.due_date || todayISO(), is_milestone: task.is_milestone || false,
    custom: task.custom && typeof task.custom === 'object' ? { ...task.custom } : {},
    checklist: Array.isArray(task.checklist) ? task.checklist : [],
    tags: Array.isArray(task.tags) ? task.tags : [],
  })
  const [comments, setComments] = useState([])
  const [newComment, setNewComment] = useState('')
  const [tagInput, setTagInput] = useState('')
  const [checkInput, setCheckInput] = useState('')
  const [subInput, setSubInput] = useState('')
  const [subs, setSubs] = useState(subtasks || [])
  const set = (k) => (e) => setF({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value })
  const setCustom = (fid, v) => setF((p) => ({ ...p, custom: { ...p.custom, [fid]: v } }))

  useEffect(() => { if (task.id) api.getComments(task.id).then(({ data }) => setComments(data || [])) }, [task.id])

  async function refreshSubs() { if (task.id) { const { data } = await api.getSubtasks(task.id); setSubs(data || []) } }

  // tags
  const addTag = (raw) => {
    const tg = raw.trim()
    if (tg && !f.tags.includes(tg)) setF({ ...f, tags: [...f.tags, tg] })
    setTagInput('')
  }
  const removeTag = (tg) => setF({ ...f, tags: f.tags.filter((x) => x !== tg) })

  // checklist
  const addCheck = () => {
    if (!checkInput.trim()) return
    setF({ ...f, checklist: [...f.checklist, { id: uid(), text: checkInput.trim(), done: false }] })
    setCheckInput('')
  }
  const toggleCheck = (id) => setF({ ...f, checklist: f.checklist.map((c) => c.id === id ? { ...c, done: !c.done } : c) })
  const removeCheck = (id) => setF({ ...f, checklist: f.checklist.filter((c) => c.id !== id) })

  // subtasks (persisted rows — only after the parent exists)
  async function addSub() {
    if (!subInput.trim()) return
    await api.createTask({ project_id: project.id, parent_id: task.id, title: subInput.trim(), status: 'not', priority: 'med' })
    setSubInput(''); refreshSubs(); onChangeQuiet()
  }
  async function toggleSub(s) { await api.updateTask(s.id, { status: s.status === 'done' ? 'not' : 'done' }); refreshSubs(); onChangeQuiet() }
  async function removeSub(s) { if (confirm('Delete subtask?')) { await api.deleteTask(s.id); refreshSubs(); onChangeQuiet() } }
  function onChangeQuiet() { reload && reload() }

  async function save() {
    if (!f.title.trim()) return alert('Title is required')
    const payload = {
      title: f.title, description: f.description, status: f.status, priority: f.priority,
      assignee: f.assignee || null, start_date: f.start_date || null, due_date: f.due_date || null,
      is_milestone: f.is_milestone, custom: f.custom, checklist: f.checklist, tags: f.tags,
      project_id: project.id,
    }
    if (isNew) { const { error } = await api.createTask(payload); if (error) return alert(error.message) }
    else { const { error } = await api.updateTask(task.id, payload); if (error) return alert(error.message) }
    onSaved()
  }
  async function remove() { if (confirm('Delete this task' + (subs.length ? ' and its subtasks' : '') + '?')) { await api.deleteTask(task.id); onSaved() } }
  async function postComment() {
    if (!newComment.trim()) return
    await api.addComment(task.id, user.id, newComment.trim())
    setNewComment('')
    const { data } = await api.getComments(task.id); setComments(data || [])
  }

  const checkDone = f.checklist.filter((c) => c.done).length
  const suggestions = allTags.filter((t) => !f.tags.includes(t)).slice(0, 8)

  return (
    <Modal wide kicker={isNew ? 'NEW TASK' : 'TASK'} title={isNew ? 'Create task' : f.title} onClose={onClose}>
      <div className="field"><label>Title</label>
        <input value={f.title} onChange={set('title')} disabled={!canEdit} placeholder="e.g. Pour Level 7 slab" /></div>
      <div className="row2">
        <div className="field"><label>Status</label>
          <select value={f.status} onChange={set('status')}>{STATUSES.map((s) => <option key={s.k} value={s.k}>{s.n}</option>)}</select></div>
        <div className="field"><label>Priority</label>
          <select value={f.priority} onChange={set('priority')} disabled={!canEdit}>{PRIORITIES.map((p) => <option key={p.k} value={p.k}>{p.n}</option>)}</select></div>
      </div>
      <div className="row2">
        <div className="field"><label>Assignee</label>
          <select value={f.assignee} onChange={set('assignee')} disabled={!canEdit}>
            <option value="">Unassigned</option>
            {members.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select></div>
        <div className="field"><label>Due date</label>
          <input type="date" value={f.due_date || ''} onChange={set('due_date')} disabled={!canEdit} /></div>
      </div>
      {canEdit && (
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 600 }}>
          <input type="checkbox" checked={f.is_milestone} onChange={set('is_milestone')} style={{ width: 'auto' }} /> Mark as milestone
        </label>
      )}

      {/* Tags */}
      <div className="field">
        <label>Tags</label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: f.tags.length ? 8 : 0 }}>
          {f.tags.map((tg) => (
            <span key={tg} className="tagchip on">{tg}{canEdit && <button onClick={() => removeTag(tg)} style={{ marginLeft: 4, color: 'inherit' }}>×</button>}</span>
          ))}
        </div>
        {canEdit && (
          <>
            <input value={tagInput} onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addTag(tagInput) } }}
              placeholder="Type a tag and press Enter" />
            {suggestions.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
                {suggestions.map((tg) => <button key={tg} type="button" className="tagchip" onClick={() => addTag(tg)}>+ {tg}</button>)}
              </div>
            )}
          </>
        )}
      </div>

      {/* Custom fields */}
      {fields.length > 0 && (
        <div style={{ borderTop: '1px solid var(--line)', paddingTop: 14, display: 'flex', flexDirection: 'column', gap: 13 }}>
          <div style={{ fontFamily: 'Sora', fontWeight: 700, fontSize: 13, color: 'var(--mut)', textTransform: 'uppercase', letterSpacing: '.5px' }}>Custom fields</div>
          {fields.map((fl) => (
            <FieldInput key={fl.id} field={fl} value={f.custom[fl.id]} members={members}
              onChange={(v) => canEdit ? setCustom(fl.id, v) : null} />
          ))}
        </div>
      )}

      {/* Checklist */}
      <div className="field" style={{ borderTop: '1px solid var(--line)', paddingTop: 14 }}>
        <label>Checklist {f.checklist.length ? `(${checkDone}/${f.checklist.length})` : ''}</label>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 8 }}>
          {f.checklist.map((c) => (
            <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input type="checkbox" checked={c.done} onChange={() => toggleCheck(c.id)} style={{ width: 'auto' }} disabled={!canEdit} />
              <span style={{ flex: 1, fontSize: 13, textDecoration: c.done ? 'line-through' : 'none', color: c.done ? 'var(--mut)' : 'var(--ink)' }}>{c.text}</span>
              {canEdit && <button className="x" style={{ width: 24, height: 24 }} onClick={() => removeCheck(c.id)}>×</button>}
            </div>
          ))}
          {!f.checklist.length && <span style={{ color: 'var(--mut)', fontSize: 12.5 }}>No items.</span>}
        </div>
        {canEdit && (
          <div style={{ display: 'flex', gap: 8 }}>
            <input value={checkInput} onChange={(e) => setCheckInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addCheck() } }} placeholder="Add checklist item…" style={{ flex: 1 }} />
            <button className="btn sm" onClick={addCheck}>Add</button>
          </div>
        )}
      </div>

      {/* Subtasks (saved tasks only) */}
      <div className="field" style={{ borderTop: '1px solid var(--line)', paddingTop: 14 }}>
        <label>Subtasks {subs.length ? `(${subs.filter((s) => s.status === 'done').length}/${subs.length})` : ''}</label>
        {isNew ? (
          <span style={{ color: 'var(--mut)', fontSize: 12.5 }}>Save the task first to add subtasks.</span>
        ) : (
          <>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 8 }}>
              {subs.map((s) => (
                <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <input type="checkbox" checked={s.status === 'done'} onChange={() => toggleSub(s)} style={{ width: 'auto' }} disabled={!canEdit} />
                  <span style={{ flex: 1, fontSize: 13, textDecoration: s.status === 'done' ? 'line-through' : 'none', color: s.status === 'done' ? 'var(--mut)' : 'var(--ink)' }}>{s.title}</span>
                  {canEdit && <button className="x" style={{ width: 24, height: 24 }} onClick={() => removeSub(s)}>×</button>}
                </div>
              ))}
              {!subs.length && <span style={{ color: 'var(--mut)', fontSize: 12.5 }}>No subtasks.</span>}
            </div>
            {canEdit && (
              <div style={{ display: 'flex', gap: 8 }}>
                <input value={subInput} onChange={(e) => setSubInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addSub() } }} placeholder="Add subtask…" style={{ flex: 1 }} />
                <button className="btn sm" onClick={addSub}>Add</button>
              </div>
            )}
          </>
        )}
      </div>

      <div className="field"><label>Description</label>
        <textarea rows="3" value={f.description} onChange={set('description')} disabled={!canEdit} placeholder="Scope, dependencies, notes…" /></div>

      {!isNew && (
        <div className="field" style={{ borderTop: '1px solid var(--line)', paddingTop: 14 }}>
          <label>Comments ({comments.length})</label>
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
            {!comments.length && <span style={{ color: 'var(--mut)', fontSize: 13 }}>No comments yet.</span>}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <input placeholder="Add a comment…" value={newComment} onChange={(e) => setNewComment(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && postComment()}
              style={{ flex: 1, border: '1px solid var(--line)', borderRadius: 10, padding: '9px 12px' }} />
            <button className="btn sm" onClick={postComment}>Send</button>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
        <button className="btn" onClick={save}>{isNew ? 'Create task' : 'Save changes'}</button>
        {!isNew && canEdit && <button className="btn danger" onClick={remove}>Delete</button>}
        <button className="btn ghost" style={{ marginLeft: 'auto' }} onClick={onClose}>Close</button>
      </div>
    </Modal>
  )
}

function FieldsModal({ project, fields, onClose, onSaved }) {
  const [rows, setRows] = useState(() => fields.map((x) => ({ ...x, optionsText: (x.options || []).join(', ') })))
  const [busy, setBusy] = useState(false)
  const setRow = (i, k, v) => setRows(rows.map((r, j) => (j === i ? { ...r, [k]: v } : r)))
  const addRow = () => setRows([...rows, { _new: true, name: '', type: 'text', optionsText: '', sort: rows.length }])
  const dropRow = (i) => setRows(rows.filter((_, j) => j !== i))

  async function save() {
    setBusy(true)
    const keepIds = rows.filter((r) => r.id).map((r) => r.id)
    for (const fl of fields) if (!keepIds.includes(fl.id)) await api.deleteTaskField(fl.id)
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i]
      if (!r.name.trim()) continue
      const options = (r.type === 'select' || r.type === 'multiselect')
        ? r.optionsText.split(',').map((s) => s.trim()).filter(Boolean) : []
      const payload = { name: r.name.trim(), type: r.type, options, sort: i }
      if (r.id) await api.updateTaskField(r.id, payload)
      else await api.createTaskField({ project_id: project.id, ...payload })
    }
    setBusy(false)
    onSaved()
  }

  return (
    <Modal wide kicker="CUSTOM FIELDS" title="Task fields for this project" onClose={onClose}>
      <p style={{ color: 'var(--mut)', margin: 0, fontSize: 13 }}>
        Add your own task attributes. Dropdown / multi-select use the comma-separated options. Deleting a field hides its values from tasks.
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {rows.map((r, i) => (
          <div key={r.id || 'new' + i} style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <input value={r.name} onChange={(e) => setRow(i, 'name', e.target.value)} placeholder="Field name"
              style={{ flex: '1 1 140px', border: '1px solid var(--line)', borderRadius: 9, padding: '9px 11px' }} />
            <select value={r.type} onChange={(e) => setRow(i, 'type', e.target.value)}
              style={{ flex: '0 0 130px', border: '1px solid var(--line)', borderRadius: 9, padding: '9px 11px' }}>
              {FIELD_TYPES.map((t) => <option key={t.k} value={t.k}>{t.n}</option>)}
            </select>
            {(r.type === 'select' || r.type === 'multiselect')
              ? <input value={r.optionsText} onChange={(e) => setRow(i, 'optionsText', e.target.value)} placeholder="Option A, Option B, …"
                  style={{ flex: '1 1 160px', border: '1px solid var(--line)', borderRadius: 9, padding: '9px 11px' }} />
              : <div style={{ flex: '1 1 160px', color: 'var(--mut)', fontSize: 12 }}>{fieldTypeOf(r.type).n}</div>}
            <button className="x" style={{ width: 32, height: 32, flexShrink: 0 }} onClick={() => dropRow(i)} title="Remove">×</button>
          </div>
        ))}
      </div>
      <button className="addbtn" style={{ margin: '2px 0 0', width: '100%' }} onClick={addRow}>+ Add field</button>
      <div style={{ display: 'flex', gap: 10 }}>
        <button className="btn" onClick={save} disabled={busy}>Save fields</button>
        <button className="btn ghost" style={{ marginLeft: 'auto' }} onClick={onClose}>Cancel</button>
      </div>
    </Modal>
  )
}
