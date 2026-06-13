import { useEffect, useState, useCallback, useMemo } from 'react'
import { useAuth } from '../auth'
import { useWorkspace } from '../workspace'
import * as api from '../api'
import { invoiceAmounts, invStatus } from '../finance'
import { fmtDate, num, todayISO } from '../components/Bits'

const STR = {
  daily: { en: 'Daily Progress Report', ar: 'تقرير التقدم اليومي' },
  budget: { en: 'Cost & Invoice Report', ar: 'تقرير التكاليف والفواتير' },
  project: { en: 'Project Report', ar: 'تقرير المشروع' },
  projectLabel: { en: 'Project', ar: 'المشروع' }, date: { en: 'Date', ar: 'التاريخ' },
  preparedBy: { en: 'Prepared by', ar: 'أعدّه' }, generated: { en: 'Generated', ar: 'تاريخ الإصدار' },
  intro: { en: 'Introduction', ar: 'مقدمة' }, summary: { en: 'Summary', ar: 'ملخص' },
  tasks: { en: 'Tasks', ar: 'المهام' }, task: { en: 'Task', ar: 'المهمة' }, status: { en: 'Status', ar: 'الحالة' },
  assignee: { en: 'Assignee', ar: 'المسؤول' }, list: { en: 'List', ar: 'القائمة' },
  start: { en: 'Start', ar: 'البداية' }, due: { en: 'Due', ar: 'الاستحقاق' }, priority: { en: 'Priority', ar: 'الأولوية' },
  totalTasks: { en: 'Total tasks', ar: 'إجمالي المهام' }, completed: { en: 'Completed', ar: 'مكتملة' },
  inProgress: { en: 'In progress', ar: 'قيد التنفيذ' }, overdue: { en: 'Overdue', ar: 'متأخرة' }, progress: { en: 'Progress', ar: 'نسبة الإنجاز' },
  financial: { en: 'Financial summary', ar: 'الملخص المالي' }, budgetL: { en: 'Budget', ar: 'الميزانية' },
  spent: { en: 'Spent', ar: 'المصروف' }, remaining: { en: 'Remaining', ar: 'المتبقي' },
  claimed: { en: 'Claimed', ar: 'إجمالي المطالبات' }, received: { en: 'Received', ar: 'المحصّل' }, outstanding: { en: 'Outstanding', ar: 'المستحق' },
  expenses: { en: 'Expenses', ar: 'المصروفات' }, category: { en: 'Category', ar: 'التصنيف' },
  description: { en: 'Description', ar: 'الوصف' }, amount: { en: 'Amount', ar: 'المبلغ' },
  invoices: { en: 'Invoices', ar: 'الفواتير' }, no: { en: 'No.', ar: 'رقم' },
  currentWorks: { en: 'Current works', ar: 'أعمال المستخلص' }, totalDue: { en: 'Total due', ar: 'الإجمالي المستحق' },
  spendByCat: { en: 'Spend by category', ar: 'المصروفات حسب التصنيف' }, none: { en: 'No data.', ar: 'لا توجد بيانات.' },
  printBtn: { en: 'Print / Save PDF', ar: 'طباعة / حفظ PDF' }, reportType: { en: 'Report type', ar: 'نوع التقرير' },
  language: { en: 'Language', ar: 'اللغة' }, total: { en: 'Total', ar: 'الإجمالي' }, unassigned: { en: 'Unassigned', ar: 'غير مُسند' },
  introPh: { en: 'Write an introduction / notes to appear at the top of the report…', ar: 'اكتب مقدمة أو ملاحظات تظهر في بداية التقرير…' },
}

