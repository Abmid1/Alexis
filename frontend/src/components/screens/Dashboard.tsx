'use client';
import { useEffect, useState } from 'react';
import { Tag } from '@/components/ui/Tag';
import { api } from '@/lib/api';
import { Lead } from '@/lib/types';

interface Metrics {
  totalLeads: number; qualified: number; closedDeals: number;
  revenue: string; totalProperties: number;
}

// Donut circumference for r = 54
const CIRC = 2 * Math.PI * 54; // ≈ 339.3

export default function Dashboard() {
  const [leads, setLeads]       = useState<Lead[]>([]);
  const [metrics, setMetrics]   = useState<Metrics>({ totalLeads: 0, qualified: 0, closedDeals: 0, revenue: 'GHS 0', totalProperties: 0 });
  const [loading, setLoading]   = useState(true);
  const [weekBars, setWeekBars] = useState<number[]>([35, 48, 42, 60, 55, 72, 80]);

  useEffect(() => {
    Promise.all([
      api.leads.list(),
      api.pipeline.get(),
    ]).then(([allLeads, pipeData]) => {
      setLeads(allLeads.slice(0, 5));

      const qualified = allLeads.filter((l: any) =>
        l.status === 'Hot' || l.status === 'Warm' || l.status === 'Qualified'
      ).length;
      const closed = pipeData.stats?.closedCount || 0;

      // Week bars from real lead data
      const now = Date.now();
      const bars = Array.from({ length: 7 }, (_, i) => {
        const dayStart = new Date(now - (6 - i) * 86400000);
        dayStart.setHours(0, 0, 0, 0);
        const dayEnd = new Date(dayStart.getTime() + 86400000);
        return allLeads.filter((l: any) => {
          const d = new Date(l.addedAt || l.createdAt);
          return d >= dayStart && d < dayEnd;
        }).length;
      });
      const maxBar = Math.max(...bars, 1);
      setWeekBars(bars.map(b => Math.round((b / maxBar) * 110) + 10));

      setMetrics({
        totalLeads: allLeads.length,
        qualified,
        closedDeals: closed,
        revenue: pipeData.stats?.totalValueFmt || 'GHS 0',
        totalProperties: 0,
      });
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  // Source breakdown
  const srcCounts: Record<string, number> = {};
  leads.forEach((l: any) => { srcCounts[l.source] = (srcCounts[l.source] || 0) + 1; });
  const total = Math.max(Object.values(srcCounts).reduce((a, b) => a + b, 0), 1);

  const sources = [
    { color: '#25D366', label: 'WhatsApp',  pct: Math.round(((srcCounts.WhatsApp  || 0) / total) * 100) || 40 },
    { color: '#E1306C', label: 'Instagram', pct: Math.round(((srcCounts.Instagram || 0) / total) * 100) || 25 },
    { color: '#1877F2', label: 'Facebook',  pct: Math.round(((srcCounts.Facebook  || 0) / total) * 100) || 20 },
    { color: '#EF9F27', label: 'Website',   pct: Math.round(((srcCounts.Website   || 0) / total) * 100) || 15 },
  ];

  // Build donut arcs
  let offset = 0;
  const arcs = sources.map(s => {
    const len = (s.pct / 100) * CIRC;
    const arc = { ...s, len, offset };
    offset += len;
    return arc;
  });

  const topSource = sources.reduce((a, b) => a.pct > b.pct ? a : b, sources[0]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* ── Metric cards ──────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12 }}>
        {[
          { label: 'Total leads',    val: loading ? '—' : String(metrics.totalLeads),  change: 'All time',         up: true,  icon: '👥' },
          { label: 'Hot & Warm',     val: loading ? '—' : String(metrics.qualified),   change: 'Active interest',  up: true,  icon: '🔥' },
          { label: 'Closed deals',   val: loading ? '—' : String(metrics.closedDeals), change: 'Pipeline wins',    up: true,  icon: '✅' },
          { label: 'Pipeline value', val: loading ? '—' : metrics.revenue,             change: 'Total active',     up: true,  icon: '💰', sm: true },
        ].map(m => (
          <div key={m.label} className="metric-card">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                {m.label}
              </div>
              <span style={{ fontSize: 16, opacity: 0.55 }}>{m.icon}</span>
            </div>
            <div style={{ fontSize: m.sm ? 26 : 36, fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1, letterSpacing: '-0.02em', marginBottom: 10 }}>
              {m.val}
            </div>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 4,
              fontSize: 11, fontWeight: 500,
              color: '#34D399',
              background: 'rgba(52,211,153,0.1)',
              padding: '2px 8px', borderRadius: 20,
            }}>
              ↑ {m.change}
            </div>
          </div>
        ))}
      </div>

      {/* ── Charts row ────────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '3fr 2fr', gap: 12 }}>

        {/* Bar chart */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>Leads this week</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>New inquiries per day</div>
            </div>
            <span style={{ fontSize: 11, color: 'var(--accent-light)', fontWeight: 500, background: 'rgba(52,211,153,0.1)', padding: '3px 10px', borderRadius: 20 }}>
              7 days
            </span>
          </div>
          <div className="chart-bars" style={{ paddingBottom: 4 }}>
            {weekBars.map((h, i) => (
              <div key={i} className="bar-wrap">
                <div
                  className="bar"
                  style={{
                    height: h,
                    background: i === 6
                      ? 'linear-gradient(180deg, #34D399 0%, #1D9E75 100%)'
                      : 'linear-gradient(180deg, var(--bg-hover) 0%, var(--bg-active) 100%)',
                    boxShadow: i === 6 ? '0 0 12px rgba(52,211,153,0.3)' : 'none',
                  }}
                />
                <div className="bar-lbl">{days[i]}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Donut chart — Lead sources */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>Lead sources</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>Where leads come from</div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 20, flex: 1 }}>
            {/* Big donut */}
            <div style={{ flexShrink: 0 }}>
              <svg width="150" height="150" viewBox="0 0 150 150">
                {/* Track ring */}
                <circle cx="75" cy="75" r="54" fill="none"
                  stroke="var(--bg-hover)" strokeWidth="18" />
                {/* Colored arcs */}
                <g transform="rotate(-90, 75, 75)">
                  {arcs.map((arc, i) => (
                    <circle
                      key={i}
                      cx="75" cy="75" r="54"
                      fill="none"
                      stroke={arc.color}
                      strokeWidth="18"
                      strokeDasharray={`${arc.len} ${CIRC - arc.len}`}
                      strokeDashoffset={-arc.offset}
                      strokeLinecap="butt"
                      style={{ transition: 'stroke-dasharray 0.8s ease' }}
                    />
                  ))}
                </g>
                {/* Centre label */}
                <text x="75" y="70" textAnchor="middle"
                  fontSize="22" fontWeight="700"
                  fill="var(--text-primary)">
                  {metrics.totalLeads}
                </text>
                <text x="75" y="86" textAnchor="middle"
                  fontSize="9" fontWeight="500"
                  fill="var(--text-muted)"
                  style={{ textTransform: 'uppercase', letterSpacing: 1 }}>
                  TOTAL
                </text>
              </svg>
            </div>

            {/* Legend */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, flex: 1, minWidth: 0 }}>
              {sources.map(s => (
                <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: s.color, flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-primary)' }}>{s.label}</div>
                  </div>
                  <div style={{
                    fontSize: 11, fontWeight: 700,
                    color: 'var(--text-primary)',
                    background: 'var(--bg-elevated)',
                    padding: '2px 8px', borderRadius: 20,
                    flexShrink: 0,
                  }}>
                    {s.pct}%
                  </div>
                </div>
              ))}
              <div style={{ marginTop: 4, paddingTop: 10, borderTop: '1px solid var(--border-subtle)' }}>
                <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>Top source</div>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', marginTop: 2 }}>
                  {topSource?.label}
                  <span style={{ fontSize: 10, color: '#34D399', marginLeft: 5 }}>{topSource?.pct}%</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Recent leads ──────────────────────────────────────────── */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>Recent leads</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>Latest inquiries from all platforms</div>
          </div>
          <span style={{ fontSize: 11, color: 'var(--accent-light)', cursor: 'pointer', fontWeight: 500 }}>View all →</span>
        </div>
        <table className="table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Source</th>
              <th>Interest</th>
              <th>Status</th>
              <th>Added</th>
            </tr>
          </thead>
          <tbody>
            {leads.map((l: any) => (
              <tr key={l.id}>
                <td className="bold">{l.name}</td>
                <td>
                  <span style={{
                    fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 4,
                    background: l.source === 'WhatsApp' ? 'rgba(37,211,102,0.12)'
                              : l.source === 'Instagram' ? 'rgba(225,48,108,0.12)'
                              : l.source === 'Facebook' ? 'rgba(24,119,242,0.12)'
                              : 'rgba(239,159,39,0.12)',
                    color: l.source === 'WhatsApp' ? '#25D366'
                         : l.source === 'Instagram' ? '#E1306C'
                         : l.source === 'Facebook' ? '#1877F2'
                         : '#EF9F27',
                  }}>
                    {l.source}
                  </span>
                </td>
                <td style={{ color: 'var(--text-secondary)' }}>{l.interest}</td>
                <td><Tag label={l.status} /></td>
                <td style={{ color: 'var(--text-muted)', fontSize: 11 }}>{l.added}</td>
              </tr>
            ))}
            {leads.length === 0 && !loading && (
              <tr>
                <td colSpan={5} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '24px 0', fontSize: 12 }}>
                  No leads yet — add your first one
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

    </div>
  );
}
