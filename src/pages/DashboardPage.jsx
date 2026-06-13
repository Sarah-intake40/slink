import { useEffect, useState, useCallback, useMemo } from 'react'
import { useWorkspace } from '../workspace'
import * as api from '../api'
import { PieChart, Legend, BarChart, MultiSeriesChart } from '../components/Charts'
import { invoiceAmounts, invStatus, INVOICE_STATUS } from '../finance'
import { money, num } from '../components/Bits'

const PALETTE = ['#7B68EE', '#4f86ff', '#22c55e', '#f9a825', '#e5484d', '#0891b2', '#db2777', '#6366f1']
const sar2 = (v) => (Number(v) || 0).toLocaleString('en-US', { maximumFractionDigits: 0 })

export default function DashboardPage() {
  const { ws } = useWorkspace()
  const [cats, setCats] = useState([])
  const [expenses, setExpenses] = useState([])
  const [invoices, setInvoices] = useState([])
  const [loading, setLoading] = useState(true)
  // dynamic widget controls
  const [metric, setMetric] = useState('spend')
  const [groupBy, setGroupBy] = useState('category')
  const [chart, setChart] = useState('pie')
  // costs-vs-invoices comparison controls
  const [cmpSel, setCmpSel] = useState(['spent', 'claimed'])
  const [cmpMode, setCmpMode] = useState('bar')
  const toggleCmp = (k) => setCmpSel((s) => s.includes(k) ? s.filter((x) => x !== k) : [...s, k])

  const load = useCallback(async () => {
    if (!ws) return
    const [{ data: cs }, { data: es }, { data: iv }] = await Promise.all([api.getCostCategories(ws.id), api.getExpenses(ws.id), api.getInvoices(ws.id)])
    setCats(cs || []); setExpenses(es || []); setInvoices(iv || []); setLoading(false)
  }, [ws])
  useEffect(() => { load() }, [load])

  const totals = useMemo(() => {
    const budget = num(ws?.budget)
    const spent = expenses.reduce((a, e) => a + num(e.amount), 0)
    const amts = invoices.map(invoiceAmounts)
    const currentWorks = amts.reduce((a, x) => a + x.current, 0)
    const claimedDue = amts.reduce((a, x) => a + x.totalDue, 0)
    const received = invoices.filter((i) => i.status === 'received').reduce((a, i) => a + invoiceAmounts(i).totalDue, 0)
    return { budget, spent, currentWorks, claimedDue, received, claimGap: spent - currentWorks, outstanding: claimedDue - received }
  }, [ws, expenses, invoices])

  const spendByCat = useMemo(() => {
    const m = new Map()
    expenses.forEach((e) => { const c = cats.find((x) => x.id === e.category_id); const k = c?.name || 'Uncategorized'; const g = m.get(k) || { label: k, color: c?.color || '#9aa3b2', value: 0 }; g.value += num(e.amount); m.set(k, g) })
    return [...m.values()].sort((a, b) => b.value - a.value)
  }, [expenses, cats])

  const invByStatus = useMemo(() => INVOICE_STATUS.map((s) => ({
    label: s.en, color: s.c, value: invoices.filter((i) => i.status === s.k).reduce((a, i) => a + invoiceAmounts(i).totalDue, 0),
  })).filter((d) => d.value > 0), [invoices])

  const monthly = useMemo(() => monthlyData(expenses, invoices), [expenses, invoices])
  const cmpSeries = CMP_SERIES.filter((s) => cmpSel.includes(s.k)).map((s) => ({ name: s.name, color: s.color, values: monthly.labels.map((m) => monthly.data[s.k][m] || 0) }))

  const dynData = useMemo(() => buildDynamic(metric, groupBy, { expenses, invoices, cats }), [metric, groupBy, expenses, invoices, cats])
  const groupOptions = metric === 'spend' ? [['category', 'Category'], ['month', 'Month']] : [['status', 'Status'], ['month', 'Month']]
  useEffect(() => { if (!groupOptions.some(([k]) => k === groupBy)) setGroupBy(groupOptions[0][0]) }, [metric]) // eslint-disable-line

  if (loading) return <div className="spin" />
  const behind = totals.claimGap > 1

  return (
    <>
      <div className="list-head"><div><div className="crumb">{ws?.name} · project dashboard</div><h2>Dashboard</h2></div></div>

      <div className="kpi">
        <div className="c"><div className="v">{money(totals.budget)}</div><div className="l">Project budget</div></div>
        <div className="c"><div className="v">{money(totals.spent)}</div><div className="l">Spent (costs)</div></div>
        <div className="c"><div className="v">{money(totals.claimedDue)}</div><div className="l">Claimed (invoices)</div></div>
        <div className="c"><div className="v" style={{ color: 'var(--done)' }}>{money(totals.received)}</div><div className="l">Received</div></div>
      </div>

      <div className="card pad banner" style={{ borderColor: behind ? '#f3c5c7' : '#bbe7c8', background: behind ? '#fff5f5' : '#f1fbf4', marginBottom: 16 }}>
        <span style={{ fontSize: 24 }}>{behind ? '⚠️' : '✅'}</span>
        <div>
          <div style={{ fontWeight: 800, color: behind ? 'var(--danger)' : 'var(--done)' }}>
            {behind ? 'Behind on claiming from the owner' : 'Claims are keeping up with spend'}
          </div>
          <div style={{ color: 'var(--mut)', fontSize: 13, marginTop: 2 }}>
            Spent <b style={{ color: 'var(--ink)' }}>{money(totals.spent)}</b> vs invoiced works <b style={{ color: 'var(--ink)' }}>{money(totals.currentWorks)}</b>
            {behind ? <> — about <b style={{ color: 'var(--danger)' }}>{money(totals.claimGap)}</b> of spend isn't claimed yet.</> : <> — you've claimed for everything spent.</>}
          </div>
        </div>
        <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
          <div style={{ fontSize: 11, color: 'var(--mut)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.4px' }}>Outstanding</div>
          <div className="mono" style={{ fontWeight: 800, fontSize: 18, color: totals.outstanding > 0 ? 'var(--danger)' : 'var(--done)' }}>{money(totals.outstanding)}</div>
          <div style={{ fontSize: 11, color: 'var(--mut)' }}>claimed − received</div>
        </div>
      </div>

      <div className="dash-grid">
        <div className="card pad span2">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
            <h4 className="card-h" style={{ margin: 0 }}>Costs vs Invoices · by month</h4>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginLeft: 8 }}>
              {CMP_SERIES.map((s) => (
                <button key={s.k} className={'tagchip' + (cmpSel.includes(s.k) ? ' on' : '')}
                  onClick={() => toggleCmp(s.k)}
                  style={cmpSel.includes(s.k) ? { borderColor: s.color, color: s.color, background: s.color + '18' } : undefined}>
                  <span style={{ width: 8, height: 8, borderRadius: 2, background: s.color, display: 'inline-block', marginRight: 5 }} />{s.name}
                </button>
              ))}
            </div>
            <select className="dash-sel" value={cmpMode} onChange={(e) => setCmpMode(e.target.value)} style={{ marginLeft: 'auto' }}>
              <option value="bar">Grouped bars</option><option value="line">Lines</option>
            </select>
          </div>
          <MultiSeriesChart mode={cmpMode} labels={monthly.labels.map(monthLabel)} series={cmpSeries} fmt={(v) => 'SAR ' + sar2(v)} />
        </div>

        <div className="card pad">
          <h4 className="card-h">Spend by category</h4>
          <div className="pie-row"><PieChart data={spendByCat} /><Legend data={spendByCat} fmt={(v) => 'SAR ' + sar2(v)} /></div>
        </div>
        <div className="card pad">
          <h4 className="card-h">Invoices by status</h4>
          <div className="pie-row"><PieChart data={invByStatus} /><Legend data={invByStatus} fmt={(v) => 'SAR ' + sar2(v)} /></div>
        </div>
        <div className="card pad">
          <h4 className="card-h">Budget · Spent · Claimed · Received</h4>
          <BarChart fmt={(v) => sar2(v)} data={[
            { label: 'Budget', value: totals.budget, color: '#9aa3b2' },
            { label: 'Spent', value: totals.spent, color: '#e5484d' },
            { label: 'Claimed', value: totals.claimedDue, color: '#4f86ff' },
            { label: 'Received', value: totals.received, color: '#22c55e' },
          ]} />
        </div>

        <div className="card pad">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
            <h4 className="card-h" style={{ margin: 0 }}>Custom view</h4>
            <select className="dash-sel" value={metric} onChange={(e) => setMetric(e.target.value)}>
              <option value="spend">Spend</option>
              <option value="claimed">Claimed (total due)</option>
              <option value="received">Received</option>
              <option value="current_works">Invoiced works</option>
            </select>
            <span style={{ color: 'var(--mut)', fontSize: 12 }}>by</span>
            <select className="dash-sel" value={groupBy} onChange={(e) => setGroupBy(e.target.value)}>
              {groupOptions.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
            </select>
            <select className="dash-sel" value={chart} onChange={(e) => setChart(e.target.value)} style={{ marginLeft: 'auto' }}>
              <option value="pie">Pie</option><option value="bar">Bar</option>
            </select>
          </div>
          {chart === 'pie'
            ? <div className="pie-row"><PieChart data={dynData} /><Legend data={dynData} fmt={(v) => 'SAR ' + sar2(v)} /></div>
            : <BarChart data={dynData} fmt={(v) => sar2(v)} />}
        </div>
      </div>
    </>
  )
}

