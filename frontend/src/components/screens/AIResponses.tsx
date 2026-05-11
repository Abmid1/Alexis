'use client';
import { useEffect, useState } from 'react';
import { Tag } from '@/components/ui/Tag';
import { Modal } from '@/components/ui/Modal';
import { api } from '@/lib/api';
import { AITemplate } from '@/lib/types';

interface AIResponsesProps { showModal: boolean; onModalClose: () => void; }

// ── Small stat pill ────────────────────────────────────────────────────────────
function StatPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="metric-card" style={{ textAlign: 'center' }}>
      <div style={{ fontSize: 20, fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 4 }}>{label}</div>
    </div>
  );
}

// ── Live badge ─────────────────────────────────────────────────────────────────
function LiveBadge() {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      fontSize: 9, fontWeight: 700, letterSpacing: 0.4,
      padding: '3px 8px', borderRadius: 4,
      background: 'rgba(52,211,153,0.12)',
      color: '#34D399',
      textTransform: 'uppercase',
    }}>
      <span style={{
        width: 5, height: 5, borderRadius: '50%',
        background: '#34D399', display: 'inline-block',
        boxShadow: '0 0 0 2px rgba(52,211,153,0.3)',
        animation: 'pulse 2s infinite',
      }} />
      Active in AI
    </span>
  );
}

