'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';

export default function LoginPage() {
  const router = useRouter();
  const { login, user, isLoading } = useAuth();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPw, setShowPw] = useState(false);

  useEffect(() => {
    if (!isLoading && user) router.replace('/');
  }, [user, isLoading, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      const { token, user: userData } = await api.auth.login(form);
      login(token, userData);
      router.replace('/');
    } catch (err: any) {
      setError(err.message || 'Login failed');
    } finally { setLoading(false); }
  };

  return (
    <div style={{ minHeight: '100vh', background: '#F7F7F6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-sans)', padding: '20px' }}>
      <div style={{ width: '100%', maxWidth: 380 }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 48, height: 48, borderRadius: 12, background: '#1D9E75', marginBottom: 12 }}>
            <span style={{ color: '#E1F5EE', fontSize: 20, fontWeight: 700 }}>B</span>
          </div>
          <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--color-text-primary)', letterSpacing: '0.05em' }}>BILT AFRICA</div>
          <div style={{ fontSize: 11, color: 'var(--color-text-tertiary)', marginTop: 2 }}>Agent CRM · Accra</div>
        </div>

        {/* Card */}
        <div style={{ background: '#fff', borderRadius: 12, border: '0.5px solid var(--color-border-tertiary)', padding: '28px 28px 24px', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
          <h1 style={{ fontSize: 15, fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: 4 }}>Welcome back</h1>
          <p style={{ fontSize: 11, color: 'var(--color-text-tertiary)', marginBottom: 22 }}>Sign in to your CRM account</p>

          {error && (
            <div style={{ background: '#FAECE7', border: '0.5px solid #f0b9a8', borderRadius: 6, padding: '9px 12px', fontSize: 11, color: '#993C1D', marginBottom: 16 }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Email address</label>
              <input className="form-input" type="email" required autoFocus
                value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                placeholder="you@example.com" />
            </div>
            <div className="form-group" style={{ marginBottom: 8 }}>
              <label className="form-label">Password</label>
              <div style={{ position: 'relative' }}>
                <input className="form-input" type={showPw ? 'text' : 'password'} required
                  value={form.password} onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                  placeholder="Enter your password" style={{ paddingRight: 36 }} />
                <button type="button" onClick={() => setShowPw(!showPw)}
                  style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: 'var(--color-text-tertiary)' }}>
                  {showPw ? '🙈' : '👁'}
                </button>
              </div>
            </div>

            <div style={{ textAlign: 'right', marginBottom: 18 }}>
              <Link href="/forgot-password" style={{ fontSize: 10, color: '#1D9E75', textDecoration: 'none' }}>Forgot password?</Link>
            </div>

            <button type="submit" disabled={loading}
              style={{ width: '100%', padding: '10px', background: loading ? '#aaa' : '#1D9E75', color: '#E1F5EE', border: 'none', borderRadius: 7, fontSize: 12, fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer', transition: 'background 0.2s' }}>
              {loading ? 'Signing in…' : 'Sign in'}
            </button>
          </form>
        </div>

        <p style={{ textAlign: 'center', fontSize: 11, color: 'var(--color-text-tertiary)', marginTop: 16 }}>
          Don&apos;t have an account?{' '}
          <Link href="/signup" style={{ color: '#1D9E75', fontWeight: 500, textDecoration: 'none' }}>Create one</Link>
        </p>
      </div>
    </div>
  );
}