const m2 = (v) => 'SAR ' + (Number(v) || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

export default function ReportsPage() {
  const { profile } = useAuth()
  const { ws, spaces, lists, members } = useWorkspace()
  const [type, setType] = useState('daily')
  const [lang, setLang] = useState('en')
  const [intro, setIntro] = useState('')
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const t = (k) => STR[k]?.[lang] ?? k

  const load = useCallback(async () => {
    if (!ws) return
    const listIds = lists.map((l) => l.id), spaceIds = spaces.map((s) => s.id)
    const [ts, st, ex, iv, cc] = await Promise.all([
      listIds.length ? api.getTasksInLists(listIds) : Promise.resolve({ data: [] }),
      spaceIds.length ? api.getStatusesInSpaces(spaceIds) : Promise.resolve({ data: [] }),
      api.getExpenses(ws.id), api.getInvoices(ws.id), api.getCostCategories(ws.id),
    ])
    setData({
      tasks: (ts.data || []).filter((x) => !x.parent_id).map((x) => ({ ...x, assignees: (x.task_assignees || []).map((a) => a.user_id) })),
      statuses: st.data || [], expenses: ex.data || [], invoices: iv.data || [], cats: cc.data || [],
    })
    setLoading(false)
  }, [ws, lists, spaces])
  useEffect(() => { load() }, [load])

  const fin = useMemo(() => {
    if (!data) return null
    const budget = num(ws?.budget)
    const spent = data.expenses.reduce((a, e) => a + num(e.amount), 0)
    const amts = data.invoices.map(invoiceAmounts)
    const claimed = amts.reduce((a, x) => a + x.totalDue, 0)
    const received = data.invoices.filter((i) => i.status === 'received').reduce((a, i) => a + invoiceAmounts(i).totalDue, 0)
    return { budget, spent, remaining: budget - spent, claimed, received, outstanding: claimed - received }
  }, [data, ws])

  if (loading || !data) return <div className="spin" />

  const statusOf = (id) => data.statuses.find((s) => s.id === id)
  const isDone = (id) => { const ty = statusOf(id)?.type; return ty === 'done' || ty === 'closed' }
  const listOf = (id) => lists.find((l) => l.id === id)
  const nameOf = (id) => members.find((m) => m.id === id)?.name
  const catOf = (id) => data.cats.find((c) => c.id === id)

  const total = data.tasks.length
  const done = data.tasks.filter((x) => isDone(x.status_id)).length
  const prog = total ? Math.round(done / total * 100) : 0
  const active = data.tasks.filter((x) => statusOf(x.status_id)?.type === 'active').length
  const today = todayISO()
  const overdue = data.tasks.filter((x) => x.due_date && String(x.due_date).slice(0, 10) < today && !isDone(x.status_id)).length

  const title = t(type)

  const TasksTable = () => (
    <table className="rep-tbl"><thead><tr>
      <th>{t('task')}</th><th>{t('list')}</th><th>{t('status')}</th><th>{t('assignee')}</th><th>{t('start')}</th><th>{t('due')}</th>
    </tr></thead><tbody>
      {data.tasks.map((x) => {
        const s = statusOf(x.status_id)
        return <tr key={x.id}>
          <td>{x.name}</td><td>{listOf(x.list_id)?.name || '—'}</td>
          <td>{s ? <span className="rep-pill" style={{ background: s.color + '22', color: s.color }}>{s.name}</span> : '—'}</td>
          <td>{x.assignees.map(nameOf).filter(Boolean).join(', ') || t('unassigned')}</td>
          <td>{fmtDate(x.start_date) || '—'}</td><td>{fmtDate(x.due_date) || '—'}</td>
        </tr>
      })}
      {!data.tasks.length && <tr><td colSpan={6} style={{ textAlign: 'center', color: '#888' }}>{t('none')}</td></tr>}
    </tbody></table>
  )

  const FinSummary = () => (
    <div className="rep-kpi">
      {[['budgetL', fin.budget], ['spent', fin.spent], ['remaining', fin.remaining], ['claimed', fin.claimed], ['received', fin.received], ['outstanding', fin.outstanding]].map(([k, v]) => (
        <div key={k} className="rep-kpi-c"><div className="rep-kpi-v">{m2(v)}</div><div className="rep-kpi-l">{t(k)}</div></div>
      ))}
    </div>
  )

  const ExpensesTable = () => {
    const totalSpent = data.expenses.reduce((a, e) => a + num(e.amount), 0)
    return (
      <table className="rep-tbl"><thead><tr><th>{t('date')}</th><th>{t('category')}</th><th>{t('description')}</th><th>{t('amount')}</th></tr></thead>
        <tbody>
          {data.expenses.map((e) => <tr key={e.id}><td>{fmtDate(e.spent_on)}</td><td>{catOf(e.category_id)?.name || '—'}</td><td>{e.description || '—'}</td><td className="num">{m2(e.amount)}</td></tr>)}
          {!data.expenses.length && <tr><td colSpan={4} style={{ textAlign: 'center', color: '#888' }}>{t('none')}</td></tr>}
          {data.expenses.length > 0 && <tr className="rep-total"><td colSpan={3}>{t('total')}</td><td className="num">{m2(totalSpent)}</td></tr>}
        </tbody></table>
    )
  }

  const InvoicesTable = () => (
    <table className="rep-tbl"><thead><tr><th>{t('no')}</th><th>{t('date')}</th><th>{t('currentWorks')}</th><th>{t('totalDue')}</th><th>{t('status')}</th></tr></thead>
      <tbody>
        {data.invoices.map((i) => { const a = invoiceAmounts(i), s = invStatus(i.status); return (
          <tr key={i.id}><td>{i.seq}</td><td>{fmtDate(i.invoice_date)}</td><td className="num">{m2(a.current)}</td><td className="num">{m2(a.totalDue)}</td><td>{lang === 'ar' ? s.ar : s.en}</td></tr>
        )})}
        {!data.invoices.length && <tr><td colSpan={5} style={{ textAlign: 'center', color: '#888' }}>{t('none')}</td></tr>}
      </tbody></table>
  )

  const SpendByCat = () => {
    const totalSpent = data.expenses.reduce((a, e) => a + num(e.amount), 0)
    return (
      <table className="rep-tbl"><thead><tr><th>{t('category')}</th><th>{t('amount')}</th><th>%</th></tr></thead><tbody>
        {data.cats.map((c) => { const sp = data.expenses.filter((e) => e.category_id === c.id).reduce((a, e) => a + num(e.amount), 0)
          return <tr key={c.id}><td><span style={{ color: c.color }}>●</span> {c.name}</td><td className="num">{m2(sp)}</td><td className="num">{totalSpent ? Math.round(sp / totalSpent * 100) : 0}%</td></tr> })}
      </tbody></table>
    )
  }

  return (
    <>
      <div className="rep-controls">
        <div className="list-head">
          <div><div className="crumb">Reports · التقارير</div><h2>Reports</h2></div>
          <button className="btn" style={{ marginLeft: 'auto' }} onClick={() => window.print()}>🖨 {t('printBtn')}</button>
        </div>
        <div className="vc" style={{ borderBottom: 'none' }}>
          <label className="vc-ctl"><span>{t('reportType')}</span>
            <select value={type} onChange={(e) => setType(e.target.value)}>
              <option value="daily">{STR.daily[lang]}</option>
              <option value="budget">{STR.budget[lang]}</option>
              <option value="project">{STR.project[lang]}</option>
            </select></label>
          <label className="vc-ctl"><span>{t('language')}</span>
            <select value={lang} onChange={(e) => setLang(e.target.value)}>
              <option value="en">English</option><option value="ar">العربية</option>
            </select></label>
        </div>
        <textarea className="rep-intro-input" rows={3} value={intro} onChange={(e) => setIntro(e.target.value)} placeholder={t('introPh')} dir={lang === 'ar' ? 'rtl' : 'ltr'} />
      </div>

      {/* the printable document */}
      <div className="report-doc" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
        <div className="rep-head">
          <div>
            <div className="rep-kicker">{t('projectLabel')}</div>
            <h1>{ws?.name}</h1>
          </div>
          <div className="rep-meta">
            <div className="rep-title">{title}</div>
            <div>{t('date')}: {fmtDate(today)}</div>
            <div>{t('preparedBy')}: {profile?.full_name || '—'}</div>
          </div>
        </div>

        {intro.trim() && (
          <div className="rep-sec"><h3>{t('intro')}</h3><p className="rep-intro" style={{ whiteSpace: 'pre-wrap' }}>{intro}</p></div>
        )}

        {(type === 'daily' || type === 'project') && (
          <div className="rep-sec">
            <h3>{t('summary')}</h3>
            <div className="rep-kpi">
              <div className="rep-kpi-c"><div className="rep-kpi-v">{total}</div><div className="rep-kpi-l">{t('totalTasks')}</div></div>
              <div className="rep-kpi-c"><div className="rep-kpi-v">{done}</div><div className="rep-kpi-l">{t('completed')}</div></div>
              <div className="rep-kpi-c"><div className="rep-kpi-v">{active}</div><div className="rep-kpi-l">{t('inProgress')}</div></div>
              <div className="rep-kpi-c"><div className="rep-kpi-v">{overdue}</div><div className="rep-kpi-l">{t('overdue')}</div></div>
              <div className="rep-kpi-c"><div className="rep-kpi-v">{prog}%</div><div className="rep-kpi-l">{t('progress')}</div></div>
            </div>
          </div>
        )}

        {(type === 'daily' || type === 'project') && (
          <div className="rep-sec"><h3>{t('tasks')}</h3><TasksTable /></div>
        )}

        {(type === 'budget' || type === 'project') && fin && (
          <>
            <div className="rep-sec"><h3>{t('financial')}</h3><FinSummary /></div>
            <div className="rep-sec"><h3>{t('spendByCat')}</h3><SpendByCat /></div>
            <div className="rep-sec"><h3>{t('expenses')}</h3><ExpensesTable /></div>
            <div className="rep-sec"><h3>{t('invoices')}</h3><InvoicesTable /></div>
          </>
        )}

        <div className="rep-foot">S Link · {ws?.name} · {t('generated')}: {new Date().toLocaleString(lang === 'ar' ? 'ar-EG' : 'en-GB')}</div>
      </div>
    </>
  )
}
