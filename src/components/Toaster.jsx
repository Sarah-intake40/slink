import { useNavigate } from 'react-router-dom'
import { useNotifications, notifText } from '../notifications'

export default function Toaster() {
  const { toasts, dismissToast } = useNotifications()
  const nav = useNavigate()
  if (!toasts?.length) return null
  return (
    <div className="toaster">
      {toasts.map((t) => (
        <div key={t.id} className="toast" onClick={() => { if (t.list_id) nav('/list/' + t.list_id); dismissToast(t.id) }}>
          <span className="toast-ic">🔔</span>
          <div className="toast-body">{notifText(t)}</div>
          <button className="toast-x" onClick={(e) => { e.stopPropagation(); dismissToast(t.id) }}>×</button>
        </div>
      ))}
    </div>
  )
}
