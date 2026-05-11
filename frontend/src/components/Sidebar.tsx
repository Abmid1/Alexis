'use client';
import { Screen } from '@/lib/types';
import { useAuth } from '@/context/AuthContext';

// ── SVG Icons ─────────────────────────────────────────────────────────────────
const Icons: Record<string, JSX.Element> = {
  dashboard: (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="1.5" y="1.5" width="5.5" height="5.5" rx="1.5" />
      <rect x="9"   y="1.5" width="5.5" height="5.5" rx="1.5" />
      <rect x="1.5" y="9"   width="5.5" height="5.5" rx="1.5" />
      <rect x="9"   y="9"   width="5.5" height="5.5" rx="1.5" />
    </svg>
  ),
  leads: (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="8" cy="5" r="2.8" />
      <path d="M2 14c0-2.8 2.7-5 6-5s6 2.2 6 5" />
    </svg>
  ),
  properties: (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1.5 7.5L8 2l6.5 5.5" />
      <path d="M3 8V14h10V8" />
      <rect x="5.5" y="10" width="5" height="4" rx="0.8" />
    </svg>
  ),
  conversations: (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M13.5 2.5H2.5a1 1 0 00-1 1v6a1 1 0 001 1h2v2.5l3-2.5h6a1 1 0 001-1v-6a1 1 0 00-1-1z" />
    </svg>
  ),
  pipeline: (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="1.5" y="4" width="3" height="9" rx="1" />
      <rect x="6.5" y="6.5" width="3" height="6.5" rx="1" />
      <rect x="11.5" y="2" width="3" height="11" rx="1" />
    </svg>
  ),
  reports: (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="2,12 5.5,7.5 8.5,10.5 12,5 14.5,7" />
      <line x1="1.5" y1="14.5" x2="14.5" y2="14.5" />
    </svg>
  ),
  followups: (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="8" cy="8" r="6.5" />
      <polyline points="8,4.5 8,8.5 10.5,11" />
    </svg>
  ),
  airesponses: (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 1.5l1.8 4.7 4.7 1.8-4.7 1.8L8 14.5l-1.8-4.7L1.5 8l4.7-1.8z" />
    </svg>
  ),
};

const NAV: { id: Screen; label: string; section?: string }[] = [
  { id: 'dashboard',     label: 'Dashboard',     section: 'Workspace' },
  { id: 'leads',         label: 'Leads' },
  { id: 'properties',    label: 'Properties' },
  { id: 'conversations', label: 'Conversations' },
  { id: 'pipeline',      label: 'Pipeline' },
  { id: 'reports',       label: 'Reports',       section: 'Analytics' },
  { id: 'followups',     label: 'Follow-ups',    section: 'Automation' },
  { id: 'airesponses',   label: 'AI Responses' },
];

interface SidebarProps { active: Screen; onNavigate: (s: Screen) => void; }

export default function Sidebar({ active, onNavigate }: SidebarProps) {
  const { user } = useAuth();
  const initials = user?.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase() || 'BA';
  let lastSection = '';

  return (
    <div className="sidebar">

      {/* ── Logo ──────────────────────────────────────────────────── */}
      <div style={{
        padding: '16px 16px 14px',
        borderBottom: '1px solid var(--border-subtle)',
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        flexShrink: 0,
      }}>
        <div style={{
          width: 30, height: 30,
          borderRadius: 8,
          background: 'linear-gradient(135deg, #1D9E75 0%, #34D399 100%)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
          boxShadow: '0 2px 8px rgba(29,158,117,0.4)',
        }}>
          <span style={{ color: '#fff', fontSize: 14, fontWeight: 800, letterSpacing: '-0.5px' }}>B</span>
        </div>
        <div>
          <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>
            Bilt Africa
          </div>
          <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 1 }}>
            Real Estate CRM
          </div>
        </div>
      </div>

      {/* ── Navigation ────────────────────────────────────────────── */}
      <div style={{ flex: 1, paddingTop: 6, overflowY: 'auto' }}>
        {NAV.map((item) => {
          const showSection = item.section && item.section !== lastSection;
          if (item.section) lastSection = item.section;
          const isActive = active === item.id;

          return (
            <div key={item.id}>
              {showSection && (
                <div className="nav-section-label">{item.section}</div>
              )}
              <div
                className={`nav-item${isActive ? ' active' : ''}`}
                onClick={() => onNavigate(item.id)}
              >
                <span className="nav-icon">{Icons[item.id]}</span>
                <span>{item.label}</span>
                {/* Unread dot for conversations */}
                {item.id === 'conversations' && (
                  <span style={{
                    marginLeft: 'auto',
                    width: 6, height: 6,
                    borderRadius: '50%',
                    background: '#F87171',
                    flexShrink: 0,
                    boxShadow: '0 0 6px rgba(248,113,113,0.6)',
                  }} />
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* ── User card ─────────────────────────────────────────────── */}
      <div style={{
        margin: '8px 10px 14px',
        background: 'var(--bg-elevated)',
        border: '1px solid var(--border)',
        borderRadius: 10,
        padding: '10px 12px',
        flexShrink: 0,
        display: 'flex',
        alignItems: 'center',
        gap: 10,
      }}>
        <div style={{
          width: 30, height: 30,
          borderRadius: '50%',
          background: 'linear-gradient(135deg, rgba(29,158,117,0.3), rgba(52,211,153,0.15))',
          border: '1.5px solid rgba(52,211,153,0.3)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 11, fontWeight: 700,
          color: 'var(--accent-light)',
          flexShrink: 0,
        }}>
          {initials}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {user?.name || 'Agent'}
          </div>
          <div style={{ fontSize: 10, color: 'var(--accent-light)', marginTop: 1.5, display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#34D399', display: 'inline-block', boxShadow: '0 0 4px rgba(52,211,153,0.7)' }} />
            Online
          </div>
        </div>
      </div>
    </div>
  );
}
