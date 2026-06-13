import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../auth'
import * as api from '../api'
import ProjectModal from '../components/ProjectModal'
import { stOf, money, fmtDate, isOverdue, Bar } from '../components/Bits'

export default function Dashboard() {
  const { user, role } = useAuth()
  const nav = useNavigate()
  const [projects, setProjects] = useState([])
  const [tasks, setTasks] = useState([])
  const [expenses, setExpenses] = useState([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(null) // null | {} (new) | project (edit)

  async function load() {
    setLoading(true)
    const { data: ps } = await api.getProjects()
    setProjects(ps || [])
    // pull tasks + expenses across visible projects for progress/budget bars
    const ids = (ps || []).map((p) => p.id)
    if (ids.length) {
      const [{ data: ts }, { data: es }] = await Promise.all([
        fetchTasks(ids),
        fetchExpenses(ids),
      ])
      setTasks(ts || []); setExpenses(es || [])
    } else { setTasks([]); setExpenses([]) }
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  const progressOf = (pid) => {
    const t = tasks.filter((x) => x.project_id === pid)
    if (!t.length) return 0
    return Math.round(t.filter((x) => x.status === 'done').length / t.length * 100)
  }
  const spentOf = (pid) => expenses.filter((e) => e.project_id === pid).reduce((a, e) => a + Number(e.amount), 0)

  const openTasks = tasks.filter((t) => t.status !== 'done').length
  const overdue = tasks.filter((t) => isOverdue(t.due_date, t.status)).length
  const totBudget = projects.reduce((a, p) => a + Number(p.budget), 0)
  const totSpent = expenses.reduce((a, e) => a + Number(e.amount), 0)

  if (loading) return <div className="spin" />

  return (
    <>
      <div className="page-h">
        <h2>Projects</h2>
        <span className="sub">{projects.length} project{projects.length !== 1 ? 's' : ''}</span>
        {role === 'pm' && <button className="btn" style={{ marginLeft: 'auto' }} onClick={() => setEditing({})}>+ New Project</button>}
      </div>

      {projects.length > 0 && (
        <div className="kpi">
          <div className="c accent"><div className="v">{projects.length}</div><div className="l">Active Projects</div></div>
          <div className="c"><div className="v">{openTasks}</div><div className="l">Open Tasks</div></div>
          <div className="c"><div className="v" style={{ color: 'var(--crit)' }}>{overdue}</div><div className="l">Overdue</div></div>
          <div className="c"><div className="v">{totBudget ? Math.round(totSpent / totBudget * 100) : 0}%</div><div className="l">Budget Used</div></div>
        </div>
      )}

      {projects.length === 0 ? (
        <div className="empty">
          <div className="ic">🏗️</div>
          <p>No projects yet.</p>
          {role === 'pm'
            ? <button className="btn" onClick={() => setEditing({})}>+ Create your first project</button>
            : <p style={{ fontSize: 13 }}>Ask your Project Manager to add you to a project.</p>}
        </div>
      ) : (
        <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill,minmax(330px,1fr))' }}>
          {projects.map((p) => {
            const prog = progressOf(p.id)
            const spent = spentOf(p.id)
            const bpct = p.budget ? Math.round(spent / p.budget * 100) : 0
            const over = bpct > 92
            const st = stOf(p.status)
            return (
              <div key={p.id} className="pcard" onClick={() => nav('/project/' + p.id)}>
                <div className="stripe" style={{ background: p.color }} />
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div><h3>{p.name}</h3><div className="code mono">{p.code}</div></div>
                  <span className={'chip ' + st.cls}><span className="d" style={{ background: st.c }} />{st.n}</span>
                </div>
                <div className="loc">📍 {p.location || '—'}</div>
                <div className="barlabel"><span>Progress</span><b>{prog}%</b></div>
                <Bar pct={prog} color={p.color} />
                <div className="barlabel"><span>Budget · {money(spent)} / {money(p.budget)}</span>
                  <b style={{ color: over ? 'var(--crit)' : 'var(--done)' }}>{bpct}%</b></div>
                <Bar pct={bpct} color={over ? 'var(--crit)' : 'var(--done)'} />
                <div className="metarow">
                  <span>Due <b>{fmtDate(p.end_date)}</b></span>
                  <span style={{ marginLeft: 'auto', color: over ? 'var(--crit)' : 'var(--done)', fontWeight: 600 }}>
                    {over ? '⚠ Near budget cap' : 'On budget'}</span>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {editing && <ProjectModal project={editing} userId={user.id} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); load() }} />}
    </>
  )
}

// helper queries (kept here to avoid extra imports)
import { supabase } from '../supabaseClient'
const fetchTasks = (ids) => supabase.from('tasks').select('id,project_id,status,due_date').in('project_id', ids)
const fetchExpenses = (ids) => supabase.from('expenses').select('project_id,amount').in('project_id', ids)


