import { useState, useEffect } from 'react'

// Shared constants + small UI helpers

export const PRIORITIES = [
  { k: 'urgent', n: 'Urgent', c: '#e5484d' },
  { k: 'high',   n: 'High',   c: '#f9a825' },
  { k: 'normal', n: 'Normal', c: '#4f86ff' },
  { k: 'low',    n: 'Low',    c: '#87909e' },
]
export const prOf = (k) => PRIORITIES.find((p) => p.k === k) || null

export const STATUS_TYPES = [
  { k: 'todo',   n: 'Not started' },
  { k: 'active', n: 'Active' },
  { k: 'done',   n: 'Done' },
  { k: 'closed', n: 'Closed' },
]

// Custom field types
export const FIELD_TYPES = [
  { k: 'text',        n: 'Text' },
  { k: 'number',      n: 'Number' },
  { k: 'money',       n: 'Money' },
  { k: 'percent',     n: 'Percent' },
  { k: 'date',        n: 'Date' },
  { k: 'select',      n: 'Dropdown' },
  { k: 'multiselect', n: 'Multi-select' },
  { k: 'checkbox',    n: 'Checkbox' },
  { k: 'person',      n: 'Person' },
  { k: 'url',         n: 'URL' },
]
export const fieldTypeOf = (k) => FIELD_TYPES.find((t) => t.k === k) || FIELD_TYPES[0]

// Minutes -> "2h 30m" / "45m"
export function fmtDuration(mins) {
  const m = Number(mins) || 0
  if (!m) return ''
  const h = Math.floor(m / 60), r = m % 60
  return (h ? h + 'h' : '') + (r ? (h ? ' ' : '') + r + 'm' : (h ? '' : '0m'))
}

const AV_COLORS = ['#7B68EE', '#4f86ff', '#22c55e', '#f9a825', '#e5484d', '#0891b2', '#db2777', '#6366f1']
export function avatarColor(seed = '') {
  let h = 0
  for (let i = 0; i < seed.length; i++) h = seed.charCodeAt(i) + ((h << 5) - h)
  return AV_COLORS[Math.abs(h) % AV_COLORS.length]
}
export function initials(name = '?') {
  return name.split(' ').filter(Boolean).map((w) => w[0]).slice(0, 2).join('').toUpperCase() || '?'
}

export const num = (v) => (v === '' || v == null ? 0 : Number(v))
export const money = (n) => 'SAR ' + (Number(n) || 0).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })

// Cost calculator: how an expense's rate is applied.
export const RATE_BASES = [
  { k: 'flat', n: 'Flat amount', hint: 'enter the total directly' },
  { k: 'unit', n: 'Per unit', hint: 'quantity × rate' },
  { k: 'day', n: 'Per day', hint: 'quantity × daily rate' },
  { k: 'hour', n: 'Per hour', hint: 'quantity × hourly rate × hours' },
]
// hour: qty × rate × hours · unit/day: qty × rate · flat: the stored amount
export function expenseAmount({ rate_basis, quantity, rate, hours, amount }) {
  const q = Number(quantity) || 0, r = Number(rate) || 0, h = Number(hours) || 0
  if (rate_basis === 'hour') return q * r * h
  if (rate_basis === 'unit' || rate_basis === 'day') return q * r
  return Number(amount) || 0
}
// thousands-separated number input (e.g. 100,000); emits a Number or ''.
// Keeps an internal text buffer while focused so decimals (e.g. 100.45) can be typed.
export function MoneyInput({ value, onChange, placeholder, decimals = false, ...rest }) {
  const formatted = value === '' || value == null ? '' : Number(value).toLocaleString('en-US', { maximumFractionDigits: decimals ? 2 : 0 })
  const [focused, setFocused] = useState(false)
  const [text, setText] = useState(formatted)
  useEffect(() => { if (!focused) setText(formatted) }, [formatted, focused])

  function handle(e) {
    let raw = e.target.value.replace(decimals ? /[^\d.]/g : /[^\d]/g, '')
    if (decimals) { const p = raw.split('.'); if (p.length > 2) raw = p[0] + '.' + p.slice(1).join('') } // one dot only
    setText(raw)
    onChange(raw === '' || raw === '.' ? '' : Number(raw))
  }
  return (
    <input type="text" inputMode="decimal" placeholder={placeholder}
      value={focused ? text : formatted}
      onFocus={() => { setFocused(true); setText(value === '' || value == null ? '' : String(value)) }}
      onBlur={() => setFocused(false)}
      onChange={handle} {...rest} />
  )
}

export const fmtDate = (d) => (d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) : '')
export const todayISO = () => new Date().toISOString().slice(0, 10)
export const isOverdue = (due, done) => due && !done && new Date(due) < new Date(new Date().toDateString())
export const uid = () => (crypto?.randomUUID ? crypto.randomUUID() : 'id' + Math.random().toString(36).slice(2))

export function Avatar({ name, size = 24 }) {
  return (
    <span className="av" title={name}
      style={{ width: size, height: size, fontSize: size * 0.42, background: avatarColor(name) }}>
      {initials(name)}
    </span>
  )
}

export function PriorityFlag({ k, size = 14 }) {
  const p = prOf(k)
  if (!p) return null
  return <span title={p.n} style={{ color: p.c, fontSize: size, lineHeight: 1 }}>⚑</span>
}

export function StatusDot({ color, size = 10 }) {
  return <span style={{ width: size, height: size, borderRadius: '50%', background: color || '#87909e', display: 'inline-block', flexShrink: 0 }} />
}
