import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { useAuth } from './auth'
import * as api from './api'

const Ctx = createContext(null)
export const useWorkspace = () => useContext(Ctx)

export function WorkspaceProvider({ children }) {
  const { user } = useAuth()
  const [ws, setWs] = useState(null)
  const [spaces, setSpaces] = useState([])
  const [folders, setFolders] = useState([])
  const [lists, setLists] = useState([])
  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(true)

  const loadTree = useCallback(async (wid) => {
    const [{ data: sp }, { data: fl }, { data: li }, { data: mm }] = await Promise.all([
      api.getSpaces(wid), api.getFolders(wid), api.getLists(wid), api.getWorkspaceMembers(wid),
    ])
    setSpaces(sp || []); setFolders(fl || []); setLists(li || [])
    setMembers((mm || []).map((m) => ({ id: m.user_id, role: m.role, name: m.profiles?.full_name || 'User' })))
  }, [])

  const boot = useCallback(async () => {
    if (!user) return
    setLoading(true)
    const mine = await api.ensureWorkspace(user)
    const first = mine?.[0]?.workspaces || null
    setWs(first)
    if (first) await loadTree(first.id)
    setLoading(false)
  }, [user, loadTree])

  useEffect(() => { if (user) boot() }, [user, boot])

  const refresh = useCallback(() => { if (ws) return loadTree(ws.id) }, [ws, loadTree])

  return (
    <Ctx.Provider value={{ ws, spaces, folders, lists, members, loading, refresh, setWs }}>
      {children}
    </Ctx.Provider>
  )
}
