import { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react'
import { useAuth } from './auth'
import { supabase } from './supabaseClient'
import * as api from './api'

const Ctx = createContext(null)
export const useNotifications = () => useContext(Ctx)

export function notifText(n) {
  const b = n.body || ''
  if (n.type === 'assigned') return `Assigned to you: ${b}`
  if (n.type === 'comment') return `New comment: ${b}`
  if (n.type === 'mention') return `You were mentioned: ${b}`
  return b || 'New notification'
}

export function NotificationsProvider({ children }) {
  const { user } = useAuth()
  const [items, setItems] = useState([])
  const [toasts, setToasts] = useState([])
  const timers = useRef({})

  const refresh = useCallback(async () => {
    if (!user) return
    const { data } = await api.getNotifications(user.id)
    setItems(data || [])
  }, [user])
  useEffect(() => { refresh() }, [refresh])

  const dismissToast = useCallback((id) => {
    setToasts((t) => t.filter((x) => x.id !== id))
    clearTimeout(timers.current[id]); delete timers.current[id]
  }, [])

  const pushToast = useCallback((n) => {
    setToasts((t) => [...t.filter((x) => x.id !== n.id), n])
    timers.current[n.id] = setTimeout(() => dismissToast(n.id), 6500)
    // optional native desktop popup if the user has granted permission
    if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
      try { new Notification('S Link', { body: notifText(n) }) } catch { /* ignore */ }
    }
  }, [dismissToast])

  // ask once for desktop-notification permission (best-effort)
  useEffect(() => {
    if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
      Notification.requestPermission().catch(() => {})
    }
  }, [])

  // live updates for new notifications addressed to this user
  useEffect(() => {
    if (!user) return
    const ch = supabase.channel('notif-' + user.id)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` },
        (payload) => { setItems((cur) => [payload.new, ...cur]); pushToast(payload.new) })
      .subscribe()
    return () => supabase.removeChannel(ch)
  }, [user, pushToast])

  useEffect(() => () => { Object.values(timers.current).forEach(clearTimeout) }, [])

  const unread = items.filter((n) => !n.read).length
  const markRead = async (id) => { setItems((c) => c.map((n) => n.id === id ? { ...n, read: true } : n)); await api.markNotificationRead(id) }
  const markAll = async () => { setItems((c) => c.map((n) => ({ ...n, read: true }))); if (user) await api.markAllNotificationsRead(user.id) }

  return <Ctx.Provider value={{ items, unread, refresh, markRead, markAll, toasts, dismissToast }}>{children}</Ctx.Provider>
}

// Build notification rows for recipients (dedupes, drops the actor).
export function buildNotifs(recipientIds, { actorId, type, task_id, list_id, body }) {
  return [...new Set(recipientIds)].filter((id) => id && id !== actorId)
    .map((user_id) => ({ user_id, actor_id: actorId, type, task_id, list_id, body }))
}
