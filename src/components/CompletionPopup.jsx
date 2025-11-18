import React, { useState } from 'react';

export default function CompletionPopup({ open, onClose, results }) {
    const [copied, setCopied] = useState(false);
    if (!open) return null;

    const d = new Date();
    const dateStr = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
    const lines = [`I've completed all the modes of Pokedle on ${dateStr}! \n`, ...results.map(r => `${r.label}: ${r.solved ? r.guessCount : 'Not completed'}`)];
    const text = lines.join('\n');

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(text);
            setCopied(true);
            setTimeout(() => setCopied(false), 1800);
        } catch (e) {
            // ignore
        }
    };

    return (
        <div role="dialog" aria-modal="true" aria-label="Results" style={{ position: 'fixed', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 20000 }}>
            <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.45)' }} onClick={onClose} />
            <div style={{ width: 420, maxWidth: '84vw', background: '#fff', borderRadius: 8, padding: 16, boxShadow: '0 8px 36px rgba(0,0,0,0.35)', position: 'relative', zIndex: 20001 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                    <h3 style={{ margin: 0, fontSize: 18 }}>Results</h3>
                    <button onClick={onClose} aria-label="Close" style={{ background: 'transparent', border: 'none', fontSize: 20, cursor: 'pointer' }}>×</button>
                </div>

                <div style={{ marginBottom: 8, color: '#555', whiteSpace: 'pre-wrap', fontFamily: 'Inter, Arial, sans-serif', textAlign: 'left' }}>
                    {lines.map((line, i) => (
                        <div key={i} style={{ padding: '2px 0' }}>{line}</div>
                    ))}
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', marginTop: 12, gap: 8 }}>
                    {copied && <div style={{ color: '#1976d2', fontSize: 13 }}>Copied to clipboard</div>}
                    <button onClick={handleCopy} aria-label="Copy summary" style={{ width: 40, height: 36, padding: 6, borderRadius: 8, background: '#eee', color: '#111', border: '1px solid #ddd', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
                            <path d="M16 1H4a2 2 0 0 0-2 2v12" stroke="#333" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                            <rect x="8" y="5" width="13" height="13" rx="2" stroke="#333" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                    </button>
                </div>
            </div>
        </div>
    );
}
