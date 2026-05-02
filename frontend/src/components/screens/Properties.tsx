'use client';
import { useEffect, useState } from 'react';
import { Tag } from '@/components/ui/Tag';
import { Modal } from '@/components/ui/Modal';
import { api } from '@/lib/api';
import { Property } from '@/lib/types';

const colorMap: Record<string, string> = {
  green: '#E1F5EE', blue: '#E6F1FB', amber: '#FAEEDA', purple: '#EEEDFE', coral: '#FAECE7', teal: '#E1F5EE',
};

interface Props { showModal: boolean; onModalClose: () => void; }

export default function Properties({ showModal, onModalClose }: Props) {
  const [properties, setProperties] = useState<Property[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [typeFilter, setTypeFilter] = useState('all');
  const [form, setForm] = useState({ name: '', location: '', price: '', price_numeric: '', type: 'sale' });
  const [saving, setSaving] = useState(false);

  const load = (type: string) => {
    api.properties.list(type !== 'all' ? type : undefined).then(setProperties).catch(() => {});
  };

  useEffect(() => { load(typeFilter); }, [typeFilter]);
  useEffect(() => { api.properties.stats().then(setStats).catch(() => {}); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true);
    try {
      const prop = await api.properties.create({
        ...form,
        price_numeric: parseInt(form.price_numeric.replace(/[^0-9]/g, '')) || 0,
      });
      setProperties(prev => [prop, ...prev]);
      setStats((s: any) => s ? { ...s, listed: s.listed + 1 } : s);
      onModalClose();
      setForm({ name: '', location: '', price: '', price_numeric: '', type: 'sale' });
    } finally { setSaving(false); }
  };

  const filters = [
    { key: 'all', label: `All (${stats?.listed ?? '…'})` },
    { key: 'sale', label: `For sale (${stats?.forSaleCount ?? '…'})` },
    { key: 'rent', label: `For rent (${stats?.forRentCount ?? '…'})` },
    { key: 'land', label: 'Land' },
  ];

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10, marginBottom: 16 }}>
        {[
          { label: 'Listed',          val: stats?.listed ?? '…',           change: 'Active inventory',         sm: false },
          { label: 'For sale',        val: stats?.forSaleCount ?? '…',     change: stats?.saleValueFmt ?? '',  sm: false },
          { label: 'For rent',        val: stats?.forRentCount ?? '…',     change: stats?.rentValueFmt ?? '',  sm: false },
          { label: 'Total value',     val: stats?.saleValueFmt ?? '…',     change: 'Sale listings',            sm: true  },
        ].map(m => (
          <div key={m.label} className="metric-card">
            <div style={{ fontSize: 10, color: 'var(--color-text-tertiary)', marginBottom: 3 }}>{m.label}</div>
            <div style={{ fontSize: m.sm ? 14 : 22, fontWeight: 500, color: 'var(--color-text-primary)', lineHeight: 1 }}>{String(m.val)}</div>
            <div style={{ fontSize: 10, marginTop: 3, color: 'var(--color-text-tertiary)' }}>{m.change}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 6, marginBottom: 14, flexWrap: 'wrap' }}>
        {filters.map(f => (
          <button key={f.key} className={`filter-btn${typeFilter === f.key ? ' sel' : ''}`} onClick={() => setTypeFilter(f.key)}>{f.label}</button>
        ))}
        <button className="filter-btn">Verified ✓</button>
      </div>

      {properties.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--color-text-tertiary)', fontSize: 12 }}>
          No properties yet. Click <strong>+ Add property</strong> to list your first one.
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10 }}>
          {properties.map(p => (
            <div key={p.id} style={{ background: 'var(--color-background-secondary)', border: '0.5px solid var(--color-border-tertiary)', borderRadius: 'var(--border-radius-lg)', overflow: 'hidden' }}>
              <div style={{ height: 80, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, background: colorMap[p.color] || '#E1F5EE' }}>{p.emoji}</div>
              <div style={{ padding: '9px 10px' }}>
                <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--color-text-primary)' }}>{p.name}</div>
                <div style={{ fontSize: 10, color: 'var(--color-text-tertiary)', marginTop: 1 }}>{p.location}</div>
                <div style={{ fontSize: 12, fontWeight: 500, color: '#1D9E75', marginTop: 5 }}>{p.price}</div>
                <div style={{ display: 'flex', gap: 4, marginTop: 5, flexWrap: 'wrap' }}>
                  <Tag label={p.type} /><Tag label={p.status} />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <Modal title="Add Property" onClose={onModalClose}>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Property name *</label>
              <input className="form-input" required value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="e.g. 3 Bed House · East Legon" />
            </div>
            <div className="form-group">
              <label className="form-label">Location</label>
              <input className="form-input" value={form.location} onChange={e => setForm(p => ({ ...p, location: e.target.value }))} placeholder="e.g. Accra · Added May 2025" />
            </div>
            <div className="form-group">
              <label className="form-label">Price (display) *</label>
              <input className="form-input" required value={form.price} onChange={e => setForm(p => ({ ...p, price: e.target.value }))} placeholder="e.g. GHS 480,000 or GHS 4,200 / mo" />
            </div>
            <div className="form-group">
              <label className="form-label">Price (number, for metrics)</label>
              <input className="form-input" type="number" value={form.price_numeric} onChange={e => setForm(p => ({ ...p, price_numeric: e.target.value }))} placeholder="e.g. 480000" />
            </div>
            <div className="form-group">
              <label className="form-label">Type</label>
              <select className="form-select" value={form.type} onChange={e => setForm(p => ({ ...p, type: e.target.value }))}>
                <option value="sale">For Sale</option><option value="rent">For Rent</option><option value="land">Land</option>
              </select>
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 16 }}>
              <button type="button" className="btn" onClick={onModalClose}>Cancel</button>
              <button type="submit" className="btn btn-green" disabled={saving}>{saving ? 'Saving…' : 'Add Property'}</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
