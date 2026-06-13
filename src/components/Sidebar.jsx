import { useState } from 'react'
import { useNavigate, useParams, useLocation } from 'react-router-dom'
import { useWorkspace } from '../workspace'
import { useNotifications } from '../notifications'
import * as api from '../api'
import Modal from './Modal'
import { StatusDot, Avatar } from './Bits'

const COLORS = ['#7B68EE', '#4f86ff', '#22c55e', '#f9a825', '#e5484d', '#0891b2', '#db2777', '#6366f1']

export default function Sidebar() {
  const { ws, spaces, folders, lists, members, refresh } = useWorkspace()
  const { unread } = useNotifications()
  const nav = useNavigate()
  const loc = useLocation()
  const { listId, spaceId, userId } = useParams()
  const [open, setOpen] = useState({})
  const [modal, setModal] = useState(null)      // create/rename entity
  const [menu, setMenu] = useState(null)        // open ⋯ menu id
  const [addMember, setAddMember] = useState(false)
  const isOpen = (id) => open[id] !== false
  const toggle = (id) => setOpen((o) => ({ ...o, [id]: o[id] === false ? true : false }))

  const folderlessLists = (sid) => lists.filter((l) => l.space_id === sid && !l.folder_id)
  const spaceFolders = (sid) => folders.filter((f) => f.space_id === sid)
  const folderLists = (fid) => lists.filter((l) => l.folder_id === fid)

  async function del(kind, id) {
    setMenu(null)
    const label = kind === 'space' ? 'space (and all its lists & tasks)' : kind === 'folder' ? 'folder (and its lists)' : 'list (and its tasks)'
    if (!confirm(`Delete this ${label}? This cannot be undone.`)) return
    if (kind === 'space') await api.deleteSpace(id)
    else if (kind === 'folder') await api.deleteFolder(id)
    else await api.deleteList(id)
    await refresh()
    if ((kind === 'list' && id === listId) || (kind === 'space' && id === spaceId)) nav('/')
  }

  const Dots = ({ items }) => (
    <span style={{ position: 'relative' }}>
      <button className="mini" title="Options" onClick={(e) => { e.stopPropagation(); setMenu(menu === items.key ? null : items.key) }}>⋯</button>
      {menu === items.key && (
        <>
          <div className="menu-back" onClick={() => setMenu(null)} />
          <div className="row-menu">
            {items.options.map((o) => <button key={o.label} onClick={(e) => { e.stopPropagation(); o.onClick() }}>{o.label}</button>)}
          </div>
        </>
      )}
    </span>
  )

  const ListRow = ({ l }) => (
    <div className={'side-list' + (l.id === listId ? ' on' : '')}>
      <button className="side-list-main" onClick={() => nav('/list/' + l.id)}>
        <span className="ic" style={{ color: l.color || 'var(--mut2)' }}>▤</span><span className="nm">{l.name}</span>
      </button>
      <Dots items={{ key: 'l' + l.id, options: [
        { label: '✎ Rename / color', onClick: () => { setMenu(null); setModal({ type: 'list', mode: 'rename', id: l.id, name: l.name, color: l.color }) } },
        { label: '🗑 Delete', onClick: () => del('list', l.id) },
      ] }} />
    </div>
  )

  return (
    <aside className="sidebar">
      <button className="side-ws" onClick={() => nav('/')} title={ws?.name || 'Workspace'}>
        <span className="ws-badge" style={{ background: 'linear-gradient(135deg,var(--accent),#9b8bff)' }}>S</span>
        <span className="ws-name"><b style={{ color: 'var(--accent)' }}>Link</b></span>
      </button>

      <button className={'side-nav' + (loc.pathname === '/' ? ' on' : '')} onClick={() => nav('/')}>🏠 Home</button>
      <button className={'side-nav' + (loc.pathname === '/inbox' ? ' on' : '')} onClick={() => nav('/inbox')}>
        🔔 Inbox {unread > 0 && <span className="ibadge">{unread}</span>}
      </button>

      {/* PROJECT (construction finance) */}
      <div className="side-section-h"><span>Project</span></div>
      <button className={'side-nav' + (loc.pathname === '/dashboard' ? ' on' : '')} onClick={() => nav('/dashboard')}>📊 Dashboard</button>
      <button className={'side-nav' + (loc.pathname === '/costs' ? ' on' : '')} onClick={() => nav('/costs')}>💸 Costs</button>
      <button className={'side-nav' + (loc.pathname === '/invoices' ? ' on' : '')} onClick={() => nav('/invoices')}>🧾 Invoices</button>
      <button className={'side-nav' + (loc.pathname === '/reports' ? ' on' : '')} onClick={() => nav('/reports')}>📄 Reports</button>

      {/* TEAM */}
      <div className="side-section-h"><span>Team</span>
        <button className="mini" title="Add collaborator" onClick={() => setAddMember(true)}>+</button></div>
      <div className="side-tree">
        {members.map((m) => (
          <button key={m.id} className={'side-member' + (m.id === userId ? ' on' : '')} onClick={() => nav('/user/' + m.id)}>
            <Avatar name={m.name} size={22} /><span className="nm">{m.name}</span>
            {m.role === 'owner' && <span className="role-tag">owner</span>}
          </button>
        ))}
        {!members.length && <div className="side-empty">Just you so far</div>}
      </div>

      {/* SPACES */}
      <div className="side-section-h"><span>Spaces</span>
        <button className="mini" title="New space" onClick={() => setModal({ type: 'space', mode: 'create' })}>+</button></div>
      <div className="side-tree">
        {spaces.map((s) => (
          <div key={s.id} className="space-block">
            <div className={'space-row' + (s.id === spaceId ? ' on' : '')}>
              <button className="caret" onClick={() => toggle(s.id)}>{isOpen(s.id) ? '▾' : '▸'}</button>
              <button className="space-head" onClick={() => nav('/space/' + s.id)}>
                <StatusDot color={s.color} size={12} /><span className="nm">{s.name}</span>
              </button>
              <button className="mini" title="New list" onClick={() => setModal({ type: 'list', mode: 'create', spaceId: s.id })}>+</button>
              <Dots items={{ key: 's' + s.id, options: [
                { label: '＋ New folder', onClick: () => { setMenu(null); setModal({ type: 'folder', mode: 'create', spaceId: s.id }) } },
                { label: '✎ Rename', onClick: () => { setMenu(null); setModal({ type: 'space', mode: 'rename', id: s.id, name: s.name, color: s.color }) } },
                { label: '🗑 Delete', onClick: () => del('space', s.id) },
              ] }} />
            </div>
            {isOpen(s.id) && (
              <div className="space-children">
                {folderlessLists(s.id).map((l) => <ListRow key={l.id} l={l} />)}
                {spaceFolders(s.id).map((f) => (
                  <div key={f.id} className="folder-block">
                    <div className="space-row">
                      <button className="caret" onClick={() => toggle(f.id)}>{isOpen(f.id) ? '▾' : '▸'}</button>
                      <button className="folder-head" onClick={() => toggle(f.id)}><span className="ic">🗂</span><span className="nm">{f.name}</span></button>
                      <button className="mini" title="New list" onClick={() => setModal({ type: 'list', mode: 'create', spaceId: s.id, folderId: f.id })}>+</button>
                      <Dots items={{ key: 'f' + f.id, options: [
                        { label: '✎ Rename', onClick: () => { setMenu(null); setModal({ type: 'folder', mode: 'rename', id: f.id, name: f.name }) } },
                        { label: '🗑 Delete', onClick: () => del('folder', f.id) },
                      ] }} />
                    </div>
                    {isOpen(f.id) && <div className="folder-children">{folderLists(f.id).map((l) => <ListRow key={l.id} l={l} />)}</div>}
                  </div>
                ))}
                {!folderlessLists(s.id).length && !spaceFolders(s.id).length && <div className="side-empty">No lists yet</div>}
              </div>
            )}
          </div>
        ))}
        {!spaces.length && <div className="side-empty" style={{ padding: '8px 14px' }}>Create your first space →</div>}
      </div>

      {modal && <EntityModal info={modal} ws={ws} onClose={() => setModal(null)}
        onDone={async (goTo) => { setModal(null); await refresh(); if (goTo) nav('/list/' + goTo) }} />}
      {addMember && <AddMemberModal ws={ws} onClose={() => setAddMember(false)} onDone={async () => { setAddMember(false); await refresh() }} />}
    </aside>
  )
}

