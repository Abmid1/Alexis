'use client';
import { useRouter } from 'next/navigation';
import { Screen } from '@/lib/types';
import { useAuth } from '@/context/AuthContext';

const titles: Record<Screen, string> = {
  dashboard: 'Dashboard', leads: 'Leads', properties: 'Properties',
  conversations: 'Conversations', pipeline: 'Pipeline', reports: 'Reports',
  followups: 'Follow-ups', airesponses: 'AI Responses',
};
const actions: Record<Screen, string> = {
  dashboard: '+ Add lead', leads: '+ New lead', properties: '+ Add property',
  conversations: '', pipeline: '+ New deal', reports: '',
  followups: '+ Add task', airesponses: '+ New template',
};

interface TopbarProps { active: Screen; onAction: () => void; }

export default function Topbar({ active, onAction }: TopbarProps) {
  const { logout, user } = useAuth();
  const router = useRouter();

  const handleLogout = () => {
    logout();
    router.replace('/login');
  };

  const today = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '11px 18px', borderBottom: '0.5px solid var(--color-border-tertiary)', flexShrink: 0, background: 'var(--color-background-primary)' }}>
      <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-text-primary)' }}>{titles[active]}</div>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <div style={{ fontSize: 11, color: 'var(--color-text-tertiary)' }}>{today}</div>
        {actions[active] && (
          <button className="btn btn-green" onClick={onAction}>{actions[active]}</button>
        )}
        {user && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, paddingLeft: 8, borderLeft: '0.5px solid var(--color-border-tertiary)' }}>
            <div style={{ width: 22, height: 22, borderRadius: '50%', background: '#E1F5EE', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 8, fontWeight: 600, color: '#0F6E56' }}>
              {user.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
            </div>
            <span style={{ fontSize: 10, color: 'var(--color-text-secondary)', maxWidth: 80, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.name}</span>
            <button onClick={handleLogout}
              style={{ fontSize: 10, color: 'var(--color-text-tertiary)', background: 'none', border: '0.5px solid var(--color-border-secondary)', borderRadius: 5, padding: '3px 7px', cursor: 'pointer' }}>
              Log out
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
