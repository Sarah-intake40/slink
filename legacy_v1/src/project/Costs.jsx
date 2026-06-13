import { useEffect, useState, useCallback } from 'react'
import { useAuth } from '../auth'
import * as api from '../api'
import Modal from '../components/Modal'
import { DEFAULT_CATEGORIES, RATE_BASES, expenseAmount, money, fmtDate, todayISO, MoneyInput } from '../components/Bits'

const num = (v) => (v === '' || v == null ? 0 : Number(v))

export default function Costs({ project, role, onChange }) {
  const { user } = useAuth()
  const [cats, setCats] = useState([])
  const [expenses, setExpenses] = useState([])
  const [tasks, setTasks] = useState([])
  const [adding, setAdding] = useState(false)
  const [managing, setManaging] = useState(false)
  const [loading, setLoading] = useState(true)

  const canEdit = role === 'pm' || role === 'engineer'
  const isPM = role === 'pm'

  const load = useCallback(async () => {
    let { data: cs } = await api.getCategories(project.id)
    // first time a PM opens the tab: seed the editable default categories
    if ((!cs || !cs.length) && role === 'pm') {
      await Promise.all(DEFAULT_CATEGORIES.map((c, i) =>
        api.createCategory({ project_id: project.id, name: c.name, color: c.color, sort: i })))
      cs = (await api.getCategories(project.id)).data
    }
    const [{ data: es }, { data: ts }] = await Promise.all([api.getExpenses(project.id), api.getTasks(project.id)])
    setCats(cs || []); setExpenses(es || []); setTasks(ts || [])
    setLoading(false)
  }, [project.id, role])
  useEffect(() => { load() }, [load])

  if (loading) return <div className="spin" />

  const catOf = (id) => cats.find((c) => c.id === id)
  const spentBy = (id) => expenses.filter((e) => e.category_id === id).reduce((a, e) => a + num(e.amount), 0)
  const totalSpent = expenses.reduce((a, e) => a + num(e.amount), 0)
  const totalCatBudget = cats.reduce((a, c) => a + num(c.budget), 0)
  const uncategorized = expenses.filter((e) => !e.category_id || !catOf(e.category_id))

  async function removeExpense(id) {
    if (!confirm('Delete this expense?')) return
    await api.deleteExpense(id); load(); onChange && onChange()
  }

  return (
    <>
      <div style={{ display: 'flex', marginBottom: 16, alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <h3 style={{ fontSize: 18 }}>Cost control</h3>
        <span style={{ color: 'var(--mut)', fontSize: 13 }}>· {money(totalSpent)} spent of {money(project.budget)} total</span>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
          {isPM && <button className="btn ghost" onClick={() => setManaging(true)}>⚙ Categories &amp; budget</button>}
          {canEdit && <button className="btn" onClick={() => setAdding(true)}>+ Add expense</button>}
        </div>
      </div>

      <div className="costgrid">
        {/* category budget vs actual */}
        <div className="card" style={{ padding: 18 }}>
          <h4 style={{ fontSize: 15, marginBottom: 6 }}>Budget vs. actual by category</h4>
          {!cats.length && <div style={{ color: 'var(--mut)', fontSize: 13, margin: '10px 0' }}>
            No categories yet.{isPM ? ' Use “Categories & budget” to add some.' : ''}</div>}
          {cats.map((c) => {
            const spent = spentBy(c.id), bud = num(c.budget)
            const pct = bud ? Math.round(spent / bud * 100) : (spent ? 100 : 0)
            const over = bud && spent > bud
            return (
              <div key={c.id} style={{ margin: '14px 0' }}>
                <div style={{ display: 'flex', fontSize: 13, fontWeight: 600 }}>
                  <span><span style={{ color: c.color }}>●</span> {c.name}</span>
                  <span className="mono" style={{ marginLeft: 'auto', color: over ? 'var(--crit)' : 'var(--ink2)' }}>
                    {money(spent)} / {money(bud)}</span>
                </div>
                <div className="bar" style={{ marginTop: 6 }}>
                  <i style={{ width: Math.min(pct, 100) + '%', background: over ? 'var(--crit)' : c.color }} />
                </div>
              </div>
            )
          })}
          <div style={{ borderTop: '1px solid var(--line)', marginTop: 14, paddingTop: 12, display: 'flex', fontWeight: 700 }}>
            <span>Total allocated</span>
            <span className="mono" style={{ marginLeft: 'auto', color: totalCatBudget > project.budget ? 'var(--crit)' : 'var(--ink)' }}>{money(totalCatBudget)}</span>
          </div>
        </div>

        {/* expense ledger */}
        <div className="card" style={{ padding: 18 }}>
          <h4 style={{ fontSize: 15, marginBottom: 12 }}>Expense log ({expenses.length})</h4>
          {!expenses.length && <div style={{ color: 'var(--mut)', fontSize: 13 }}>No expenses entered yet.</div>}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
            {expenses.map((e) => {
              const c = catOf(e.category_id)
              const task = tasks.find((t) => t.id === e.task_id)
              return (
                <div key={e.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 0', borderBottom: '1px solid var(--line)' }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: c?.color || 'var(--mut2)', flexShrink: 0 }} />
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{e.description || c?.name || 'Expense'}</div>
                    <div style={{ color: 'var(--mut)', fontSize: 11.5 }}>
                      {c?.name || 'Uncategorized'} · {fmtDate(e.spent_on)}{task ? ` · ${task.title}` : ''}{breakdownText(e) ? ` · ${breakdownText(e)}` : ''}
                    </div>
                  </div>
                  <span className="mono" style={{ marginLeft: 'auto', fontWeight: 600 }}>{money(e.amount)}</span>
                  {canEdit && <button className="x" style={{ width: 26, height: 26 }} onClick={() => removeExpense(e.id)}>×</button>}
                </div>
              )
            })}
          </div>
          {uncategorized.length > 0 && (
            <div style={{ marginTop: 12, fontSize: 11.5, color: 'var(--mut)' }}>
              {uncategorized.length} expense(s) have no category{isPM ? ' — edit them to assign one.' : ''}.
            </div>
          )}
        </div>
      </div>

      {adding && <ExpenseModal project={project} cats={cats} tasks={tasks} userId={user.id}
        onClose={() => setAdding(false)} onSaved={() => { setAdding(false); load(); onChange && onChange() }} />}
      {managing && <CategoryModal project={project} cats={cats}
        onClose={() => setManaging(false)} onSaved={() => { setManaging(false); load() }} />}
    </>
  )
}

// "10 worker × SAR 37/hr × 8h" style summary for the ledger
function breakdownText(e) {
  if (!e.rate_basis || e.rate_basis === 'flat') return ''
  const unit = e.unit_label || 'unit'
  const q = num(e.quantity)
  if (e.rate_basis === 'hour') return `${q} ${unit} × ${money(e.rate)}/hr × ${num(e.hours)}h`
  return `${q} ${unit} × ${money(e.rate)}/${e.rate_basis}`
}

function ExpenseModal({ project, cats, tasks, userId, onClose, onSaved }) {
  const [f, setF] = useState({
    category_id: cats[0]?.id || '', description: '', spent_on: todayISO(), task_id: '',
    rate_basis: 'flat', amount: '', quantity: '', unit_label: '', rate: '', hours: '',
  })
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value })
  const setNum = (k) => (e) => setF({ ...f, [k]: e.target.value })
  const total = expenseAmount(f)
  const calc = f.rate_basis !== 'flat'

  async function save() {
    if (!f.category_id) return alert('Pick a category first (add one under “Categories & budget”).')
    if (total <= 0) return alert('Enter an amount greater than zero.')
    const { error } = await api.createExpense({
      project_id: project.id, category_id: f.category_id, description: f.description,
      spent_on: f.spent_on, task_id: f.task_id || null, created_by: userId,
      amount: total, rate_basis: f.rate_basis,
      quantity: calc ? num(f.quantity) : null, unit_label: calc ? (f.unit_label || null) : null,
      rate: calc ? num(f.rate) : null, hours: f.rate_basis === 'hour' ? num(f.hours) : null,
    })
    if (error) return alert(error.message)
    onSaved()
  }

  return (
    <Modal kicker="NEW EXPENSE" title="Log a cost" onClose={onClose}>
      <div className="row2">
        <div className="field"><label>Category</label>
          <select value={f.category_id} onChange={set('category_id')}>
            {!cats.length && <option value="">— no categories —</option>}
            {cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select></div>
        <div className="field"><label>How is it priced?</label>
          <select value={f.rate_basis} onChange={set('rate_basis')}>
            {RATE_BASES.map((b) => <option key={b.k} value={b.k}>{b.n} — {b.hint}</option>)}
          </select></div>
      </div>

      <div className="field"><label>Description</label>
        <input value={f.description} onChange={set('description')} placeholder={calc ? 'e.g. Site labour — Tuesday shift' : 'e.g. Ready-mix concrete'} /></div>

      {calc ? (
        <>
          <div className="row2">
            <div className="field"><label>Quantity</label>
              <input type="number" value={f.quantity} onChange={setNum('quantity')} placeholder="e.g. 10" /></div>
            <div className="field"><label>Unit name (optional)</label>
              <input value={f.unit_label} onChange={set('unit_label')} placeholder="worker / m³ / day" /></div>
          </div>
          <div className="row2">
            <div className="field"><label>Rate per {f.rate_basis === 'hour' ? 'hour' : f.rate_basis} (SAR)</label>
              <input type="number" value={f.rate} onChange={setNum('rate')} placeholder="e.g. 37.5" /></div>
            {f.rate_basis === 'hour'
              ? <div className="field"><label>Hours worked (each)</label>
                  <input type="number" value={f.hours} onChange={setNum('hours')} placeholder="e.g. 8" /></div>
              : <div className="field"><label>&nbsp;</label><div style={{ color: 'var(--mut)', fontSize: 12, padding: '10px 0' }}>{f.quantity || 0} × {money(f.rate)}</div></div>}
          </div>
        </>
      ) : (
        <div className="field"><label>Amount (SAR)</label>
          <MoneyInput value={f.amount} onChange={(v) => setF({ ...f, amount: v })} placeholder="0" /></div>
      )}

      <div className="row2">
        <div className="field"><label>Date</label><input type="date" value={f.spent_on} onChange={set('spent_on')} /></div>
        <div className="field"><label>Link to task (optional)</label>
          <select value={f.task_id} onChange={set('task_id')}>
            <option value="">None</option>
            {tasks.map((t) => <option key={t.id} value={t.id}>{t.title}</option>)}
          </select></div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', background: 'var(--bg2)', border: '1px solid var(--line)', borderRadius: 10, padding: '12px 14px' }}>
        <div style={{ fontSize: 11, color: 'var(--mut)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.4px' }}>Total</div>
        <div className="mono" style={{ marginLeft: 'auto', fontWeight: 800, fontSize: 20, color: 'var(--blue)' }}>{money(total)}</div>
      </div>

      <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
        <button className="btn" onClick={save}>Add expense</button>
        <button className="btn ghost" style={{ marginLeft: 'auto' }} onClick={onClose}>Cancel</button>
      </div>
    </Modal>
  )
}

function CategoryModal({ project, cats, onClose, onSaved }) {
  const [rows, setRows] = useState(() => cats.map((c) => ({ ...c })))
  const [busy, setBusy] = useState(false)
  const total = rows.reduce((a, r) => a + num(r.budget), 0)
  const setRow = (i, k, v) => setRows(rows.map((r, j) => (j === i ? { ...r, [k]: v } : r)))
  const addRow = () => setRows([...rows, { _new: true, name: '', color: '#2563eb', budget: 0, sort: rows.length }])
  const dropRow = (i) => setRows(rows.filter((_, j) => j !== i))

  async function save() {
    setBusy(true)
    const keepIds = rows.filter((r) => r.id).map((r) => r.id)
    // delete categories removed in the editor
    for (const c of cats) if (!keepIds.includes(c.id)) await api.deleteCategory(c.id)
    // upsert the rest
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i]
      if (!r.name.trim()) continue
      const payload = { name: r.name.trim(), color: r.color, budget: num(r.budget), sort: i }
      if (r.id) await api.updateCategory(r.id, payload)
      else await api.createCategory({ project_id: project.id, ...payload })
    }
    setBusy(false)
    onSaved()
  }

  return (
    <Modal wide kicker="CATEGORIES & BUDGET" title="Edit categories and allocations" onClose={onClose}>
      <p style={{ color: 'var(--mut)', margin: 0, fontSize: 13 }}>
        Rename, recolour, add or remove categories, and set how the {money(project.budget)} total budget is split. Deleting a category leaves its past expenses uncategorized.
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {rows.map((r, i) => (
          <div key={r.id || 'new' + i} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input type="color" value={r.color} onChange={(e) => setRow(i, 'color', e.target.value)}
              style={{ width: 38, height: 38, padding: 3, border: '1px solid var(--line)', borderRadius: 9, flexShrink: 0 }} />
            <input value={r.name} onChange={(e) => setRow(i, 'name', e.target.value)} placeholder="Category name"
              style={{ flex: 1, border: '1px solid var(--line)', borderRadius: 9, padding: '9px 11px' }} />
            <div style={{ width: 150, flexShrink: 0 }}>
              <MoneyInput value={r.budget} onChange={(v) => setRow(i, 'budget', v)} placeholder="0"
                style={{ width: '100%', border: '1px solid var(--line)', borderRadius: 9, padding: '9px 11px', fontFamily: 'JetBrains Mono' }} />
            </div>
            <button className="x" style={{ width: 32, height: 32, flexShrink: 0 }} onClick={() => dropRow(i)} title="Remove">×</button>
          </div>
        ))}
      </div>
      <button className="addbtn" style={{ margin: '2px 0 0', width: '100%' }} onClick={addRow}>+ Add category</button>

      <div style={{ display: 'flex', fontWeight: 700, padding: '4px 0' }}>
        <span>Allocated total</span>
        <span className="mono" style={{ marginLeft: 'auto', color: total > project.budget ? 'var(--crit)' : 'var(--ink)' }}>{money(total)}</span>
      </div>
      <div style={{ display: 'flex', gap: 10 }}>
        <button className="btn" onClick={save} disabled={busy}>Save</button>
        <button className="btn ghost" style={{ marginLeft: 'auto' }} onClick={onClose}>Cancel</button>
      </div>
    </Modal>
  )
}
