'use client';
import { useEffect, useState } from 'react';
import { MetricCard } from '@/components/ui/MetricCard';
import { api } from '@/lib/api';
import { PipelineDeal, PipelineStage } from '@/lib/types';

const STAGES: PipelineStage[] = ['New', 'Qualified', 'Negotiating', 'Closed'];
const stageColors: Record<PipelineStage, string> = {
  New: '#1D9E75', Qualified: '#378ADD', Negotiating: '#EF9F27', Closed: '#7F77DD',
};

export default function Pipeline() {
  const [grouped, setGrouped] = useState<Record<PipelineStage, PipelineDeal[]>>({ New: [], Qualified: [], Negotiating: [], Closed: [] });
  const [dragging, setDragging] = useState<string | null>(null);

  useEffect(() => {
    api.pipeline.get().then(data => setGrouped(data.grouped)).catch(() => {});
  }, []);

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

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10, marginBottom: 16 }}>
        <MetricCard label="Pipeline value" value="GHS 4.2m" change="Active deals" changeType="neutral" small />
        <MetricCard label="Avg deal size" value="GHS 183k" change="+12% vs last mo" small />
        <MetricCard label="Win rate" value="36%" change="+4pts this month" />
        <MetricCard label="Avg close time" value="22 days" change="+2 vs last mo" changeType="down" small />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8 }}>
        {STAGES.map(stage => (
          <div key={stage}
            onDragOver={e => e.preventDefault()}
            onDrop={e => handleDrop(e, stage)}
            style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{ fontSize: 10, fontWeight: 500, color: 'var(--color-text-secondary)', paddingBottom: 4, borderBottom: `2px solid ${stageColors[stage]}`, display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
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
                {/* Move buttons */}
                <div style={{ display: 'flex', gap: 4, marginTop: 6, flexWrap: 'wrap' }}>
                  {STAGES.filter(s => s !== stage).map(s => (
                    <button key={s} onClick={() => moveToStage(deal.id, s)}
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
    </div>
  );
}
