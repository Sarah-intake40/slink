import { useEffect, useState, useCallback } from 'react'
import { useParams } from 'react-router-dom'
import { useWorkspace } from '../workspace'
import * as api from '../api'
import TaskViews from '../components/TaskViews'

export default function ListPage() {
  const { listId } = useParams()
  const { members, lists, spaces } = useWorkspace()
  const [list, setList] = useState(null)
  const [statuses, setStatuses] = useState([])
  const [fields, setFields] = useState([])
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)

  const loadTasks = useCallback(async () => { const { data } = await api.getTasks(listId); setTasks(data || []) }, [listId])

  const boot = useCallback(async () => {
    setLoading(true)
    let li = lists.find((l) => l.id === listId)
    if (!li) { const { data } = await api.getList(listId); li = data }
    setList(li || null)
    if (li) {
      const [{ data: st }, { data: fl }] = await Promise.all([api.getStatuses(li.space_id), api.getTaskFields(li.space_id)])
      setStatuses(st || []); setFields(fl || [])
    }
    await loadTasks(); setLoading(false)
  }, [listId, lists, loadTasks])
  useEffect(() => { boot() }, [boot])

  const reloadConfig = useCallback(async () => {
    if (!list) return
    const [{ data: st }, { data: fl }] = await Promise.all([api.getStatuses(list.space_id), api.getTaskFields(list.space_id)])
    setStatuses(st || []); setFields(fl || [])
  }, [list])

  if (loading) return <div className="spin" />
  if (!list) return <div className="empty"><div className="ic">🔒</div><p>List not found or you don't have access.</p></div>
  const space = spaces.find((s) => s.id === list.space_id)

  return (
    <TaskViews tasks={tasks} statuses={statuses} fields={fields} members={members} lists={lists}
      defaultListId={listId} space={space} reload={loadTasks} onConfigChanged={reloadConfig}
      header={{ crumb: space?.name, title: list.name }} />
  )
}
