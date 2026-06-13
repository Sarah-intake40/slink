import { PRIORITIES } from './Bits'

export default function ViewControls({ view, members, q, setQ, fAssignee, setFAssignee, fPriority, setFPriority, sortBy, setSortBy, groupBy, setGroupBy }) {
  return (
    <div className="vc">
      <input className="vc-search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search tasks…" />

      {view === 'list' && (
        <label className="vc-ctl"><span>Group</span>
          <select value={groupBy} onChange={(e) => setGroupBy(e.target.value)}>
            <option value="status">Status</option>
            <option value="assignee">Assignee</option>
            <option value="priority">Priority</option>
            <option value="none">None</option>
          </select>
        </label>
      )}

      <label className="vc-ctl"><span>Sort</span>
        <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
          <option value="manual">Default</option>
          <option value="due">Due date</option>
          <option value="priority">Priority</option>
          <option value="name">Name</option>
          <option value="created">Created</option>
        </select>
      </label>

      <label className="vc-ctl"><span>Assignee</span>
        <select value={fAssignee} onChange={(e) => setFAssignee(e.target.value)}>
          <option value="">Anyone</option>
          {members.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
        </select>
      </label>

      <label className="vc-ctl"><span>Priority</span>
        <select value={fPriority} onChange={(e) => setFPriority(e.target.value)}>
          <option value="">Any</option>
          {PRIORITIES.map((p) => <option key={p.k} value={p.k}>{p.n}</option>)}
        </select>
      </label>

      {(q || fAssignee || fPriority) && (
        <button className="vc-clear" onClick={() => { setQ(''); setFAssignee(''); setFPriority('') }}>Clear</button>
      )}
    </div>
  )
}
