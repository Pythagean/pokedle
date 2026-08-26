import React, { useState } from 'react';
import { useAuth } from '../utils/AuthContext';

const PINK = '#DE627B';
const PINK_LIGHT = '#ffaab5';
const PINK_BG = '#fff0f3';

export default function AccountPage({ darkMode = false }) {
  const { user, displayName, loading, signIn, signUp, signInWithMagicLink, signOut, updateDisplayName } = useAuth();

  const bg = darkMode ? '#1f232a' : 'transparent';
  const panelBg = darkMode ? '#2a2f38' : '#fff';
  const border = darkMode ? '#3a4250' : '#f0d0d8';
  const text = darkMode ? '#e5e7eb' : '#222';
  const muted = darkMode ? '#9ca3af' : '#666';
  const inputBg = darkMode ? '#1f2430' : '#fff';
  const inputBorder = darkMode ? '#4b5563' : '#e0c0c8';

  if (loading) {
    return (
      <div style={{ background: bg, minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: text }}>
        Loading…
      </div>
    );
  }

  return (
    <div style={{ background: bg, minHeight: '60vh', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '24px 16px', color: text }}>
      <div style={{ width: '100%', maxWidth: 420 }}>
        <h2 style={{ textAlign: 'center', color: PINK, marginBottom: 24, fontSize: 24, fontWeight: 800 }}>
          👤 Account
        </h2>
        {user ? (
          <ProfileView
            user={user}
            displayName={displayName}
            darkMode={darkMode}
            panelBg={panelBg}
            border={border}
            text={text}
            muted={muted}
            inputBg={inputBg}
            inputBorder={inputBorder}
            signOut={signOut}
            updateDisplayName={updateDisplayName}
          />
        ) : (
          <AuthForm
            darkMode={darkMode}
            panelBg={panelBg}
            border={border}
            text={text}
            muted={muted}
            inputBg={inputBg}
            inputBorder={inputBorder}
            signIn={signIn}
            signUp={signUp}
            signInWithMagicLink={signInWithMagicLink}
          />
        )}
      </div>
    </div>
  );
}

function AuthForm({ darkMode, panelBg, border, text, muted, inputBg, inputBorder, signIn, signUp, signInWithMagicLink }) {
  const [tab, setTab] = useState('signin'); // 'signin' | 'signup' | 'magic'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [status, setStatus] = useState(null); // null | 'loading' | 'success' | 'error'
  const [message, setMessage] = useState('');

  const inputStyle = {
    width: '100%',
    padding: '10px 12px',
    borderRadius: 8,
    border: `1px solid ${inputBorder}`,
    background: inputBg,
    color: text,
    fontSize: 15,
    boxSizing: 'border-box',
    outline: 'none',
    colorScheme: darkMode ? 'dark' : 'light',
  };

  const btnStyle = (disabled) => ({
    width: '100%',
    padding: '11px',
    borderRadius: 8,
    border: 'none',
    background: disabled ? (darkMode ? '#555' : '#e0b0ba') : PINK,
    color: '#fff',
    fontSize: 15,
    fontWeight: 700,
    cursor: disabled ? 'not-allowed' : 'pointer',
    marginTop: 4,
    transition: 'background 0.2s',
  });

  async function handleSubmit(e) {
    e.preventDefault();
    setStatus('loading');
    setMessage('');
    try {
      if (tab === 'signin') {
        const { error } = await signIn(email, password);
        if (error) { setStatus('error'); setMessage(error.message); }
        else setStatus('success');
      } else if (tab === 'signup') {
        const { error } = await signUp(email, password, displayName);
        if (error) { setStatus('error'); setMessage(error.message); }
        else { setStatus('success'); setMessage('Account created! Check your email to confirm.'); }
      } else {
        const { error } = await signInWithMagicLink(email);
        if (error) { setStatus('error'); setMessage(error.message); }
        else { setStatus('success'); setMessage('Magic link sent! Check your email.'); }
      }
    } catch (err) {
      setStatus('error');
      setMessage(err?.message ?? 'Something went wrong.');
    }
  }

  const tabStyle = (active) => ({
    flex: 1,
    padding: '9px 0',
    background: active ? PINK : 'transparent',
    color: active ? '#fff' : (darkMode ? '#ff9db5' : PINK),
    border: 'none',
    borderRadius: 8,
    fontWeight: 700,
    fontSize: 14,
    cursor: 'pointer',
    transition: 'background 0.2s',
  });

  return (
    <div style={{ background: panelBg, border: `1px solid ${border}`, borderRadius: 14, padding: '28px 24px', boxShadow: '0 4px 24px rgba(0,0,0,0.06)' }}>
      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, background: darkMode ? '#1f2430' : '#fff0f3', borderRadius: 10, padding: 4, marginBottom: 24 }}>
        <button style={tabStyle(tab === 'signin')} onClick={() => { setTab('signin'); setStatus(null); setMessage(''); }}>Sign In</button>
        <button style={tabStyle(tab === 'signup')} onClick={() => { setTab('signup'); setStatus(null); setMessage(''); }}>Sign Up</button>
        <button style={tabStyle(tab === 'magic')} onClick={() => { setTab('magic'); setStatus(null); setMessage(''); }}>Magic Link</button>
      </div>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {tab === 'signup' && (
          <div>
            <label style={{ fontSize: 13, fontWeight: 600, color: muted, display: 'block', marginBottom: 4 }}>Display Name (up to 12 chars)</label>
            <input
              style={inputStyle}
              type="text"
              maxLength={12}
              value={displayName}
              onChange={e => setDisplayName(e.target.value)}
              placeholder="Your trainer name"
              autoComplete="nickname"
            />
          </div>
        )}
        <div>
          <label style={{ fontSize: 13, fontWeight: 600, color: muted, display: 'block', marginBottom: 4 }}>Email</label>
          <input
            style={inputStyle}
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="trainer@pokecenter.com"
            required
            autoComplete="email"
          />
        </div>
        {tab !== 'magic' && (
          <div>
            <label style={{ fontSize: 13, fontWeight: 600, color: muted, display: 'block', marginBottom: 4 }}>Password</label>
            <input
              style={inputStyle}
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              required={tab !== 'magic'}
              minLength={6}
              autoComplete={tab === 'signup' ? 'new-password' : 'current-password'}
            />
          </div>
        )}

        {message && (
          <div style={{
            padding: '8px 12px',
            borderRadius: 8,
            background: status === 'error' ? (darkMode ? '#3b1f24' : '#fff0f0') : (darkMode ? '#1f3b24' : '#f0fff4'),
            color: status === 'error' ? '#e53e3e' : '#38a169',
            fontSize: 13,
          }}>
            {message}
          </div>
        )}

        <button
          type="submit"
          disabled={status === 'loading' || (tab === 'magic' && status === 'success')}
          style={btnStyle(status === 'loading' || (tab === 'magic' && status === 'success'))}
        >
          {status === 'loading'
            ? 'Please wait…'
            : tab === 'signin' ? 'Sign In'
            : tab === 'signup' ? 'Create Account'
            : 'Send Magic Link'}
        </button>
      </form>

      <p style={{ textAlign: 'center', fontSize: 12, color: muted, marginTop: 20, marginBottom: 0 }}>
        Your scores and guesses are saved anonymously by default.
        Creating an account lets you restore them across devices.
      </p>
    </div>
  );
}

