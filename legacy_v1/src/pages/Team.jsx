import { useEffect, useState } from 'react'
import { useAuth } from '../auth'
import * as api from '../api'
import Modal from '../components/Modal'
import { Avatar, ROLE_LABEL } from '../components/Bits'

const ROLES = ['pm', 'engineer', 'sub', 'client']

export default function Team() {
  const { role, user } = useAuth()
  const [people, setPeople] = useState([])
  const [projects, setProjects] = useState([])
  const [managing, setManaging] = useState(null)

  async function load() {
    const [{ data: ps }, { data: prj }] = await Promise.all([api.getProfiles(), api.getProjects()])
    setPeople(ps || []); setProjects(prj || [])
  }
  useEffect(() => { load() }, [])

  if (role !== 'pm') return <div className="empty"><div className="ic">🔒</div><p>Only the Project Manager can manage the team.</p></div>

  async function changeRole(id, newRole) { await api.updateRole(id, newRole); load() }

  return (
    <>
      <div className="page-h"><h2>Team</h2><span className="sub">Manage roles &amp; project access</span></div>

      <div className="note" style={{ marginBottom: 18 }}>
        People join by signing up at your app's URL. New sign-ups start as <b>Site Engineer</b>; change anyone's role below.
        Add them to specific projects so subcontractors and clients only see what they should.
      </div>

      <table className="tbl">
        <thead><tr><th>Name</th><th>Role</th><th>Projects</th><th></th></tr></thead>
        <tbody>
          {people.map((p) => (
            <tr key={p.id}>
              <td><span style={{ display: 'flex', alignItems: 'center', gap: 9 }}><Avatar name={p.full_name} size={28} />{p.full_name}{p.id === user.id ? ' (you)' : ''}</span></td>
              <td>
                <select value={p.role} onChange={(e) => changeRole(p.id, e.target.value)}
                  disabled={p.id === user.id}
                  style={{ border: '1px solid var(--line)', borderRadius: 8, padding: '5px 8px', fontWeight: 600 }}>
                  {ROLES.map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
                </select>
              </td>
              <td style={{ color: 'var(--mut)' }}>—</td>
              <td><button className="btn ghost sm" onClick={() => setManaging(p)}>Manage access</button></td>
            </tr>
          ))}
        </tbody>
      </table>

      {managing && <AccessModal person={managing} projects={projects} onClose={() => setManaging(null)} />}
    </>
  )
}

function AccessModal({ person, projects, onClose }) {
  const [memberOf, setMemberOf] = useState({})  // {projectId: role}
  const [loading, setLoading] = useState(true)

  async function load() {
    setLoading(true)
    const map = {}
    for (const pr of projects) {
      const { data } = await api.getMembers(pr.id)
      const mine = (data || []).find((m) => m.user_id === person.id)
      if (mine) map[pr.id] = mine.role
    }
    setMemberOf(map); setLoading(false)
  }
  useEffect(() => { load() }, [])

  async function toggle(pid, on) {
    if (on) { await api.addMember(pid, person.id, person.role); setMemberOf({ ...memberOf, [pid]: person.role }) }
    else { await api.removeMember(pid, person.id); const c = { ...memberOf }; delete c[pid]; setMemberOf(c) }
  }

  return (
    <Modal kicker="PROJECT ACCESS" title={person.full_name} onClose={onClose}>
      <p style={{ color: 'var(--mut)', margin: 0, fontSize: 13 }}>
        Tick the projects {person.full_name} can see. Their role there follows their account role
        (<b>{ROLE_LABEL[person.role]}</b>).
      </p>
      {loading ? <div className="spin" /> : projects.map((pr) => (
        <label key={pr.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', borderBottom: '1px solid var(--line)' }}>
          <input type="checkbox" checked={!!memberOf[pr.id]} onChange={(e) => toggle(pr.id, e.target.checked)} style={{ width: 'auto' }} />
          <span style={{ width: 12, height: 12, borderRadius: 3, background: pr.color }} />
          <span style={{ fontWeight: 600 }}>{pr.name}</span>
          <span className="mono" style={{ color: 'var(--mut)', fontSize: 12, marginLeft: 'auto' }}>{pr.code}</span>
        </label>
      ))}
      <button className="btn" style={{ marginTop: 4 }} onClick={onClose}>Done</button>
    </Modal>
  )
}
