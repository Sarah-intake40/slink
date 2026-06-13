import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useWorkspace } from '../workspace'
import * as api from '../api'

// Global Cmd/Ctrl-K command palette: jump to any page, space, list, member, or task.
const PAGES = [
  { icon: '🏠', label: 'Home', sub: 'My work', path: '/' },
  { icon: '🔔', label: 'Inbox', sub: 'Notifications', path: '/inbox' },
  { icon: '📊', label: 'Dashboard', sub: 'Finance overview', path: '/dashboard' },
  { icon: '💰', label: 'Costs', sub: 'Expenses & budget', path: '/costs' },
  { icon: '🧾', label: 'Invoices', sub: 'Payment certificates', path: '/invoices' },
  { icon: '📄', label: 'Reports', sub: 'Project reports', path: '/reports' },
]

export default function CommandPalette() {
  const { spaces, lists, members } = useWorkspace()
  const nav = useNavigate()
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')
  const [active, setActive] = useState(0)
  const [tasks, setTasks] = useState([])
  const inputRef = useRef(null)

  // open on Cmd/Ctrl-K from anywhere
  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault(); setOpen((o) => !o)
      }
    }
    const onOpen = () => setOpen(true)
    window.addEventListener('keydown', onKey)
    window.addEventListener('cmdk:open', onOpen)
    return () => { window.removeEventListener('keydown', onKey); window.removeEventListener('cmdk:open', onOpen) }
  }, [])

  // reset + focus on open
  useEffect(() => {
    if (open) { setQ(''); setActive(0); setTasks([]); setTimeout(() => inputRef.current?.focus(), 0) }
  }, [open])

  const close = useCallback(() => setOpen(false), [])

  // debounced server-side task search
  useEffect(() => {
    if (!open) return
    const term = q.trim()
    if (term.length < 2) { setTasks([]); return }
    const listIds = lists.map((l) => l.id)
    if (!listIds.length) { setTasks([]); return }
    let cancelled = false
    const t = setTimeout(async () => {
      const { data } = await api.searchTasks(listIds, term)
      if (!cancelled) setTasks(data || [])
    }, 180)
    return () => { cancelled = true; clearTimeout(t) }
  }, [q, open, lists])

  const spaceName = useCallback((id) => spaces.find((s) => s.id === id)?.name || '', [spaces])
  const listOf = useCallback((id) => lists.find((l) => l.id === id), [lists])

  // build flat, filtered result list (with section headers interleaved)
  const items = useMemo(() => {
    const term = q.trim().toLowerCase()
    const hit = (s) => !term || (s || '').toLowerCase().includes(term)
    const out = []

    const pages = PAGES.filter((p) => hit(p.label) || hit(p.sub))
    pages.forEach((p) => out.push({ type: 'page', icon: p.icon, label: p.label, sub: p.sub, path: p.path }))

    spaces.filter((s) => hit(s.name)).slice(0, 6).forEach((s) =>
      out.push({ type: 'space', icon: '🪐', label: s.name, sub: 'Space', path: '/space/' + s.id }))

    lists.filter((l) => hit(l.name)).slice(0, 8).forEach((l) =>
      out.push({ type: 'list', icon: '📋', label: l.name, sub: spaceName(l.space_id) || 'List', path: '/list/' + l.id }))

    members.filter((m) => hit(m.name)).slice(0, 6).forEach((m) =>
      out.push({ type: 'member', icon: '👤', label: m.name, sub: 'Member', path: '/user/' + m.id }))

    tasks.forEach((t) => {
      const l = listOf(t.list_id)
      out.push({ type: 'task', icon: '✓', label: t.name, sub: l ? l.name : 'Task', path: '/list/' + t.list_id + '?task=' + t.id })
    })
    return out
  }, [q, spaces, lists, members, tasks, spaceName, listOf])

  useEffect(() => { setActive((a) => Math.min(a, Math.max(0, items.length - 1))) }, [items.length])

  const go = useCallback((item) => { if (item) { nav(item.path); close() } }, [nav, close])

  const onKeyDown = (e) => {
    if (e.key === 'Escape') { e.preventDefault(); close() }
    else if (e.key === 'ArrowDown') { e.preventDefault(); setActive((a) => Math.min(a + 1, items.length - 1)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)) }
    else if (e.key === 'Enter') { e.preventDefault(); go(items[active]) }
  }

  if (!open) return null
  return (
    <div className="cmdk-scrim" onMouseDown={close}>
      <div className="cmdk" onMouseDown={(e) => e.stopPropagation()}>
        <input ref={inputRef} className="cmdk-input" placeholder="Search tasks, lists, spaces, people…"
          value={q} onChange={(e) => { setQ(e.target.value); setActive(0) }} onKeyDown={onKeyDown} />
        <div className="cmdk-results">
          {!items.length ? (
            <div className="cmdk-empty">{q.trim() ? 'No matches' : 'Type to search'}</div>
          ) : items.map((it, i) => (
            <button key={it.type + it.path + i}
              className={'cmdk-item' + (i === active ? ' active' : '')}
              onMouseEnter={() => setActive(i)} onClick={() => go(it)}>
              <span className="cmdk-ic">{it.icon}</span>
              <span className="cmdk-label">{it.label}</span>
              <span className="cmdk-sub">{it.sub}</span>
            </button>
          ))}
        </div>
        <div className="cmdk-foot">
          <span><kbd>↑</kbd><kbd>↓</kbd> navigate</span>
          <span><kbd>↵</kbd> open</span>
          <span><kbd>esc</kbd> close</span>
        </div>
      </div>
    </div>
  )
}
