import { useEffect, useState, useCallback } from 'react'
import { useAuth } from '../auth'
import * as api from '../api'
import Modal from '../components/Modal'
import { CERT_STATUSES, certStOf, certAmounts, certNet, money, fmtDate, todayISO, MoneyInput } from '../components/Bits'

const abbr = (v) => {
  v = Number(v) || 0
  if (Math.abs(v) >= 1e6) return (v / 1e6).toFixed(Math.abs(v) >= 1e7 ? 0 : 1) + 'M'
  if (Math.abs(v) >= 1e3) return Math.round(v / 1e3) + 'K'
  return Math.round(v)
}
const num = (v) => (v === '' || v == null ? 0 : Number(v))
const sortKey = (c) => c.period_to || c.submitted_on || c.created_at || ''

export default function Invoices({ project, role, onChange }) {
  const { user } = useAuth()
  const [certs, setCerts] = useState([])
  const [expenses, setExpenses] = useState([])
  const [editing, setEditing] = useState(null)
  const [loading, setLoading] = useState(true)
  const canEdit = role === 'pm' || role === 'engineer'

  const load = useCallback(async () => {
    const [{ data: cs }, { data: es }] = await Promise.all([
      api.getCertificates(project.id),
      api.getExpenses(project.id),
    ])
    setCerts(cs || [])
    setExpenses(es || [])
    setLoading(false)
  }, [project.id])
  useEffect(() => { load() }, [load])

  if (loading) return <div className="spin" />

  const contract = Number(project.budget) || 0
  const sorted = [...certs].sort((a, b) => (sortKey(a) < sortKey(b) ? -1 : 1))
  const amt = certs.map((c) => certAmounts(c))

  const totalGross = certs.reduce((a, c) => a + num(c.gross_amount), 0)
  const totalNet = amt.reduce((a, x) => a + x.net, 0)
  const paidNet = certs.filter((c) => c.status === 'paid').reduce((a, c) => a + certNet(c), 0)
  const totalSpent = expenses.reduce((a, e) => a + num(e.amount), 0)
  const totalRetention = amt.reduce((a, x) => a + x.retention, 0)
  const totalAdvance = amt.reduce((a, x) => a + x.advance, 0)
  const totalTax = amt.reduce((a, x) => a + x.tax, 0)
  const totalDiscount = amt.reduce((a, x) => a + x.discount, 0)

  const billedPct = contract ? totalGross / contract * 100 : 0
  const spentPct = contract ? totalSpent / contract * 100 : 0
  const collectedPct = contract ? paidNet / contract * 100 : 0
  const latest = sorted[sorted.length - 1]
  const actualProgress = latest ? num(latest.progress_pct) : 0
  const billingGap = actualProgress - billedPct
  const underBilled = Math.max(0, billingGap / 100 * contract)
  const behind = billingGap > 1
  const cashGap = paidNet - totalSpent

  const points = sorted.map((c, i) => {
    const billed = sorted.slice(0, i + 1).reduce((a, x) => a + num(x.gross_amount), 0)
    const upto = sortKey(c)
    const spent = expenses.filter((e) => (e.spent_on || '') <= upto).reduce((a, e) => a + num(e.amount), 0)
    return { label: '#' + c.seq, billed, spent }
  })

  return (
    <>
      <div style={{ display: 'flex', marginBottom: 16, alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <h3 style={{ fontSize: 18 }}>Invoices <span style={{ color: 'var(--mut)', fontWeight: 600 }}>المستخلصات</span></h3>
        <span style={{ color: 'var(--mut)', fontSize: 13 }}>· {certs.length} invoice{certs.length === 1 ? '' : 's'} · {money(totalGross)} billed of {money(contract)} contract</span>
        {canEdit && <button className="btn" style={{ marginLeft: 'auto' }} onClick={() => setEditing({ seq: (certs.reduce((m, c) => Math.max(m, c.seq || 0), 0) + 1) })}>+ New invoice</button>}
      </div>

      <div className="kpi">
        <div className="c"><div className="v">{money(contract)}</div><div className="l">Contract value</div></div>
        <div className="c accent"><div className="v">{Math.round(billedPct)}%</div><div className="l">Billed · {money(totalGross)}</div></div>
        <div className="c"><div className="v" style={{ color: 'var(--done)' }}>{money(paidNet)}</div><div className="l">Collected (مصروف)</div></div>
        <div className="c"><div className="v" style={{ color: 'var(--ink)' }}>{money(totalSpent)}</div><div className="l">Spent (expenses)</div></div>
      </div>

      <div className="card" style={{ padding: 16, marginBottom: 18, display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap',
        borderColor: behind ? '#fecdd3' : '#bbf7d0', background: behind ? '#fff5f6' : '#f0fdf6' }}>
        <span style={{ fontSize: 26 }}>{behind ? '⚠️' : '✅'}</span>
        <div>
          <div style={{ fontWeight: 800, fontFamily: 'Sora', color: behind ? 'var(--crit)' : 'var(--done)' }}>
            {behind ? 'Behind on billing — متأخر في الفوترة' : 'Billing in line with progress — الفوترة متوافقة مع الإنجاز'}
          </div>
          <div style={{ color: 'var(--mut)', fontSize: 13, marginTop: 3 }}>
            Actual progress <b style={{ color: 'var(--ink)' }}>{actualProgress.toFixed(0)}%</b> vs billed <b style={{ color: 'var(--ink)' }}>{billedPct.toFixed(0)}%</b>
            {behind
              ? <> — about <b style={{ color: 'var(--crit)' }}>{money(underBilled)}</b> of completed work is not yet invoiced.</>
              : <> — you have invoiced for all completed work.</>}
          </div>
        </div>
        <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
          <div style={{ fontSize: 11, color: 'var(--mut)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.4px' }}>Cash position</div>
          <div className="mono" style={{ fontWeight: 800, fontSize: 18, color: cashGap < 0 ? 'var(--crit)' : 'var(--done)' }}>
            {cashGap < 0 ? '−' : '+'}{money(Math.abs(cashGap))}
          </div>
          <div style={{ fontSize: 11, color: 'var(--mut)' }}>collected − spent</div>
        </div>
      </div>

      <div className="costgrid" style={{ marginBottom: 18 }}>
        <div className="card" style={{ padding: 18 }}>
          <h4 style={{ fontSize: 15, marginBottom: 4 }}>Cumulative billed vs. spent</h4>
          <div style={{ color: 'var(--mut)', fontSize: 12, marginBottom: 10 }}>Across invoice periods</div>
          {points.length ? <TrendChart points={points} /> : <Hint text="Add invoices to see the trend." />}
          <div style={{ display: 'flex', gap: 18, marginTop: 10, fontSize: 12, fontWeight: 600 }}>
            <span><span style={{ color: 'var(--blue)' }}>■</span> Billed (cumulative)</span>
            <span><span style={{ color: 'var(--crit)' }}>■</span> Spent (cumulative)</span>
          </div>
        </div>

        <div className="card" style={{ padding: 18 }}>
          <h4 style={{ fontSize: 15, marginBottom: 12 }}>Progress vs. money (% of contract)</h4>
          <CompareBar label="Actual progress" pct={actualProgress} color="var(--indigo)" />
          <CompareBar label="Billed" pct={billedPct} color="var(--blue)" />
          <CompareBar label="Collected" pct={collectedPct} color="var(--done)" />
          <CompareBar label="Spent" pct={spentPct} color="var(--crit)" />

          <div style={{ borderTop: '1px solid var(--line)', marginTop: 14, paddingTop: 12 }}>
            <h4 style={{ fontSize: 13, marginBottom: 8, color: 'var(--mut)' }}>Totals across all invoices</h4>
            {totalDiscount > 0 && <DedRow label="Discount" v={totalDiscount} />}
            <DedRow label="Retention held (محتجز الضمان)" v={totalRetention} />
            <DedRow label="Advance recovered (استرداد الدفعة)" v={totalAdvance} />
            <DedRow label="VAT (الضريبة)" v={totalTax} />
            <div style={{ display: 'flex', fontWeight: 700, marginTop: 6, paddingTop: 8, borderTop: '1px solid var(--line)' }}>
              <span>Net of all invoices</span><span className="mono" style={{ marginLeft: 'auto' }}>{money(totalNet)}</span>
            </div>
          </div>
        </div>
      </div>

      {sorted.length ? (
        <table className="tbl">
          <thead><tr>
            <th>#</th><th>Period</th><th>Progress</th><th>Work value</th><th>Deductions</th><th>VAT</th><th>Net payable</th><th>Status</th><th>Date</th>
          </tr></thead>
          <tbody>
            {sorted.map((c) => {
              const s = certStOf(c.status)
              const a = certAmounts(c)
              const ded = a.discount + a.retention + a.advance + a.other
              return (
                <tr key={c.id} onClick={() => canEdit && setEditing(c)}>
                  <td className="id">{c.seq}{c.title ? <span style={{ color: 'var(--mut)', fontWeight: 400 }}> · {c.title}</span> : ''}</td>
                  <td className="mono" style={{ fontSize: 12 }}>{fmtDate(c.period_from)} – {fmtDate(c.period_to)}</td>
                  <td className="mono">{num(c.progress_pct).toFixed(0)}%</td>
                  <td className="mono">{money(a.gross)}</td>
                  <td className="mono" style={{ color: 'var(--mut)' }}>−{money(ded)}</td>
                  <td className="mono" style={{ color: 'var(--done)' }}>+{money(a.tax)}</td>
                  <td className="mono" style={{ fontWeight: 700 }}>{money(a.net)}</td>
                  <td><span className={'chip ' + s.cls}><span className="d" style={{ background: s.c }} />{s.n}</span></td>
                  <td className="mono" style={{ fontSize: 12, color: c.status === 'paid' ? 'var(--done)' : 'inherit' }}>
                    {c.status === 'paid' ? (fmtDate(c.paid_on) + ' ✓') : fmtDate(c.submitted_on)}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      ) : (
        <div className="empty"><div className="ic">🧾</div><p>No invoices yet.</p>
          {canEdit && <button className="btn" onClick={() => setEditing({ seq: 1 })}>+ Create first invoice</button>}</div>
      )}

      {editing && <CertModal cert={editing} project={project} userId={user.id}
        onClose={() => setEditing(null)} onSaved={() => { setEditing(null); load(); onChange && onChange() }} />}
    </>
  )
}

const Hint = ({ text }) => <div style={{ color: 'var(--mut)', fontSize: 13, padding: '30px 0', textAlign: 'center' }}>{text}</div>

function DedRow({ label, v }) {
  return (
    <div style={{ display: 'flex', fontSize: 12.5, margin: '5px 0', color: 'var(--ink2)' }}>
      <span>{label}</span><span className="mono" style={{ marginLeft: 'auto' }}>{money(v)}</span>
    </div>
  )
}

function CompareBar({ label, pct, color }) {
  const p = Math.max(0, Number(pct) || 0)
  return (
    <div style={{ margin: '11px 0' }}>
      <div style={{ display: 'flex', fontSize: 12.5, fontWeight: 600 }}>
        <span>{label}</span><span className="mono" style={{ marginLeft: 'auto' }}>{p.toFixed(0)}%</span>
      </div>
      <div className="bar" style={{ marginTop: 5 }}><i style={{ width: Math.min(p, 100) + '%', background: color }} /></div>
    </div>
  )
}

function TrendChart({ points }) {
  const W = 600, H = 230, P = { l: 52, r: 14, t: 14, b: 26 }
  const iw = W - P.l - P.r, ih = H - P.t - P.b
  const maxY = Math.max(1, ...points.flatMap((p) => [p.billed, p.spent]))
  const n = points.length
  const x = (i) => (n === 1 ? P.l + iw / 2 : P.l + (i / (n - 1)) * iw)
  const y = (v) => P.t + ih - (v / maxY) * ih
  const base = P.t + ih
  const line = (key) => points.map((p, i) => (i ? 'L' : 'M') + x(i).toFixed(1) + ' ' + y(p[key]).toFixed(1)).join(' ')
  const fill = (key) => n === 1 ? '' : `M${x(0)} ${base} ` + points.map((p, i) => `L${x(i).toFixed(1)} ${y(p[key]).toFixed(1)}`).join(' ') + ` L${x(n - 1)} ${base} Z`
  const ticks = [0, 0.25, 0.5, 0.75, 1]
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto' }}>
      {ticks.map((t) => {
        const gy = P.t + ih - t * ih
        return (
          <g key={t}>
            <line x1={P.l} y1={gy} x2={W - P.r} y2={gy} stroke="var(--line)" strokeWidth="1" />
            <text x={P.l - 8} y={gy + 3.5} textAnchor="end" fontSize="10" fill="var(--mut)" fontFamily="JetBrains Mono">{abbr(maxY * t)}</text>
          </g>
        )
      })}
      <path d={fill('billed')} fill="rgba(37,99,235,.10)" />
      <path d={line('spent')} fill="none" stroke="var(--crit)" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
      <path d={line('billed')} fill="none" stroke="var(--blue)" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
      {points.map((p, i) => (
        <g key={i}>
          <circle cx={x(i)} cy={y(p.spent)} r="3" fill="var(--crit)" />
          <circle cx={x(i)} cy={y(p.billed)} r="3" fill="var(--blue)" />
          <text x={x(i)} y={H - 8} textAnchor="middle" fontSize="10" fill="var(--mut)" fontFamily="JetBrains Mono">{p.label}</text>
        </g>
      ))}
    </svg>
  )
}

function CertModal({ cert, project, userId, onClose, onSaved }) {
  const isNew = !cert.id
  const [f, setF] = useState({
    seq: cert.seq || 1,
    title: cert.title || '',
    status: cert.status || 'draft',
    period_from: cert.period_from || '',
    period_to: cert.period_to || '',
    submitted_on: cert.submitted_on || todayISO(),
    progress_pct: cert.progress_pct ?? '',
    gross_amount: cert.gross_amount ?? '',
    discount_pct: cert.discount_pct ?? 0,
    retention_pct: cert.retention_pct ?? 10,
    advance_pct: cert.advance_pct ?? 0,
    other_deduction: cert.other_deduction ?? '',
    tax_pct: cert.tax_pct ?? 15,
    paid_on: cert.paid_on || '',
    notes: cert.notes || '',
  })
  const [busy, setBusy] = useState(false)
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value })
  const a = certAmounts(f)

  async function save() {
    if (!num(f.gross_amount)) return alert('Enter the work value (إجمالي قيمة الأعمال).')
    setBusy(true)
    const payload = {
      project_id: project.id, seq: parseInt(f.seq, 10) || 1, title: f.title.trim() || null, status: f.status,
      period_from: f.period_from || null, period_to: f.period_to || null,
      submitted_on: f.submitted_on || null,
      progress_pct: num(f.progress_pct), gross_amount: num(f.gross_amount),
      discount_pct: num(f.discount_pct), retention_pct: num(f.retention_pct),
      advance_pct: num(f.advance_pct), other_deduction: num(f.other_deduction), tax_pct: num(f.tax_pct),
      paid_on: f.status === 'paid' ? (f.paid_on || todayISO()) : (f.paid_on || null),
      notes: f.notes.trim() || null,
    }
    const { error } = isNew
      ? await api.createCertificate({ ...payload, created_by: userId })
      : await api.updateCertificate(cert.id, payload)
    setBusy(false)
    if (error) return alert(error.message)
    onSaved()
  }
  async function remove() {
    if (!confirm('Delete this invoice?')) return
    await api.deleteCertificate(cert.id); onSaved()
  }

  const pctField = (k, label) => (
    <div className="field"><label>{label}</label>
      <div style={{ position: 'relative' }}>
        <input type="number" value={f[k]} onChange={set(k)} placeholder="0" style={{ paddingRight: 28 }} />
        <span style={{ position: 'absolute', right: 11, top: 10, color: 'var(--mut)', fontSize: 13 }}>%</span>
      </div>
    </div>
  )

  return (
    <Modal wide kicker={isNew ? 'NEW INVOICE' : 'INVOICE #' + cert.seq} title={isNew ? 'New invoice — مستخلص جديد' : 'Edit invoice'} onClose={onClose}>
      <div className="row2">
        <div className="field"><label>Invoice no. (رقم المستخلص)</label><input type="number" value={f.seq} onChange={set('seq')} /></div>
        <div className="field"><label>Status (الحالة)</label>
          <select value={f.status} onChange={set('status')}>{CERT_STATUSES.map((s) => <option key={s.k} value={s.k}>{s.n} — {s.ar}</option>)}</select></div>
      </div>
      <div className="field"><label>Label (optional)</label><input value={f.title} onChange={set('title')} placeholder="e.g. Interim Payment 1" /></div>

      <div className="row2">
        <div className="field"><label>Period from</label><input type="date" value={f.period_from} onChange={set('period_from')} /></div>
        <div className="field"><label>Period to</label><input type="date" value={f.period_to} onChange={set('period_to')} /></div>
      </div>
      <div className="row2">
        <div className="field"><label>Submitted on (تاريخ التقديم)</label><input type="date" value={f.submitted_on} onChange={set('submitted_on')} /></div>
        <div className="field"><label>Actual progress % (نسبة الإنجاز)</label><input type="number" value={f.progress_pct} onChange={set('progress_pct')} placeholder="0" /></div>
      </div>

      <div className="field"><label>Work value — قيمة الأعمال المنفذة (SAR)</label>
        <MoneyInput value={f.gross_amount} onChange={(v) => setF({ ...f, gross_amount: v })} placeholder="0" /></div>

      <div className="row2">
        {pctField('discount_pct', 'Discount %')}
        {pctField('retention_pct', 'Retention % — محتجز الضمان')}
      </div>
      <div className="row2">
        {pctField('advance_pct', 'Advance recovery % — استرداد الدفعة')}
        {pctField('tax_pct', 'VAT % — الضريبة')}
      </div>
      <div className="field"><label>Other deductions (flat SAR) — خصومات/غرامات</label>
        <MoneyInput value={f.other_deduction} onChange={(v) => setF({ ...f, other_deduction: v })} placeholder="0" /></div>

      {/* live construction breakdown */}
      <div style={{ background: 'var(--bg2)', border: '1px solid var(--line)', borderRadius: 10, padding: '12px 14px', fontSize: 13 }}>
        <BreakRow label="Work value" v={a.gross} />
        {a.discount > 0 && <BreakRow label={`− Discount (${num(f.discount_pct)}%)`} v={-a.discount} />}
        <BreakRow label="Certified value (taxable)" v={a.base} strong />
        <BreakRow label={`− Retention (${num(f.retention_pct)}%)`} v={-a.retention} />
        <BreakRow label={`− Advance recovery (${num(f.advance_pct)}%)`} v={-a.advance} />
        {a.other > 0 && <BreakRow label="− Other deductions" v={-a.other} />}
        <BreakRow label={`+ VAT (${num(f.tax_pct)}%)`} v={a.tax} />
        <div style={{ borderTop: '1px solid var(--line)', marginTop: 8, paddingTop: 8, display: 'flex', alignItems: 'center' }}>
          <span style={{ fontWeight: 800, fontFamily: 'Sora' }}>Net payable — الصافي المستحق</span>
          <span className="mono" style={{ marginLeft: 'auto', fontWeight: 800, fontSize: 18, color: a.net < 0 ? 'var(--crit)' : 'var(--blue)' }}>{money(a.net)}</span>
        </div>
      </div>

      {f.status === 'paid' && (
        <div className="field"><label>Paid / disbursed on — تاريخ الصرف</label><input type="date" value={f.paid_on || todayISO()} onChange={set('paid_on')} /></div>
      )}
      <div className="field"><label>Notes</label><textarea rows={2} value={f.notes} onChange={set('notes')} placeholder="Optional" /></div>

      <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
        <button className="btn" onClick={save} disabled={busy}>{isNew ? 'Create invoice' : 'Save'}</button>
        {!isNew && <button className="btn danger" onClick={remove}>Delete</button>}
        <button className="btn ghost" style={{ marginLeft: 'auto' }} onClick={onClose}>Cancel</button>
      </div>
    </Modal>
  )
}

function BreakRow({ label, v, strong }) {
  return (
    <div style={{ display: 'flex', margin: '4px 0', fontWeight: strong ? 700 : 400, color: strong ? 'var(--ink)' : 'var(--ink2)' }}>
      <span>{label}</span>
      <span className="mono" style={{ marginLeft: 'auto', color: v < 0 ? 'var(--crit)' : 'inherit' }}>{v < 0 ? '−' : ''}{money(Math.abs(v))}</span>
    </div>
  )
}
