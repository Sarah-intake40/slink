import { useState } from 'react'
import * as api from '../api'
import Modal from './Modal'
import { STATUSES, money, todayISO } from './Bits'

export default function ProjectModal({ project, userId, onClose, onSaved }) {
  const isNew = !project.id
  const [f, setF] = useState({
    name: project.name || '', code: project.code || '', location: project.location || '',
    status: project.status || 'not', budget: Number(project.budget) || 0,
    start_date: project.start_date || todayISO(), end_date: project.end_date || '',
    color: project.color || '#2563eb',
  })
  const [busy, setBusy] = useState(false)
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value })

  // budget shows with thousands separators (e.g. 7,000,000) so zeros are easy to read
  const budgetDisplay = f.budget ? Number(f.budget).toLocaleString('en-US') : ''
  const onBudget = (e) => {
    const digits = e.target.value.replace(/[^\d]/g, '')
    setF({ ...f, budget: digits ? Number(digits) : 0 })
  }

  async function save() {
    if (!f.name.trim()) return alert('Project name is required')
    setBusy(true)
    const payload = { ...f, budget: Number(f.budget) || 0 }
    if (isNew) {
      const { data, error } = await api.createProject({ ...payload, created_by: userId })
      if (error) { alert(error.message); setBusy(false); return }
      if (data) await api.addMember(data.id, userId, 'pm') // PM joins own project
    } else {
      const { error } = await api.updateProject(project.id, payload)
      if (error) { alert(error.message); setBusy(false); return }
    }
    onSaved()
  }
  async function remove() {
    if (!confirm('Delete this project and all its tasks/records? This cannot be undone.')) return
    await api.deleteProject(project.id)
    onSaved()
  }

  return (
    <Modal kicker={isNew ? 'NEW PROJECT' : 'EDIT PROJECT'} title={isNew ? 'Create project' : f.name} onClose={onClose}>
      <div className="field"><label>Project name</label><input value={f.name} onChange={set('name')} placeholder="e.g. Al Noor Tower" /></div>
      <div className="row2">
        <div className="field"><label>Code</label><input value={f.code} onChange={set('code')} placeholder="ANT-24" /></div>
        <div className="field"><label>Status</label>
          <select value={f.status} onChange={set('status')}>{STATUSES.map((s) => <option key={s.k} value={s.k}>{s.n}</option>)}</select></div>
      </div>
      <div className="field"><label>Location</label><input value={f.location} onChange={set('location')} placeholder="Riyadh — Olaya District" /></div>
      <div className="row2">
        <div className="field">
          <label>Total budget (SAR)</label>
          <input type="text" inputMode="numeric" value={budgetDisplay} onChange={onBudget} placeholder="7,000,000" />
          <div style={{ fontSize: 12, color: 'var(--mut)', marginTop: 5, fontFamily: 'JetBrains Mono' }}>= {money(f.budget)}</div>
        </div>
        <div className="field"><label>Accent colour</label><input type="color" value={f.color} onChange={set('color')} style={{ height: 42, padding: 4 }} /></div>
      </div>
      <div className="row2">
        <div className="field"><label>Start date</label><input type="date" value={f.start_date || ''} onChange={set('start_date')} /></div>
        <div className="field"><label>Target end</label><input type="date" value={f.end_date || ''} onChange={set('end_date')} /></div>
      </div>
      <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
        <button className="btn" disabled={busy} onClick={save}>{isNew ? 'Create project' : 'Save changes'}</button>
        {!isNew && <button className="btn danger" onClick={remove}>Delete</button>}
        <button className="btn ghost" style={{ marginLeft: 'auto' }} onClick={onClose}>Cancel</button>
      </div>
    </Modal>
  )
}
