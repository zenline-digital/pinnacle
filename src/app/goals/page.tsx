'use client';
import { useState, useEffect } from 'react';
import AppShell from '@/components/layout/AppShell';
import { CurrencyProvider, useCurrency } from '@/components/CurrencyProvider';

const AREA_ICONS = ['🎯','💰','❤️','🏢','🌱','👨‍👩‍👧','🎓','🏋️','✈️','🏠'];
const AREA_COLORS = ['#6366f1','#c9a84c','#ef4444','#3b82f6','#22c55e','#f59e0b','#8b5cf6','#06b6d4','#ec4899','#84cc16'];

const STATUS_STYLES: Record<string, { label: string; className: string }> = {
  not_started: { label: 'Not Started', className: 'status-todo' },
  in_progress: { label: 'In Progress', className: 'status-progress' },
  done: { label: 'Done', className: 'status-done' },
  paused: { label: 'Paused', className: 'status-paused' },
  todo: { label: 'To Do', className: 'status-todo' },
};

function GoalsContent() {
  const { currency, setCurrency } = useCurrency();
  const [lifeGoal, setLifeGoal] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeArea, setActiveArea] = useState<string | null>(null);
  const [expandedGoals, setExpandedGoals] = useState<Set<string>>(new Set());

  // Modal states
  const [modal, setModal] = useState<string | null>(null);
  const [form, setForm] = useState<any>({});

  useEffect(() => { loadGoals(); }, []);

  async function loadGoals() {
    const res = await fetch('/api/goals');
    const data = await res.json();
    setLifeGoal(data);
    if (data?.areas?.length > 0 && !activeArea) {
      setActiveArea(data.areas[0].id);
    }
    setLoading(false);
  }

  async function saveLifeGoal(e: React.FormEvent) {
    e.preventDefault();
    const method = lifeGoal ? 'PUT' : 'POST';
    const body = lifeGoal ? { ...form, id: lifeGoal.id } : form;
    await fetch('/api/goals', { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    setModal(null);
    loadGoals();
  }

  async function saveArea(e: React.FormEvent) {
    e.preventDefault();
    const method = form.id ? 'PUT' : 'POST';
    const body = form.id ? form : { ...form, life_goal_id: lifeGoal.id, priority_order: lifeGoal.areas?.length || 0 };
    await fetch('/api/goals/areas', { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    setModal(null);
    loadGoals();
  }

  async function saveGoal(e: React.FormEvent) {
    e.preventDefault();
    const method = form.id ? 'PUT' : 'POST';
    const body = form.id ? form : { ...form, area_id: activeArea };
    await fetch('/api/goals/goals', { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    setModal(null);
    loadGoals();
  }

  async function saveMilestone(e: React.FormEvent) {
    e.preventDefault();
    const method = form.id ? 'PUT' : 'POST';
    await fetch('/api/milestones', { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
    setModal(null);
    loadGoals();
  }

  async function saveTask(e: React.FormEvent) {
    e.preventDefault();
    const method = form.id ? 'PUT' : 'POST';
    await fetch('/api/tasks', { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
    setModal(null);
    loadGoals();
  }

  async function updateTaskStatus(taskId: string, status: string, task: any) {
    await fetch('/api/tasks', { method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...task, id: taskId, status }) });
    loadGoals();
  }

  async function updateGoalStatus(goalId: string, status: string, goal: any) {
    await fetch('/api/goals/goals', { method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...goal, id: goalId, status }) });
    loadGoals();
  }

  async function deleteItem(url: string, id: string) {
    if (!confirm('Delete this item and everything inside it?')) return;
    await fetch(url, { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) });
    loadGoals();
  }

  const toggleGoal = (id: string) => {
    setExpandedGoals(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  };

  const currentArea = lifeGoal?.areas?.find((a: any) => a.id === activeArea);

  // Progress calculation
  function calcProgress(goals: any[]): number {
    if (!goals?.length) return 0;
    const done = goals.filter(g => g.status === 'done').length;
    return Math.round((done / goals.length) * 100);
  }

  return (
    <AppShell currency={currency} onCurrencyChange={setCurrency}>
      <div className="p-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="font-display text-2xl font-bold">Life Goal Planner</h1>
            <p className="text-sm mt-1" style={{ color: 'rgba(255,255,255,0.4)' }}>Your complete life roadmap</p>
          </div>
          <button className="btn-gold text-sm" onClick={() => { setForm(lifeGoal ? { ...lifeGoal } : {}); setModal('lifeGoal'); }}>
            {lifeGoal ? '✏️ Edit Life Goal' : '✨ Create Life Goal'}
          </button>
        </div>

        {loading ? (
          <p className="text-center py-20" style={{ color: 'rgba(255,255,255,0.3)' }}>Loading...</p>
        ) : !lifeGoal ? (
          <div className="card p-16 text-center">
            <div className="text-5xl mb-4">🎯</div>
            <h2 className="font-display text-xl font-bold mb-3">Define Your Life Goal</h2>
            <p className="text-sm mb-6 max-w-md mx-auto" style={{ color: 'rgba(255,255,255,0.4)' }}>
              Start by setting your master life goal — the big picture. Everything else flows from here.
            </p>
            <button className="btn-gold" onClick={() => { setForm({}); setModal('lifeGoal'); }}>
              Create Life Goal
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-5">
            {/* Life goal + areas sidebar */}
            <div className="lg:col-span-1 space-y-4">
              {/* Life goal card */}
              <div className="card p-4" style={{ borderColor: 'rgba(201,168,76,0.3)' }}>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg">🌟</span>
                  <span className="text-xs font-semibold gold-gradient uppercase tracking-wider">Life Goal</span>
                </div>
                <h2 className="font-display font-bold leading-snug">{lifeGoal.title}</h2>
                {lifeGoal.target_year && (
                  <p className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.4)' }}>Target: {lifeGoal.target_year}</p>
                )}
                {lifeGoal.vision_statement && (
                  <p className="text-xs mt-2 italic" style={{ color: 'rgba(255,255,255,0.45)' }}>"{lifeGoal.vision_statement}"</p>
                )}
              </div>

              {/* Goal areas */}
              <div className="card p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-display font-semibold text-sm">Areas</h3>
                  <button onClick={() => { setForm({ icon: '🎯', color: '#6366f1' }); setModal('area'); }}
                    className="text-xs" style={{ color: '#c9a84c' }}>+ Add</button>
                </div>
                <div className="space-y-1">
                  {lifeGoal.areas?.map((area: any) => {
                    const prog = calcProgress(area.goals);
                    return (
                      <button key={area.id} onClick={() => setActiveArea(area.id)}
                        className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-left transition-all text-sm"
                        style={{ background: activeArea === area.id ? `${area.color}20` : 'transparent', color: activeArea === area.id ? area.color : 'rgba(255,255,255,0.6)' }}>
                        <span className="text-base">{area.icon}</span>
                        <span className="flex-1 font-medium">{area.name}</span>
                        <span className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>{prog}%</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Goals and milestones */}
            <div className="lg:col-span-3">
              {currentArea ? (
                <div className="card p-5">
                  <div className="flex items-center justify-between mb-5">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{currentArea.icon}</span>
                      <div>
                        <h2 className="font-display font-bold text-lg">{currentArea.name}</h2>
                        <p className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>
                          {currentArea.goals?.length || 0} goals · {calcProgress(currentArea.goals)}% done
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => { setForm({ icon: currentArea.icon, color: currentArea.color, id: currentArea.id, name: currentArea.name }); setModal('area'); }}
                        className="btn-ghost text-xs px-3 py-1.5">Edit Area</button>
                      <button onClick={() => { setForm({ status: 'not_started', priority: 'medium' }); setModal('goal'); }}
                        className="btn-gold text-xs">+ Add Goal</button>
                    </div>
                  </div>

                  {/* Goals list */}
                  {currentArea.goals?.length === 0 ? (
                    <div className="text-center py-10">
                      <p className="text-sm mb-3" style={{ color: 'rgba(255,255,255,0.3)' }}>No goals in this area yet</p>
                      <button className="btn-gold text-sm" onClick={() => { setForm({ status: 'not_started', priority: 'medium' }); setModal('goal'); }}>
                        Add First Goal
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {currentArea.goals?.map((goal: any) => (
                        <div key={goal.id} className="card-2 overflow-hidden">
                          {/* Goal header */}
                          <div className="flex items-center gap-3 p-4">
                            <button onClick={() => toggleGoal(goal.id)} className="shrink-0"
                              style={{ color: 'rgba(255,255,255,0.3)' }}>
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                {expandedGoals.has(goal.id) ? <path d="M18 15l-6-6-6 6"/> : <path d="M6 9l6 6 6-6"/>}
                              </svg>
                            </button>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-semibold text-sm">{goal.title}</span>
                                <select value={goal.status}
                                  onChange={e => updateGoalStatus(goal.id, e.target.value, goal)}
                                  className="text-xs py-0.5 px-2 rounded-lg" style={{ width: 'auto', padding: '2px 8px' }}>
                                  <option value="not_started">Not Started</option>
                                  <option value="in_progress">In Progress</option>
                                  <option value="done">Done</option>
                                  <option value="paused">Paused</option>
                                </select>
                                {goal.priority === 'high' && <span className="text-xs px-2 py-0.5 rounded-full bg-red-500/20 text-red-400">High Priority</span>}
                              </div>
                              {goal.target_date && (
                                <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.35)' }}>
                                  Target: {new Date(goal.target_date).toLocaleDateString('en-AE', { month: 'short', year: 'numeric' })}
                                </p>
                              )}
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <button onClick={() => { setForm({ ...goal }); setModal('goal'); }}
                                className="text-xs px-2 py-1 rounded-lg hover:bg-white/10 transition-colors"
                                style={{ color: 'rgba(255,255,255,0.4)' }}>✏️</button>
                              <button onClick={() => { setForm({ goal_id: goal.id, status: 'not_started', order_index: goal.milestones?.length || 0 }); setModal('milestone'); }}
                                className="text-xs px-2 py-1 rounded-lg hover:bg-white/10 transition-colors"
                                style={{ color: '#c9a84c' }}>+ Milestone</button>
                              <button onClick={() => deleteItem('/api/goals/goals', goal.id)}
                                className="text-xs px-2 py-1 rounded-lg hover:bg-red-500/10 transition-colors"
                                style={{ color: 'rgba(255,255,255,0.25)' }}>✕</button>
                            </div>
                          </div>

                          {/* Milestones */}
                          {expandedGoals.has(goal.id) && (
                            <div className="border-t px-4 pb-4 pt-3 space-y-3" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
                              {goal.milestones?.length === 0 && (
                                <p className="text-xs text-center py-2" style={{ color: 'rgba(255,255,255,0.25)' }}>
                                  No milestones yet — add one to track progress
                                </p>
                              )}
                              {goal.milestones?.map((ms: any) => (
                                <div key={ms.id} className="border rounded-xl p-3" style={{ borderColor: 'rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.02)' }}>
                                  <div className="flex items-center gap-2 mb-2">
                                    <span className="text-sm">🏁</span>
                                    <span className="text-sm font-medium">{ms.title}</span>
                                    <select value={ms.status}
                                      onChange={async e => { await fetch('/api/milestones', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...ms, status: e.target.value }) }); loadGoals(); }}
                                      className="text-xs py-0.5 px-2 rounded-lg ml-auto" style={{ width: 'auto', padding: '2px 8px' }}>
                                      <option value="not_started">Not Started</option>
                                      <option value="in_progress">In Progress</option>
                                      <option value="done">Done</option>
                                    </select>
                                    <button onClick={() => { setForm({ milestone_id: ms.id, priority: 'medium', status: 'todo' }); setModal('task'); }}
                                      className="text-xs" style={{ color: '#c9a84c' }}>+ Task</button>
                                    <button onClick={() => deleteItem('/api/milestones', ms.id)}
                                      className="text-xs" style={{ color: 'rgba(255,255,255,0.2)' }}>✕</button>
                                  </div>
                                  {ms.due_date && (
                                    <p className="text-xs mb-2 ml-6" style={{ color: 'rgba(255,255,255,0.35)' }}>
                                      Due: {new Date(ms.due_date).toLocaleDateString('en-AE', { month: 'short', day: 'numeric', year: 'numeric' })}
                                    </p>
                                  )}
                                  {/* Tasks */}
                                  {ms.tasks?.length > 0 && (
                                    <div className="ml-6 space-y-1.5">
                                      {ms.tasks.map((task: any) => (
                                        <div key={task.id} className="flex items-center gap-2 group">
                                          <button onClick={() => updateTaskStatus(task.id, task.status === 'done' ? 'todo' : 'done', task)}
                                            className="w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-all"
                                            style={{ borderColor: task.status === 'done' ? '#22c55e' : 'rgba(255,255,255,0.2)', background: task.status === 'done' ? '#22c55e' : 'transparent' }}>
                                            {task.status === 'done' && <svg width="10" height="10" viewBox="0 0 12 12" fill="none"><path d="M2 6l3 3 5-5" stroke="white" strokeWidth="2" strokeLinecap="round"/></svg>}
                                          </button>
                                          <span className="text-xs flex-1" style={{ color: task.status === 'done' ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.7)', textDecoration: task.status === 'done' ? 'line-through' : 'none' }}>
                                            {task.title}
                                          </span>
                                          {task.due_date && (
                                            <span className="text-xs" style={{ color: 'rgba(255,255,255,0.25)' }}>
                                              {new Date(task.due_date).toLocaleDateString('en-AE', { month: 'short', day: 'numeric' })}
                                            </span>
                                          )}
                                          <button onClick={() => deleteItem('/api/tasks', task.id)}
                                            className="text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                                            style={{ color: 'rgba(255,255,255,0.3)' }}>✕</button>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="card p-16 text-center">
                  <p style={{ color: 'rgba(255,255,255,0.3)' }}>Select or add a goal area to get started</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── Modals ── */}
      {modal === 'lifeGoal' && (
        <GoalModal title={lifeGoal ? 'Edit Life Goal' : 'Create Your Life Goal'} onClose={() => setModal(null)}>
          <form onSubmit={saveLifeGoal} className="space-y-4">
            <div><label>Life Goal Title *</label>
              <input value={form.title || ''} onChange={e => setForm((f: any) => ({ ...f, title: e.target.value }))} placeholder="e.g. Financial Freedom & Family Prosperity" required/></div>
            <div><label>Vision Statement</label>
              <textarea value={form.vision_statement || ''} onChange={e => setForm((f: any) => ({ ...f, vision_statement: e.target.value }))} placeholder="In 5 years, I want to..." rows={3}/></div>
            <div><label>Description</label>
              <textarea value={form.description || ''} onChange={e => setForm((f: any) => ({ ...f, description: e.target.value }))} placeholder="What does achieving this goal mean to you?" rows={2}/></div>
            <div><label>Target Year</label>
              <input type="number" value={form.target_year || ''} onChange={e => setForm((f: any) => ({ ...f, target_year: parseInt(e.target.value) }))} placeholder="2030" min="2024" max="2050"/></div>
            <div className="flex gap-3 pt-2">
              <button type="submit" className="btn-gold flex-1">Save Life Goal</button>
              <button type="button" className="btn-ghost flex-1" onClick={() => setModal(null)}>Cancel</button>
            </div>
          </form>
        </GoalModal>
      )}

      {modal === 'area' && (
        <GoalModal title={form.id ? 'Edit Goal Area' : 'Add Goal Area'} onClose={() => setModal(null)}>
          <form onSubmit={saveArea} className="space-y-4">
            <div><label>Area Name *</label>
              <input value={form.name || ''} onChange={e => setForm((f: any) => ({ ...f, name: e.target.value }))} placeholder="e.g. Financial, Health, Career..." required/></div>
            <div><label>Icon</label>
              <div className="flex flex-wrap gap-2 mt-1">
                {AREA_ICONS.map(icon => (
                  <button type="button" key={icon} onClick={() => setForm((f: any) => ({ ...f, icon }))}
                    className="w-9 h-9 rounded-lg text-lg flex items-center justify-center transition-all"
                    style={{ background: form.icon === icon ? 'rgba(201,168,76,0.2)' : 'rgba(255,255,255,0.07)', border: form.icon === icon ? '1px solid #c9a84c' : '1px solid transparent' }}>
                    {icon}
                  </button>
                ))}
              </div>
            </div>
            <div><label>Color</label>
              <div className="flex flex-wrap gap-2 mt-1">
                {AREA_COLORS.map(color => (
                  <button type="button" key={color} onClick={() => setForm((f: any) => ({ ...f, color }))}
                    className="w-8 h-8 rounded-lg border-2 transition-all"
                    style={{ background: color, borderColor: form.color === color ? 'white' : 'transparent' }}/>
                ))}
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <button type="submit" className="btn-gold flex-1">{form.id ? 'Save' : 'Add Area'}</button>
              <button type="button" className="btn-ghost flex-1" onClick={() => setModal(null)}>Cancel</button>
            </div>
          </form>
        </GoalModal>
      )}

      {modal === 'goal' && (
        <GoalModal title={form.id ? 'Edit Goal' : 'Add Goal'} onClose={() => setModal(null)}>
          <form onSubmit={saveGoal} className="space-y-4">
            <div><label>Goal Title *</label>
              <input value={form.title || ''} onChange={e => setForm((f: any) => ({ ...f, title: e.target.value }))} placeholder="e.g. Save AED 100,000 by 2026" required/></div>
            <div><label>Description</label>
              <textarea value={form.description || ''} onChange={e => setForm((f: any) => ({ ...f, description: e.target.value }))} placeholder="Details about this goal..." rows={2}/></div>
            <div className="grid grid-cols-2 gap-3">
              <div><label>Target Date</label>
                <input type="date" value={form.target_date || ''} onChange={e => setForm((f: any) => ({ ...f, target_date: e.target.value }))}/></div>
              <div><label>Status</label>
                <select value={form.status || 'not_started'} onChange={e => setForm((f: any) => ({ ...f, status: e.target.value }))}>
                  <option value="not_started">Not Started</option>
                  <option value="in_progress">In Progress</option>
                  <option value="done">Done</option>
                  <option value="paused">Paused</option>
                </select></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><label>Priority</label>
                <select value={form.priority || 'medium'} onChange={e => setForm((f: any) => ({ ...f, priority: e.target.value }))}>
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select></div>
              <div><label>Linked Amount (AED)</label>
                <input type="number" value={form.linked_amount || ''} onChange={e => setForm((f: any) => ({ ...f, linked_amount: e.target.value }))} placeholder="0"/></div>
            </div>
            <div className="flex gap-3 pt-2">
              <button type="submit" className="btn-gold flex-1">{form.id ? 'Save' : 'Add Goal'}</button>
              <button type="button" className="btn-ghost flex-1" onClick={() => setModal(null)}>Cancel</button>
            </div>
          </form>
        </GoalModal>
      )}

      {modal === 'milestone' && (
        <GoalModal title="Add Milestone" onClose={() => setModal(null)}>
          <form onSubmit={saveMilestone} className="space-y-4">
            <div><label>Milestone Title *</label>
              <input value={form.title || ''} onChange={e => setForm((f: any) => ({ ...f, title: e.target.value }))} placeholder="e.g. Open dedicated savings account" required/></div>
            <div><label>Description</label>
              <textarea value={form.description || ''} onChange={e => setForm((f: any) => ({ ...f, description: e.target.value }))} placeholder="What needs to happen?" rows={2}/></div>
            <div><label>Due Date</label>
              <input type="date" value={form.due_date || ''} onChange={e => setForm((f: any) => ({ ...f, due_date: e.target.value }))}/></div>
            <div className="flex gap-3 pt-2">
              <button type="submit" className="btn-gold flex-1">Add Milestone</button>
              <button type="button" className="btn-ghost flex-1" onClick={() => setModal(null)}>Cancel</button>
            </div>
          </form>
        </GoalModal>
      )}

      {modal === 'task' && (
        <GoalModal title="Add Task" onClose={() => setModal(null)}>
          <form onSubmit={saveTask} className="space-y-4">
            <div><label>Task *</label>
              <input value={form.title || ''} onChange={e => setForm((f: any) => ({ ...f, title: e.target.value }))} placeholder="e.g. Transfer AED 1,000 this month" required/></div>
            <div><label>Note</label>
              <input value={form.note || ''} onChange={e => setForm((f: any) => ({ ...f, note: e.target.value }))} placeholder="Additional details..."/></div>
            <div className="grid grid-cols-2 gap-3">
              <div><label>Due Date</label>
                <input type="date" value={form.due_date || ''} onChange={e => setForm((f: any) => ({ ...f, due_date: e.target.value }))}/></div>
              <div><label>Priority</label>
                <select value={form.priority || 'medium'} onChange={e => setForm((f: any) => ({ ...f, priority: e.target.value }))}>
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select></div>
            </div>
            <div className="flex gap-3 pt-2">
              <button type="submit" className="btn-gold flex-1">Add Task</button>
              <button type="button" className="btn-ghost flex-1" onClick={() => setModal(null)}>Cancel</button>
            </div>
          </form>
        </GoalModal>
      )}
    </AppShell>
  );
}

function GoalModal({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.75)' }}
         onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="card w-full max-w-md max-h-[90vh] overflow-y-auto scrollbar-thin p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-display font-bold text-lg">{title}</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-white text-xl leading-none">×</button>
        </div>
        {children}
      </div>
    </div>
  );
}

export default function GoalsPage() {
  return (
    <CurrencyProvider>
      <GoalsContent />
    </CurrencyProvider>
  );
}