export default function AIResponses({ showModal, onModalClose }: AIResponsesProps) {
  const [templates, setTemplates] = useState<AITemplate[]>([]);
  const [form, setForm] = useState({
    triggerLabel: 'New',
    trigger: '',
    question: '',
    answer: '',
    autoTag: 'Auto',
  });
  const [saving, setSaving]   = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);

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

  const totalUsed = templates.reduce((sum, t) => sum + (t.usedCount || 0), 0);

  return (
    <div>

      {/* ── Stats ─────────────────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10, marginBottom: 20 }}>
        <StatPill label="Templates active" value={String(templates.length)} />
        <StatPill label="Times AI used a template" value={totalUsed > 0 ? totalUsed.toLocaleString() : '—'} />
        <StatPill label="AI response time" value="3–5 sec" />
        <StatPill label="Topics covered" value={String(templates.length)} />
      </div>

      {/* ── How it works banner ───────────────────────────────────────── */}
      <div style={{
        background: 'rgba(52,211,153,0.06)',
        border: '1px solid rgba(52,211,153,0.2)',
        borderRadius: 8,
        padding: '12px 16px',
        marginBottom: 18,
        display: 'flex',
        gap: 12,
        alignItems: 'flex-start',
      }}>
        <span style={{ fontSize: 18, flexShrink: 0, marginTop: 1 }}>🤖</span>
        <div>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>
            These templates are injected directly into the AI
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
            When a customer asks something that matches a template topic, the AI uses your approved
            wording instead of making up its own answer. You control exactly what the AI says on
            pricing, payment plans, viewings, policies — anything you write here becomes the AI's
            script. For topics with no template, the AI uses its own judgment.
          </div>
        </div>
      </div>

      {/* ── Template list ─────────────────────────────────────────────── */}
      {templates.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)', fontSize: 12 }}>
          <div style={{ fontSize: 28, marginBottom: 10 }}>📋</div>
          <div style={{ fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 6 }}>No templates yet</div>
          <div style={{ maxWidth: 340, margin: '0 auto' }}>
            Click <strong>+ Add template</strong> to write your first approved script.
            Once saved, the AI will use your exact wording whenever that topic comes up in conversation.
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {templates.map(t => {
            const isOpen = expanded === t.id;
            return (
              <div
                key={t.id}
                style={{
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border)',
                  borderRadius: 8,
                  overflow: 'hidden',
                  transition: 'border-color 0.15s',
                }}
              >
                {/* ── Header row ── */}
                <div
                  onClick={() => setExpanded(isOpen ? null : t.id)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '11px 14px', cursor: 'pointer',
                    userSelect: 'none',
                  }}
                >
                  {/* Expand arrow */}
                  <span style={{
                    fontSize: 10, color: 'var(--text-muted)',
                    transform: isOpen ? 'rotate(90deg)' : 'none',
                    transition: 'transform 0.15s',
                    flexShrink: 0,
                  }}>▶</span>

                  <Tag label={t.triggerLabel} />

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {t.trigger}
                    </div>
                    {!isOpen && (
                      <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {t.question}
                      </div>
                    )}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                    <LiveBadge />
                    {t.usedCount > 0 && (
                      <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                        Used {t.usedCount}×
                      </span>
                    )}
                    <button
                      onClick={e => { e.stopPropagation(); remove(t.id); }}
                      style={{
                        fontSize: 9, color: 'var(--text-muted)',
                        background: 'none', border: 'none', cursor: 'pointer',
                        padding: '2px 6px', borderRadius: 4,
                        opacity: 0.7,
                      }}
                    >
                      Delete
                    </button>
                  </div>
                </div>

                {/* ── Expanded body ── */}
                {isOpen && (
                  <div style={{ borderTop: '1px solid var(--border-subtle)', padding: '12px 14px 14px' }}>

                    {/* Topic description */}
                    <div style={{ marginBottom: 10 }}>
                      <div style={{ fontSize: 9, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>
                        When customer asks about
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{t.trigger}</div>
                    </div>

                    {/* Example question */}
                    <div style={{ marginBottom: 10 }}>
                      <div style={{ fontSize: 9, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>
                        Example question
                      </div>
                      <div style={{
                        fontSize: 11, color: 'var(--text-secondary)',
                        background: 'var(--bg-elevated)', borderRadius: 6,
                        padding: '7px 10px', border: '1px solid var(--border-subtle)',
                        fontStyle: 'italic',
                      }}>
                        "{t.question}"
                      </div>
                    </div>

                    {/* Approved AI answer */}
                    <div>
                      <div style={{ fontSize: 9, fontWeight: 600, color: '#34D399', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 5 }}>
                        <span>🤖</span> AI's approved response
                      </div>
                      <div style={{
                        fontSize: 11, color: 'var(--text-primary)', lineHeight: 1.65,
                        background: 'rgba(52,211,153,0.05)',
                        border: '1px solid rgba(52,211,153,0.2)',
                        borderRadius: 6, padding: '9px 12px',
                        whiteSpace: 'pre-wrap',
                      }}>
                        {t.answer}
                      </div>
                      <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 6 }}>
                        The AI uses this exact wording when this topic comes up. It may adjust tone slightly for conversation flow but preserves all key details.
                      </div>
                    </div>

                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── Add Template Modal ─────────────────────────────────────────── */}
      {showModal && (
        <Modal title="New AI Template" onClose={onModalClose}>
          <div style={{
            fontSize: 11, color: 'var(--text-secondary)',
            background: 'rgba(52,211,153,0.06)',
            border: '1px solid rgba(52,211,153,0.15)',
            borderRadius: 6, padding: '8px 12px', marginBottom: 16, lineHeight: 1.6,
          }}>
            Once saved, the AI will read this template in every conversation and use your approved answer whenever this topic comes up.
          </div>

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Label</label>
              <select
                className="form-select"
                value={form.triggerLabel}
                onChange={e => setForm(p => ({ ...p, triggerLabel: e.target.value }))}
              >
                <option>New</option>
                <option>Warm</option>
                <option>Hot</option>
                <option>Cold</option>
                <option>General</option>
                <option>Policy</option>
                <option>Pricing</option>
                <option>Viewing</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Topic / Trigger *</label>
              <input
                className="form-input"
                required
                value={form.trigger}
                onChange={e => setForm(p => ({ ...p, trigger: e.target.value }))}
                placeholder="e.g. Payment plan questions, Viewing requests, Negotiation…"
              />
              <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 4 }}>
                Describe the topic in plain language. The AI uses this to match the customer's message.
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Example customer question *</label>
              <input
                className="form-input"
                required
                value={form.question}
                onChange={e => setForm(p => ({ ...p, question: e.target.value }))}
                placeholder='e.g. "Can I pay in instalments?"'
              />
            </div>

            <div className="form-group">
              <label className="form-label">Your approved AI response *</label>
              <textarea
                className="form-input"
                required
                rows={4}
                style={{ resize: 'vertical' }}
                value={form.answer}
                onChange={e => setForm(p => ({ ...p, answer: e.target.value }))}
                placeholder="Write exactly what you want the AI to say. Be specific — include any policies, prices, timelines, or promises you want stated correctly every time."
              />
              <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 4 }}>
                The AI will use this exact wording. Anything you write here overrides the AI's own judgment on this topic.
              </div>
            </div>

            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 16 }}>
              <button type="button" className="btn" onClick={onModalClose}>Cancel</button>
              <button type="submit" className="btn btn-green" disabled={saving}>
                {saving ? 'Saving…' : '+ Add to AI'}
              </button>
            </div>
          </form>
        </Modal>
      )}

    </div>
  );
}
