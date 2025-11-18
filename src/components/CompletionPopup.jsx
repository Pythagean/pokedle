import React from 'react';

export default function CompletionPopup({ open, onClose, results }) {
  if (!open) return null;
  return (
    <div role="dialog" aria-modal="true" aria-label="Completion summary" style={{ position: 'fixed', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 20000 }}>
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.45)' }} onClick={onClose} />
      <div style={{ width: 360, maxWidth: '94vw', background: '#fff', borderRadius: 8, padding: 16, boxShadow: '0 8px 36px rgba(0,0,0,0.35)', position: 'relative', zIndex: 20001 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <h3 style={{ margin: 0, fontSize: 18 }}>Completion Summary</h3>
          <button onClick={onClose} aria-label="Close" style={{ background: 'transparent', border: 'none', fontSize: 20, cursor: 'pointer' }}>×</button>
        </div>
        <div style={{ marginBottom: 8, color: '#555' }}>Guesses taken for each mode:</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {results.map(r => (
            <div key={r.key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 8px', borderRadius: 6, background: '#fafafa', border: '1px solid #eee' }}>
              <div style={{ fontWeight: 700 }}>{r.label}</div>
              <div style={{ color: r.solved ? '#111' : '#999' }}>{r.solved ? `${r.guessCount} guess${r.guessCount === 1 ? '' : 'es'}` : 'Not completed'}</div>
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 12 }}>
          <button onClick={onClose} style={{ padding: '8px 12px', borderRadius: 8, background: '#1976d2', color: '#fff', border: 'none', cursor: 'pointer' }}>Close</button>
        </div>
      </div>
    </div>
  );
}