function EntityModal({ info, ws, onClose, onDone }) {
  const rename = info.mode === 'rename'
  const [name, setName] = useState(info.name || '')
  const [color, setColor] = useState(info.color || '#7B68EE')
  const [busy, setBusy] = useState(false)
  const titles = { space: rename ? 'Rename space' : 'New space', folder: rename ? 'Rename folder' : 'New folder', list: rename ? 'Rename list' : 'New list' }

  async function save() {
    if (!name.trim()) return
    setBusy(true)
    if (info.type === 'space') {
      if (rename) await api.updateSpace(info.id, { name: name.trim(), color })
      else { const { data } = await api.createSpace({ workspace_id: ws.id, name: name.trim(), color, sort: 0 }); if (data) await api.seedSpaceStatuses(data.id) }
    } else if (info.type === 'folder') {
      if (rename) await api.updateFolder(info.id, { name: name.trim() })
      else await api.createFolder({ space_id: info.spaceId, name: name.trim(), sort: 0 })
    } else {
      if (rename) await api.updateList(info.id, { name: name.trim(), color })
      else { const { data } = await api.createList({ space_id: info.spaceId, folder_id: info.folderId || null, name: name.trim(), color, sort: 0 }); setBusy(false); return onDone(data?.id) }
    }
    setBusy(false); onDone()
  }

  return (
    <Modal kicker={titles[info.type].toUpperCase()} title={titles[info.type]} onClose={onClose}>
      <div className="field"><label>Name</label>
        <input autoFocus value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && save()} placeholder="Name" /></div>
      {(info.type === 'space' || info.type === 'list') && (
        <div className="field"><label>Color</label>
          <div style={{ display: 'flex', gap: 8 }}>
            {COLORS.map((c) => <button key={c} onClick={() => setColor(c)} style={{ width: 26, height: 26, borderRadius: '50%', background: c, outline: color === c ? '2px solid var(--ink)' : 'none', outlineOffset: 2 }} />)}
          </div></div>
      )}
      <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
        <button className="btn" onClick={save} disabled={busy}>{rename ? 'Save' : 'Create'}</button>
        <button className="btn ghost" style={{ marginLeft: 'auto' }} onClick={onClose}>Cancel</button>
      </div>
    </Modal>
  )
}

