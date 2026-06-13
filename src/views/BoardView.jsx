import { useState } from 'react'
import { Avatar, PriorityFlag, StatusDot, fmtDate, isOverdue } from '../components/Bits'

export default function BoardView({ tasks, statuses, members, listMap = {}, showList = false, onOpen, onQuickAdd, onChangeStatus }) {
  const [dragId, setDragId] = useState(null)
  const nameOf = (id) => members.find((m) => m.id === id)?.name

  function drop(statusId) {
    if (dragId) {
      const t = tasks.find((x) => x.id === dragId)
      if (t && t.status_id !== statusId) onChangeStatus(dragId, statusId)
    }
    setDragId(null)
  }

  return (
    <div className="board">
      {statuses.map((s) => {
        const items = tasks.filter((t) => t.status_id === s.id)
        return (
          <div key={s.id} className="bcol">
            <div className="bcol-h"><StatusDot color={s.color} /> <span className="nm">{s.name}</span><span className="n">{items.length}</span></div>
            <div className="bcol-body"
              onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add('over') }}
              onDragLeave={(e) => e.currentTarget.classList.remove('over')}
              onDrop={(e) => { e.currentTarget.classList.remove('over'); drop(s.id) }}>
              {items.map((t) => {
                const done = s.type === 'done' || s.type === 'closed'
                const lst = listMap[t.list_id]
                return (
                  <div key={t.id} className="bcard" draggable onClick={() => onOpen(t)}
                    style={showList && lst ? { borderLeft: `3px solid ${lst.color}` } : undefined}
                    onDragStart={(e) => { setDragId(t.id); e.currentTarget.classList.add('drag') }}
                    onDragEnd={(e) => e.currentTarget.classList.remove('drag')}>
                    {showList && lst && <span className="list-chip" style={{ background: lst.color + '22', color: lst.color, marginBottom: 6, display: 'inline-flex' }}>{lst.name}</span>}
                    <div className="tt">{t.name}</div>
                    {(t.tags || []).length > 0 && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 6 }}>
                        {t.tags.slice(0, 3).map((tg) => <span key={tg} className="tagchip">{tg}</span>)}
                      </div>
                    )}
                    <div className="bmeta">
                      <PriorityFlag k={t.priority} />
                      {t.due_date && <span style={{ color: isOverdue(t.due_date, done) ? 'var(--danger)' : 'var(--mut)', fontSize: 11 }}>{fmtDate(t.due_date)}</span>}
                      {t.commentCount > 0 && <span style={{ fontSize: 11, color: 'var(--mut)' }}>💬 {t.commentCount}</span>}
                      <span style={{ marginLeft: 'auto', display: 'flex' }}>
                        {t.assignees.slice(0, 3).map((id) => <Avatar key={id} name={nameOf(id)} size={22} />)}
                      </span>
                    </div>
                  </div>
                )
              })}
              <QuickAdd onAdd={(name) => onQuickAdd(name, s.id)} />
            </div>
          </div>
        )
      })}
      {!statuses.length && <div className="empty"><div className="ic">📋</div><p>This space has no statuses yet.</p></div>}
    </div>
  )
}

function QuickAdd({ onAdd }) {
  const [v, setV] = useState('')
  return (
    <input className="bcol-add" value={v} placeholder="+ Add task"
      onChange={(e) => setV(e.target.value)}
      onKeyDown={(e) => { if (e.key === 'Enter' && v.trim()) { onAdd(v); setV('') } }} />
  )
}
