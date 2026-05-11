'use client';
import { useEffect, useState } from 'react';
import { MetricCard } from '@/components/ui/MetricCard';
import { Tag } from '@/components/ui/Tag';
import { Modal } from '@/components/ui/Modal';
import { api } from '@/lib/api';
import { Lead, LeadStatus, LeadSource } from '@/lib/types';

const STATUS_FILTERS: (LeadStatus | 'All')[] = ['All', 'Hot', 'Warm', 'New', 'Cold'];
const SOURCE_FILTERS: LeadSource[] = ['WhatsApp', 'Instagram'];

interface LeadsProps { showModal: boolean; onModalClose: () => void; }

// ── Time ago helper ────────────────────────────────────────────────────────────
function timeAgo(dateStr: string | null) {
  if (!dateStr) return null;
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins  = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days  = Math.floor(diff / 86400000);
  if (mins < 1)   return 'just now';
  if (mins < 60)  return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
}

// ── Due-for-follow-up pill ─────────────────────────────────────────────────────
function DuePill() {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 3,
      fontSize: 9, fontWeight: 600, padding: '2px 6px',
      borderRadius: 4,
      background: 'rgba(248,113,113,0.12)',
      color: '#F87171',
      whiteSpace: 'nowrap',
    }}>
      <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#F87171', display: 'inline-block' }} />
      Due
    </span>
  );
}

export default function Leads({ showModal, onModalClose }: LeadsProps) {
  const [leads, setLeads]         = useState<Lead[]>([]);
  const [stats, setStats]         = useState<any>(null);
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [sourceFilter, setSourceFilter] = useState<string>('');
  const [form, setForm]           = useState({ name: '', source: 'WhatsApp', interest: '', budget: '' });
  const [saving, setSaving]       = useState(false);

  const load = (status: string, source: string) => {
    const params = new URLSearchParams();
    if (status !== 'All') params.set('status', status);
    if (source) params.set('source', source);
    api.leads.list(params.toString()).then(setLeads).catch(() => {});
  };

  useEffect(() => { load(statusFilter, sourceFilter); }, [statusFilter, sourceFilter]);
  useEffect(() => { api.leads.stats().then(setStats).catch(() => {}); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const lead = await api.leads.create(form);
      setLeads(prev => [lead, ...prev]);
      onModalClose();
      setForm({ name: '', source: 'WhatsApp', interest: '', budget: '' });
    } finally { setSaving(false); }
  };

  const counts: Record<string, number> = { All: leads.length };
  leads.forEach(l => { counts[l.status] = (counts[l.status] || 0) + 1; });

  const dueCount = leads.filter(l => l.dueForFollowUp).length;

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10, marginBottom: 16 }}>
        <MetricCard label="Total leads"      value={stats ? String(stats.total)       : '…'} change="All time" />
        <MetricCard label="New today"        value={stats ? String(stats.newToday)    : '…'} change="Added today" />
        <MetricCard label="AI qualified"     value={stats ? String(stats.aiQualified) : '…'} change={stats ? `${stats.total ? Math.round((stats.aiQualified / stats.total) * 100) : 0}% rate` : '…'} />
        <MetricCard label="Due follow-up"    value={String(dueCount)} change="Need contact now" />
      </div>

      <div style={{ display: 'flex', gap: 6, marginBottom: 14, flexWrap: 'wrap' }}>
        {STATUS_FILTERS.map(s => (
          <button key={s} className={`filter-btn${statusFilter === s ? ' sel' : ''}`}
            onClick={() => { setStatusFilter(s); setSourceFilter(''); }}>
            {s}{s !== 'All' ? ` (${counts[s] || 0})` : ` (${leads.length})`}
          </button>
        ))}
        {SOURCE_FILTERS.map(src => (
          <button key={src} className={`filter-btn${sourceFilter === src ? ' sel' : ''}`}
            onClick={() => { setSourceFilter(sourceFilter === src ? '' : src); setStatusFilter('All'); }}>
            {src}
          </button>
        ))}
        {dueCount > 0 && (
          <button
            className={`filter-btn${statusFilter === '__due__' ? ' sel' : ''}`}
            onClick={() => {
              setStatusFilter('All');
              setSourceFilter('');
              // Filter visually — just scroll to first due lead (handled in table)
            }}
            style={{ marginLeft: 'auto', color: '#F87171', borderColor: 'rgba(248,113,113,0.3)' }}
          >
            🔴 {dueCount} due
          </button>
        )}
      </div>

      <div className="card">
        <table className="table">
          <thead>
            <tr>
              <th>Lead</th>
              <th>Source</th>
              <th>Property interest</th>
              <th>Budget (GHS)</th>
              <th>Status</th>
              <th>AI score</th>
              <th>Last contacted</th>
              <th>Added</th>
            </tr>
          </thead>
          <tbody>
            {leads.map(l => (
              <tr key={l.id} style={l.dueForFollowUp ? { background: 'rgba(248,113,113,0.04)' } : undefined}>
                <td className="bold">{l.name}</td>
                <td>{l.source}</td>
                <td>{l.interest}</td>
                <td>{l.budget}</td>
                <td><Tag label={l.status} /></td>
                <td style={{
                  color: l.aiScore && l.aiScore >= 70 ? '#1D9E75' : l.aiScore && l.aiScore >= 50 ? '#EF9F27' : '#888780',
                  fontWeight: 500,
                }}>
                  {l.aiScore ?? '—'}
                </td>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexWrap: 'nowrap' }}>
                    <span style={{ fontSize: 11, color: l.lastContactedAt ? 'var(--text-secondary)' : 'var(--text-muted)' }}>
                      {l.lastContactedAt ? timeAgo(l.lastContactedAt) : '—'}
                    </span>
                    {l.dueForFollowUp && <DuePill />}
                  </div>
                </td>
                <td style={{ color: 'var(--text-muted)', fontSize: 11 }}>{l.added}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <Modal title="Add New Lead" onClose={onModalClose}>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Full Name *</label>
              <input className="form-input" required value={form.name}
                onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                placeholder="e.g. Kofi Asante" />
            </div>
            <div className="form-group">
              <label className="form-label">Source</label>
              <select className="form-select" value={form.source}
                onChange={e => setForm(p => ({ ...p, source: e.target.value }))}>
                <option>WhatsApp</option>
                <option>Instagram</option>
                <option>Website</option>
                <option>Facebook</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Property Interest</label>
              <input className="form-input" value={form.interest}
                onChange={e => setForm(p => ({ ...p, interest: e.target.value }))}
                placeholder="e.g. 3 bed · East Legon" />
            </div>
            <div className="form-group">
              <label className="form-label">Budget (GHS)</label>
              <input className="form-input" value={form.budget}
                onChange={e => setForm(p => ({ ...p, budget: e.target.value }))}
                placeholder="e.g. 400–500k" />
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 16 }}>
              <button type="button" className="btn" onClick={onModalClose}>Cancel</button>
              <button type="submit" className="btn btn-green" disabled={saving}>
                {saving ? 'Saving...' : 'Add Lead'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
