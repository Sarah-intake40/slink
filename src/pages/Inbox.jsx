import { useNavigate } from 'react-router-dom'
import { useNotifications } from '../notifications'
import { Avatar } from '../components/Bits'

const LABEL = { assigned: 'assigned you to a task', comment: 'commented on a task', mention: 'mentioned you', watching: 'updated a task you watch' }
const ago = (d) => {
  const s = Math.floor((Date.now() - new Date(d).getTime()) / 1000)
  if (s < 60) return 'just now'
  if (s < 3600) return Math.floor(s / 60) + 'm ago'
  if (s < 86400) return Math.floor(s / 3600) + 'h ago'
  return Math.floor(s / 86400) + 'd ago'
}

export default function Inbox() {
  const { items, unread, markRead, markAll } = useNotifications()
  const nav = useNavigate()

  const open = (n) => { if (!n.read) markRead(n.id); if (n.list_id) nav('/list/' + n.list_id) }

  return (
    <div style={{ maxWidth: 720 }}>
      <div className="list-head">
        <div><div className="crumb">Notifications</div><h2>Inbox {unread > 0 && <span className="ibadge">{unread}</span>}</h2></div>
        {unread > 0 && <button className="btn ghost sm" style={{ marginLeft: 'auto' }} onClick={markAll}>Mark all read</button>}
      </div>

      {!items.length ? (
        <div className="empty"><div className="ic">🔔</div><p>You're all caught up.</p></div>
      ) : (
        <div className="inbox">
          {items.map((n) => (
            <button key={n.id} className={'inbox-row' + (n.read ? '' : ' unread')} onClick={() => open(n)}>
              {!n.read && <span className="dot" />}
              <Avatar name={n.actor?.full_name || 'Someone'} size={32} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13 }}>
                  <b>{n.actor?.full_name || 'Someone'}</b> {LABEL[n.type] || 'notified you'}
                </div>
                {n.body && <div style={{ color: 'var(--mut)', fontSize: 12.5, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{n.body}</div>}
              </div>
              <span style={{ color: 'var(--mut2)', fontSize: 11.5, flexShrink: 0 }}>{ago(n.created_at)}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
