export default function Modal({ kicker, title, onClose, wide, children }) {
  return (
    <div className="scrim" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className={'modal' + (wide ? ' wide' : '')}>
        <div className="modal-h">
          <div>
            {kicker && <div className="k">{kicker}</div>}
            <h3 style={{ marginTop: 3 }}>{title}</h3>
          </div>
          <button className="x" onClick={onClose}>×</button>
        </div>
        <div className="modal-b">{children}</div>
      </div>
    </div>
  )
}
