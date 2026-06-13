import { useState } from 'react'
import * as api from '../api'
import Modal from './Modal'
import { STATUS_TYPES, FIELD_TYPES } from './Bits'

const STATUS_COLORS = ['#87909e', '#4f86ff', '#7B68EE', '#f9a825', '#22c55e', '#e5484d', '#0891b2', '#db2777']

export default function CustomizeModal({ space, statuses, fields, onClose, onSaved }) {
  const [tab, setTab] = useState('statuses')
  const [sts, setSts] = useState(() => statuses.map((s) => ({ ...s })))
  const [fls, setFls] = useState(() => fields.map((f) => ({ ...f, optionsText: (f.options || []).join(', ') })))
  const [busy, setBusy] = useState(false)

  // move an item up/down within a list (reorder, Jira-style)
  const move = (arr, set) => (i, dir) => {
    const j = i + dir
    if (j < 0 || j >= arr.length) return
    const next = arr.slice()
    ;[next[i], next[j]] = [next[j], next[i]]
    set(next)
  }
  // statuses helpers
  const setS = (i, k, v) => setSts(sts.map((r, j) => (j === i ? { ...r, [k]: v } : r)))
  const addS = () => setSts([...sts, { _new: true, name: '', color: '#87909e', type: 'active', sort: sts.length }])
  const dropS = (i) => setSts(sts.filter((_, j) => j !== i))
  const moveS = move(sts, setSts)
  // fields helpers
  const setF = (i, k, v) => setFls(fls.map((r, j) => (j === i ? { ...r, [k]: v } : r)))
  const addF = () => setFls([...fls, { _new: true, name: '', type: 'text', optionsText: '', sort: fls.length }])
  const dropF = (i) => setFls(fls.filter((_, j) => j !== i))
  const moveF = move(fls, setFls)

  async function save() {
    setBusy(true)
    // statuses
    const keepS = sts.filter((r) => r.id).map((r) => r.id)
    for (const s of statuses) if (!keepS.includes(s.id)) await api.deleteStatus(s.id)
    for (let i = 0; i < sts.length; i++) {
      const r = sts[i]; if (!r.name.trim()) continue
      const payload = { name: r.name.trim(), color: r.color, type: r.type, sort: i }
      if (r.id) await api.updateStatus(r.id, payload)
      else await api.createStatus({ space_id: space.id, ...payload })
    }
    // fields
    const keepF = fls.filter((r) => r.id).map((r) => r.id)
    for (const f of fields) if (!keepF.includes(f.id)) await api.deleteTaskField(f.id)
    for (let i = 0; i < fls.length; i++) {
      const r = fls[i]; if (!r.name.trim()) continue
      const options = (r.type === 'select' || r.type === 'multiselect')
        ? r.optionsText.split(',').map((s) => s.trim()).filter(Boolean) : []
      const payload = { name: r.name.trim(), type: r.type, options, sort: i }
      if (r.id) await api.updateTaskField(r.id, payload)
      else await api.createTaskField({ space_id: space.id, ...payload })
    }
    setBusy(false); onSaved()
  }

  return (
    <Modal wide kicker={'SPACE · ' + (space?.name || '').toUpperCase()} title="Customize" onClose={onClose}>
      <div className="view-tabs" style={{ alignSelf: 'flex-start' }}>
        <button className={tab === 'statuses' ? 'on' : ''} onClick={() => setTab('statuses')}>Statuses</button>
        <button className={tab === 'fields' ? 'on' : ''} onClick={() => setTab('fields')}>Custom fields</button>
      </div>

      {tab === 'statuses' && (
        <>
          <p style={{ color: 'var(--mut)', fontSize: 13, margin: 0 }}>Statuses apply to every list in this space. “Done/Closed” types mark tasks complete.</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
            {sts.map((r, i) => (
              <div key={r.id || 'n' + i} style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                <select value={r.color} onChange={(e) => setS(i, 'color', e.target.value)} style={swatchStyle(r.color)}>
                  {STATUS_COLORS.map((c) => <option key={c} value={c} style={{ background: c }}>{c}</option>)}
                </select>
                <input value={r.name} onChange={(e) => setS(i, 'name', e.target.value)} placeholder="Status name"
                  style={{ flex: '1 1 140px', border: '1px solid var(--line2)', borderRadius: 9, padding: '8px 11px' }} />
                <select value={r.type} onChange={(e) => setS(i, 'type', e.target.value)}
                  style={{ flex: '0 0 130px', border: '1px solid var(--line2)', borderRadius: 9, padding: '8px 11px' }}>
                  {STATUS_TYPES.map((t) => <option key={t.k} value={t.k}>{t.n}</option>)}
                </select>
                <button className="mini" title="Move up" disabled={i === 0} onClick={() => moveS(i, -1)}>↑</button>
                <button className="mini" title="Move down" disabled={i === sts.length - 1} onClick={() => moveS(i, 1)}>↓</button>
                <button className="x" style={{ width: 30, height: 30 }} onClick={() => dropS(i)}>×</button>
              </div>
            ))}
          </div>
          <button className="btn ghost sm" style={{ alignSelf: 'flex-start' }} onClick={addS}>+ Add status</button>
        </>
      )}

      {tab === 'fields' && (
        <>
          <p style={{ color: 'var(--mut)', fontSize: 13, margin: 0 }}>Custom fields appear on every task in this space. Dropdown / multi-select use comma-separated options.</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
            {fls.map((r, i) => (
              <div key={r.id || 'n' + i} style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                <input value={r.name} onChange={(e) => setF(i, 'name', e.target.value)} placeholder="Field name"
                  style={{ flex: '1 1 140px', border: '1px solid var(--line2)', borderRadius: 9, padding: '8px 11px' }} />
                <select value={r.type} onChange={(e) => setF(i, 'type', e.target.value)}
                  style={{ flex: '0 0 130px', border: '1px solid var(--line2)', borderRadius: 9, padding: '8px 11px' }}>
                  {FIELD_TYPES.map((t) => <option key={t.k} value={t.k}>{t.n}</option>)}
                </select>
                {(r.type === 'select' || r.type === 'multiselect')
                  ? <input value={r.optionsText} onChange={(e) => setF(i, 'optionsText', e.target.value)} placeholder="Option A, Option B"
                      style={{ flex: '1 1 150px', border: '1px solid var(--line2)', borderRadius: 9, padding: '8px 11px' }} />
                  : <span style={{ flex: '1 1 150px', color: 'var(--mut2)', fontSize: 12 }} />}
                <button className="mini" title="Move up" disabled={i === 0} onClick={() => moveF(i, -1)}>↑</button>
                <button className="mini" title="Move down" disabled={i === fls.length - 1} onClick={() => moveF(i, 1)}>↓</button>
                <button className="x" style={{ width: 30, height: 30 }} onClick={() => dropF(i)}>×</button>
              </div>
            ))}
          </div>
          <button className="btn ghost sm" style={{ alignSelf: 'flex-start' }} onClick={addF}>+ Add field</button>
        </>
      )}

      <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
        <button className="btn" onClick={save} disabled={busy}>Save</button>
        <button className="btn ghost" style={{ marginLeft: 'auto' }} onClick={onClose}>Cancel</button>
      </div>
    </Modal>
  )
}

const swatchStyle = (c) => ({
  flex: '0 0 46px', height: 36, borderRadius: 9, border: '1px solid var(--line2)',
  color: c, fontWeight: 700,
})
