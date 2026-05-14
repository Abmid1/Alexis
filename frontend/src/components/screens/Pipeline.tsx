'use client';
import { useEffect, useState } from 'react';
import { MetricCard } from '@/components/ui/MetricCard';
import { Modal } from '@/components/ui/Modal';
import { api } from '@/lib/api';
import { PipelineDeal, PipelineStage } from '@/lib/types';

const STAGES: PipelineStage[] = ['New', 'Qualified', 'Negotiating', 'Closed'];
const stageColors: Record<PipelineStage, string> = {
  New: '#1D9E75', Qualified: '#378ADD', Negotiating: '#EF9F27', Closed: '#7F77DD',
};

const STAGE_PROGRESS: Record<PipelineStage, number> = {
  New: 10, Qualified: 35, Negotiating: 65, Closed: 100,
};

interface PipelineProps { showModal: boolean; onModalClose: () => void; }

const emptyForm = { property: '', client: '', amount: '', stage: 'New' as PipelineStage };

export default function Pipeline({ showModal, onModalClose }: PipelineProps) {
  const [grouped, setGrouped] = useState<Record<PipelineStage, PipelineDeal[]>>(
    { New: [], Qualified: [], Negotiating: [], Closed: [] }
  );
  const [stats, setStats] = useState<any>(null);
  const [dragging, setDragging]   = useState<string | null>(null);
  const [form, setForm]           = useState(emptyForm);
  const [saving, setSaving]       = useState(false);
  const [formError, setFormError] = useState('');

  useEffect(() => {
    api.pipeline.get().then(data => {
      setGrouped(data.grouped);
      setStats(data.stats);
    }).catch(() => {});
  }, []);

  // Reset form when modal opens
  useEffect(() => {
    if (showModal) { setForm(emptyForm); setFormError(''); }
  }, [showModal]);

  const moveToStage = async (dealId: string, newStage: PipelineStage) => {
    await api.pipeline.update(dealId, { stage: newStage }).catch(() => {});
    setGrouped(prev => {
      const updated = { ...prev };
      let deal: PipelineDeal | undefined;
      STAGES.forEach(s => {
        const idx = updated[s].findIndex(d => d.id === dealId);
        if (idx !== -1) { [deal] = updated[s].splice(idx, 1); }
      });
      if (deal) {
        deal = { ...deal, stage: newStage, progress: newStage === 'Closed' ? 100 : deal.progress };
        updated[newStage] = [...updated[newStage], deal];
      }
      return { ...updated };
    });
  };

  const handleDrop = (e: React.DragEvent, stage: PipelineStage) => {
    e.preventDefault();
    if (dragging) { moveToStage(dragging, stage); setDragging(null); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.property.trim() || !form.client.trim() || !form.amount.trim()) {
      setFormError('Property, client and amount are all required.');
      return;
    }
    setSaving(true);
    setFormError('');
    try {
      // Parse amount to numeric (strip non-digit chars except dot)
      const numeric = parseFloat(form.amount.replace(/[^0-9.]/g, '')) || 0;
      // Format display amount
      const display = numeric >= 1_000_000
        ? `GHS ${(numeric / 1_000_000).toFixed(2)}m`
        : numeric >= 1_000
        ? `GHS ${(numeric / 1_000).toFixed(0)}k`
        : `GHS ${numeric}`;

      const deal = await api.pipeline.create({
        property:       form.property.trim(),
        client:         form.client.trim(),
        amount:         display,
        amount_numeric: numeric,
        stage:          form.stage,
      });

      setGrouped(prev => ({
        ...prev,
        [form.stage]: [...prev[form.stage], deal],
      }));
      onModalClose();
    } catch (err: any) {
      setFormError(err.message || 'Failed to create deal.');
    } finally {
      setSaving(false);
    }
  };

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '7px 10px', borderRadius: 6,
    border: '1px solid var(--border)', background: 'var(--bg-elevated)',
    color: 'var(--text-primary)', fontSize: 12, outline: 'none',
    boxSizing: 'border-box',
  };

  const labelStyle: React.CSSProperties = {
    fontSize: 10, fontWeight: 600, color: 'var(--text-muted)',
    textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4, display: 'block',
  };

  return (
    <div>
      {/* ── Stats ──────────────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10, marginBottom: 16 }}>
        <MetricCard label="Pipeline value"  value={stats?.totalValueFmt ?? 'GHS 0'} change="Active deals" changeType="neutral" small />
        <MetricCard label="Avg deal size"   value={stats?.avgDealFmt ?? 'GHS 0'}    change="Per deal" small />
        <MetricCard label="Win rate"        value={`${stats?.winRate ?? 0}%`}       change="Closed vs total" />
        <MetricCard label="Deals closed"    value={String(stats?.closedCount ?? 0)} change="All time" changeType="neutral" small />
      </div>

      {/* ── Kanban ─────────────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8 }}>
        {STAGES.map(stage => (
          <div key={stage}
            onDragOver={e => e.preventDefault()}
            onDrop={e => handleDrop(e, stage)}
            style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{
              fontSize: 10, fontWeight: 500, color: 'var(--color-text-secondary)',
              paddingBottom: 4, borderBottom: `2px solid ${stageColors[stage]}`,
              display: 'flex', justifyContent: 'space-between', marginBottom: 2,
            }}>
              {stage} <span>{grouped[stage]?.length || 0}</span>
            </div>
            {(grouped[stage] || []).map(deal => (
              <div key={deal.id} className="pipe-card"
                draggable
                onDragStart={() => setDragging(deal.id)}
                onDragEnd={() => setDragging(null)}>
                <div style={{ fontSize: 10, fontWeight: 500, color: 'var(--color-text-primary)' }}>{deal.property}</div>
                <div style={{ fontSize: 9, color: 'var(--color-text-tertiary)', marginTop: 1 }}>{deal.client}</div>
                <div style={{ fontSize: 10, color: '#1D9E75', marginTop: 3, fontWeight: 500 }}>{deal.amount}</div>
                <div style={{ height: 2, borderRadius: 1, marginTop: 5, background: 'var(--color-border-tertiary)' }}>
                  <div style={{ height: '100%', borderRadius: 1, background: stageColors[stage], width: `${deal.progress}%`, transition: 'width 0.3s' }} />
                </div>
                <div style={{ display: 'flex', gap: 4, marginTop: 6, flexWrap: 'wrap' }}>
                  {STAGES.filter(s => s !== stage).map(s => (
                    <button key={s} type="button" onClick={() => moveToStage(deal.id, s)}
                      style={{ fontSize: 8, padding: '2px 5px', borderRadius: 4, border: `0.5px solid ${stageColors[s]}`, background: 'transparent', color: stageColors[s], cursor: 'pointer' }}>
                      → {s}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* ── New deal modal ─────────────────────────────────────────── */}
      {showModal && (
        <Modal title="New Deal" onClose={onModalClose}>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

            <div>
              <label style={labelStyle}>Property name</label>
              <input
                style={inputStyle}
                placeholder="e.g. 3 Bed House · East Legon"
                value={form.property}
                onChange={e => setForm(p => ({ ...p, property: e.target.value }))}
              />
            </div>

            <div>
              <label style={labelStyle}>Client name</label>
              <input
                style={inputStyle}
                placeholder="e.g. Kwame Mensah"
                value={form.client}
                onChange={e => setForm(p => ({ ...p, client: e.target.value }))}
              />
            </div>

            <div>
              <label style={labelStyle}>Amount (GHS)</label>
              <input
                style={inputStyle}
                placeholder="e.g. 480000"
                type="number"
                min="0"
                value={form.amount}
                onChange={e => setForm(p => ({ ...p, amount: e.target.value }))}
              />
            </div>

            <div>
              <label style={labelStyle}>Stage</label>
              <select
                style={{ ...inputStyle, cursor: 'pointer' }}
                title="Deal stage"
                value={form.stage}
                onChange={e => setForm(p => ({ ...p, stage: e.target.value as PipelineStage }))}
              >
                {STAGES.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>

            {formError && (
              <div style={{ fontSize: 11, color: '#F87171' }}>{formError}</div>
            )}

            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 4 }}>
              <button type="button" onClick={onModalClose}
                style={{ fontSize: 11, padding: '6px 14px', borderRadius: 6, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                Cancel
              </button>
              <button type="submit" disabled={saving}
                style={{ fontSize: 11, padding: '6px 14px', borderRadius: 6, border: 'none', background: '#1D9E75', color: '#fff', cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1 }}>
                {saving ? 'Creating…' : 'Create deal'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
