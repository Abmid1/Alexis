'use client';
import { Screen } from '@/lib/types';
import { useAuth } from '@/context/AuthContext';

const navItems: { id: Screen; label: string; color: string; group?: string }[] = [
  { id: 'dashboard',     label: 'Dashboard',     color: '#1D9E75', group: 'Main' },
  { id: 'leads',         label: 'Leads',          color: '#378ADD' },
  { id: 'properties',    label: 'Properties',     color: '#EF9F27' },
  { id: 'conversations', label: 'Conversations',  color: '#1D9E75' },
  { id: 'pipeline',      label: 'Pipeline',       color: '#7F77DD' },
  { id: 'reports',       label: 'Reports',        color: '#D85A30', group: 'Analytics' },
  { id: 'followups',     label: 'Follow-ups',     color: '#EF9F27', group: 'Automation' },
  { id: 'airesponses',   label: 'AI Responses',   color: '#1D9E75' },
];

interface SidebarProps { active: Screen; onNavigate: (s: Screen) => void; }

export default function Sidebar({ active, onNavigate }: SidebarProps) {
  const { user } = useAuth();
  let lastGroup = '';

  const initials = user?.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || 'KM';

  return (
    <div className="sidebar">
      <div style={{ padding: '14px 16px', borderBottom: '0.5px solid var(--color-border-tertiary)', flexShrink: 0 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-primary)', letterSpacing: '0.05em' }}>BILT AFRICA</div>
        <div style={{ fontSize: 9, color: 'var(--color-text-tertiary)', marginTop: 1 }}>Agent CRM · Accra</div>
      </div>

      <div style={{ flex: 1, paddingTop: 6, overflowY: 'auto' }}>
        {navItems.map((item) => {
          const showGroup = item.group && item.group !== lastGroup;
          if (item.group) lastGroup = item.group;
          return (
            <div key={item.id}>
              {showGroup && (
                <div style={{ padding: '10px 8px 2px', fontSize: 9, color: 'var(--color-text-tertiary)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                  {item.group}
                </div>
              )}
              <div
                className={`nav-item${active === item.id ? ' active' : ''}`}
                onClick={() => onNavigate(item.id)}
              >
                <div className="nav-dot" style={{ background: item.color }} />
                {item.label}
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ margin: '0 10px 12px', background: 'var(--color-background-primary)', border: '0.5px solid var(--color-border-tertiary)', borderRadius: 'var(--border-radius-md)', padding: 10, flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div className="av av-g" style={{ width: 26, height: 26, fontSize: 9 }}>{initials}</div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--color-text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {user?.name || 'Agent'}
            </div>
            <div style={{ fontSize: 9, color: '#1D9E75' }}>● Online</div>
          </div>
        </div>
      </div>
    </div>
  );
}
