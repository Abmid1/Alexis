'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import Sidebar from '@/components/Sidebar';
import Topbar from '@/components/Topbar';
import Dashboard from '@/components/screens/Dashboard';
import Leads from '@/components/screens/Leads';
import Properties from '@/components/screens/Properties';
import Conversations from '@/components/screens/Conversations';
import Pipeline from '@/components/screens/Pipeline';
import Reports from '@/components/screens/Reports';
import FollowUps from '@/components/screens/FollowUps';
import AIResponses from '@/components/screens/AIResponses';
import { Screen } from '@/lib/types';

export default function Home() {
  const router = useRouter();
  const { user, isLoading } = useAuth();
  const [screen, setScreen] = useState<Screen>('dashboard');
  const [modal, setModal] = useState(false);

  useEffect(() => {
    if (!isLoading && !user) router.replace('/login');
  }, [user, isLoading, router]);

  if (isLoading || !user) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#F7F7F6' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: '#1D9E75', margin: '0 auto 12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ color: '#E1F5EE', fontSize: 14, fontWeight: 700 }}>B</span>
          </div>
          <div style={{ fontSize: 11, color: '#888780' }}>Loading…</div>
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      <Sidebar active={screen} onNavigate={(s) => { setScreen(s); setModal(false); }} />
      <div className="main">
        <Topbar active={screen} onAction={() => setModal(true)} />
        <div className="content">
          {screen === 'dashboard'    && <Dashboard />}
          {screen === 'leads'        && <Leads showModal={modal} onModalClose={() => setModal(false)} />}
          {screen === 'properties'   && <Properties showModal={modal} onModalClose={() => setModal(false)} />}
          {screen === 'conversations'&& <Conversations />}
          {screen === 'pipeline'     && <Pipeline />}
          {screen === 'reports'      && <Reports />}
          {screen === 'followups'    && <FollowUps showModal={modal} onModalClose={() => setModal(false)} />}
          {screen === 'airesponses'  && <AIResponses showModal={modal} onModalClose={() => setModal(false)} />}
        </div>
      </div>
    </div>
  );
}
