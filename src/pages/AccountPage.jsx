import React, { useState } from 'react';
import { useAuth } from '../utils/AuthContext';

const PINK = '#DE627B';
const PINK_LIGHT = '#ffaab5';
const PINK_BG = '#fff0f3';

const AVATAR_BG_COLORS = [
  '#f5a3b3', '#a3c4f5', '#a3f0b4', '#f5e6a3',
  '#c4a3f5', '#f5c4a3', '#a3eef0', '#e8e8e8',
  '#3a4250',
];
const DEFAULT_AVATAR_BG = AVATAR_BG_COLORS[0];

export default function AccountPage({ darkMode = false }) {
  const { user, displayName, profile, loading, signIn, signUp, signInWithMagicLink, signOut, updateDisplayName, updateAvatar } = useAuth();

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
            profile={profile}
            darkMode={darkMode}
            panelBg={panelBg}
            border={border}
            text={text}
            muted={muted}
            inputBg={inputBg}
            inputBorder={inputBorder}
            signOut={signOut}
            updateDisplayName={updateDisplayName}
            updateAvatar={updateAvatar}
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

function ProfileView({ user, displayName, profile, darkMode, panelBg, border, text, muted, inputBg, inputBorder, signOut, updateDisplayName, updateAvatar }) {
  const [editName, setEditName] = useState(displayName || '');
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');
  const [loggingOut, setLoggingOut] = useState(false);
  const [avatarHovered, setAvatarHovered] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);

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
      {pickerOpen && (
        <AvatarPickerModal
          open={pickerOpen}
          onClose={() => setPickerOpen(false)}
          onSave={async (pokemonId, bgColor, zoom, offsetX, offsetY) => {
            await updateAvatar(pokemonId, bgColor, zoom, offsetX, offsetY);
            setPickerOpen(false);
          }}
          initialPokemonId={profile?.avatar_pokemon_id || null}
          initialBgColor={profile?.avatar_bg_color || DEFAULT_AVATAR_BG}
          initialZoom={profile?.avatar_zoom ?? 1}
          initialOffsetX={profile?.avatar_offset_x ?? 0}
          initialOffsetY={profile?.avatar_offset_y ?? 0}
          darkMode={darkMode}
        />
      )}
      {/* Profile card */}
      <div style={{ background: panelBg, border: `1px solid ${border}`, borderRadius: 14, padding: '24px', boxShadow: '0 4px 24px rgba(0,0,0,0.06)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20 }}>
          {/* Clickable avatar circle */}
          <div
            role="button"
            aria-label="Edit avatar"
            tabIndex={0}
            onClick={() => setPickerOpen(true)}
            onKeyDown={e => (e.key === 'Enter' || e.key === ' ') && setPickerOpen(true)}
            onMouseEnter={() => setAvatarHovered(true)}
            onMouseLeave={() => setAvatarHovered(false)}
            style={{
              width: 52, height: 52, borderRadius: '50%',
              flexShrink: 0, cursor: 'pointer', position: 'relative',
              boxShadow: avatarHovered ? `0 0 0 3px ${PINK}` : '0 0 0 3px transparent',
              transition: 'box-shadow 0.15s',
              ...(profile?.avatar_pokemon_id ? {
                backgroundColor: profile.avatar_bg_color || PINK_LIGHT,
                backgroundImage: `url(https://raw.githubusercontent.com/Pythagean/pokedle_assets/main/sprites_trimmed/${profile.avatar_pokemon_id}-front.png)`,
                backgroundSize: `${(profile.avatar_zoom ?? 1) * 100}%`,
                backgroundPosition: `${50 - (profile.avatar_offset_x ?? 0)}% ${50 - (profile.avatar_offset_y ?? 0)}%`,
                backgroundRepeat: 'no-repeat',
              } : {
                background: profile?.avatar_bg_color || `linear-gradient(135deg, ${PINK_LIGHT}, ${PINK})`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }),
            }}
          >
            {!profile?.avatar_pokemon_id && (
              <img src="icons/classic.png" alt="default avatar" style={{ width: 40, height: 40, objectFit: 'contain' }} />
            )}
            {/* Pencil overlay on hover */}
            <div style={{
              position: 'absolute', inset: 0,
              background: 'rgba(0,0,0,0.42)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              borderRadius: '50%',
              opacity: avatarHovered ? 1 : 0,
              transition: 'opacity 0.15s',
              pointerEvents: 'none',
            }}>
              <span style={{ fontSize: 17, lineHeight: 1 }}>✏️</span>
            </div>
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

function AvatarPickerModal({ open, onClose, onSave, initialPokemonId, initialBgColor, initialZoom, initialOffsetX, initialOffsetY, darkMode }) {
  const [pokemonList, setPokemonList] = useState([]);
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState(initialPokemonId);
  const [selectedBg, setSelectedBg] = useState(initialBgColor || DEFAULT_AVATAR_BG);
  const [zoom, setZoom] = useState(initialZoom ?? 1);
  const [offsetX, setOffsetX] = useState(initialOffsetX ?? 0);
  const [offsetY, setOffsetY] = useState(initialOffsetY ?? 0);
  const [dragging, setDragging] = useState(false);
  const [saving, setSaving] = useState(false);
  const dragRef = React.useRef(null);

  React.useEffect(() => {
    if (!open) return;
    setSelectedId(initialPokemonId);
    setSelectedBg(initialBgColor || DEFAULT_AVATAR_BG);
    setZoom(initialZoom ?? 1);
    setOffsetX(initialOffsetX ?? 0);
    setOffsetY(initialOffsetY ?? 0);
    setSearch('');
    if (pokemonList.length === 0) {
      fetch('data/pokemon_data.json')
        .then(r => r.json())
        .then(data => setPokemonList(data.map(p => ({ id: p.id, name: p.name }))));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  if (!open) return null;

  const filtered = search.trim()
    ? pokemonList.filter(p => p.name.toLowerCase().includes(search.toLowerCase()))
    : pokemonList;

  async function handleSave() {
    setSaving(true);
    await onSave(selectedId, selectedBg, zoom, offsetX, offsetY);
    setSaving(false);
  }

  function handlePointerDown(e) {
    if (!selectedId) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    const rect = e.currentTarget.getBoundingClientRect();
    dragRef.current = { startX: e.clientX, startY: e.clientY, startOffsetX: offsetX, startOffsetY: offsetY, w: rect.width, h: rect.height };
    setDragging(true);
  }

  function handlePointerMove(e) {
    if (!dragRef.current) return;
    const { startX, startY, startOffsetX, startOffsetY, w, h } = dragRef.current;
    setOffsetX(Math.max(-50, Math.min(50, startOffsetX - (e.clientX - startX) / w * 100)));
    setOffsetY(Math.max(-50, Math.min(50, startOffsetY - (e.clientY - startY) / h * 100)));
  }

  function handlePointerUp() {
    dragRef.current = null;
    setDragging(false);
  }

  function nudge(dx, dy) {
    setOffsetX(v => Math.max(-50, Math.min(50, v - dx)));
    setOffsetY(v => Math.max(-50, Math.min(50, v - dy)));
  }

  const bg = darkMode ? '#2a2f38' : '#fff';
  const headerText = darkMode ? '#e5e7eb' : '#222';
  const mutedText = darkMode ? '#9ca3af' : '#666';
  const inputBg = darkMode ? '#1f2937' : '#f9f9f9';
  const inputBorder = darkMode ? '#4b5563' : '#ddd';
  const dividerColor = darkMode ? '#3a4250' : '#f0d0d8';
  const cellHoverBg = darkMode ? '#3a4250' : '#fff0f3';
  const dpadBtn = {
    width: 26, height: 26, padding: 0, borderRadius: 4,
    border: `1px solid ${inputBorder}`,
    background: darkMode ? '#1f2937' : '#f0f0f0',
    color: headerText, fontSize: 13, cursor: 'pointer',
  };

  return (
    <div
      onClick={e => e.target === e.currentTarget && onClose()}
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(0,0,0,0.55)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 16,
      }}
    >
      <div style={{
        background: bg, borderRadius: 16,
        width: '100%', maxWidth: 480,
        maxHeight: '90vh',
        display: 'flex', flexDirection: 'column',
        overflow: 'hidden',
        boxShadow: '0 8px 40px rgba(0,0,0,0.25)',
      }}>
        {/* Header */}
        <div style={{ padding: '20px 20px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
          <h3 style={{ margin: 0, color: PINK, fontWeight: 800, fontSize: 18 }}>Choose Your Avatar</h3>
          <button
            onClick={onClose}
            aria-label="Close"
            style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: mutedText, lineHeight: 1, padding: '4px 6px' }}
          >✕</button>
        </div>

        {/* Preview + zoom/position controls */}
        <div style={{ padding: '14px 20px 0', display: 'flex', gap: 14, flexShrink: 0 }}>
          {/* Draggable preview circle */}
          <div
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            style={{
              width: 90, height: 90, borderRadius: '50%',
              flexShrink: 0, position: 'relative',
              cursor: selectedId ? (dragging ? 'grabbing' : 'grab') : 'default',
              userSelect: 'none', touchAction: 'none',
              ...(selectedId ? {
                backgroundColor: selectedBg,
                backgroundImage: `url(https://raw.githubusercontent.com/Pythagean/pokedle_assets/main/sprites_trimmed/${selectedId}-front.png)`,
                backgroundSize: `${zoom * 100}%`,
                backgroundPosition: `${50 - offsetX}% ${50 - offsetY}%`,
                backgroundRepeat: 'no-repeat',
              } : {
                background: selectedBg,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }),
            }}
          >
            {!selectedId && (
              <img src="icons/classic.png" alt="default avatar" style={{ width: '70%', height: '70%', objectFit: 'contain' }} />
            )}
          </div>
          {/* Controls */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6, justifyContent: 'center' }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, fontWeight: 700, color: mutedText, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 3 }}>
                <span>Zoom</span><span>{zoom.toFixed(1)}×</span>
              </div>
              <input
                type="range" min="0.5" max="3" step="0.05"
                value={zoom}
                onChange={e => setZoom(+e.target.value)}
                disabled={!selectedId}
                style={{ width: '100%', accentColor: PINK, cursor: selectedId ? 'pointer' : 'not-allowed' }}
              />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 26px)', gap: 2, opacity: selectedId ? 1 : 0.35 }}>
              <span /><button onClick={() => nudge(0, -5)} style={dpadBtn}>↑</button><span />
              <button onClick={() => nudge(-5, 0)} style={dpadBtn}>←</button>
              <button onClick={() => { setOffsetX(0); setOffsetY(0); }} style={{ ...dpadBtn, fontSize: 11 }} title="Reset position">⊙</button>
              <button onClick={() => nudge(5, 0)} style={dpadBtn}>→</button>
              <span /><button onClick={() => nudge(0, 5)} style={dpadBtn}>↓</button><span />
            </div>
          </div>
        </div>

        {/* Background color picker */}
        <div style={{ padding: '12px 20px 0', flexShrink: 0 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: mutedText, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>Background</div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {AVATAR_BG_COLORS.map(color => (
              <button
                key={color}
                onClick={() => setSelectedBg(color)}
                aria-label={color}
                style={{
                  width: 28, height: 28, borderRadius: '50%', background: color,
                  border: selectedBg === color ? `3px solid ${PINK}` : '3px solid transparent',
                  cursor: 'pointer', flexShrink: 0, padding: 0,
                  outline: selectedBg === color ? `1px solid rgba(0,0,0,0.15)` : 'none',
                  transition: 'border-color 0.1s',
                }}
              />
            ))}
          </div>
        </div>

        {/* Search */}
        <div style={{ padding: '12px 20px 0', flexShrink: 0 }}>
          <input
            type="search"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search Pokémon…"
            autoComplete="off"
            style={{
              width: '100%', boxSizing: 'border-box', padding: '8px 12px',
              borderRadius: 8, border: `1px solid ${inputBorder}`,
              background: inputBg, color: headerText,
              fontSize: 14, outline: 'none',
              colorScheme: darkMode ? 'dark' : 'light',
            }}
          />
        </div>

        {/* Pokémon grid */}
        <div style={{
          flex: 1, overflowY: 'auto', padding: '8px 10px',
          display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 2,
          alignContent: 'start', maxHeight: 320,
        }}>
          {/* "None" option */}
          <div
            onClick={() => setSelectedId(null)}
            style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              padding: '3px 1px', borderRadius: 6, cursor: 'pointer',
              background: selectedId === null ? cellHoverBg : 'transparent',
              border: selectedId === null ? `1px solid ${PINK}` : '1px solid transparent',
            }}
          >
            <img
              src="icons/classic.png"
              alt="none"
              style={{ width: 40, height: 40, objectFit: 'contain' }}
            />
            <span style={{ fontSize: 8, color: mutedText, marginTop: 2, minHeight: 10 }}>None</span>
          </div>

          {filtered.map(p => (
            <div
              key={p.id}
              onClick={() => setSelectedId(p.id)}
              style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center',
                padding: '3px 1px', borderRadius: 6, cursor: 'pointer',
                background: selectedId === p.id ? cellHoverBg : 'transparent',
                border: selectedId === p.id ? `1px solid ${PINK}` : '1px solid transparent',
              }}
            >
              <img
                src={`https://raw.githubusercontent.com/Pythagean/pokedle_assets/main/sprites_trimmed/${p.id}-front.png`}
                alt={p.name}
                loading="lazy"
                style={{ width: 40, height: 40, objectFit: 'contain' }}
              />
              <span style={{ fontSize: 8, color: mutedText, marginTop: 2, textAlign: 'center', wordBreak: 'break-word', maxWidth: '100%', minHeight: 10, lineHeight: 1 }}>{p.name}</span>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div style={{ padding: '12px 20px', borderTop: `1px solid ${dividerColor}`, display: 'flex', gap: 8, flexShrink: 0 }}>
          <button
            onClick={onClose}
            style={{
              flex: 1, padding: 10, borderRadius: 8,
              border: `1px solid ${inputBorder}`,
              background: 'transparent', color: headerText,
              cursor: 'pointer', fontWeight: 600, fontSize: 14,
            }}
          >Cancel</button>
          <button
            onClick={handleSave}
            disabled={saving}
            style={{
              flex: 2, padding: 10, borderRadius: 8, border: 'none',
              background: saving ? (darkMode ? '#555' : '#e0b0ba') : PINK,
              color: '#fff', cursor: saving ? 'not-allowed' : 'pointer',
              fontWeight: 700, fontSize: 14,
            }}
          >{saving ? 'Saving…' : 'Save Avatar'}</button>
        </div>
      </div>
    </div>
  );
}
