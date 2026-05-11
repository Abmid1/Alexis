'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';

export default function SignupPage() {
  const router = useRouter();
  const { login, user, isLoading } = useAuth();
  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPw, setShowPw] = useState(false);

  useEffect(() => {
    if (!isLoading && user) router.replace('/');
  }, [user, isLoading, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (form.password !== form.confirm) return setError('Passwords do not match');
    if (form.password.length < 6) return setError('Password must be at least 6 characters');
    setLoading(true);
    try {
      const { token, user: userData } = await api.auth.register({ name: form.name, email: form.email, password: form.password });
      login(token, userData);
      router.replace('/login');
    } catch (err: any) {
      setError(err.message || 'Registration failed');
    } finally { setLoading(false); }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: '#111113',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: 'var(--font-sans)',
      padding: '20px',
    }}>
      <div style={{ width: '100%', maxWidth: 360 }}>

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            width: 44, height: 44, borderRadius: 12,
            background: '#1D9E75',
            marginBottom: 14,
            boxShadow: '0 0 28px rgba(29,158,117,0.3)',
          }}>
            <span style={{ color: '#fff', fontSize: 20, fontWeight: 700 }}>B</span>
          </div>
          <div style={{ fontSize: 15, fontWeight: 600, color: '#E4E4E7', letterSpacing: '0.02em' }}>Bilt Africa</div>
          <div style={{ fontSize: 11, color: '#62626A', marginTop: 3 }}>Real Estate CRM · Accra</div>
        </div>

        {/* Card */}
        <div style={{
          background: '#1C1C1F',
          borderRadius: 12,
          border: '1px solid #2A2A2E',
          padding: '26px 26px 22px',
          boxShadow: '0 8px 40px rgba(0,0,0,0.4)',
        }}>
          <h1 style={{ fontSize: 14, fontWeight: 600, color: '#E4E4E7', marginBottom: 4 }}>Create your account</h1>
          <p style={{ fontSize: 11, color: '#62626A', marginBottom: 22 }}>Start managing leads with AI automation</p>

          {error && (
            <div style={{
              background: 'rgba(216,90,48,0.12)',
              border: '1px solid rgba(216,90,48,0.25)',
              borderRadius: 6,
              padding: '9px 12px',
              fontSize: 11,
              color: '#F87171',
              marginBottom: 16,
            }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Full name</label>
              <input className="form-input" required autoFocus
                value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                placeholder="Kwame Mensah" />
            </div>
            <div className="form-group">
              <label className="form-label">Email address</label>
              <input className="form-input" type="email" required
                value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                placeholder="kwame@dreamhomes.com" />
            </div>
            <div className="form-group">
              <label className="form-label">Password</label>
              <div style={{ position: 'relative' }}>
                <input className="form-input" type={showPw ? 'text' : 'password'} required
                  value={form.password} onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                  placeholder="Min. 6 characters" style={{ paddingRight: 36 }} />
                <button type="button" onClick={() => setShowPw(!showPw)}
                  style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: '#62626A' }}>
                  {showPw ? '🙈' : '👁'}
                </button>
              </div>
            </div>
            <div className="form-group" style={{ marginBottom: 22 }}>
              <label className="form-label">Confirm password</label>
              <input className="form-input" type={showPw ? 'text' : 'password'} required
                value={form.confirm} onChange={e => setForm(p => ({ ...p, confirm: e.target.value }))}
                placeholder="Repeat password" />
            </div>

            <button type="submit" disabled={loading} style={{
              width: '100%',
              padding: '9px',
              background: loading ? '#2A2A2E' : '#1D9E75',
              color: loading ? '#62626A' : '#fff',
              border: 'none',
              borderRadius: 7,
              fontSize: 12,
              fontWeight: 600,
              cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'background 0.2s',
            }}>
              {loading ? 'Creating account…' : 'Create account'}
            </button>
          </form>
        </div>

        <p style={{ textAlign: 'center', fontSize: 11, color: '#62626A', marginTop: 16 }}>
          Already have an account?{' '}
          <Link href="/login" style={{ color: '#34D399', fontWeight: 500, textDecoration: 'none' }}>Sign in</Link>
        </p>
      </div>
    </div>
  );
}
