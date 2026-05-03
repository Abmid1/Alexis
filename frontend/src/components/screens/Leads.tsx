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

export default function Leads({ showModal, onModalClose }: LeadsProps) {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [sourceFilter, setSourceFilter] = useState<string>('');
  const [form, setForm] = useState({ name: '', source: 'WhatsApp', interest: '', budget: '' });
  const [saving, setSaving] = useState(false);

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

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10, marginBottom: 16 }}>
        <MetricCard label="Total leads"   value={stats ? String(stats.total)        : '…'} change="All time" />
        <MetricCard label="New today"     value={stats ? String(stats.newToday)     : '…'} change="Added today" />
        <MetricCard label="AI qualified"  value={stats ? String(stats.aiQualified)  : '…'} change={stats ? `${stats.total ? Math.round((stats.aiQualified / stats.total) * 100) : 0}% rate` : '…'} />
        <MetricCard label="Avg response"  value="47 sec" change="AI-powered" small />
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
      </div>

      <div className="card">
        <table className="table">
          <thead>
            <tr><th>Lead</th><th>Source</th><th>Property interest</th><th>Budget (GHS)</th><th>Status</th><th>AI score</th><th>Added</th></tr>
          </thead>
          <tbody>
            {leads.map(l => (
              <tr key={l.id}>
                <td className="bold">{l.name}</td>
                <td>{l.source}</td>
                <td>{l.interest}</td>
                <td>{l.budget}</td>
                <td><Tag label={l.status} /></td>
                <td style={{ color: l.aiScore && l.aiScore >= 70 ? '#1D9E75' : l.aiScore && l.aiScore >= 50 ? '#EF9F27' : '#888780', fontWeight: 500 }}>
                  {l.aiScore ?? '—'}
                </td>
                <td>{l.added}</td>
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
              <input className="form-input" required value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="e.g. Kofi Asante" />
            </div>
            <div className="form-group">
              <label className="form-label">Source</label>
              <select className="form-select" value={form.source} onChange={e => setForm(p => ({ ...p, source: e.target.value }))}>
                <option>WhatsApp</option><option>Instagram</option><option>Website</option><option>Facebook</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Property Interest</label>
              <input className="form-input" value={form.interest} onChange={e => setForm(p => ({ ...p, interest: e.target.value }))} placeholder="e.g. 3 bed · East Legon" />
            </div>
            <div className="form-group">
              <label className="form-label">Budget (GHS)</label>
              <input className="form-input" value={form.budget} onChange={e => setForm(p => ({ ...p, budget: e.target.value }))} placeholder="e.g. 400–500k" />
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 16 }}>
              <button type="button" className="btn" onClick={onModalClose}>Cancel</button>
              <button type="submit" className="btn btn-green" disabled={saving}>{saving ? 'Saving...' : 'Add Lead'}</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
