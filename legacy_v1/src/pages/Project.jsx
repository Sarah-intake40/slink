import { useEffect, useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth'
import * as api from '../api'
import { supabase } from '../supabaseClient'
import { stOf, money, fmtDate, Bar } from '../components/Bits'
import ProjectModal from '../components/ProjectModal'
import Board from '../project/Board'
import Timeline from '../project/Timeline'
import CalendarView from '../project/CalendarView'
import Costs from '../project/Costs'
import Invoices from '../project/Invoices'
import Records from '../project/Records'
import Files from '../project/Files'
import Reports from '../project/Reports'

const TABS = [
  ['board', 'Board'], ['timeline', 'Timeline'], ['calendar', 'Calendar'],
  ['costs', 'Costs'], ['invoice', 'Invoices'], ['records', 'Records'], ['files', 'Files'], ['reports', 'Reports'],
]

export default function Project() {
  const { id } = useParams()
  const nav = useNavigate()
  const { role, user } = useAuth()
  const [project, setProject] = useState(null)
  const [tab, setTab] = useState('board')
  const [tasks, setTasks] = useState([])
  const [expenses, setExpenses] = useState([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)

  const loadProject = useCallback(async () => {
    const { data } = await api.getProject(id)
    setProject(data)
  }, [id])

  const loadStats = useCallback(async () => {
    const [{ data: ts }, { data: es }] = await Promise.all([
      supabase.from('tasks').select('id,status').eq('project_id', id),
      supabase.from('expenses').select('amount').eq('project_id', id),
    ])
    setTasks(ts || []); setExpenses(es || [])
  }, [id])

  useEffect(() => {
    (async () => { setLoading(true); await Promise.all([loadProject(), loadStats()]); setLoading(false) })()
  }, [loadProject, loadStats])

  if (loading) return <div className="spin" />
  if (!project) return <div className="empty"><div className="ic">🔒</div><p>Project not found or you don't have access.</p></div>

  const prog = tasks.length ? Math.round(tasks.filter((t) => t.status === 'done').length / tasks.length * 100) : 0
  const spent = expenses.reduce((a, e) => a + Number(e.amount), 0)
  const bpct = project.budget ? Math.round(spent / project.budget * 100) : 0
  const st = stOf(project.status)
  const canEdit = role === 'pm' || role === 'engineer'

  const refresh = () => { loadStats() }

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: 18, flexWrap: 'wrap' }}>
        <button className="btn ghost sm" onClick={() => nav('/')}>← Projects</button>
        <div>
          <h2 style={{ fontSize: 24 }}>{project.name} <span className="mono" style={{ color: 'var(--mut)', fontSize: 14 }}>{project.code}</span></h2>
          <div style={{ color: 'var(--mut)', fontSize: 13, marginTop: 2 }}>📍 {project.location || '—'} · Due {fmtDate(project.end_date)}</div>
        </div>
        <span className={'chip ' + st.cls} style={{ marginTop: 6 }}><span className="d" style={{ background: st.c }} />{st.n}</span>
        {role === 'pm' && <button className="btn ghost sm" style={{ marginTop: 4 }} onClick={() => setEditing(true)}>✎ Edit project</button>}
        <div style={{ marginLeft: 'auto', minWidth: 220 }}>
          <div className="barlabel"><span>Progress</span><b>{prog}%</b></div>
          <Bar pct={prog} color={project.color} />
          <div className="barlabel"><span>Budget {money(spent)} / {money(project.budget)}</span>
            <b style={{ color: bpct > 92 ? 'var(--crit)' : 'var(--done)' }}>{bpct}%</b></div>
          <Bar pct={bpct} color={bpct > 92 ? 'var(--crit)' : 'var(--done)'} />
        </div>
      </div>

      <div className="tabs">
        {TABS.map(([k, label]) => (
          <button key={k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)}>{label}</button>
        ))}
      </div>

      {tab === 'board' && <Board project={project} canEdit={canEdit} onChange={refresh} />}
      {tab === 'timeline' && <Timeline project={project} />}
      {tab === 'calendar' && <CalendarView project={project} />}
      {tab === 'costs' && <Costs project={project} role={role} onChange={refresh} />}
      {tab === 'invoice' && <Invoices project={project} role={role} onChange={refresh} />}
      {tab === 'records' && <Records project={project} role={role} />}
      {tab === 'files' && <Files project={project} role={role} />}
      {tab === 'reports' && <Reports project={project} />}

      {editing && (
        <ProjectModal
          project={project}
          userId={user.id}
          onClose={() => setEditing(false)}
          onSaved={async () => {
            setEditing(false)
            const { data } = await api.getProject(id)
            if (!data) { nav('/'); return }   // deleted → back to portfolio
            setProject(data)
            loadStats()
          }}
        />
      )}
    </>
  )
}
