import React, { useState } from 'react';

export default function CompletionPopup({ open, onClose, results, guessesByPage = {} }) {
    const [copied, setCopied] = useState(false);
    const [showDetails, setShowDetails] = useState(false);
    if (!open) return null;

    const d = new Date();
    const dateStr = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
    const entries = results.map(r => ({ label: r.label, value: r.solved ? r.guessCount : '-' }));
    const total = entries.reduce((acc, e) => acc + (typeof e.value === 'number' ? e.value : 0), 0);
    const summaryLines = [`I've completed all the modes of Pokédle for ${dateStr}! \n`, ...entries.map(e => `${e.label}: ${e.value}`), `Total: ${total}`];
    const summaryText = summaryLines.join('\n');

    // Build detailed text when details view is active: include guesses per mode (reversed order)
    const detailedLines = [ `I've completed all the modes of Pokédle for ${dateStr}! \n` ];
    results.forEach(r => {
        const guesses = (guessesByPage && guessesByPage[r.key]) || [];
        const names = guesses.slice().reverse().map(g => g.name).filter(Boolean);
        const displayNames = names.length > 0 ? ` (${names.join(', ')})` : '';
        detailedLines.push(`${r.label}: ${guesses.length}${displayNames}`);
    });
    detailedLines.push(`Total: ${total}`);
    const detailedText = detailedLines.join('\n');

    const handleCopy = async () => {
        try {
            const toCopy = showDetails ? detailedText : summaryText;
            await navigator.clipboard.writeText(toCopy);
            setCopied(true);
            setTimeout(() => setCopied(false), 1800);
        } catch (e) {
            // ignore
        }
    };

    return (
        <div role="dialog" aria-modal="true" aria-label="Results" style={{ position: 'fixed', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 20000 }}>
            <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.45)' }} onClick={onClose} />
                <div style={{ width: 260, maxWidth: '64vw', background: '#fff', borderRadius: 8, padding: 14, boxShadow: '0 8px 36px rgba(0,0,0,0.35)', position: 'relative', zIndex: 20001, overflow: 'hidden' }}>
                    <div aria-hidden style={{ position: 'absolute', inset: 0, backgroundImage: `url('icons/results.png')`, backgroundSize: 'contain', backgroundRepeat: 'no-repeat', backgroundPosition: 'center', opacity: 0.06, filter: 'grayscale(60%)', pointerEvents: 'none', margin: '25px' }} />

                <div style={{ position: 'relative', zIndex: 2 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                    <h3 style={{ margin: 0, fontSize: 18 }}>Results</h3>
                    <button onClick={onClose} aria-label="Close" style={{ background: 'transparent', border: 'none', fontSize: 20, cursor: 'pointer' }}>×</button>
                </div>

                <div style={{ marginBottom: 8, color: '#333', fontSize: 13, whiteSpace: 'pre-wrap', fontFamily: 'Inter, Arial, sans-serif', textAlign: 'left' }}>
                    {!showDetails ? (
                        entries.map((e, i) => (
                                    <div key={i} style={{ display: 'flex', alignItems: 'center', padding: '2px 0', lineHeight: '1.2' }}>
                                        <span style={{ fontWeight: 400, fontSize: 12, opacity: 0.95, flex: '1 1 auto', marginRight: 8, maxWidth: 75 }}>{e.label}:</span>
                                        <span style={{ fontWeight: 700, minWidth: 24, textAlign: 'right', flex: '0 0 auto' }}>{e.value}</span>
                                    </div>
                        ))
                    ) : (
                        <div style={{ color: '#333', fontSize: 13 }}>
                            {results.map((r, i) => {
                                const guesses = (guessesByPage && guessesByPage[r.key]) || [];
                                // Reverse guesses order for display
                                const names = guesses.slice().reverse().map(g => g.name).filter(Boolean);
                                const displayNames = names.length > 0 ? ` (${names.join(', ')})` : '';
                                const count = guesses.length;
                                return (
                                    <div key={i} style={{ padding: '4px 0' }}>
                                        <span style={{ fontWeight: 400 }}>{r.label}:</span> <strong>{count}</strong>
                                        {names.length > 0 ? (
                                            <span>{' ('}
                                                {names.map((n, idx) => {
                                                    const sep = idx === 0 ? '' : ', ';
                                                    const isLast = idx === names.length - 1;
                                                    return (
                                                        <span key={idx}>{sep}{isLast ? <strong>{n}</strong> : n}</span>
                                                    );
                                                })}
                                            {')'}</span>
                                        ) : null}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0' }}>
                        <div style={{ lineHeight: '1.2', fontWeight: 700, textAlign: 'left' }}>{`Total: ${total}`}</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            {copied && <div style={{ color: '#1976d2', fontSize: 13 }}>Copied to clipboard</div>}
                            <button onClick={() => setShowDetails(s => !s)} aria-pressed={showDetails} aria-label="Toggle details" title="Show details" style={{ height: 36, padding: '6px 10px', borderRadius: 8, background: showDetails ? '#1976d2' : '#eee', color: showDetails ? '#fff' : '#111', border: '1px solid #ddd', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                {showDetails ? 'Hide' : 'Details'}
                            </button>
                            <button onClick={handleCopy} aria-label="Copy summary" style={{ width: 40, height: 36, padding: 6, borderRadius: 8, background: '#eee', color: '#111', border: '1px solid #ddd', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
                                    <path d="M16 1H4a2 2 0 0 0-2 2v12" stroke="#333" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                                    <rect x="8" y="5" width="13" height="13" rx="2" stroke="#333" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                                </svg>
                            </button>
                        </div>
                    </div>
                </div>
                </div>
            </div>
        </div>
    );
}
