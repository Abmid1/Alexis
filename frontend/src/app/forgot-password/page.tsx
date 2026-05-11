'use client';
import { useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';

type Step = 'email' | 'reset' | 'done';

export default function ForgotPasswordPage() {
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [devToken, setDevToken] = useState('');
  const [resetForm, setResetForm] = useState({ token: '', newPassword: '', confirm: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPw, setShowPw] = useState(false);

  const handleRequestReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      const res = await api.auth.forgotPassword(email);
      if (res.dev_token) {
        setDevToken(res.dev_token);
        setResetForm(p => ({ ...p, token: res.dev_token }));
      }
      setStep('reset');
    } catch (err: any) {
      setError(err.message || 'Request failed');
    } finally { setLoading(false); }
  };

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (resetForm.newPassword !== resetForm.confirm) return setError('Passwords do not match');
    if (resetForm.newPassword.length < 6) return setError('Password must be at least 6 characters');
    setLoading(true);
    try {
      await api.auth.resetPassword({ token: resetForm.token, newPassword: resetForm.newPassword });
      setStep('done');
    } catch (err: any) {
      setError(err.message || 'Reset failed');
    } finally { setLoading(false); }
  };

  return (
    <div style={{ minHeight: '100vh', background: '#111113', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-sans)', padding: '20px' }}>
      <div style={{ width: '100%', maxWidth: 360 }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 44, height: 44, borderRadius: 12, background: '#1D9E75', marginBottom: 14, boxShadow: '0 0 28px rgba(29,158,117,0.3)' }}>
            <span style={{ color: '#fff', fontSize: 20, fontWeight: 700 }}>B</span>
          </div>
          <div style={{ fontSize: 15, fontWeight: 600, color: '#E4E4E7', letterSpacing: '0.02em' }}>Bilt Africa</div>
          <div style={{ fontSize: 11, color: '#62626A', marginTop: 3 }}>Real Estate CRM · Accra</div>
        </div>

        <div style={{ background: '#1C1C1F', borderRadius: 12, border: '1px solid #2A2A2E', padding: '26px 26px 22px', boxShadow: '0 8px 40px rgba(0,0,0,0.4)' }}>

          {/* ── Step 1: Enter email ── */}
          {step === 'email' && (
            <>
              <h1 style={{ fontSize: 15, fontWeight: 600, color: '#E4E4E7', marginBottom: 4 }}>Reset your password</h1>
              <p style={{ fontSize: 11, color: '#62626A', marginBottom: 22 }}>Enter your email to receive a reset token</p>
              {error && <div style={{ background: 'rgba(216,90,48,0.12)', borderRadius: 6, padding: '9px 12px', fontSize: 11, color: '#F87171', marginBottom: 16 }}>{error}</div>}
              <form onSubmit={handleRequestReset}>
                <div className="form-group" style={{ marginBottom: 22 }}>
                  <label className="form-label">Email address</label>
                  <input className="form-input" type="email" required autoFocus value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" />
                </div>
                <button type="submit" disabled={loading}
                  style={{ width: '100%', padding: '10px', background: loading ? '#2A2A2E' : '#1D9E75', color: '#fff', border: 'none', borderRadius: 7, fontSize: 12, fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer' }}>
                  {loading ? 'Sending…' : 'Send reset token'}
                </button>
              </form>
            </>
          )}

          {/* ── Step 2: Enter token + new password ── */}
          {step === 'reset' && (
            <>
              <h1 style={{ fontSize: 15, fontWeight: 600, color: '#E4E4E7', marginBottom: 4 }}>Enter reset token</h1>
              <p style={{ fontSize: 11, color: '#62626A', marginBottom: 16 }}>
                {devToken ? 'Development mode — token shown below.' : 'Check your email for the reset token.'}
              </p>

              {devToken && (
                <div style={{ background: 'rgba(29,158,117,0.1)', border: '1px solid rgba(52,211,153,0.2)', borderRadius: 6, padding: '10px 12px', marginBottom: 16 }}>
                  <div style={{ fontSize: 9, color: '#34D399', marginBottom: 4, fontWeight: 600 }}>DEV MODE — Reset Token</div>
                  <div style={{ fontSize: 10, fontFamily: 'monospace', color: '#34D399', wordBreak: 'break-all' }}>{devToken}</div>
                </div>
              )}

              {error && <div style={{ background: 'rgba(216,90,48,0.12)', borderRadius: 6, padding: '9px 12px', fontSize: 11, color: '#F87171', marginBottom: 16 }}>{error}</div>}

              <form onSubmit={handleReset}>
                <div className="form-group">
                  <label className="form-label">Reset token</label>
                  <input className="form-input" required value={resetForm.token} onChange={e => setResetForm(p => ({ ...p, token: e.target.value }))} placeholder="Paste token here" />
                </div>
                <div className="form-group">
                  <label className="form-label">New password</label>
                  <div style={{ position: 'relative' }}>
                    <input className="form-input" type={showPw ? 'text' : 'password'} required value={resetForm.newPassword} onChange={e => setResetForm(p => ({ ...p, newPassword: e.target.value }))} placeholder="Min. 6 characters" style={{ paddingRight: 36 }} />
                    <button type="button" onClick={() => setShowPw(!showPw)} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: '#62626A' }}>
                      {showPw ? '🙈' : '👁'}
                    </button>
                  </div>
                </div>
                <div className="form-group" style={{ marginBottom: 22 }}>
                  <label className="form-label">Confirm new password</label>
                  <input className="form-input" type={showPw ? 'text' : 'password'} required value={resetForm.confirm} onChange={e => setResetForm(p => ({ ...p, confirm: e.target.value }))} placeholder="Repeat password" />
                </div>
                <button type="submit" disabled={loading}
                  style={{ width: '100%', padding: '10px', background: loading ? '#2A2A2E' : '#1D9E75', color: '#fff', border: 'none', borderRadius: 7, fontSize: 12, fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer' }}>
                  {loading ? 'Resetting…' : 'Reset password'}
                </button>
              </form>
            </>
          )}

          {/* ── Step 3: Done ── */}
          {step === 'done' && (
            <div style={{ textAlign: 'center', padding: '8px 0' }}>
              <div style={{ fontSize: 32, marginBottom: 12 }}>✅</div>
              <h1 style={{ fontSize: 15, fontWeight: 600, color: '#E4E4E7', marginBottom: 8 }}>Password reset!</h1>
              <p style={{ fontSize: 11, color: '#62626A', marginBottom: 22 }}>Your password has been updated. You can now sign in.</p>
              <Link href="/login" style={{ display: 'block', padding: '10px', background: '#1D9E75', color: '#fff', borderRadius: 7, fontSize: 12, fontWeight: 600, textDecoration: 'none', textAlign: 'center' }}>
                Go to login
              </Link>
            </div>
          )}
        </div>

        <p style={{ textAlign: 'center', fontSize: 11, color: '#62626A', marginTop: 16 }}>
          <Link href="/login" style={{ color: '#1D9E75', fontWeight: 500, textDecoration: 'none' }}>← Back to login</Link>
        </p>
      </div>
    </div>
  );
}
