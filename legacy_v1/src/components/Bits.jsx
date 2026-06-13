// Shared constants + small UI helpers used across the app

export const STATUSES = [
  { k: 'not',  n: 'Not Started', c: 'var(--not)',  cls: 'st-not'  },
  { k: 'prog', n: 'In Progress', c: 'var(--prog)', cls: 'st-prog' },
  { k: 'hold', n: 'On Hold',     c: 'var(--hold)', cls: 'st-hold' },
  { k: 'insp', n: 'Inspection',  c: 'var(--insp)', cls: 'st-insp' },
  { k: 'done', n: 'Complete',    c: 'var(--done)', cls: 'st-done' },
]
export const stOf = (k) => STATUSES.find((s) => s.k === k) || STATUSES[0]

export const PRIORITIES = [
  { k: 'low',  n: 'Low',      cls: 'pr-low'  },
  { k: 'med',  n: 'Medium',   cls: 'pr-med'  },
  { k: 'high', n: 'High',     cls: 'pr-high' },
  { k: 'crit', n: 'Critical', cls: 'pr-crit' },
]
export const prOf = (k) => PRIORITIES.find((p) => p.k === k) || PRIORITIES[1]

export const CATEGORIES = [
  { k: 'labor',         n: 'Labor',         c: '#2563eb' },
  { k: 'materials',     n: 'Materials',     c: '#0ea5e9' },
  { k: 'equipment',     n: 'Equipment',     c: '#6366f1' },
  { k: 'subcontractor', n: 'Subcontractor', c: '#0891b2' },
  { k: 'other',         n: 'Other',         c: '#94a3b8' },
]
export const catOf = (k) => CATEGORIES.find((c) => c.k === k) || CATEGORIES[4]

// Default categories seeded into a new project (name + colour). Editable afterwards.
export const DEFAULT_CATEGORIES = [
  { name: 'Labor',         color: '#2563eb' },
  { name: 'Materials',     color: '#0ea5e9' },
  { name: 'Equipment',     color: '#6366f1' },
  { name: 'Subcontractor', color: '#0891b2' },
  { name: 'Other',         color: '#94a3b8' },
]

// How an expense's rate is applied. `flat` = plain amount, no calculator.
export const RATE_BASES = [
  { k: 'flat', n: 'Flat amount',  hint: 'enter the total directly' },
  { k: 'unit', n: 'Per unit',     hint: 'quantity × rate' },
  { k: 'day',  n: 'Per day',      hint: 'quantity × daily rate' },
  { k: 'hour', n: 'Per hour',     hint: 'quantity × hourly rate × hours' },
]
// Compute an expense total from its breakdown.
// hour: qty × rate × hours · unit/day: qty × rate · flat: the stored amount.
export function expenseAmount({ rate_basis, quantity, rate, hours, amount }) {
  const q = Number(quantity) || 0, r = Number(rate) || 0, h = Number(hours) || 0
  if (rate_basis === 'hour') return q * r * h
  if (rate_basis === 'unit' || rate_basis === 'day') return q * r
  return Number(amount) || 0
}

// Payment-certificate (المستخلص) lifecycle. `ar` shown alongside the English label.
export const CERT_STATUSES = [
  { k: 'draft',     n: 'Draft',        ar: 'تحت التحضير', c: 'var(--not)',  cls: 'st-not'  },
  { k: 'submitted', n: 'Submitted',    ar: 'مقدّم',        c: 'var(--prog)', cls: 'st-prog' },
  { k: 'review',    n: 'Under Review', ar: 'تحت المراجعة', c: 'var(--hold)', cls: 'st-hold' },
  { k: 'approved',  n: 'Approved',     ar: 'معتمد',        c: 'var(--insp)', cls: 'st-insp' },
  { k: 'paid',      n: 'Paid',         ar: 'مصروف',        c: 'var(--done)', cls: 'st-done' },
]
export const certStOf = (k) => CERT_STATUSES.find((s) => s.k === k) || CERT_STATUSES[0]
// Construction-invoice breakdown — deductions are PERCENTAGES of the work value.
//   work value (gross)
//   − discount        (discount_pct % of gross)
//   = certified value (base)        ← taxable supply
//   − retention       (retention_pct % of base)   محتجز الضمان
//   − advance recovery(advance_pct  % of base)     استرداد الدفعة المقدمة
//   − other deduction (flat penalty/back-charge)
//   + VAT             (tax_pct % of base)
//   = net payable
export function certAmounts(c) {
  const pct = (v) => (Number(v) || 0) / 100
  const gross = Number(c.gross_amount) || 0
  const discount = pct(c.discount_pct) * gross
  const base = gross - discount
  const retention = pct(c.retention_pct) * base
  const advance = pct(c.advance_pct) * base
  const other = Number(c.other_deduction) || 0
  const tax = pct(c.tax_pct) * base
  const net = base - retention - advance - other + tax
  return { gross, discount, base, retention, advance, other, tax, net }
}
export const certNet = (c) => certAmounts(c).net

