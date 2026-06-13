import { useEffect, useState, useCallback } from 'react'
import { useAuth } from '../auth'
import { useWorkspace } from '../workspace'
import * as api from '../api'
import Modal from '../components/Modal'
import { num, MoneyInput, fmtDate, todayISO } from '../components/Bits'
import { invoiceAmounts, INVOICE_STATUS, invStatus } from '../finance'

const fmt2 = (v) => (Number(v) || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

export default function InvoicesPage() {
  const { user } = useAuth()
  const { ws } = useWorkspace()
  const [invoices, setInvoices] = useState([])
  const [editing, setEditing] = useState(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => { if (!ws) return; const { data } = await api.getInvoices(ws.id); setInvoices(data || []); setLoading(false) }, [ws])
  useEffect(() => { load() }, [load])

  if (loading) return <div className="spin" />
  const amts = invoices.map(invoiceAmounts)
  const totalClaimed = amts.reduce((a, x) => a + x.totalDue, 0)
  const received = invoices.filter((i) => i.status === 'received').reduce((a, i) => a + invoiceAmounts(i).totalDue, 0)
  const outstanding = totalClaimed - received

  return (
    <>
      <div className="list-head">
        <div><div className="crumb">Invoices · المستخلصات · claims to the owner</div><h2>Invoices <span style={{ color: 'var(--mut)', fontWeight: 600, fontSize: 18 }}>فاتورة</span></h2></div>
        <button className="btn" style={{ marginLeft: 'auto' }} onClick={() => setEditing({ seq: invoices.reduce((m, i) => Math.max(m, i.seq || 0), 0) + 1 })}>+ Invoice</button>
      </div>

      <div className="kpi">
        <div className="c"><div className="v">SAR {fmt2(totalClaimed)}</div><div className="l">Total claimed</div></div>
        <div className="c"><div className="v" style={{ color: 'var(--done)' }}>SAR {fmt2(received)}</div><div className="l">Received</div></div>
        <div className="c"><div className="v" style={{ color: outstanding > 0 ? 'var(--danger)' : 'var(--ink)' }}>SAR {fmt2(outstanding)}</div><div className="l">Outstanding</div></div>
        <div className="c"><div className="v">{invoices.length}</div><div className="l">Invoices</div></div>
      </div>

      {invoices.length ? (
        <table className="tbl">
          <thead><tr><th>#</th><th>Title</th><th>Date</th><th>Current works</th><th>Net before VAT</th><th>Total due</th><th>Status</th></tr></thead>
          <tbody>
            {invoices.map((inv) => {
              const a = invoiceAmounts(inv), s = invStatus(inv.status)
              return (
                <tr key={inv.id} onClick={() => setEditing(inv)}>
                  <td className="mono" style={{ fontWeight: 700 }}>{inv.seq}</td>
                  <td>{inv.title || '—'}</td>
                  <td className="mono" style={{ fontSize: 12 }}>{fmtDate(inv.invoice_date)}</td>
                  <td className="mono">{fmt2(a.current)}</td>
                  <td className="mono">{fmt2(a.netBeforeVat)}</td>
                  <td className="mono" style={{ fontWeight: 700 }}>{fmt2(a.totalDue)}</td>
                  <td><span className="inv-chip" style={{ background: s.c + '22', color: s.c }}>{s.en} · {s.ar}</span></td>
                </tr>
              )
            })}
          </tbody>
        </table>
      ) : (
        <div className="empty"><div className="ic">🧾</div><p>No invoices yet.</p>
          <button className="btn" onClick={() => setEditing({ seq: 1 })}>+ Create first invoice</button></div>
      )}

      {editing && <InvoiceModal inv={editing} wsId={ws.id} userId={user.id} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); load() }} />}
    </>
  )
}

