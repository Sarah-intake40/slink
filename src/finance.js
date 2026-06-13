// Construction invoice (مستخلص) math — matches the standard Saudi payment
// certificate layout. Percentages apply to the CURRENT works, and VAT is on
// (current works − advance recovery), as on a real certificate.
const n = (v) => Number(v) || 0
const pct = (v) => n(v) / 100

export function invoiceAmounts(inv) {
  const contract = n(inv.contract_total)
  const toDate = n(inv.work_to_date)
  const prev = n(inv.previous_works)
  const current = toDate - prev                              // الأعمال للمستخلص الحالي
  const advance = pct(inv.advance_pct) * current             // خصم الدفعة المقدمة
  const retWorks = pct(inv.retention_works_pct) * current    // ضمان أعمال
  const retFinal = pct(inv.retention_final_pct) * current    // ضمان نهائي
  const netBeforeVat = current - advance - retWorks - retFinal
  const vatBase = current - advance
  const vat = pct(inv.vat_pct) * vatBase
  const totalDue = netBeforeVat + vat
  return { contract, toDate, prev, current, advance, retWorks, retFinal, netBeforeVat, vatBase, vat, totalDue }
}

// Bilingual row layout in the exact sequence of the certificate.
export const INVOICE_STATUS = [
  { k: 'draft',     ar: 'مسودة',  en: 'Draft',     c: 'var(--mut2)' },
  { k: 'submitted', ar: 'مقدّم',   en: 'Submitted', c: '#4f86ff' },
  { k: 'approved',  ar: 'معتمد',   en: 'Approved',  c: '#f9a825' },
  { k: 'received',  ar: 'محصّل',   en: 'Received',  c: '#22c55e' },
]
export const invStatus = (k) => INVOICE_STATUS.find((s) => s.k === k) || INVOICE_STATUS[0]
