import { useEffect, useState, useCallback } from 'react'
import { useAuth } from '../auth'
import { useWorkspace } from '../workspace'
import * as api from '../api'
import Modal from '../components/Modal'
import { money, num, MoneyInput, fmtDate, todayISO, RATE_BASES, expenseAmount } from '../components/Bits'

// "10 worker × SAR 37/hr × 8h" summary for the log
function breakdownText(e) {
  if (!e.rate_basis || e.rate_basis === 'flat') return ''
  const unit = e.unit_label || 'unit', q = num(e.quantity)
  if (e.rate_basis === 'hour') return `${q} ${unit} × ${money(e.rate)}/hr × ${num(e.hours)}h`
  return `${q} ${unit} × ${money(e.rate)}/${e.rate_basis}`
}

const DEFAULTS = [
  { name: 'Labor', color: '#4f86ff' }, { name: 'Materials', color: '#22c55e' },
  { name: 'Equipment', color: '#7B68EE' }, { name: 'Subcontractor', color: '#0891b2' },
  { name: 'Other', color: '#f9a825' },
]

export default function CostsPage() {
  const { user } = useAuth()
  const { ws, setWs } = useWorkspace()
  const [cats, setCats] = useState([])
  const [expenses, setExpenses] = useState([])
  const [editingExp, setEditingExp] = useState(null)
  const [managing, setManaging] = useState(false)
  const [editBudget, setEditBudget] = useState(false)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!ws) return
    let { data: cs } = await api.getCostCategories(ws.id)
    if (!cs || !cs.length) {
      await Promise.all(DEFAULTS.map((c, i) => api.createCostCategory({ workspace_id: ws.id, name: c.name, color: c.color, sort: i })))
      cs = (await api.getCostCategories(ws.id)).data
    }
    const { data: es } = await api.getExpenses(ws.id)
    setCats(cs || []); setExpenses(es || []); setLoading(false)
  }, [ws])
  useEffect(() => { load() }, [load])

  if (loading) return <div className="spin" />
  const budget = num(ws?.budget)
  const totalSpent = expenses.reduce((a, e) => a + num(e.amount), 0)
  const remaining = budget - totalSpent
  const pct = budget ? Math.round(totalSpent / budget * 100) : 0
  const catOf = (id) => cats.find((c) => c.id === id)
  const spentBy = (id) => expenses.filter((e) => e.category_id === id).reduce((a, e) => a + num(e.amount), 0)

  async function removeExpense(id) { if (confirm('Delete this expense?')) { await api.deleteExpense(id); load() } }

  return (
    <>
      <div className="list-head">
        <div><div className="crumb">Project costs · actual spend</div><h2>Costs</h2></div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
          <button className="btn ghost" onClick={() => setEditBudget(true)}>Project budget</button>
          <button className="btn ghost" onClick={() => setManaging(true)}>⚙ Categories</button>
          <button className="btn" onClick={() => setEditingExp({})}>+ Expense</button>
        </div>
      </div>

      <div className="kpi">
        <div className="c"><div className="v">{money(budget)}</div><div className="l">Project budget</div></div>
        <div className="c"><div className="v">{money(totalSpent)}</div><div className="l">Spent</div></div>
        <div className="c"><div className="v" style={{ color: remaining < 0 ? 'var(--danger)' : 'var(--done)' }}>{money(remaining)}</div><div className="l">Remaining</div></div>
        <div className="c"><div className="v" style={{ color: pct > 95 ? 'var(--danger)' : 'var(--ink)' }}>{pct}%</div><div className="l">Budget used</div></div>
      </div>

      <div className="fin-grid">
        <div className="card pad">
          <h4 className="card-h">Spend by category</h4>
          {cats.map((c) => {
            const sp = spentBy(c.id), p = totalSpent ? Math.round(sp / totalSpent * 100) : 0
            return (
              <div key={c.id} style={{ margin: '12px 0' }}>
                <div style={{ display: 'flex', fontSize: 13, fontWeight: 600 }}>
                  <span><span style={{ color: c.color }}>●</span> {c.name}</span>
                  <span className="mono" style={{ marginLeft: 'auto' }}>{money(sp)} · {p}%</span>
                </div>
                <div className="bar" style={{ marginTop: 5 }}><i style={{ width: p + '%', background: c.color }} /></div>
              </div>
            )
          })}
          {!cats.length && <div style={{ color: 'var(--mut)', fontSize: 13 }}>No categories.</div>}
        </div>

        <div className="card pad">
          <h4 className="card-h">Expense log ({expenses.length})</h4>
          {!expenses.length && <div style={{ color: 'var(--mut)', fontSize: 13 }}>No expenses logged yet.</div>}
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {expenses.map((e) => {
              const c = catOf(e.category_id)
              return (
                <div key={e.id} className="exp-row" onClick={() => setEditingExp(e)}>
                  <span style={{ width: 9, height: 9, borderRadius: '50%', background: c?.color || 'var(--mut2)', flexShrink: 0 }} />
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{e.description || c?.name || 'Expense'}</div>
                    <div style={{ color: 'var(--mut)', fontSize: 11.5 }}>{c?.name || 'Uncategorized'} · {fmtDate(e.spent_on)}{breakdownText(e) ? ' · ' + breakdownText(e) : ''}</div>
                  </div>
                  <span className="mono" style={{ fontWeight: 600 }}>{money(e.amount)}</span>
                  <button className="x" style={{ width: 26, height: 26 }} onClick={(ev) => { ev.stopPropagation(); removeExpense(e.id) }}>×</button>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {editingExp && <ExpenseModal exp={editingExp} cats={cats} wsId={ws.id} userId={user.id}
        onClose={() => setEditingExp(null)} onSaved={() => { setEditingExp(null); load() }} />}
      {managing && <CategoryModal cats={cats} wsId={ws.id} onClose={() => setManaging(false)} onSaved={() => { setManaging(false); load() }} />}
      {editBudget && <BudgetModal ws={ws} onClose={() => setEditBudget(false)}
        onSaved={(b) => { setEditBudget(false); setWs({ ...ws, budget: b }) }} />}
    </>
  )
}

function ExpenseModal({ exp, cats, wsId, userId, onClose, onSaved }) {
  const isNew = !exp.id
  const [f, setF] = useState({
    category_id: exp.category_id || cats[0]?.id || '', description: exp.description || '', spent_on: exp.spent_on || todayISO(),
    rate_basis: exp.rate_basis || 'flat', amount: exp.amount ?? '', quantity: exp.quantity ?? '', unit_label: exp.unit_label || '', rate: exp.rate ?? '', hours: exp.hours ?? '',
  })
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value })
  const calc = f.rate_basis !== 'flat'
  const total = expenseAmount(f)

  async function save() {
    if (!f.category_id) return alert('Pick a category')
    if (total <= 0) return alert('Enter an amount greater than zero')
    const payload = {
      workspace_id: wsId, category_id: f.category_id || null, description: f.description, spent_on: f.spent_on,
      amount: total, rate_basis: f.rate_basis,
      quantity: calc ? num(f.quantity) : null, unit_label: calc ? (f.unit_label || null) : null,
      rate: calc ? num(f.rate) : null, hours: f.rate_basis === 'hour' ? num(f.hours) : null,
    }
    const { error } = isNew ? await api.createExpense({ ...payload, created_by: userId }) : await api.updateExpense(exp.id, payload)
    if (error) return alert(error.message)
    onSaved()
  }

  return (
    <Modal kicker={isNew ? 'NEW EXPENSE' : 'EDIT EXPENSE'} title="Log a cost" onClose={onClose}>
      <div className="row2">
        <div className="field"><label>Category</label>
          <select value={f.category_id} onChange={set('category_id')}>{cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
        <div className="field"><label>How is it priced?</label>
          <select value={f.rate_basis} onChange={set('rate_basis')}>{RATE_BASES.map((b) => <option key={b.k} value={b.k}>{b.n} — {b.hint}</option>)}</select></div>
      </div>

      <div className="field"><label>Description</label>
        <input value={f.description} onChange={set('description')} placeholder={calc ? 'e.g. Site labour — Tuesday shift' : 'e.g. Ready-mix concrete'} /></div>

      {calc ? (
        <>
          <div className="row2">
            <div className="field"><label>Quantity</label><input type="number" value={f.quantity} onChange={set('quantity')} placeholder="e.g. 10" /></div>
            <div className="field"><label>Unit name (optional)</label><input value={f.unit_label} onChange={set('unit_label')} placeholder="worker / m³ / day" /></div>
          </div>
          <div className="row2">
            <div className="field"><label>Rate per {f.rate_basis === 'hour' ? 'hour' : f.rate_basis} (SAR)</label><input type="number" value={f.rate} onChange={set('rate')} placeholder="e.g. 37.5" /></div>
            {f.rate_basis === 'hour'
              ? <div className="field"><label>Hours worked (each)</label><input type="number" value={f.hours} onChange={set('hours')} placeholder="e.g. 8" /></div>
              : <div className="field"><label>&nbsp;</label><div style={{ color: 'var(--mut)', fontSize: 12, padding: '10px 0' }}>{f.quantity || 0} × {money(f.rate)}</div></div>}
          </div>
        </>
      ) : (
        <div className="field"><label>Amount (SAR)</label><MoneyInput decimals value={f.amount} onChange={(v) => setF({ ...f, amount: v })} placeholder="0" /></div>
      )}

      <div className="field"><label>Date</label><input type="date" value={f.spent_on} onChange={set('spent_on')} /></div>

      <div style={{ display: 'flex', alignItems: 'center', background: 'var(--hover)', border: '1px solid var(--line)', borderRadius: 10, padding: '11px 14px' }}>
        <span style={{ fontSize: 11, color: 'var(--mut)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.4px' }}>Total</span>
        <span className="mono" style={{ marginLeft: 'auto', fontWeight: 800, fontSize: 18, color: 'var(--accent)' }}>{money(total)}</span>
      </div>

      <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
        <button className="btn" onClick={save}>{isNew ? 'Add expense' : 'Save'}</button>
        <button className="btn ghost" style={{ marginLeft: 'auto' }} onClick={onClose}>Cancel</button>
      </div>
    </Modal>
  )
}

function CategoryModal({ cats, wsId, onClose, onSaved }) {
  const [rows, setRows] = useState(() => cats.map((c) => ({ ...c })))
  const [busy, setBusy] = useState(false)
  const COLORS = ['#7B68EE', '#4f86ff', '#22c55e', '#f9a825', '#e5484d', '#0891b2', '#db2777', '#6366f1']
  const setRow = (i, k, v) => setRows(rows.map((r, j) => (j === i ? { ...r, [k]: v } : r)))
  async function save() {
    setBusy(true)
    const keep = rows.filter((r) => r.id).map((r) => r.id)
    for (const c of cats) if (!keep.includes(c.id)) await api.deleteCostCategory(c.id)
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i]; if (!r.name.trim()) continue
      if (r.id) await api.updateCostCategory(r.id, { name: r.name.trim(), color: r.color, sort: i })
      else await api.createCostCategory({ workspace_id: wsId, name: r.name.trim(), color: r.color, sort: i })
    }
    setBusy(false); onSaved()
  }
  return (
    <Modal kicker="COST CATEGORIES" title="Edit categories" onClose={onClose}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
        {rows.map((r, i) => (
          <div key={r.id || 'n' + i} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <select value={r.color} onChange={(e) => setRow(i, 'color', e.target.value)} style={{ width: 70, color: r.color, fontWeight: 700, border: '1px solid var(--line2)', borderRadius: 8, padding: '8px' }}>
              {COLORS.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <input value={r.name} onChange={(e) => setRow(i, 'name', e.target.value)} placeholder="Category name" style={{ flex: 1, border: '1px solid var(--line2)', borderRadius: 8, padding: '8px 11px' }} />
            <button className="x" style={{ width: 30, height: 30 }} onClick={() => setRows(rows.filter((_, j) => j !== i))}>×</button>
          </div>
        ))}
      </div>
      <button className="btn ghost sm" style={{ alignSelf: 'flex-start' }} onClick={() => setRows([...rows, { name: '', color: '#7B68EE' }])}>+ Add category</button>
      <div style={{ display: 'flex', gap: 10 }}>
        <button className="btn" onClick={save} disabled={busy}>Save</button>
        <button className="btn ghost" style={{ marginLeft: 'auto' }} onClick={onClose}>Cancel</button>
      </div>
    </Modal>
  )
}

function BudgetModal({ ws, onClose, onSaved }) {
  const [b, setB] = useState(ws?.budget ?? '')
  const [busy, setBusy] = useState(false)
  async function save() {
    setBusy(true)
    const val = num(b)
    const { error } = await api.updateWorkspace(ws.id, { budget: val })
    setBusy(false)
    if (error) return alert(error.message)
    onSaved(val)
  }
  return (
    <Modal kicker="PROJECT BUDGET" title="Set the whole-project budget" onClose={onClose}>
      <div className="field"><label>Budget (SAR)</label>
        <MoneyInput value={b} onChange={setB} placeholder="100,000" autoFocus />
        <div style={{ fontSize: 12, color: 'var(--mut)', marginTop: 5, fontFamily: 'ui-monospace,monospace' }}>= {money(b)}</div>
      </div>
      <div style={{ display: 'flex', gap: 10 }}>
        <button className="btn" onClick={save} disabled={busy}>Save budget</button>
        <button className="btn ghost" style={{ marginLeft: 'auto' }} onClick={onClose}>Cancel</button>
      </div>
    </Modal>
  )
}
