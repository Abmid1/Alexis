'use client';
import { useEffect, useState } from 'react';
import { Tag } from '@/components/ui/Tag';
import { Modal } from '@/components/ui/Modal';
import { api } from '@/lib/api';
import { FollowUp } from '@/lib/types';

interface FollowUpsProps { showModal: boolean; onModalClose: () => void; }

type TabType = 'tasks' | 'ai-sent';

// ── Time ago helper ───────────────────────────────────────────────────────────
function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins  = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days  = Math.floor(diff / 86400000);
  if (mins < 60)  return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
}

// ── Status colour for follow-up number ───────────────────────────────────────
const statusColor: Record<string, string> = {
  Hot: '#F87171', Warm: '#FBBF24', New: '#34D399', Cold: '#60A5FA',
};

export default function FollowUps({ showModal, onModalClose }: FollowUpsProps) {
  const [tab, setTab]           = useState<TabType>('tasks');
  const [followUps, setFollowUps] = useState<FollowUp[]>([]);
  const [aiLogs, setAiLogs]     = useState<any[]>([]);
  const [form, setForm]         = useState({ title: '', subtitle: '', time: '' });
  const [saving, setSaving]     = useState(false);
  const [triggering, setTriggering] = useState(false);

  useEffect(() => {
    api.followups.list().then(data => {
      setFollowUps(data.followUps || []);
    }).catch(() => {});

    api.autoFollowups.list().then(setAiLogs).catch(() => {});
  }, []);

  const toggle = async (id: string, completed: boolean) => {
    await api.followups.update(id, { completed: !completed }).catch(() => {});
    setFollowUps(prev => prev.map(f =>
      f.id === id ? { ...f, completed: !completed, status: !completed ? 'Done' : 'Scheduled' } : f
    ));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const task = await api.followups.create(form);
      setFollowUps(prev => [...prev, task]);
      onModalClose();
      setForm({ title: '', subtitle: '', time: '' });
    } finally { setSaving(false); }
  };

  const triggerJob = async () => {
    setTriggering(true);
    try {
      await api.autoFollowups.triggerRun();
      // Reload logs after a short delay
      setTimeout(() => {
        api.autoFollowups.list().then(setAiLogs).catch(() => {});
        setTriggering(false);
      }, 3000);
    } catch { setTriggering(false); }
  };

  const completedCount = followUps.filter(f => f.completed).length;
  const pendingCount   = followUps.filter(f => !f.completed).length;
  const repliedCount   = aiLogs.filter(l => l.replied).length;

  return (
    <div>

      {/* ── Stats ──────────────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10, marginBottom: 16 }}>
        {[
          { label: 'Pending tasks',   val: pendingCount,        change: 'Your manual tasks' },
          { label: 'Completed today', val: completedCount,      change: 'Ticked off' },
          { label: 'AI follow-ups',   val: aiLogs.length,       change: 'Auto-sent by AI' },
          { label: 'Replied',         val: repliedCount,        change: `${aiLogs.length ? Math.round(repliedCount / aiLogs.length * 100) : 0}% response rate` },
        ].map(m => (
          <div key={m.label} className="metric-card">
            <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 3 }}>{m.label}</div>
            <div style={{ fontSize: 22, fontWeight: 500, color: 'var(--text-primary)', lineHeight: 1 }}>{m.val}</div>
            <div style={{ fontSize: 10, marginTop: 3, color: 'var(--text-muted)' }}>{m.change}</div>
          </div>
        ))}
      </div>

      {/* ── Tabs ───────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 14, alignItems: 'center' }}>
        {([
          { key: 'tasks',   label: `My Tasks (${pendingCount})` },
          { key: 'ai-sent', label: `AI Sent (${aiLogs.length})` },
        ] as { key: TabType; label: string }[]).map(t => (
          <button key={t.key} className={`filter-btn${tab === t.key ? ' sel' : ''}`}
            onClick={() => setTab(t.key)}>
            {t.label}
          </button>
        ))}

        {/* Manual trigger button */}
        {tab === 'ai-sent' && (
          <button
            onClick={triggerJob}
            disabled={triggering}
            style={{
              marginLeft: 'auto',
              fontSize: 10,
              padding: '4px 12px',
              borderRadius: 6,
              border: '1px solid var(--border)',
              background: 'var(--bg-elevated)',
              color: 'var(--text-secondary)',
              cursor: triggering ? 'not-allowed' : 'pointer',
              opacity: triggering ? 0.6 : 1,
            }}
          >
            {triggering ? '⏳ Running…' : '▶ Run AI job now'}
          </button>
        )}
      </div>

      {/* ── My Tasks tab ───────────────────────────────────────────── */}
      {tab === 'tasks' && (
        <div className="card">
          {followUps.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '30px 0', color: 'var(--text-muted)', fontSize: 12 }}>
              No tasks yet — click <strong>+ Add task</strong> to create one
            </div>
          ) : followUps.map(f => (
            <div key={f.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', borderBottom: '1px solid var(--border-subtle)' }}>
              {/* Checkbox */}
              <div
                onClick={() => toggle(f.id, f.completed)}
                style={{
                  width: 17, height: 17,
                  borderRadius: 4,
                  border: f.completed ? 'none' : '1.5px solid var(--border)',
                  flexShrink: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer',
                  background: f.completed ? 'var(--accent)' : 'transparent',
                  transition: 'background 0.15s',
                }}
              >
                {f.completed && (
                  <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                    <path d="M1 4l2 2 4-4" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                )}
              </div>

              <div style={{ flex: 1 }}>
                <div style={{
                  fontSize: 12, fontWeight: 500,
                  color: 'var(--text-primary)',
                  textDecoration: f.completed ? 'line-through' : 'none',
                  opacity: f.completed ? 0.5 : 1,
                }}>
                  {f.title}
                </div>
                {f.subtitle && (
                  <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 1 }}>{f.subtitle}</div>
                )}
              </div>

              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                {f.time && <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 4 }}>{f.time}</div>}
                <Tag label={f.status} />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── AI Sent tab ────────────────────────────────────────────── */}
      {tab === 'ai-sent' && (
        <div>
          {/* Legend */}
          <div style={{ display: 'flex', gap: 16, marginBottom: 10, fontSize: 10, color: 'var(--text-muted)' }}>
            {['Hot', 'Warm', 'New', 'Cold'].map(s => (
              <span key={s} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <span style={{ width: 7, height: 7, borderRadius: '50%', background: statusColor[s], display: 'inline-block' }} />
                {s}
              </span>
            ))}
            <span style={{ marginLeft: 'auto' }}>· AI runs hourly</span>
          </div>

          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            {aiLogs.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)', fontSize: 12 }}>
                <div style={{ fontSize: 24, marginBottom: 10 }}>🤖</div>
                <div style={{ fontWeight: 500, marginBottom: 6, color: 'var(--text-secondary)' }}>No AI follow-ups sent yet</div>
                <div>The AI runs every hour and follows up with leads automatically based on their status and how long they've been quiet.</div>
                <button onClick={triggerJob} disabled={triggering}
                  style={{ marginTop: 14, padding: '6px 16px', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 6, fontSize: 11, cursor: 'pointer', fontWeight: 500 }}>
                  {triggering ? 'Running…' : 'Run now to test'}
                </button>
              </div>
            ) : (
              <table className="table" style={{ margin: 0 }}>
                <thead>
                  <tr>
                    <th style={{ paddingLeft: 16 }}>Customer</th>
                    <th>Platform</th>
                    <th>Status</th>
                    <th>Follow-up #</th>
                    <th>Message sent</th>
                    <th>Replied</th>
                    <th style={{ paddingRight: 16 }}>Sent</th>
                  </tr>
                </thead>
                <tbody>
                  {aiLogs.map((log: any) => (
                    <tr key={log.id}>
                      <td className="bold" style={{ paddingLeft: 16 }}>{log.customerName}</td>
                      <td>
                        <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 4,
                          background: log.platform === 'WhatsApp' ? 'rgba(37,211,102,0.12)' : log.platform === 'Instagram' ? 'rgba(225,48,108,0.12)' : 'rgba(24,119,242,0.12)',
                          color: log.platform === 'WhatsApp' ? '#25D366' : log.platform === 'Instagram' ? '#E1306C' : '#1877F2',
                          fontWeight: 500,
                        }}>
                          {log.platform}
                        </span>
                      </td>
                      <td>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11 }}>
                          <span style={{ width: 7, height: 7, borderRadius: '50%', background: statusColor[log.leadStatus] || '#888', flexShrink: 0 }} />
                          {log.leadStatus}
                        </span>
                      </td>
                      <td>
                        <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--accent-light)' }}>
                          #{log.followUpNumber}
                        </span>
                      </td>
                      <td style={{ maxWidth: 280 }}>
                        <div style={{ fontSize: 11, color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 260 }}>
                          {log.message}
                        </div>
                      </td>
                      <td>
                        <span style={{
                          fontSize: 10, padding: '2px 7px', borderRadius: 4, fontWeight: 500,
                          background: log.replied ? 'rgba(52,211,153,0.12)' : 'rgba(98,98,106,0.12)',
                          color: log.replied ? '#34D399' : 'var(--text-muted)',
                        }}>
                          {log.replied ? '✓ Replied' : 'Waiting'}
                        </span>
                      </td>
                      <td style={{ paddingRight: 16, color: 'var(--text-muted)', fontSize: 10 }}>
                        {log.sentAt ? timeAgo(log.sentAt) : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Rules reference card */}
          <div className="card" style={{ marginTop: 12 }}>
            <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-primary)', marginBottom: 10 }}>
              Follow-up schedule
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10 }}>
              {[
                { status: 'Hot',  color: '#F87171', intervals: ['4 hours', '24 hours', '3 days'],  max: 3 },
                { status: 'Warm', color: '#FBBF24', intervals: ['24 hours', '3 days', '7 days'],   max: 3 },
                { status: 'New',  color: '#34D399', intervals: ['2 hours', '2 days', '7 days'],    max: 3 },
                { status: 'Cold', color: '#60A5FA', intervals: ['7 days', '14 days'],              max: 2 },
              ].map(r => (
                <div key={r.status} style={{ background: 'var(--bg-elevated)', borderRadius: 6, padding: '10px 12px', border: '1px solid var(--border)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: r.color, flexShrink: 0 }} />
                    <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-primary)' }}>{r.status}</span>
                    <span style={{ fontSize: 9, color: 'var(--text-muted)', marginLeft: 'auto' }}>max {r.max}×</span>
                  </div>
                  {r.intervals.map((interval, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4, fontSize: 10, color: 'var(--text-secondary)' }}>
                      <span style={{ fontSize: 9, color: r.color, fontWeight: 600, width: 14 }}>#{i + 1}</span>
                      {interval} of silence
                    </div>
                  ))}
                </div>
              ))}
            </div>
            <div style={{ marginTop: 10, fontSize: 10, color: 'var(--text-muted)' }}>
              ⚡ Qualified leads are never auto-messaged — you handle those personally. AI stops if the customer replies or asks for a human.
            </div>
          </div>
        </div>
      )}

      {/* ── Add Task Modal ──────────────────────────────────────────── */}
      {showModal && (
        <Modal title="Add Task" onClose={onModalClose}>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Task *</label>
              <input className="form-input" required value={form.title}
                onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
                placeholder="e.g. Call Kofi Mensah" />
            </div>
            <div className="form-group">
              <label className="form-label">Details</label>
              <input className="form-input" value={form.subtitle}
                onChange={e => setForm(p => ({ ...p, subtitle: e.target.value }))}
                placeholder="e.g. Discuss viewing options" />
            </div>
            <div className="form-group">
              <label className="form-label">Time</label>
              <input className="form-input" value={form.time}
                onChange={e => setForm(p => ({ ...p, time: e.target.value }))}
                placeholder="e.g. 3:00 PM" />
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 16 }}>
              <button type="button" className="btn" onClick={onModalClose}>Cancel</button>
              <button type="submit" className="btn btn-green" disabled={saving}>
                {saving ? 'Saving…' : 'Add Task'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
