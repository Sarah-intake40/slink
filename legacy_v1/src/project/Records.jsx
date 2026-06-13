import { useEffect, useState } from 'react'
import * as api from '../api'
import Modal from '../components/Modal'
import { RECORD_KINDS, STATUSES, PRIORITIES, stOf, prOf, fmtDate, todayISO, isOverdue, Avatar, StatusChip } from '../components/Bits'

export default function Records({ project, role }) {
  const [kind, setKind] = useState('rfi')
  const [records, setRecords] = useState([])
  const [members, setMembers] = useState([])
  const [editing, setEditing] = useState(null)
  const canWrite = role !== 'client'

  async function load() {
    const { data } = await api.getRecords(project.id)
    setRecords(data || [])
    const { data: m } = await api.getMembers(project.id)
    setMembers((m || []).map((x) => ({ id: x.user_id, name: x.profiles?.full_name || 'User' })))
  }
  useEffect(() => { load() }, [project.id])

  const meta = RECORD_KINDS.find((r) => r.k === kind)
  const rows = records.filter((r) => r.kind === kind)

  return (
    <>
      <div className="tabs" style={{ marginBottom: 18 }}>
        {RECORD_KINDS.map((r) => (
          <button key={r.k} className={kind === r.k ? 'on' : ''} onClick={() => setKind(r.k)}>
            {r.n} <span style={{ color: 'var(--mut)' }}>({records.filter((x) => x.kind === r.k).length})</span>
          </button>
        ))}
      </div>

      <div style={{ display: 'flex', marginBottom: 14 }}>
        <h3 style={{ fontSize: 18 }}>{meta.n}</h3>
        {canWrite && <button className="btn" style={{ marginLeft: 'auto' }} onClick={() => setEditing({ kind })}>+ New {meta.single}</button>}
      </div>

      {rows.length ? (
        <table className="tbl">
          <thead><tr><th>Ref</th><th>Title</th><th>Status</th><th>Priority</th><th>Assignee</th><th>Due</th></tr></thead>
          <tbody>
            {rows.map((r) => {
              const pr = prOf(r.priority), who = members.find((m) => m.id === r.assignee)?.name, od = isOverdue(r.due_date, r.status)
              return (
                <tr key={r.id} onClick={() => canWrite && setEditing(r)}>
                  <td className="id">{r.ref || '—'}</td>
                  <td>{r.title}</td>
                  <td><StatusChip status={r.status} /></td>
                  <td className={pr.cls} style={{ fontWeight: 700 }}>{pr.n}</td>
                  <td>{who ? <span style={{ display: 'flex', alignItems: 'center', gap: 7 }}><Avatar name={who} size={24} />{who}</span> : '—'}</td>
                  <td className="mono" style={{ color: od ? 'var(--crit)' : 'inherit' }}>{fmtDate(r.due_date)}{od ? ' ⚠' : ''}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      ) : (
        <div className="empty"><div className="ic">📋</div><p>No {meta.n.toLowerCase()} yet.</p>
          {canWrite && <button className="btn" onClick={() => setEditing({ kind })}>+ Create first {meta.single}</button>}</div>
      )}

      {editing && <RecordModal record={editing} project={project} members={members} existing={records}
        onClose={() => setEditing(null)} onSaved={() => { setEditing(null); load() }} />}
    </>
  )
}

function RecordModal({ record, project, members, existing, onClose, onSaved }) {
  const isNew = !record.id
  const meta = RECORD_KINDS.find((r) => r.k === record.kind)
  const [f, setF] = useState({
    title: record.title || '', status: record.status || 'not', priority: record.priority || 'med',
    assignee: record.assignee || '', due_date: record.due_date || todayISO(),
  })
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value })

  async function save() {
    if (!f.title.trim()) return alert('Title is required')
    if (isNew) {
      const n = String(existing.filter((r) => r.kind === record.kind).length + 1).padStart(3, '0')
      const ref = `${meta.prefix}-${n}`
      const { error } = await api.createRecord({ ...f, kind: record.kind, ref, project_id: project.id, assignee: f.assignee || null })
      if (error) return alert(error.message)
    } else {
      const { error } = await api.updateRecord(record.id, { ...f, assignee: f.assignee || null })
      if (error) return alert(error.message)
    }
    onSaved()
  }
  async function remove() { if (confirm('Delete this record?')) { await api.deleteRecord(record.id); onSaved() } }

  return (
    <Modal kicker={isNew ? 'NEW ' + meta.single.toUpperCase() : record.ref} title={isNew ? 'Create ' + meta.single : record.title} onClose={onClose}>
      <div className="field"><label>Title</label><input value={f.title} onChange={set('title')} /></div>
      <div className="row2">
        <div className="field"><label>Status</label>
          <select value={f.status} onChange={set('status')}>{STATUSES.map((s) => <option key={s.k} value={s.k}>{s.n}</option>)}</select></div>
        <div className="field"><label>Priority</label>
          <select value={f.priority} onChange={set('priority')}>{PRIORITIES.map((p) => <option key={p.k} value={p.k}>{p.n}</option>)}</select></div>
      </div>
      <div className="row2">
        <div className="field"><label>Assignee</label>
          <select value={f.assignee} onChange={set('assignee')}>
            <option value="">Unassigned</option>
            {members.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select></div>
        <div className="field"><label>Due date</label><input type="date" value={f.due_date || ''} onChange={set('due_date')} /></div>
      </div>
      <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
        <button className="btn" onClick={save}>{isNew ? 'Create' : 'Save'}</button>
        {!isNew && <button className="btn danger" onClick={remove}>Delete</button>}
        <button className="btn ghost" style={{ marginLeft: 'auto' }} onClick={onClose}>Cancel</button>
      </div>
    </Modal>
  )
}
