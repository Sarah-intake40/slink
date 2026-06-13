// Lightweight dependency-free SVG charts.

export function PieChart({ data, size = 168, donut = 0.58 }) {
  const slices = (data || []).filter((d) => d.value > 0)
  const total = slices.reduce((a, d) => a + d.value, 0)
  const r = size / 2, cx = r, cy = r
  if (!total) return <svg viewBox={`0 0 ${size} ${size}`} style={{ width: size, height: size }}><circle cx={cx} cy={cy} r={r - 2} fill="none" stroke="var(--line)" strokeWidth="2" /></svg>

  let acc = 0
  const paths = slices.map((d, i) => {
    const start = acc / total * 2 * Math.PI; acc += d.value; const end = acc / total * 2 * Math.PI
    if (slices.length === 1) return <circle key={i} cx={cx} cy={cy} r={r} fill={d.color} />
    const x1 = cx + r * Math.sin(start), y1 = cy - r * Math.cos(start)
    const x2 = cx + r * Math.sin(end), y2 = cy - r * Math.cos(end)
    const large = end - start > Math.PI ? 1 : 0
    return <path key={i} d={`M${cx} ${cy} L${x1.toFixed(2)} ${y1.toFixed(2)} A${r} ${r} 0 ${large} 1 ${x2.toFixed(2)} ${y2.toFixed(2)} Z`} fill={d.color} />
  })
  return (
    <svg viewBox={`0 0 ${size} ${size}`} style={{ width: size, height: size }}>
      {paths}
      {donut > 0 && <circle cx={cx} cy={cy} r={r * donut} fill="var(--card)" />}
    </svg>
  )
}

export function Legend({ data, fmt = (v) => v }) {
  const total = (data || []).reduce((a, d) => a + d.value, 0) || 1
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
      {data.map((d) => (
        <div key={d.label} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5 }}>
          <span style={{ width: 10, height: 10, borderRadius: 3, background: d.color, flexShrink: 0 }} />
          <span style={{ flex: 1, color: 'var(--ink2)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{d.label}</span>
          <span className="mono" style={{ fontWeight: 600 }}>{fmt(d.value)}</span>
          <span style={{ color: 'var(--mut2)', width: 38, textAlign: 'right' }}>{Math.round(d.value / total * 100)}%</span>
        </div>
      ))}
      {!data.length && <span style={{ color: 'var(--mut)', fontSize: 12.5 }}>No data.</span>}
    </div>
  )
}

// Grouped bars OR multi-line chart. labels = x axis; series = [{name,color,values[]}]
export function MultiSeriesChart({ labels, series, mode = 'bar', height = 260, fmt = (v) => v }) {
  const W = 660, H = height, P = { l: 56, r: 14, t: 14, b: 34 }
  const iw = W - P.l - P.r, ih = H - P.t - P.b
  const maxY = Math.max(1, ...series.flatMap((s) => s.values))
  const n = labels.length
  const ticks = [0, 0.25, 0.5, 0.75, 1]
  const ay = (v) => P.t + ih - (v / maxY) * ih
  const abbr = (v) => Math.abs(v) >= 1e6 ? (v / 1e6).toFixed(1) + 'M' : Math.abs(v) >= 1e3 ? Math.round(v / 1e3) + 'K' : Math.round(v)
  if (!n) return <div style={{ color: 'var(--mut)', fontSize: 13, padding: '24px 0', textAlign: 'center' }}>No data in range.</div>

  const slotW = iw / n
  const lineX = (i) => (n <= 1 ? P.l + iw / 2 : P.l + (i / (n - 1)) * iw)

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto' }}>
      {ticks.map((t) => { const gy = P.t + ih - t * ih; return (
        <g key={t}>
          <line x1={P.l} y1={gy} x2={W - P.r} y2={gy} stroke="var(--line)" strokeWidth="1" />
          <text x={P.l - 8} y={gy + 3.5} textAnchor="end" fontSize="10" fill="var(--mut)" fontFamily="ui-monospace,monospace">{abbr(maxY * t)}</text>
        </g>) })}

      {mode === 'bar' && series.map((s, si) => {
        const bw = (slotW * 0.7) / series.length
        return labels.map((_, i) => {
          const v = s.values[i] || 0
          const x = P.l + i * slotW + slotW * 0.15 + si * bw
          const h = (v / maxY) * ih
          return <rect key={s.name + i} x={x} y={P.t + ih - h} width={Math.max(1, bw - 2)} height={h} rx="2" fill={s.color}><title>{`${s.name} · ${labels[i]}: ${fmt(v)}`}</title></rect>
        })
      })}

      {mode === 'line' && series.map((s) => (
        <g key={s.name}>
          <path d={s.values.map((v, i) => (i ? 'L' : 'M') + lineX(i).toFixed(1) + ' ' + ay(v).toFixed(1)).join(' ')} fill="none" stroke={s.color} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
          {s.values.map((v, i) => <circle key={i} cx={lineX(i)} cy={ay(v)} r="3" fill={s.color}><title>{`${s.name} · ${labels[i]}: ${fmt(v)}`}</title></circle>)}
        </g>
      ))}

      {labels.map((l, i) => (
        <text key={i} x={mode === 'bar' ? P.l + i * slotW + slotW / 2 : lineX(i)} y={H - 12} textAnchor="middle" fontSize="10.5" fill="var(--mut)">{l}</text>
      ))}
    </svg>
  )
}

export function BarChart({ data, fmt = (v) => v, height = 200 }) {
  const max = Math.max(1, ...(data || []).map((d) => d.value))
  return (
    <div className="barchart" style={{ height }}>
      {data.map((d) => (
        <div key={d.label} className="barchart-col" title={`${d.label}: ${fmt(d.value)}`}>
          <div className="barchart-val">{fmt(d.value)}</div>
          <div className="barchart-bar" style={{ height: `${(d.value / max) * 100}%`, background: d.color || 'var(--accent)' }} />
          <div className="barchart-lbl">{d.label}</div>
        </div>
      ))}
      {!data.length && <span style={{ color: 'var(--mut)', fontSize: 12.5, alignSelf: 'center' }}>No data.</span>}
    </div>
  )
}
