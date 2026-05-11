'use client';
import { Screen } from '@/lib/types';
import { useAuth } from '@/context/AuthContext';

// ── SVG Icons (inline, no dependency) ────────────────────────────────────────
const Icons: Record<string, JSX.Element> = {
  dashboard: (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
      <rect x="1.5" y="1.5" width="5" height="5" rx="1.2" />
      <rect x="9.5" y="1.5" width="5" height="5" rx="1.2" />
      <rect x="1.5" y="9.5" width="5" height="5" rx="1.2" />
      <rect x="9.5" y="9.5" width="5" height="5" rx="1.2" />
    </svg>
  ),
  leads: (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="8" cy="5" r="2.5" />
      <path d="M2.5 13c0-2.485 2.462-4.5 5.5-4.5s5.5 2.015 5.5 4.5" />
    </svg>
  ),
  properties: (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1.5 7L8 2l6.5 5" />
      <path d="M3 7.5V14h10V7.5" />
      <rect x="5.5" y="10" width="5" height="4" rx="0.5" />
    </svg>
  ),
  conversations: (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 9.5a5 2.5 0 01-5 2.5H7l-3 2.5V12H3a2 2 0 01-2-2V5a5 2.5 0 015-2.5h3a5 2.5 0 015 2.5v2z" />
    </svg>
  ),
  pipeline: (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
      <rect x="1.5" y="3.5" width="3" height="9" rx="1" />
      <rect x="6.5" y="6.5" width="3" height="6" rx="1" />
      <rect x="11.5" y="2" width="3" height="10.5" rx="1" />
    </svg>
  ),
  reports: (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 12l3.5-4 3 3 3.5-6 2.5 2.5" />
      <path d="M1.5 14.5h13" />
    </svg>
  ),
  followups: (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="8" cy="8" r="6.5" />
      <path d="M8 4.5V8l2.5 2.5" />
    </svg>
  ),
  airesponses: (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
      <rect x="1.5" y="3.5" width="13" height="9" rx="1.5" />
      <circle cx="5.5" cy="8" r="1" fill="currentColor" stroke="none" />
      <circle cx="8" cy="8" r="1" fill="currentColor" stroke="none" />
      <circle cx="10.5" cy="8" r="1" fill="currentColor" stroke="none" />
    </svg>
  ),
};

// ── Nav config ────────────────────────────────────────────────────────────────
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

      {/* ── Logo / Workspace name ──────────────────────────────── */}
      <div style={{
        padding: '14px 14px 12px',
        borderBottom: '1px solid var(--border-subtle)',
        display: 'flex',
        alignItems: 'center',
        gap: 9,
        flexShrink: 0,
      }}>
        {/* Logo mark */}
        <div style={{
          width: 22, height: 22,
          borderRadius: 6,
          background: 'var(--accent)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
        }}>
          <span style={{ color: '#fff', fontSize: 11, fontWeight: 700, letterSpacing: '-0.5px' }}>B</span>
        </div>
        <div>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', letterSpacing: '0.01em' }}>Bilt Africa</div>
          <div style={{ fontSize: 9.5, color: 'var(--text-muted)', marginTop: 0.5 }}>Real Estate CRM</div>
        </div>
      </div>

      {/* ── Navigation ────────────────────────────────────────── */}
      <div style={{ flex: 1, paddingTop: 4, overflowY: 'auto' }}>
        {NAV.map((item) => {
          const showSection = item.section && item.section !== lastSection;
          if (item.section) lastSection = item.section;
          const isActive = active === item.id;

          return (
            <div key={item.id}>
              {showSection && (
                <div className="nav-section-label">
                  {item.section}
                </div>
              )}
              <div
                className={`nav-item${isActive ? ' active' : ''}`}
                onClick={() => onNavigate(item.id)}
              >
                <span className="nav-icon">{Icons[item.id]}</span>
                <span>{item.label}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── User card ─────────────────────────────────────────── */}
      <div style={{
        margin: '8px 10px 12px',
        background: 'var(--bg-elevated)',
        border: '1px solid var(--border-subtle)',
        borderRadius: 'var(--r-md)',
        padding: '8px 10px',
        flexShrink: 0,
        display: 'flex',
        alignItems: 'center',
        gap: 8,
      }}>
        <div className="av av-g" style={{ width: 24, height: 24, fontSize: 9 }}>{initials}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {user?.name || 'Agent'}
          </div>
          <div style={{ fontSize: 9, color: 'var(--accent-light)', marginTop: 1, display: 'flex', alignItems: 'center', gap: 3 }}>
            <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--accent-light)', display: 'inline-block' }} />
            Online
          </div>
        </div>
      </div>
    </div>
  );
}
