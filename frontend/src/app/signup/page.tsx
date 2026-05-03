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
          <h1 style={{ fontSize: 15, fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: 4 }}>Create your account</h1>
          <p style={{ fontSize: 11, color: 'var(--color-text-tertiary)', marginBottom: 22 }}>Start managing your real estate leads with AI</p>

          {error && (
            <div style={{ background: '#FAECE7', border: '0.5px solid #f0b9a8', borderRadius: 6, padding: '9px 12px', fontSize: 11, color: '#993C1D', marginBottom: 16 }}>
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
                  style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: 'var(--color-text-tertiary)' }}>
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

            <button type="submit" disabled={loading}
              style={{ width: '100%', padding: '10px', background: loading ? '#aaa' : '#1D9E75', color: '#E1F5EE', border: 'none', borderRadius: 7, fontSize: 12, fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer', transition: 'background 0.2s' }}>
              {loading ? 'Creating account…' : 'Create account'}
            </button>
          </form>
        </div>

        <p style={{ textAlign: 'center', fontSize: 11, color: 'var(--color-text-tertiary)', marginTop: 16 }}>
          Already have an account?{' '}
          <Link href="/login" style={{ color: '#1D9E75', fontWeight: 500, textDecoration: 'none' }}>Sign in</Link>
        </p>
      </div>
    </div>
  );
}
