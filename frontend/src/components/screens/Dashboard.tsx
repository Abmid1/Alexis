'use client';
import { useEffect, useState } from 'react';
import { Tag } from '@/components/ui/Tag';
import { api } from '@/lib/api';
import { Lead } from '@/lib/types';

interface Metrics {
  totalLeads: number; qualified: number; closedDeals: number;
  revenue: string; totalProperties: number;
}

export default function Dashboard() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [metrics, setMetrics] = useState<Metrics>({ totalLeads: 0, qualified: 0, closedDeals: 0, revenue: 'GHS 0', totalProperties: 0 });
  const [loading, setLoading] = useState(true);
  const [weekBars, setWeekBars] = useState<number[]>([35,48,42,60,55,72,80]);

  useEffect(() => {
    Promise.all([
      api.leads.list(),
      api.pipeline.get(),
    ]).then(([allLeads, pipeData]) => {
      setLeads(allLeads.slice(0, 4));

      // Compute metrics from real data
      const qualified = allLeads.filter((l: any) => l.status === 'Hot' || l.status === 'Warm' || l.status === 'Qualified').length;
      const closed = pipeData.stats?.closedCount || 0;

      // Week bars from last 7 days of leads
      const now = Date.now();
      const bars = Array.from({ length: 7 }, (_, i) => {
        const dayStart = new Date(now - (6 - i) * 86400000); dayStart.setHours(0,0,0,0);
        const dayEnd   = new Date(dayStart.getTime() + 86400000);
        const count = allLeads.filter((l: any) => {
          const d = new Date(l.addedAt || l.createdAt);
          return d >= dayStart && d < dayEnd;
        }).length;
        return count;
      });
      const maxBar = Math.max(...bars, 1);
      setWeekBars(bars.map(b => Math.round((b / maxBar) * 72) + 8));

      setMetrics({
        totalLeads: allLeads.length,
        qualified,
        closedDeals: closed,
        revenue: pipeData.stats?.totalValueFmt || 'GHS 0',
        totalProperties: 0,
      });
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const days = ['M','T','W','T','F','S','S'];

  // Source breakdown from real leads
  const srcCounts: Record<string, number> = {};
  leads.forEach((l: any) => { srcCounts[l.source] = (srcCounts[l.source] || 0) + 1; });
  const total = Math.max(Object.values(srcCounts).reduce((a, b) => a + b, 0), 1);

  const srcDots = [
    { color: '#1D9E75', label: 'WhatsApp',  pct: Math.round(((srcCounts.WhatsApp  || 0) / total) * 100) || 40 },
    { color: '#378ADD', label: 'Instagram', pct: Math.round(((srcCounts.Instagram || 0) / total) * 100) || 25 },
    { color: '#EF9F27', label: 'Website',   pct: Math.round(((srcCounts.Website   || 0) / total) * 100) || 20 },
    { color: '#7F77DD', label: 'Facebook',  pct: Math.round(((srcCounts.Facebook  || 0) / total) * 100) || 15 },
  ];

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10, marginBottom: 16 }}>
        {[
          { label: 'Total leads',   val: loading ? '…' : String(metrics.totalLeads),  change: 'All time',       up: true },
          { label: 'Hot / Warm',    val: loading ? '…' : String(metrics.qualified),   change: 'Active interest', up: true },
          { label: 'Closed deals',  val: loading ? '…' : String(metrics.closedDeals), change: 'Pipeline wins',  up: true },
          { label: 'Pipeline value',val: loading ? '…' : metrics.revenue,             change: 'Total active',    up: true, sm: true },
        ].map(m => (
          <div key={m.label} className="metric-card">
            <div style={{ fontSize: 10, color: 'var(--color-text-tertiary)', marginBottom: 3 }}>{m.label}</div>
            <div style={{ fontSize: m.sm ? 16 : 22, fontWeight: 500, color: 'var(--color-text-primary)', lineHeight: 1 }}>{m.val}</div>
            <div style={{ fontSize: 10, marginTop: 3 }} className={m.up ? 'up' : ''}>{m.change}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
        <div className="card">
          <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--color-text-primary)', marginBottom: 10, display: 'flex', justifyContent: 'space-between' }}>
            Leads this week <span style={{ fontSize: 10, color: '#1D9E75' }}>7 days</span>
          </div>
          <div className="chart-bars">
            {weekBars.map((h, i) => (
              <div key={i} className="bar-wrap">
                <div className="bar" style={{ height: h, background: '#1D9E75' }} />
                <div className="bar-lbl">{days[i]}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--color-text-primary)', marginBottom: 10 }}>Leads by source</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <svg width="64" height="64" viewBox="0 0 64 64" style={{ flexShrink: 0 }}>
              {srcDots.reduce<{ offset: number; els: JSX.Element[] }>((acc, src) => {
                const len = (src.pct / 100) * 150;
                acc.els.push(
                  <circle key={src.label} cx="32" cy="32" r="24" fill="none" stroke={src.color}
                    strokeWidth="12" strokeDasharray={`${len} ${150 - len}`} strokeDashoffset={-acc.offset} />
                );
                acc.offset += len;
                return acc;
              }, { offset: 0, els: [] }).els}
              <text x="32" y="36" textAnchor="middle" fontSize="10" fontWeight="500" fill="var(--color-text-primary)">{metrics.totalLeads}</text>
            </svg>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {srcDots.map(s => (
                <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 10, color: 'var(--color-text-secondary)' }}>
                  <div style={{ width: 7, height: 7, borderRadius: '50%', background: s.color, flexShrink: 0 }} />
                  {s.label} {s.pct}%
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--color-text-primary)', marginBottom: 10, display: 'flex', justifyContent: 'space-between' }}>
          Recent leads <span style={{ fontSize: 10, color: '#1D9E75', cursor: 'pointer' }}>View all</span>
        </div>
        <table className="table">
          <thead><tr><th>Name</th><th>Source</th><th>Interest</th><th>Status</th><th>Added</th></tr></thead>
          <tbody>
            {leads.map((l: any) => (
              <tr key={l.id}>
                <td className="bold">{l.name}</td>
                <td>{l.source}</td>
                <td>{l.interest}</td>
                <td><Tag label={l.status} /></td>
                <td>{l.added}</td>
              </tr>
            ))}
            {leads.length === 0 && !loading && (
              <tr><td colSpan={5} style={{ textAlign: 'center', color: 'var(--color-text-tertiary)', padding: '16px 0' }}>No leads yet — add your first one!</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
