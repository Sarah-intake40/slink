import { useEffect, useRef, useState } from 'react'
import { useAuth } from '../auth'
import * as api from '../api'
import { fmtDate, Avatar } from '../components/Bits'

export default function Files({ project, role }) {
  const { user } = useAuth()
  const [files, setFiles] = useState([])
  const [busy, setBusy] = useState(false)
  const inputRef = useRef()
  const canUpload = role !== 'client'

  async function load() { const { data } = await api.getAttachments(project.id); setFiles(data || []) }
  useEffect(() => { load() }, [project.id])

  async function onPick(e) {
    const file = e.target.files?.[0]; if (!file) return
    setBusy(true)
    const { error } = await api.uploadDrawing(project.id, file, user.id)
    setBusy(false)
    if (error) alert('Upload failed: ' + error.message)
    else { load(); e.target.value = '' }
  }
  async function open(f) {
    const { data, error } = await api.drawingUrl(f.file_path)
    if (error) return alert('Could not open file')
    window.open(data.signedUrl, '_blank')
  }
  async function remove(f) {
    if (!confirm('Delete this file?')) return
    await api.deleteAttachment(f.id, f.file_path); load()
  }

  return (
    <>
      <div style={{ display: 'flex', marginBottom: 16, alignItems: 'center' }}>
        <h3 style={{ fontSize: 18 }}>Files / Drawings</h3>
        <span style={{ color: 'var(--mut)', fontSize: 13, marginLeft: 10 }}>Drawings, PDFs &amp; site photos</span>
        {canUpload && <>
          <input ref={inputRef} type="file" hidden onChange={onPick} />
          <button className="btn" style={{ marginLeft: 'auto' }} disabled={busy} onClick={() => inputRef.current.click()}>
            {busy ? 'Uploading…' : '+ Upload file'}</button>
        </>}
      </div>

      {files.length ? (
        <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill,minmax(280px,1fr))' }}>
          {files.map((f) => {
            const ext = (f.file_name.split('.').pop() || '').toUpperCase()
            return (
              <div key={f.id} className="att" style={{ padding: 14 }}>
                <div className="ft">{ext.slice(0, 4)}</div>
                <div style={{ minWidth: 0, flex: 1, cursor: 'pointer' }} onClick={() => open(f)}>
                  <div className="nm" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{f.file_name}</div>
                  <div className="sz">{f.file_size} · {fmtDate(f.created_at)}</div>
                </div>
                {(role !== 'client') && <button className="x" style={{ width: 28, height: 28 }} onClick={() => remove(f)}>×</button>}
              </div>
            )
          })}
        </div>
      ) : (
        <div className="empty"><div className="ic">📎</div><p>No files uploaded yet.</p>
          {canUpload && <button className="btn" onClick={() => inputRef.current.click()}>+ Upload your first drawing</button>}</div>
      )}
    </>
  )
}
