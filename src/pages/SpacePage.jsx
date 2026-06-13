import { useEffect, useState, useCallback } from 'react'
import { useParams } from 'react-router-dom'
import { useWorkspace } from '../workspace'
import * as api from '../api'
import TaskViews from '../components/TaskViews'

export default function SpacePage() {
  const { spaceId } = useParams()
  const { members, spaces, lists } = useWorkspace()
  const [statuses, setStatuses] = useState([])
  const [fields, setFields] = useState([])
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)

  const space = spaces.find((s) => s.id === spaceId)
  const spaceLists = lists.filter((l) => l.space_id === spaceId)
  const listKey = spaceLists.map((l) => l.id).join(',')

  const loadTasks = useCallback(async () => {
    const ids = listKey ? listKey.split(',') : []
    if (!ids.length) { setTasks([]); return }
    const { data } = await api.getTasksInLists(ids)
    setTasks(data || [])
  }, [listKey])

  const loadConfig = useCallback(async () => {
    const [{ data: st }, { data: fl }] = await Promise.all([api.getStatuses(spaceId), api.getTaskFields(spaceId)])
    setStatuses(st || []); setFields(fl || [])
  }, [spaceId])

  useEffect(() => { (async () => { setLoading(true); await Promise.all([loadConfig(), loadTasks()]); setLoading(false) })() }, [loadConfig, loadTasks])

  if (loading) return <div className="spin" />
  if (!space) return <div className="empty"><div className="ic">🔒</div><p>Space not found.</p></div>

  return (
    <TaskViews tasks={tasks} statuses={statuses} fields={fields} members={members} lists={spaceLists}
      defaultListId={spaceLists[0]?.id || null} space={space} reload={loadTasks} onConfigChanged={loadConfig}
      header={{ crumb: 'Space · all tasks', title: space.name }} />
  )
}
