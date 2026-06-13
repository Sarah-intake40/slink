import { useEffect, useState } from 'react'
import * as api from '../api'
import { stOf, fmtDate } from '../components/Bits'

const DAY = 864e5

export default function Timeline({ project }) {
  const [tasks, setTasks] = useState([])
  useEffect(() => { api.getTasks(project.id).then(({ data }) => setTasks(data || [])) }, [project.id])

  const dated = tasks.filter((t) => t.start_date && t.due_date)
  if (!dated.length) return <div className="empty"><div className="ic">📅</div><p>Add tasks with start &amp; due dates to see the schedule.</p></div>

  const min = new Date(Math.min(...dated.map((t) => +new Date(t.start_date))))
  const max = new Date(Math.max(...dated.map((t) => +new Date(t.due_date))))
  min.setDate(1)
  const months = []
  let cur = new Date(min)
  while (cur <= max) { months.push(new Date(cur)); cur.setMonth(cur.getMonth() + 1) }
  const span = Math.max((max - min) / DAY, 1)
  const pos = (d) => ((new Date(d) - min) / DAY) / span * 100
  const today = pos(new Date())
  const sorted = [...dated].sort((a, b) => new Date(a.start_date) - new Date(b.start_date))

  return (
    <>
      <div className="gantt">
        <div className="grow head">
          <div className="gname">Task</div>
          <div className="gcells">{months.map((m, i) => <div key={i}>{m.toLocaleDateString('en-GB', { month: 'short', year: '2-digit' })}</div>)}</div>
        </div>
        {sorted.map((t) => {
          const st = stOf(t.status)
          const left = pos(t.start_date)
          const w = t.is_milestone ? 0 : Math.max(((new Date(t.due_date) - new Date(t.start_date)) / DAY) / span * 100, 1.5)
          return (
            <div key={t.id} className="grow">
              <div className="gname" title={t.title}>{t.is_milestone ? '◆ ' : ''}{t.title}</div>
              <div className="gtrack">
                <div className="gcells" style={{ position: 'absolute', inset: 0 }}>{months.map((_, i) => <div key={i} />)}</div>
                {today >= 0 && today <= 100 && <div style={{ position: 'absolute', left: today + '%', top: 0, bottom: 0, width: 2, background: 'var(--blue)', zIndex: 2 }} />}
                <div className="gbar" title={`${fmtDate(t.start_date)} → ${fmtDate(t.due_date)}`}
                  style={{ left: left + '%', width: t.is_milestone ? 14 : w + '%', background: t.is_milestone ? 'var(--insp)' : st.c, borderRadius: t.is_milestone ? 3 : 6 }}>
                  {t.is_milestone ? '' : fmtDate(t.due_date)}
                </div>
              </div>
            </div>
          )
        })}
      </div>
      <div style={{ marginTop: 12, color: 'var(--mut)', fontSize: 12 }}>
        <span style={{ color: 'var(--blue)' }}>▌</span> Today &nbsp;·&nbsp; <span style={{ color: 'var(--insp)' }}>◆</span> Milestone
      </div>
    </>
  )
}
