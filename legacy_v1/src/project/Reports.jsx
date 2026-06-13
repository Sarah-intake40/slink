import { useEffect, useState } from 'react'
import jsPDF from 'jspdf'
import * as XLSX from 'xlsx'
import * as api from '../api'
import { STATUSES, stOf, money, fmtDate, isOverdue } from '../components/Bits'

export default function Reports({ project }) {
  const [tasks, setTasks] = useState([])
  const [records, setRecords] = useState([])
  const [expenses, setExpenses] = useState([])
  const [cats, setCats] = useState([])
  const [members, setMembers] = useState({})

  useEffect(() => {
    (async () => {
      const [{ data: ts }, { data: rs }, { data: es }, { data: cs }, { data: ms }] = await Promise.all([
        api.getTasks(project.id), api.getRecords(project.id), api.getExpenses(project.id),
        api.getCategories(project.id), api.getMembers(project.id),
      ])
      setTasks(ts || []); setRecords(rs || []); setExpenses(es || []); setCats(cs || [])
      const m = {}; (ms || []).forEach((x) => m[x.user_id] = x.profiles?.full_name || 'User'); setMembers(m)
    })()
  }, [project.id])

  const catName = (id) => cats.find((c) => c.id === id)?.name || 'Uncategorized'

  const done = tasks.filter((t) => t.status === 'done').length
  const prog = tasks.length ? Math.round(done / tasks.length * 100) : 0
  const spent = expenses.reduce((a, e) => a + Number(e.amount), 0)
  const bpct = project.budget ? Math.round(spent / project.budget * 100) : 0
  const overdue = tasks.filter((t) => isOverdue(t.due_date, t.status)).length
  const nm = (id) => members[id] || '—'

  function exportPDF() {
    const doc = new jsPDF()
    doc.setFillColor(37, 99, 235); doc.rect(0, 0, 210, 22, 'F')
    doc.setTextColor(255, 255, 255); doc.setFont('helvetica', 'bold'); doc.setFontSize(16)
    doc.text('S Link — Project Status Report', 12, 14)
    doc.setTextColor(20, 20, 20); doc.setFontSize(13); doc.text(`${project.name} (${project.code || ''})`, 12, 32)
    doc.setFont('helvetica', 'normal'); doc.setFontSize(10); doc.setTextColor(90, 90, 90)
    doc.text(`${project.location || ''}   |   Generated ${new Date().toLocaleDateString('en-GB')}`, 12, 39)
    let y = 50; doc.setTextColor(20, 20, 20); doc.setFont('helvetica', 'bold'); doc.setFontSize(11)
    doc.text('Summary', 12, y); doc.setFont('helvetica', 'normal'); doc.setFontSize(10); y += 7
    ;[`Overall progress: ${prog}%`,
      `Budget used: ${bpct}% (${money(spent)} of ${money(project.budget)})`,
      `Tasks: ${done} of ${tasks.length} complete`,
      `Overdue items: ${overdue}`,
      `Status: ${stOf(project.status).n}   |   Target: ${fmtDate(project.end_date)}`].forEach((l) => { doc.text(l, 14, y); y += 6 })
    y += 4; doc.setFont('helvetica', 'bold'); doc.setFontSize(11); doc.text('Tasks', 12, y); y += 6
    doc.setFontSize(8.5); doc.setFont('helvetica', 'bold')
    doc.text('Task', 14, y); doc.text('Status', 120, y); doc.text('Due', 175, y); y += 2
    doc.setDrawColor(220); doc.line(12, y, 198, y); y += 5; doc.setFont('helvetica', 'normal')
    tasks.forEach((t) => { if (y > 278) { doc.addPage(); y = 20 }
      doc.text((t.is_milestone ? '[M] ' : '') + (t.title || '').slice(0, 60), 14, y)
      doc.text(stOf(t.status).n, 120, y); doc.text(fmtDate(t.due_date), 175, y); y += 6 })
    y += 4; if (y > 265) { doc.addPage(); y = 20 }
    doc.setFont('helvetica', 'bold'); doc.setFontSize(11); doc.text('Open Records', 12, y); y += 6
    doc.setFontSize(8.5); doc.setFont('helvetica', 'normal')
    records.filter((r) => r.status !== 'done').forEach((r) => { if (y > 278) { doc.addPage(); y = 20 }
      doc.text(`${r.ref || ''}  ${(r.title || '').slice(0, 55)}`, 14, y)
      doc.text(stOf(r.status).n, 150, y); doc.text(fmtDate(r.due_date), 178, y); y += 6 })
    doc.save(`${project.code || 'project'}-status-report.pdf`)
  }

  function exportXLSX() {
    const wb = XLSX.utils.book_new()
    const summary = [
      ['S Link Status Report'], ['Project', project.name], ['Code', project.code],
      ['Location', project.location], ['Status', stOf(project.status).n], ['Overall Progress', prog + '%'],
      ['Total Budget', project.budget], ['Spent', spent], ['Budget Used', bpct + '%'],
      ['Tasks Complete', `${done}/${tasks.length}`], ['Target', project.end_date],
    ]
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(summary), 'Summary')
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(tasks.map((t) => ({
      Task: t.title, Type: t.is_milestone ? 'Milestone' : 'Task', Status: stOf(t.status).n,
      Assignee: nm(t.assignee), Start: t.start_date, Due: t.due_date,
    }))), 'Tasks')
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(records.map((r) => ({
      Ref: r.ref, Type: r.kind, Title: r.title, Status: stOf(r.status).n, Due: r.due_date,
    }))), 'Records')
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(expenses.map((e) => ({
      Date: e.spent_on, Category: catName(e.category_id), Description: e.description,
      Qty: e.quantity, Unit: e.unit_label, Rate: e.rate, Basis: e.rate_basis, Hours: e.hours,
      Amount: Number(e.amount),
    }))), 'Expenses')
    XLSX.writeFile(wb, `${project.code || 'project'}-status-report.xlsx`)
  }

  return (
    <>
      <div style={{ display: 'flex', gap: 12, marginBottom: 22 }}>
        <button className="btn" onClick={exportPDF}>⬇ Export PDF</button>
        <button className="btn ghost" onClick={exportXLSX}>⬇ Export Excel</button>
      </div>
      <div className="kpi">
        <div className="c accent"><div className="v">{prog}%</div><div className="l">Overall Progress</div></div>
        <div className="c"><div className="v">{done}/{tasks.length}</div><div className="l">Tasks Done</div></div>
        <div className="c"><div className="v" style={{ color: bpct > 92 ? 'var(--crit)' : 'var(--done)' }}>{bpct}%</div><div className="l">Budget Used</div></div>
        <div className="c"><div className="v" style={{ color: 'var(--crit)' }}>{overdue}</div><div className="l">Overdue</div></div>
      </div>

      <div className="card" style={{ padding: 18, marginBottom: 18 }}>
        <h4 style={{ fontSize: 15, marginBottom: 12 }}>Tasks by status</h4>
        {STATUSES.map((s) => {
          const n = tasks.filter((t) => t.status === s.k).length
          return (
            <div key={s.k} style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '9px 0' }}>
              <span style={{ width: 110, fontWeight: 600, fontSize: 13 }}>{s.n}</span>
              <div className="bar" style={{ flex: 1, margin: 0 }}><i style={{ width: (tasks.length ? n / tasks.length * 100 : 0) + '%', background: s.c }} /></div>
              <b className="mono" style={{ width: 28, textAlign: 'right' }}>{n}</b>
            </div>
          )
        })}
      </div>

      <div className="card" style={{ padding: 18 }}>
        <h4 style={{ fontSize: 15, marginBottom: 12 }}>Spend by category</h4>
        {!cats.length && <div style={{ color: 'var(--mut)', fontSize: 13 }}>No categories defined yet.</div>}
        {cats.map((c) => {
          const sp = expenses.filter((e) => e.category_id === c.id).reduce((a, e) => a + Number(e.amount), 0)
          const bud = Number(c.budget) || 0
          return (
            <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '9px 0' }}>
              <span style={{ width: 110, fontWeight: 600, fontSize: 13 }}>{c.name}</span>
              <div className="bar" style={{ flex: 1, margin: 0 }}><i style={{ width: (bud ? Math.min(sp / bud * 100, 100) : (sp ? 100 : 0)) + '%', background: c.color }} /></div>
              <b className="mono" style={{ width: 130, textAlign: 'right', fontSize: 12 }}>{money(sp)} / {money(bud)}</b>
            </div>
          )
        })}
      </div>
    </>
  )
}
