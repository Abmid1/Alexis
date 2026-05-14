'use client';
import { useRouter } from 'next/navigation';
import { Screen } from '@/lib/types';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';

const titles: Record<Screen, string> = {
  dashboard:     'Dashboard',
  leads:         'Leads',
  properties:    'Properties',
  conversations: 'Conversations',
  pipeline:      'Pipeline',
  reports:       'Reports',
  followups:     'Follow-ups',
  airesponses:   'AI Responses',
};

const actions: Record<Screen, string> = {
  dashboard:     '',
  leads:         '+ New lead',
  properties:    '+ Add property',
  conversations: '',
  pipeline:      '+ New deal',
  reports:       '',
  followups:     '+ Add task',
  airesponses:   '+ New template',
};

// Subtle page icons in the breadcrumb
const breadcrumbIcons: Record<Screen, string> = {
  dashboard:     '◈',
  leads:         '◎',
  properties:    '⌂',
  conversations: '◷',
  pipeline:      '▤',
  reports:       '▲',
  followups:     '◉',
  airesponses:   '✦',
};

interface TopbarProps { active: Screen; onAction: () => void; }

export default function Topbar({ active, onAction }: TopbarProps) {
  const { logout, user } = useAuth();
  const { theme, toggle } = useTheme();
  const router = useRouter();

  const handleLogout = () => {
    logout();
    router.replace('/login');
  };

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 20px',
      height: 44,
      borderBottom: '1px solid var(--border-subtle)',
      flexShrink: 0,
      background: 'var(--bg-sidebar)',
    }}>

      {/* ── Left: breadcrumb ───────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        {/* Workspace label */}
        <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 450 }}>Bilt Africa</span>
        {/* Chevron */}
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
          <path d="M3.5 2.5L6.5 5l-3 2.5" stroke="var(--text-muted)" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        {/* Current page */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <span style={{ fontSize: 11, color: 'var(--text-muted)', opacity: 0.7 }}>{breadcrumbIcons[active]}</span>
          <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-primary)' }}>{titles[active]}</span>
        </div>
      </div>

      {/* ── Right: actions + user ──────────────────────────────── */}
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>

        {/* Action CTA */}
        {actions[active] && (
          <button className="btn btn-green" onClick={onAction} style={{ fontSize: 11, padding: '4px 12px' }}>
            {actions[active]}
          </button>
        )}

        {/* Theme toggle */}
        <button
          onClick={toggle}
          title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          style={{
            width: 30, height: 30,
            borderRadius: 'var(--r-md)',
            border: '1px solid var(--border)',
            background: 'var(--bg-elevated)',
            cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'background 0.15s, border-color 0.15s',
            flexShrink: 0,
          }}
        >
          {theme === 'dark' ? (
            /* Sun icon */
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="var(--text-secondary)" strokeWidth="1.4" strokeLinecap="round">
              <circle cx="8" cy="8" r="3" />
              <line x1="8" y1="1" x2="8" y2="2.5" />
              <line x1="8" y1="13.5" x2="8" y2="15" />
              <line x1="1" y1="8" x2="2.5" y2="8" />
              <line x1="13.5" y1="8" x2="15" y2="8" />
              <line x1="3.05" y1="3.05" x2="4.1" y2="4.1" />
              <line x1="11.9" y1="11.9" x2="12.95" y2="12.95" />
              <line x1="12.95" y1="3.05" x2="11.9" y2="4.1" />
              <line x1="4.1" y1="11.9" x2="3.05" y2="12.95" />
            </svg>
          ) : (
            /* Moon icon */
            <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="var(--text-secondary)" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
              <path d="M13.5 10.5A6 6 0 015.5 2.5a6 6 0 108 8z" />
            </svg>
          )}
        </button>

        {/* Divider */}
        <div style={{ width: 1, height: 18, background: 'var(--border)', flexShrink: 0 }} />

        {/* User */}
        {user && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            <div style={{
              width: 22, height: 22,
              borderRadius: '50%',
              background: 'rgba(29,158,117,0.2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 8.5, fontWeight: 700, color: 'var(--accent-light)',
              flexShrink: 0,
            }}>
              {user.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}
            </div>
            <span style={{
              fontSize: 11, color: 'var(--text-secondary)',
              maxWidth: 90, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {user.name}
            </span>
            <button
              onClick={handleLogout}
              style={{
                fontSize: 10,
                color: 'var(--text-muted)',
                background: 'none',
                border: '1px solid var(--border)',
                borderRadius: 'var(--r-sm)',
                padding: '2px 8px',
                cursor: 'pointer',
                transition: 'color 0.1s, border-color 0.1s',
              }}
            >
              Sign out
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