export const RECORD_KINDS = [
  { k: 'rfi',        n: 'RFIs',        single: 'RFI',         prefix: 'RFI' },
  { k: 'submittal',  n: 'Submittals',  single: 'Submittal',   prefix: 'SUB' },
  { k: 'inspection', n: 'Inspections', single: 'Inspection',  prefix: 'INS' },
  { k: 'punch',      n: 'Punch List',  single: 'Punch Item',  prefix: 'PUN' },
  { k: 'log',        n: 'Daily Logs',  single: 'Log',         prefix: 'LOG' },
  { k: 'issue',      n: 'Issues',      single: 'Issue',       prefix: 'ISS' },
]

export const ROLE_LABEL = { pm: 'Project Manager', engineer: 'Site Engineer', sub: 'Subcontractor', client: 'Client' }

// Custom task-field types (the ClickUp-style "add your own attribute" set)
export const FIELD_TYPES = [
  { k: 'text',        n: 'Text' },
  { k: 'number',      n: 'Number' },
  { k: 'money',       n: 'Money (SAR)' },
  { k: 'percent',     n: 'Percent' },
  { k: 'select',      n: 'Dropdown' },
  { k: 'multiselect', n: 'Multi-select' },
  { k: 'date',        n: 'Date' },
  { k: 'checkbox',    n: 'Checkbox' },
  { k: 'person',      n: 'Person' },
]
export const fieldTypeOf = (k) => FIELD_TYPES.find((t) => t.k === k) || FIELD_TYPES[0]

const AV_COLORS = ['#2563eb', '#0ea5e9', '#6366f1', '#0891b2', '#7c3aed', '#0d9488', '#db2777']
export function avatarColor(seed = '') {
  let h = 0
  for (let i = 0; i < seed.length; i++) h = seed.charCodeAt(i) + ((h << 5) - h)
  return AV_COLORS[Math.abs(h) % AV_COLORS.length]
}
export function initials(name = '?') {
  return name.split(' ').filter(Boolean).map((w) => w[0]).slice(0, 2).join('').toUpperCase() || '?'
}

export function money(n) {
  const v = Math.round(Number(n) || 0)
  return 'SAR ' + v.toLocaleString('en-US')
}
export const fmtDate = (d) => (d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) : '—')
export const todayISO = () => new Date().toISOString().slice(0, 10)
export const isOverdue = (due, status) => due && status !== 'done' && new Date(due) < new Date()

// --- components ---
export function Avatar({ name, size = 24 }) {
  return (
    <span className="av" title={name}
      style={{ width: size, height: size, fontSize: size * 0.42, background: avatarColor(name) }}>
      {initials(name)}
    </span>
  )
}
export function StatusChip({ status }) {
  const s = stOf(status)
  return <span className={'chip ' + s.cls}><span className="d" style={{ background: s.c }} />{s.n}</span>
}
export function Bar({ pct, color }) {
  return <div className="bar"><i style={{ width: Math.min(pct, 100) + '%', background: color }} /></div>
}
// Text input that shows big numbers with thousands separators (e.g. 7,000,000)
// so zeros are easy to read. Emits a Number (or '' when empty) to onChange.
export function MoneyInput({ value, onChange, placeholder, ...rest }) {
  const disp = value === '' || value == null ? '' : Number(value).toLocaleString('en-US')
  return (
    <input type="text" inputMode="numeric" value={disp} placeholder={placeholder}
      onChange={(e) => { const d = e.target.value.replace(/[^\d]/g, ''); onChange(d === '' ? '' : Number(d)) }}
      {...rest} />
  )
}