const CMP_SERIES = [
  { k: 'spent', name: 'Spent (costs)', color: '#e5484d' },
  { k: 'claimed', name: 'Claimed', color: '#4f86ff' },
  { k: 'received', name: 'Received', color: '#22c55e' },
  { k: 'works', name: 'Invoiced works', color: '#7B68EE' },
]
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const monthLabel = (m) => { const [y, mo] = m.split('-'); return `${MON[Number(mo) - 1]} ${String(y).slice(2)}` }

function monthlyData(expenses, invoices) {
  const months = new Set()
  const data = { spent: {}, claimed: {}, received: {}, works: {} }
  expenses.forEach((e) => { const m = String(e.spent_on || '').slice(0, 7); if (!m) return; months.add(m); data.spent[m] = (data.spent[m] || 0) + num(e.amount) })
  invoices.forEach((iv) => {
    const m = String(iv.invoice_date || '').slice(0, 7); if (!m) return; months.add(m)
    const a = invoiceAmounts(iv)
    data.claimed[m] = (data.claimed[m] || 0) + a.totalDue
    data.works[m] = (data.works[m] || 0) + a.current
    if (iv.status === 'received') data.received[m] = (data.received[m] || 0) + a.totalDue
  })
  return { labels: [...months].sort(), data }
}

