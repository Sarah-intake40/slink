import { useState } from 'react'
import { Avatar, PriorityFlag, StatusDot, PRIORITIES, fmtDate, isOverdue } from '../components/Bits'

export default function ListView({ tasks, statuses, members, groupBy = 'status', listMap = {}, showList = false, onOpen, onQuickAdd, onChangeStatus, selected, onToggleSelect, onSelectMany }) {
  const [collapsed, setCollapsed] = useState({})
  const [dragId, setDragId] = useState(null)
  const canDrag = groupBy === 'status'
  const nameOf = (id) => members.find((m) => m.id === id)?.name
  const isDoneStatus = (id) => { const t = statuses.find((s) => s.id === id)?.type; return t === 'done' || t === 'closed' }

  // build groups depending on groupBy
  let groups = []
  if (groupBy === 'status') {
    groups = statuses.map((s) => ({ key: s.id, label: s.name, color: s.color, statusId: s.id, items: tasks.filter((t) => t.status_id === s.id) }))
    const none = tasks.filter((t) => !t.status_id || !statuses.some((s) => s.id === t.status_id))
    if (none.length) groups.push({ key: 'none', label: 'No status', color: '#c0c4cc', items: none })
  } else if (groupBy === 'priority') {
    groups = PRIORITIES.map((p) => ({ key: p.k, label: p.n, color: p.c, items: tasks.filter((t) => t.priority === p.k) }))
    const none = tasks.filter((t) => !t.priority)
    groups.push({ key: 'nopri', label: 'No priority', color: '#c0c4cc', items: none })
  } else if (groupBy === 'assignee') {
    groups = members.map((m) => ({ key: m.id, label: m.name, color: '#7B68EE', items: tasks.filter((t) => t.assignees.includes(m.id)) }))
    const none = tasks.filter((t) => !t.assignees.length)
    groups.push({ key: 'noone', label: 'Unassigned', color: '#c0c4cc', items: none })
  } else {
    groups = [{ key: 'all', label: 'All tasks', color: '#7B68EE', items: tasks }]
  }
  groups = groups.filter((g) => g.items.length || g.statusId)   // keep empty status groups (for quick-add), drop empty others

  return (
    <div className="lv">
      {groups.map((g) => (
        <div key={g.key} className="lv-group">
          <div className="lv-grouphead">
            <button className="caret" onClick={() => setCollapsed((c) => ({ ...c, [g.key]: !c[g.key] }))}>{collapsed[g.key] ? '▸' : '▾'}</button>
            {onToggleSelect && g.items.length > 0 && (
              <input type="checkbox" className="lv-check" title="Select all in group"
                checked={g.items.every((t) => selected?.has(t.id))}
                onChange={(e) => onSelectMany(g.items.map((t) => t.id), e.target.checked)} />
            )}
            <span className="lv-statuspill" style={{ background: (g.color || '#87909e') + '22', color: g.color }}>
              <StatusDot color={g.color} size={8} /> {g.label}
            </span>
            <span className="lv-count">{g.items.length}</span>
          </div>
          {!collapsed[g.key] && (
            <div className={'lv-rows' + (canDrag && g.statusId ? ' drop' : '')}
              onDragOver={canDrag && g.statusId ? (e) => { e.preventDefault(); e.currentTarget.classList.add('over') } : undefined}
              onDragLeave={(e) => e.currentTarget.classList.remove('over')}
              onDrop={canDrag && g.statusId ? (e) => { e.currentTarget.classList.remove('over'); if (dragId) onChangeStatus(dragId, g.statusId); setDragId(null) } : undefined}>
              {g.items.map((t) => {
                const done = isDoneStatus(t.status_id)
                const lst = listMap[t.list_id]
                const sel = selected?.has(t.id)
                return (
                  <div key={t.id} className={'lv-row' + (sel ? ' selected' : '')} onClick={() => onOpen(t)}
                    draggable={canDrag}
                    style={showList && lst ? { borderLeft: `3px solid ${lst.color}` } : undefined}
                    onDragStart={(e) => { setDragId(t.id); e.currentTarget.classList.add('dragging') }}
                    onDragEnd={(e) => e.currentTarget.classList.remove('dragging')}>
                    {onToggleSelect && (
                      <input type="checkbox" className="lv-check" checked={!!sel}
                        onClick={(e) => e.stopPropagation()}
                        onChange={() => onToggleSelect(t.id)} />
                    )}
                    {showList && lst && <span className="list-chip" style={{ background: lst.color + '22', color: lst.color }}>{lst.name}</span>}
                    <span className="lv-name" style={{ textDecoration: done ? 'line-through' : 'none', color: done ? 'var(--mut)' : 'var(--ink)' }}>{t.name}</span>
                    <span className="lv-meta">
                      {t.recurrence?.freq && <span title="Recurring" style={{ fontSize: 12 }}>🔁</span>}
                      <PriorityFlag k={t.priority} />
                      {(t.tags || []).slice(0, 2).map((tg) => <span key={tg} className="tagchip">{tg}</span>)}
                      {t.commentCount > 0 && <span className="lv-cmt">💬 {t.commentCount}</span>}
                      {t.due_date && <span className="lv-due" style={{ color: isOverdue(t.due_date, done) ? 'var(--danger)' : 'var(--mut)' }}>{fmtDate(t.due_date)}</span>}
                      <span className="lv-assignees">{t.assignees.slice(0, 3).map((id) => <Avatar key={id} name={nameOf(id)} size={22} />)}</span>
                    </span>
                  </div>
                )
              })}
              {groupBy === 'status' && g.statusId && <QuickAdd onAdd={(name) => onQuickAdd(name, g.statusId)} />}
            </div>
          )}
        </div>
      ))}
      {!statuses.length && <div className="empty"><div className="ic">📋</div><p>This space has no statuses yet.</p></div>}
    </div>
  )
}

function QuickAdd({ onAdd }) {
  const [v, setV] = useState('')
  return (
    <div className="lv-add">
      <input value={v} placeholder="+ Add task" onChange={(e) => setV(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter' && v.trim()) { onAdd(v); setV('') } }} />
    </div>
  )
}
