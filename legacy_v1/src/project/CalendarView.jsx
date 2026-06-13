import { useEffect, useState } from 'react'
import * as api from '../api'
import { stOf } from '../components/Bits'

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']

export default function CalendarView({ project }) {
  const [items, setItems] = useState([])
  const [ref, setRef] = useState(() => { const d = new Date(); return { y: d.getFullYear(), m: d.getMonth() } })

  useEffect(() => {
    (async () => {
      const [{ data: ts }, { data: rs }] = await Promise.all([api.getTasks(project.id), api.getRecords(project.id)])
      const all = [
        ...(ts || []).filter((t) => t.due_date).map((t) => ({ id: t.id, label: t.title, due: t.due_date, status: t.status })),
        ...(rs || []).filter((r) => r.due_date).map((r) => ({ id: r.id, label: (r.ref ? r.ref + ': ' : '') + r.title, due: r.due_date, status: r.status, rec: true })),
      ]
      setItems(all)
    })()
  }, [project.id])

  const { y, m } = ref
  const first = new Date(y, m, 1)
  const startDow = (first.getDay() + 6) % 7 // Monday-first
  const dim = new Date(y, m + 1, 0).getDate()
  const now = new Date()
  const evByDay = {}
  items.forEach((it) => {
    const d = new Date(it.due)
    if (d.getFullYear() === y && d.getMonth() === m) (evByDay[d.getDate()] = evByDay[d.getDate()] || []).push(it)
  })

  const cells = []
  for (let i = 0; i < startDow; i++) cells.push(<div key={'b' + i} className="cal-cell muted" />)
  for (let d = 1; d <= dim; d++) {
    const isToday = now.getFullYear() === y && now.getMonth() === m && now.getDate() === d
    const evs = (evByDay[d] || []).slice(0, 3)
    cells.push(
      <div key={d} className={'cal-cell' + (isToday ? ' today' : '')}>
        <div className="dn">{d}</div>
        {evs.map((e) => { const st = stOf(e.status)
          return <div key={e.id} className="cal-ev" title={e.label} style={{ background: st.c + '22', color: st.c }}>{e.rec ? '◷ ' : ''}{e.label}</div> })}
        {(evByDay[d] || []).length > 3 && <div style={{ fontSize: 10, color: 'var(--mut)', marginTop: 3 }}>+{evByDay[d].length - 3} more</div>}
      </div>
    )
  }

  const shift = (n) => { let nm = m + n, ny = y; if (nm < 0) { nm = 11; ny-- } if (nm > 11) { nm = 0; ny++ } setRef({ y: ny, m: nm }) }

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
        <button className="btn ghost sm" onClick={() => shift(-1)}>←</button>
        <h3 style={{ fontSize: 18 }}>{MONTHS[m]} {y}</h3>
        <button className="btn ghost sm" onClick={() => shift(1)}>→</button>
      </div>
      <div className="cal">
        <div className="cal-h">{['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map((d) => <div key={d}>{d}</div>)}</div>
        <div className="cal-grid">{cells}</div>
      </div>
    </>
  )
}
