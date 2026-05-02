'use client';
import { useEffect, useState } from 'react';
import { MetricCard } from '@/components/ui/MetricCard';
import { Tag } from '@/components/ui/Tag';
import { Modal } from '@/components/ui/Modal';
import { api } from '@/lib/api';
import { AITemplate } from '@/lib/types';

interface AIResponsesProps { showModal: boolean; onModalClose: () => void; }

export default function AIResponses({ showModal, onModalClose }: AIResponsesProps) {
  const [templates, setTemplates] = useState<AITemplate[]>([]);
  const [form, setForm] = useState({ triggerLabel: 'New', trigger: '', question: '', answer: '', autoTag: 'Auto' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.airesponses.list().then(setTemplates).catch(() => {});
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const t = await api.airesponses.create({ ...form, triggerColor: form.triggerLabel.toLowerCase() });
      setTemplates(prev => [...prev, t]);
      onModalClose();
      setForm({ triggerLabel: 'New', trigger: '', question: '', answer: '', autoTag: 'Auto' });
    } finally { setSaving(false); }
  };

  const remove = async (id: string) => {
    await api.airesponses.remove(id).catch(() => {});
    setTemplates(prev => prev.filter(t => t.id !== id));
  };

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10, marginBottom: 16 }}>
        <MetricCard label="Responses today" value="147" change="All automated" />
        <MetricCard label="Avg response time" value="4.2 sec" change="vs 4hr manual" small />
        <MetricCard label="Escalated to agent" value="14" change="9.5% of chats" changeType="neutral" />
        <MetricCard label="Leads qualified" value="89" change="By AI alone" />
      </div>

      <div className="section-head">AI response templates — what the AI says and when</div>

      {templates.map(t => (
        <div key={t.id} style={{ background: 'var(--color-background-secondary)', border: '0.5px solid var(--color-border-tertiary)', borderRadius: 'var(--border-radius-lg)', padding: '12px 14px', marginBottom: 10 }}>
          <div style={{ fontSize: 10, color: 'var(--color-text-tertiary)', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 5 }}>
            <Tag label={t.triggerLabel} /> {t.trigger}
          </div>
          <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--color-text-primary)', marginBottom: 6 }}>{t.question}</div>
          <div style={{ fontSize: 11, color: 'var(--color-text-secondary)', lineHeight: 1.5, background: 'var(--color-background-primary)', border: '0.5px solid var(--color-border-tertiary)', borderRadius: 'var(--border-radius-md)', padding: '8px 10px' }}
            dangerouslySetInnerHTML={{ __html: t.answer }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 7 }}>
            <div style={{ fontSize: 10, color: 'var(--color-text-tertiary)' }}>
              Used {t.usedCount.toLocaleString()} times{t.continueRate > 0 ? ` · ${t.continueRate}% continue conversation` : ''}
            </div>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <Tag label={t.autoTag} />
              <button onClick={() => remove(t.id)} style={{ fontSize: 9, color: 'var(--color-text-tertiary)', background: 'none', border: 'none', cursor: 'pointer', padding: '2px 6px', borderRadius: 4 }}>Delete</button>
            </div>
          </div>
        </div>
      ))}

      {showModal && (
        <Modal title="New AI Response Template" onClose={onModalClose}>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Trigger Label</label>
              <select className="form-select" value={form.triggerLabel} onChange={e => setForm(p => ({ ...p, triggerLabel: e.target.value }))}>
                <option>New</option><option>Warm</option><option>Hot</option><option>Cold</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Trigger Description *</label>
              <input className="form-input" required value={form.trigger} onChange={e => setForm(p => ({ ...p, trigger: e.target.value }))} placeholder="When does this AI response fire?" />
            </div>
            <div className="form-group">
              <label className="form-label">Example Question *</label>
              <input className="form-input" required value={form.question} onChange={e => setForm(p => ({ ...p, question: e.target.value }))} placeholder='Lead: "example message"' />
            </div>
            <div className="form-group">
              <label className="form-label">AI Response *</label>
              <textarea className="form-input" required rows={3} style={{ resize: 'vertical' }} value={form.answer} onChange={e => setForm(p => ({ ...p, answer: e.target.value }))} placeholder="What does the AI say?" />
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 16 }}>
              <button type="button" className="btn" onClick={onModalClose}>Cancel</button>
              <button type="submit" className="btn btn-green" disabled={saving}>{saving ? 'Saving...' : 'Add Template'}</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
