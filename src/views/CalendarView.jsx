import { useState } from 'react'
import { PriorityFlag } from '../components/Bits'

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
const DOW = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
// local YYYY-MM-DD (NOT toISOString, which shifts to UTC and rolls the day)
const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

export default function CalendarView({ tasks, statuses, onOpen, onCreateOn }) {
  const [cursor, setCursor] = useState(() => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1) })
  const year = cursor.getFullYear(), month = cursor.getMonth()
  const isDone = (id) => { const t = statuses.find((s) => s.id === id)?.type; return t === 'done' || t === 'closed' }
  const colorOf = (id) => statuses.find((s) => s.id === id)?.color || '#7B68EE'

  // build a 6-week grid starting Monday
  const first = new Date(year, month, 1)
  const startOffset = (first.getDay() + 6) % 7   // Mon=0
  const start = new Date(year, month, 1 - startOffset)
  const todayISO = iso(new Date())
  const cells = Array.from({ length: 42 }, (_, i) => { const d = new Date(start); d.setDate(start.getDate() + i); return d })

  // place a task on its due date, falling back to start date
  const dateOf = (t) => String(t.due_date || t.start_date || '').slice(0, 10)
  const byDay = {}
  tasks.forEach((t) => { const d = dateOf(t); if (d) (byDay[d] ||= []).push(t) })
  const datedCount = tasks.filter((t) => dateOf(t)).length
  const undated = tasks.length - datedCount

  return (
    <div>
      {!datedCount && (
        <div style={{ background: 'var(--accent-soft)', border: '1px solid #d9d2fb', color: 'var(--accent)', borderRadius: 10, padding: '10px 14px', fontSize: 13, marginBottom: 12 }}>
          None of these tasks have a due or start date yet, so nothing shows on the calendar. Open a task and set its dates to see it here.
        </div>
      )}
      <div className="cal-nav">
        <button className="btn ghost sm" onClick={() => setCursor(new Date(year, month - 1, 1))}>‹</button>
        <h3 style={{ fontSize: 16, minWidth: 160, textAlign: 'center' }}>{MONTHS[month]} {year}</h3>
        <button className="btn ghost sm" onClick={() => setCursor(new Date(year, month + 1, 1))}>›</button>
        <button className="btn ghost sm" onClick={() => { const d = new Date(); setCursor(new Date(d.getFullYear(), d.getMonth(), 1)) }}>Today</button>
      </div>
      <div className="cal">
        <div className="cal-h">{DOW.map((d) => <div key={d}>{d}</div>)}</div>
        <div className="cal-grid">
          {cells.map((d, i) => {
            const ds = iso(d), inMonth = d.getMonth() === month, items = byDay[ds] || []
            return (
              <div key={i} className={'cal-cell' + (inMonth ? '' : ' muted') + (ds === todayISO ? ' today' : '')}
                onClick={(e) => { if (e.target === e.currentTarget) onCreateOn(ds) }}>
                <div className="dn">{d.getDate()}</div>
                {items.slice(0, 4).map((t) => (
                  <div key={t.id} className="cal-ev" onClick={() => onOpen(t)}
                    style={{ background: colorOf(t.status_id) + '22', color: colorOf(t.status_id), textDecoration: isDone(t.status_id) ? 'line-through' : 'none' }}>
                    <PriorityFlag k={t.priority} size={11} /> {t.name}
                  </div>
                ))}
                {items.length > 4 && <div style={{ fontSize: 10.5, color: 'var(--mut)', marginTop: 2 }}>+{items.length - 4} more</div>}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