function InvoiceModal({ inv, wsId, userId, onClose, onSaved }) {
  const isNew = !inv.id
  const [f, setF] = useState({
    seq: inv.seq || 1, title: inv.title || '', invoice_date: inv.invoice_date || todayISO(),
    contract_total: inv.contract_total ?? '', work_to_date: inv.work_to_date ?? '', previous_works: inv.previous_works ?? '',
    advance_pct: inv.advance_pct ?? 15, retention_works_pct: inv.retention_works_pct ?? 5,
    retention_final_pct: inv.retention_final_pct ?? 5, vat_pct: inv.vat_pct ?? 15,
    status: inv.status || 'draft', received_on: inv.received_on || '', notes: inv.notes || '',
  })
  const [busy, setBusy] = useState(false)
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value })
  const a = invoiceAmounts(f)

  const rows = [
    { ar: 'القيمة الكلية للعقد (رس)', en: 'Total contract value', v: a.contract },
    { ar: 'قيمة الأعمال حتى تاريخه (رس)', en: 'Works value to date', v: a.toDate },
    { ar: 'الأعمال المنفذة سابقاً', en: 'Previously executed works', v: a.prev },
    { ar: 'الأعمال للمستخلص الحالي', en: 'Current certificate works', v: a.current, strong: true },
    { ar: `خصم نسبة الدفعة المقدمة ${num(f.advance_pct)}%`, en: 'Advance payment deduction', v: -a.advance },
    { ar: `خصم ${num(f.retention_works_pct)}% ضمان أعمال`, en: 'Works retention', v: -a.retWorks },
    { ar: `خصم ${num(f.retention_final_pct)}% ضمان نهائي`, en: 'Final retention', v: -a.retFinal },
    { ar: `اجمالي المستحق صرفه بدون الضريبة المضافة (VAT ${num(f.vat_pct)}%)`, en: 'Total due before VAT', v: a.netBeforeVat, strong: true },
    { ar: `قيمة الضريبة المضافة (VAT ${num(f.vat_pct)}%)`, en: 'VAT amount', v: a.vat },
    { ar: 'إجمالي المستحق صرفه (رس)', en: 'Total amount due', v: a.totalDue, total: true },
  ]

  async function save() {
    setBusy(true)
    const payload = {
      workspace_id: wsId, seq: parseInt(f.seq, 10) || 1, title: f.title.trim() || null, invoice_date: f.invoice_date || null,
      contract_total: num(f.contract_total), work_to_date: num(f.work_to_date), previous_works: num(f.previous_works),
      advance_pct: num(f.advance_pct), retention_works_pct: num(f.retention_works_pct),
      retention_final_pct: num(f.retention_final_pct), vat_pct: num(f.vat_pct),
      status: f.status, received_on: f.status === 'received' ? (f.received_on || todayISO()) : (f.received_on || null), notes: f.notes.trim() || null,
    }
    const { error } = isNew ? await api.createInvoice({ ...payload, created_by: userId }) : await api.updateInvoice(inv.id, payload)
    setBusy(false); if (error) return alert(error.message); onSaved()
  }
  async function remove() { if (confirm('Delete this invoice?')) { await api.deleteInvoice(inv.id); onSaved() } }

  const pctField = (k, label) => (
    <div className="field"><label>{label}</label>
      <div style={{ position: 'relative' }}><input type="number" value={f[k]} onChange={set(k)} style={{ paddingRight: 26 }} /><span style={{ position: 'absolute', right: 10, top: 9, color: 'var(--mut)' }}>%</span></div>
    </div>
  )

  return (
    <Modal wide kicker={isNew ? 'NEW INVOICE · فاتورة' : 'INVOICE #' + inv.seq} title="Invoice · فاتورة" onClose={onClose}>
      <div className="row2">
        <div className="field"><label>Invoice no.</label><input type="number" value={f.seq} onChange={set('seq')} /></div>
        <div className="field"><label>Status</label>
          <select value={f.status} onChange={set('status')}>{INVOICE_STATUS.map((s) => <option key={s.k} value={s.k}>{s.en} · {s.ar}</option>)}</select></div>
      </div>
      <div className="row2">
        <div className="field"><label>Title (optional)</label><input value={f.title} onChange={set('title')} placeholder="e.g. Certificate 7 / Special Supplies" /></div>
        <div className="field"><label>Date</label><input type="date" value={f.invoice_date} onChange={set('invoice_date')} /></div>
      </div>

      <div className="row2">
        <div className="field"><label>Total contract value · القيمة الكلية للعقد</label><MoneyInput decimals value={f.contract_total} onChange={(v) => setF({ ...f, contract_total: v })} placeholder="0" /></div>
        <div className="field"><label>Works value to date · قيمة الأعمال حتى تاريخه</label><MoneyInput decimals value={f.work_to_date} onChange={(v) => setF({ ...f, work_to_date: v })} placeholder="0" /></div>
      </div>
      <div className="field"><label>Previously executed works · الأعمال المنفذة سابقاً</label><MoneyInput decimals value={f.previous_works} onChange={(v) => setF({ ...f, previous_works: v })} placeholder="0" /></div>

      <div className="row2">
        {pctField('advance_pct', 'Advance deduction % · الدفعة المقدمة')}
        {pctField('vat_pct', 'VAT % · الضريبة')}
      </div>
      <div className="row2">
        {pctField('retention_works_pct', 'Works retention % · ضمان أعمال')}
        {pctField('retention_final_pct', 'Final retention % · ضمان نهائي')}
      </div>

      {/* bilingual certificate preview — same sequence as a real مستخلص */}
      <div className="inv-doc">
        <div className="inv-doc-h">فاتورة ضريبية · Tax Invoice</div>
        <div className="inv-doc-note">نأمل من سعادتكم صرف مبلغ وقدره ({fmt2(a.totalDue)}) ريال سعودي حسب الجدول التالي · Kindly disburse SAR {fmt2(a.totalDue)} per the schedule below:</div>
        <table className="inv-table">
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className={(r.strong ? 'strong ' : '') + (r.total ? 'total' : '')}>
                <td className="lbl"><span className="ar">{r.ar}</span><span className="en">{r.en}</span></td>
                <td className="val mono" style={{ color: r.v < 0 ? 'var(--danger)' : 'inherit' }}>{r.v < 0 ? '-' : ''}{fmt2(Math.abs(r.v))}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {f.status === 'received' && <div className="field"><label>Received on · تاريخ التحصيل</label><input type="date" value={f.received_on || todayISO()} onChange={set('received_on')} /></div>}
      <div className="field"><label>Notes</label><textarea rows={2} value={f.notes} onChange={set('notes')} placeholder="Optional" /></div>

      <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
        <button className="btn" onClick={save} disabled={busy}>{isNew ? 'Create invoice' : 'Save'}</button>
        {!isNew && <button className="btn danger" onClick={remove}>Delete</button>}
        <button className="btn ghost" style={{ marginLeft: 'auto' }} onClick={onClose}>Close</button>
      </div>
    </Modal>
  )
}
