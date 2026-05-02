'use client';
import { useEffect, useState } from 'react';
import { MetricCard } from '@/components/ui/MetricCard';
import { Tag } from '@/components/ui/Tag';
import { Modal } from '@/components/ui/Modal';
import { api } from '@/lib/api';
import { FollowUp, Campaign } from '@/lib/types';

interface FollowUpsProps { showModal: boolean; onModalClose: () => void; }

export default function FollowUps({ showModal, onModalClose }: FollowUpsProps) {
  const [followUps, setFollowUps] = useState<FollowUp[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [form, setForm] = useState({ title: '', subtitle: '', time: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.followups.list().then(data => {
      setFollowUps(data.followUps);
      setCampaigns(data.campaigns);
    }).catch(() => {});
  }, []);

  const toggle = async (id: string, completed: boolean) => {
    await api.followups.update(id, { completed: !completed }).catch(() => {});
    setFollowUps(prev => prev.map(f => f.id === id ? { ...f, completed: !completed, status: !completed ? 'Done' : 'Scheduled' } : f));
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

  const completedCount = followUps.filter(f => f.completed).length;

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10, marginBottom: 16 }}>
        <MetricCard label="Due today" value={followUps.filter(f => !f.completed).length} change="3 overdue" changeType="down" />
        <MetricCard label="Completed" value={completedCount} change="Today so far" />
        <MetricCard label="AI automated" value="34" change="This week" />
        <MetricCard label="Response rate" value="74%" change="+8pts vs last mo" />
      </div>

      <div className="section-head">Today</div>
      <div className="card" style={{ marginBottom: 14 }}>
        {followUps.map(f => (
          <div key={f.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 0', borderBottom: '0.5px solid var(--color-border-tertiary)' }}>
            <div onClick={() => toggle(f.id, f.completed)}
              style={{ width: 16, height: 16, borderRadius: 4, border: f.completed ? 'none' : '1.5px solid var(--color-border-secondary)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', background: f.completed ? '#1D9E75' : 'transparent' }}>
              {f.completed && <svg width="8" height="8" viewBox="0 0 8 8"><path d="M1 4l2 2 4-4" stroke="#E1F5EE" strokeWidth="1.5" strokeLinecap="round" fill="none" /></svg>}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--color-text-primary)', textDecoration: f.completed ? 'line-through' : 'none', opacity: f.completed ? 0.6 : 1 }}>{f.title}</div>
              <div style={{ fontSize: 10, color: 'var(--color-text-tertiary)' }}>{f.subtitle}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 10, color: 'var(--color-text-tertiary)', marginBottom: 3 }}>{f.time}</div>
              <Tag label={f.status} />
            </div>
          </div>
        ))}
      </div>

      <div className="section-head">Automated campaigns running</div>
      <div className="card">
        {campaigns.map(c => (
          <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '0.5px solid var(--color-border-tertiary)' }}>
            <div className={`av av-${c.color}`} style={{ width: 28, height: 28 }}>{c.label}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--color-text-primary)' }}>{c.title}</div>
              <div style={{ fontSize: 10, color: 'var(--color-text-tertiary)' }}>{c.subtitle}</div>
            </div>
            <Tag label={c.status} />
          </div>
        ))}
      </div>

      {showModal && (
        <Modal title="Add Task" onClose={onModalClose}>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Task *</label>
              <input className="form-input" required value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} placeholder="e.g. Call Kofi Mensah" />
            </div>
            <div className="form-group">
              <label className="form-label">Details</label>
              <input className="form-input" value={form.subtitle} onChange={e => setForm(p => ({ ...p, subtitle: e.target.value }))} placeholder="e.g. Discuss viewing options" />
            </div>
            <div className="form-group">
              <label className="form-label">Time</label>
              <input className="form-input" value={form.time} onChange={e => setForm(p => ({ ...p, time: e.target.value }))} placeholder="e.g. 3:00 PM" />
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 16 }}>
              <button type="button" className="btn" onClick={onModalClose}>Cancel</button>
              <button type="submit" className="btn btn-green" disabled={saving}>{saving ? 'Saving...' : 'Add Task'}</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
