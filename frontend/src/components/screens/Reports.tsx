'use client';
import { useEffect, useState } from 'react';
import { MetricCard } from '@/components/ui/MetricCard';
import { api } from '@/lib/api';
import { ReportData } from '@/lib/types';

export default function Reports() {
  const [data, setData] = useState<ReportData | null>(null);

  useEffect(() => {
    api.reports.get().then(setData).catch(() => {});
  }, []);

  if (!data) return <div style={{ padding: 20, color: 'var(--color-text-tertiary)', fontSize: 12 }}>Loading...</div>;

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10, marginBottom: 16 }}>
        <MetricCard label="Total revenue" value={data.metrics.totalRevenue} change="+22% vs last mo" small />
        <MetricCard label="Deals closed" value={data.metrics.dealsClosedCount} change="+35%" />
        <MetricCard label="Lead → close rate" value={`${data.metrics.leadToCloseRate}%`} change="+2pts" />
        <MetricCard label="AI save rate" value={`${data.metrics.aiSaveRate}%`} change="Leads caught by AI" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
        <div className="card">
          <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--color-text-primary)', marginBottom: 10 }}>Revenue by month</div>
          <div className="chart-bars">
            {data.revenueByMonth.map(({ month, value }) => (
              <div key={month} className="bar-wrap">
                <div className="bar" style={{ height: value, background: month === 'May' ? '#1D9E75' : '#378ADD' }} />
                <div className="bar-lbl">{month}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--color-text-primary)', marginBottom: 10 }}>Conversion by source</div>
          {data.conversionBySource.map(({ source, rate, color }) => (
            <div key={source} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 0', borderBottom: '0.5px solid var(--color-border-tertiary)' }}>
              <div style={{ fontSize: 10, color: 'var(--color-text-secondary)', width: 80 }}>{source}</div>
              <div style={{ flex: 1, height: 6, background: 'var(--color-background-secondary)', borderRadius: 3, overflow: 'hidden' }}>
                <div style={{ height: '100%', borderRadius: 3, background: color, width: `${rate}%`, transition: 'width 0.6s ease' }} />
              </div>
              <div style={{ fontSize: 10, color: 'var(--color-text-primary)', fontWeight: 500, width: 40, textAlign: 'right' }}>{rate}%</div>
            </div>
          ))}
        </div>
      </div>

      <div className="card">
        <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--color-text-primary)', marginBottom: 10 }}>Top performing neighborhoods</div>
        {data.topNeighborhoods.map(({ name, deals, pct }) => (
          <div key={name} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 0', borderBottom: '0.5px solid var(--color-border-tertiary)' }}>
            <div style={{ fontSize: 10, color: 'var(--color-text-secondary)', width: 80 }}>{name}</div>
            <div style={{ flex: 1, height: 6, background: 'var(--color-background-secondary)', borderRadius: 3, overflow: 'hidden' }}>
              <div style={{ height: '100%', borderRadius: 3, background: '#1D9E75', width: `${pct}%`, transition: 'width 0.6s ease' }} />
            </div>
            <div style={{ fontSize: 10, color: 'var(--color-text-primary)', fontWeight: 500, width: 40, textAlign: 'right' }}>{deals} deals</div>
          </div>
        ))}
      </div>
    </div>
  );
}
