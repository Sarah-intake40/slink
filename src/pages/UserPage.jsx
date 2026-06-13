import { useEffect, useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useWorkspace } from '../workspace'
import * as api from '../api'
import { Avatar, StatusDot, PriorityFlag, fmtDate, isOverdue } from '../components/Bits'

export default function UserPage() {
  const { userId } = useParams()
  const nav = useNavigate()
  const { members, spaces, lists } = useWorkspace()
  const [tasks, setTasks] = useState([])
  const [statuses, setStatuses] = useState([])
  const [loading, setLoading] = useState(true)
  const member = members.find((m) => m.id === userId)

  const load = useCallback(async () => {
    setLoading(true)
    const listIds = lists.map((l) => l.id)
    const spaceIds = spaces.map((s) => s.id)
    const [{ data: ts }, { data: st }] = await Promise.all([
      listIds.length ? api.getTasksInLists(listIds) : Promise.resolve({ data: [] }),
      spaceIds.length ? api.getStatusesInSpaces(spaceIds) : Promise.resolve({ data: [] }),
    ])
    setTasks((ts || []).map((t) => ({ ...t, assignees: (t.task_assignees || []).map((a) => a.user_id) })))
    setStatuses(st || [])
    setLoading(false)
  }, [lists, spaces])
  useEffect(() => { load() }, [load])

  const mine = tasks.filter((t) => !t.parent_id && t.assignees.includes(userId))
  const statusOf = (id) => statuses.find((s) => s.id === id)
  const listOf = (id) => lists.find((l) => l.id === id)
  const isDone = (id) => { const t = statusOf(id)?.type; return t === 'done' || t === 'closed' }
  const open = mine.filter((t) => !isDone(t.status_id)).length

  if (loading) return <div className="spin" />

  return (
    <div>
      <div className="list-head">
        <div>
          <div className="crumb">Assigned to · {open} open</div>
          <h2 style={{ display: 'flex', alignItems: 'center', gap: 10 }}><Avatar name={member?.name} size={30} /> {member?.name || 'User'}</h2>
        </div>
      </div>
      {!mine.length ? (
        <div className="empty"><div className="ic">📭</div><p>No tasks assigned across this workspace.</p></div>
      ) : (
        <table className="tbl">
          <thead><tr><th>Task</th><th>Space</th><th>List</th><th>Status</th><th>Priority</th><th>Due</th></tr></thead>
          <tbody>
            {mine.map((t) => {
              const s = statusOf(t.status_id), lst = listOf(t.list_id)
              const sp = lst && spaces.find((x) => x.id === lst.space_id), done = isDone(t.status_id)
              return (
                <tr key={t.id} onClick={() => nav('/list/' + t.list_id)}>
                  <td style={{ fontWeight: 500, textDecoration: done ? 'line-through' : 'none', color: done ? 'var(--mut)' : 'var(--ink)' }}>{t.name}</td>
                  <td>{sp?.name || '—'}</td>
                  <td>{lst?.name || '—'}</td>
                  <td>{s ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><StatusDot color={s.color} size={8} />{s.name}</span> : '—'}</td>
                  <td><PriorityFlag k={t.priority} /> {t.priority || ''}</td>
                  <td className="mono" style={{ color: isOverdue(t.due_date, done) ? 'var(--danger)' : 'inherit' }}>{fmtDate(t.due_date) || '—'}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      )}
    </div>
  )
}