function buildDynamic(metric, groupBy, { expenses, invoices, cats }) {
  const monthKey = (d) => (d || '').slice(0, 7) || '—'
  const m = new Map()
  const add = (label, color, value) => { const g = m.get(label) || { label, color, value: 0 }; g.value += value; if (color) g.color = color; m.set(label, g) }
  if (metric === 'spend') {
    expenses.forEach((e) => {
      if (groupBy === 'category') { const c = cats.find((x) => x.id === e.category_id); add(c?.name || 'Uncategorized', c?.color, num(e.amount)) }
      else add(monthKey(e.spent_on), null, num(e.amount))
    })
  } else {
    const valOf = (inv) => { const a = invoiceAmounts(inv); return metric === 'claimed' ? a.totalDue : metric === 'received' ? (inv.status === 'received' ? a.totalDue : 0) : a.current }
    invoices.forEach((inv) => {
      const v = valOf(inv); if (!v) return
      if (groupBy === 'status') { const s = invStatus(inv.status); add(s.en, s.c, v) }
      else add(monthKey(inv.invoice_date), null, v)
    })
  }
  const arr = [...m.values()]
  arr.forEach((g, i) => { if (!g.color) g.color = PALETTE[i % PALETTE.length] })
  return groupBy === 'month' ? arr.sort((a, b) => (a.label < b.label ? -1 : 1)) : arr.sort((a, b) => b.value - a.value)
}