function ProfileView({ user, displayName, darkMode, panelBg, border, text, muted, inputBg, inputBorder, signOut, updateDisplayName }) {
  const [editName, setEditName] = useState(displayName || '');
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');
  const [loggingOut, setLoggingOut] = useState(false);

  // Keep editName in sync if displayName changes (e.g. after profile fetch)
  React.useEffect(() => { setEditName(displayName || ''); }, [displayName]);

  const inputStyle = {
    width: '100%',
    padding: '10px 12px',
    borderRadius: 8,
    border: `1px solid ${inputBorder}`,
    background: inputBg,
    color: text,
    fontSize: 15,
    boxSizing: 'border-box',
    outline: 'none',
    colorScheme: darkMode ? 'dark' : 'light',
  };

  async function handleSaveName(e) {
    e.preventDefault();
    if (!editName.trim()) return;
    setSaving(true);
    setSaveMsg('');
    const { error } = await updateDisplayName(editName);
    setSaving(false);
    if (error) setSaveMsg('Failed to save: ' + error.message);
    else {
      setSaveMsg('Saved!');
      // Also update localStorage so the card name stays in sync
      try { localStorage.setItem('pokedle_card_name', editName.trim().slice(0, 12)); } catch (_) {}
      setTimeout(() => setSaveMsg(''), 2000);
    }
  }

  async function handleSignOut() {
    setLoggingOut(true);
    await signOut();
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Profile card */}
      <div style={{ background: panelBg, border: `1px solid ${border}`, borderRadius: 14, padding: '24px', boxShadow: '0 4px 24px rgba(0,0,0,0.06)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20 }}>
          <div style={{ width: 52, height: 52, borderRadius: '50%', background: `linear-gradient(135deg, ${PINK_LIGHT}, ${PINK})`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26, flexShrink: 0 }}>
            🧢
          </div>
          <div>
            <div style={{ fontWeight: 800, fontSize: 18, color: text }}>{displayName || 'Trainer'}</div>
            <div style={{ fontSize: 13, color: muted }}>{user.email}</div>
          </div>
        </div>

        {/* Display name edit */}
        <form onSubmit={handleSaveName} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <label style={{ fontSize: 13, fontWeight: 600, color: muted }}>Display Name (shown on leaderboard)</label>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              style={{ ...inputStyle, flex: 1 }}
              type="text"
              maxLength={12}
              value={editName}
              onChange={e => { setEditName(e.target.value); setSaveMsg(''); }}
              placeholder="Your trainer name"
            />
            <button
              type="submit"
              disabled={saving || !editName.trim() || editName.trim() === displayName}
              style={{
                padding: '10px 16px',
                borderRadius: 8,
                border: 'none',
                background: (saving || !editName.trim() || editName.trim() === displayName) ? (darkMode ? '#555' : '#e0b0ba') : PINK,
                color: '#fff',
                fontWeight: 700,
                fontSize: 14,
                cursor: (saving || !editName.trim() || editName.trim() === displayName) ? 'not-allowed' : 'pointer',
                whiteSpace: 'nowrap',
                flexShrink: 0,
              }}
            >
              {saving ? '…' : 'Save'}
            </button>
          </div>
          {saveMsg && (
            <div style={{ fontSize: 13, color: saveMsg.startsWith('Failed') ? '#e53e3e' : '#38a169' }}>
              {saveMsg}
            </div>
          )}
        </form>
      </div>

      {/* Sign out */}
      <button
        onClick={handleSignOut}
        disabled={loggingOut}
        style={{
          width: '100%',
          padding: '11px',
          borderRadius: 8,
          border: `1px solid ${border}`,
          background: 'transparent',
          color: PINK,
          fontSize: 15,
          fontWeight: 700,
          cursor: loggingOut ? 'not-allowed' : 'pointer',
        }}
      >
        {loggingOut ? 'Signing out…' : 'Sign Out'}
      </button>

      <p style={{ textAlign: 'center', fontSize: 12, color: muted, margin: 0 }}>
        Your scores are linked to your account and synced across devices.
      </p>
    </div>
  );
}