function AddMemberModal({ ws, onClose, onDone }) {
  const [email, setEmail] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')

  async function add() {
    if (!email.trim()) return
    setBusy(true); setMsg('')
    const { data: prof } = await api.findProfileByEmail(email)
    if (!prof) { setBusy(false); setMsg('No S Link user with that email yet — ask them to sign up first, then add them.'); return }
    const { error } = await api.addWorkspaceMember(ws.id, prof.id, 'member')
    setBusy(false)
    if (error) { setMsg(error.message); return }
    onDone()
  }

  return (
    <Modal kicker="ADD COLLABORATOR" title="Invite someone to the workspace" onClose={onClose}>
      <p style={{ color: 'var(--mut)', fontSize: 13, margin: 0 }}>Enter the email they signed up with. They'll appear under Team and can be assigned tasks.</p>
      <div className="field"><label>Email</label>
        <input autoFocus type="email" value={email} onChange={(e) => setEmail(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && add()} placeholder="name@company.com" /></div>
      {msg && <div className="err">{msg}</div>}
      <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
        <button className="btn" onClick={add} disabled={busy}>Add to workspace</button>
        <button className="btn ghost" style={{ marginLeft: 'auto' }} onClick={onClose}>Cancel</button>
      </div>
    </Modal>
  )
}
