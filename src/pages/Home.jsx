import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../auth'
import { useWorkspace } from '../workspace'
import * as api from '../api'
import { StatusDot, PriorityFlag, fmtDate, todayISO } from '../components/Bits'

const addDays = (iso, n) => { const d = new Date(iso); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10) }

export default function Home() {
  const { user, profile } = useAuth()
  const { spaces, lists, loading: wsLoading } = useWorkspace()
  const nav = useNavigate()
  const [tasks, setTasks] = useState([])
  const [statuses, setStatuses] = useState([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    const listIds = lists.map((l) => l.id), spaceIds = spaces.map((s) => s.id)
    const [{ data: ts }, { data: st }] = await Promise.all([
      listIds.length ? api.getTasksInLists(listIds) : Promise.resolve({ data: [] }),
      spaceIds.length ? api.getStatusesInSpaces(spaceIds) : Promise.resolve({ data: [] }),
    ])
    setTasks((ts || []).map((t) => ({ ...t, assignees: (t.task_assignees || []).map((a) => a.user_id) })))
    setStatuses(st || [])
    setLoading(false)
  }, [lists, spaces])
  useEffect(() => { if (!wsLoading) load() }, [wsLoading, load])

  if (loading) return <div className="spin" />

  const statusOf = (id) => statuses.find((s) => s.id === id)
  const isDone = (id) => { const t = statusOf(id)?.type; return t === 'done' || t === 'closed' }
  const listOf = (id) => lists.find((l) => l.id === id)
  const spaceOf = (lst) => lst && spaces.find((s) => s.id === lst.space_id)

  const mine = tasks.filter((t) => !t.parent_id && t.assignees.includes(user.id) && !isDone(t.status_id))
  const today = todayISO(), weekEnd = addDays(today, 7)
  const d = (t) => String(t.due_date || '').slice(0, 10)
  const overdue = mine.filter((t) => d(t) && d(t) < today).sort((a, b) => d(a).localeCompare(d(b)))
  const dueToday = mine.filter((t) => d(t) === today)
  const soon = mine.filter((t) => d(t) > today && d(t) <= weekEnd).sort((a, b) => d(a).localeCompare(d(b)))
  const later = mine.filter((t) => d(t) > weekEnd).sort((a, b) => d(a).localeCompare(d(b)))
  const noDate = mine.filter((t) => !d(t))
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'

  const Row = ({ t, danger }) => {
    const s = statusOf(t.status_id), lst = listOf(t.list_id), sp = spaceOf(lst)
    return (
      <div className="mw-row" onClick={() => nav('/list/' + t.list_id)}>
        <PriorityFlag k={t.priority} />
        <span className="mw-name">{t.name}</span>
        <span className="mw-loc">{sp?.name}{lst ? ' · ' + lst.name : ''}</span>
        {s && <span className="mw-status" style={{ background: s.color + '22', color: s.color }}><StatusDot color={s.color} size={7} /> {s.name}</span>}
        <span className="mw-due mono" style={{ color: danger ? 'var(--danger)' : 'var(--mut)' }}>{fmtDate(t.due_date) || '—'}</span>
      </div>
    )
  }
  const Section = ({ title, items, danger, accent }) => !items.length ? null : (
    <div className="mw-sec">
      <div className="mw-sec-h"><span style={{ color: accent }}>{title}</span><span className="mw-count">{items.length}</span></div>
      <div className="mw-list">{items.map((t) => <Row key={t.id} t={t} danger={danger} />)}</div>
    </div>
  )

  return (
    <div style={{ maxWidth: 860 }}>
      <div className="list-head">
        <div><div className="crumb">My Work</div><h2>{greeting}{profile?.full_name ? ', ' + profile.full_name.split(' ')[0] : ''}</h2></div>
      </div>

      <div className="kpi" style={{ gridTemplateColumns: 'repeat(4,1fr)' }}>
        <div className="c"><div className="v" style={{ color: overdue.length ? 'var(--danger)' : 'var(--ink)' }}>{overdue.length}</div><div className="l">Overdue</div></div>
        <div className="c"><div className="v">{dueToday.length}</div><div className="l">Due today</div></div>
        <div className="c"><div className="v">{soon.length}</div><div className="l">Next 7 days</div></div>
        <div className="c"><div className="v">{mine.length}</div><div className="l">Open · assigned to me</div></div>
      </div>

      {!mine.length ? (
        <div className="empty"><div className="ic">🎉</div><p>Nothing assigned to you is open. Enjoy the calm.</p></div>
      ) : (
        <>
          <Section title="⚠ Overdue" items={overdue} danger accent="var(--danger)" />
          <Section title="Due today" items={dueToday} accent="var(--accent)" />
          <Section title="Next 7 days" items={soon} />
          <Section title="Later" items={later} />
          <Section title="No due date" items={noDate} />
        </>
      )}
    </div>
  )
}
