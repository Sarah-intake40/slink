import { Avatar, PriorityFlag, StatusDot, fmtDate, fmtDuration, isOverdue } from '../components/Bits'

export default function TableView({ tasks, statuses, members, fields = [], listMap = {}, showList = false, onOpen, selected, onToggleSelect, onSelectMany }) {
  const allSel = tasks.length > 0 && tasks.every((t) => selected?.has(t.id))
  const nameOf = (id) => members.find((m) => m.id === id)?.name
  const statusOf = (id) => statuses.find((s) => s.id === id)
  const isDone = (id) => { const t = statusOf(id)?.type; return t === 'done' || t === 'closed' }

  const fieldVal = (fl, v) => {
    if (v == null || v === '') return <span style={{ color: 'var(--mut2)' }}>—</span>
    if (fl.type === 'checkbox') return v ? '✓' : ''
    if (fl.type === 'person') return nameOf(v) || '—'
    if (fl.type === 'date') return fmtDate(v)
    if (fl.type === 'url') return <a href={v} target="_blank" rel="noreferrer" style={{ color: 'var(--accent)' }} onClick={(e) => e.stopPropagation()}>link</a>
    if (fl.type === 'multiselect') return <span style={{ display: 'inline-flex', gap: 4, flexWrap: 'wrap' }}>{(Array.isArray(v) ? v : []).map((o) => <span key={o} className="tagchip">{o}</span>)}</span>
    if (fl.type === 'money') return Number(v).toLocaleString('en-US')
    if (fl.type === 'percent') return v + '%'
    return String(v)
  }

  return (
    <div style={{ overflowX: 'auto' }}>
      <table className="tbl">
        <thead><tr>
          {onToggleSelect && <th className="tbl-check"><input type="checkbox" checked={allSel} onChange={(e) => onSelectMany(tasks.map((t) => t.id), e.target.checked)} /></th>}
          <th>Name</th>{showList && <th>List</th>}<th>Status</th><th>Assignees</th><th>Priority</th><th>Due</th><th>Estimate</th>
          {fields.map((fl) => <th key={fl.id}>{fl.name}</th>)}
        </tr></thead>
        <tbody>
          {tasks.map((t) => {
            const s = statusOf(t.status_id), done = isDone(t.status_id)
            return (
              <tr key={t.id} className={selected?.has(t.id) ? 'selected' : ''} onClick={() => onOpen(t)}>
                {onToggleSelect && <td className="tbl-check"><input type="checkbox" checked={!!selected?.has(t.id)} onClick={(e) => e.stopPropagation()} onChange={() => onToggleSelect(t.id)} /></td>}
                <td style={{ fontWeight: 500, textDecoration: done ? 'line-through' : 'none', color: done ? 'var(--mut)' : 'var(--ink)' }}>{t.name}</td>
                {showList && <td>{listMap[t.list_id] ? <span className="list-chip" style={{ background: listMap[t.list_id].color + '22', color: listMap[t.list_id].color }}>{listMap[t.list_id].name}</span> : '—'}</td>}
                <td>{s ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><StatusDot color={s.color} size={8} />{s.name}</span> : '—'}</td>
                <td><span style={{ display: 'inline-flex' }}>{t.assignees.slice(0, 3).map((id) => <Avatar key={id} name={nameOf(id)} size={22} />)}{!t.assignees.length && '—'}</span></td>
                <td><PriorityFlag k={t.priority} /> {t.priority || ''}</td>
                <td className="mono" style={{ color: isOverdue(t.due_date, done) ? 'var(--danger)' : 'inherit' }}>{fmtDate(t.due_date) || '—'}</td>
                <td className="mono">{fmtDuration(t.time_estimate) || '—'}</td>
                {fields.map((fl) => <td key={fl.id}>{fieldVal(fl, (t.custom || {})[fl.id])}</td>)}
              </tr>
            )
          })}
          {!tasks.length && <tr><td colSpan={6 + (showList ? 1 : 0) + (onToggleSelect ? 1 : 0) + fields.length} style={{ color: 'var(--mut)', textAlign: 'center', padding: 24 }}>No tasks.</td></tr>}
        </tbody>
      </table>
    </div>
  )
}
