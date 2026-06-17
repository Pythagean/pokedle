import React, { useEffect, useState } from 'react';

export default function CompletionPopup({ open, onClose, results, guessesByPage = {}, darkMode = undefined }) {
    const [copied, setCopied] = useState(false);
    const [showDetails, setShowDetails] = useState(false);
    const [isDarkMode, setIsDarkMode] = useState(() => {
        if (typeof darkMode === 'boolean') return darkMode;
        if (typeof document === 'undefined') return false;
        return document.body.classList.contains('dark-mode');
    });

    useEffect(() => {
        if (typeof darkMode === 'boolean') {
            setIsDarkMode(darkMode);
            return;
        }
        if (typeof document === 'undefined') return;

        const update = () => setIsDarkMode(document.body.classList.contains('dark-mode'));
        update();

        const observer = new MutationObserver(update);
        observer.observe(document.body, { attributes: true, attributeFilter: ['class'] });

        return () => observer.disconnect();
    }, [darkMode]);

    if (!open) return null;

    const theme = isDarkMode
        ? {
            modalBg: '#2a2f38',
            text: '#e5e7eb',
            textMuted: '#cbd5e1',
            border: '#4b5563',
            panelBtnBg: '#374151',
            panelBtnText: '#f3f4f6',
            closeBg: 'rgba(55,65,81,0.95)',
            copied: '#93c5fd',
            accent: '#60a5fa',
            svgStroke: '#d1d5db'
        }
        : {
            modalBg: '#ffffff',
            text: '#333333',
            textMuted: '#333333',
            border: '#dddddd',
            panelBtnBg: '#eeeeee',
            panelBtnText: '#111111',
            closeBg: 'rgba(255,255,255,0.92)',
            copied: '#1976d2',
            accent: '#1976d2',
            svgStroke: '#333333'
        };

    const d = new Date();
    const dateStr = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
    const entries = results.map(r => ({ label: r.label, value: r.solved ? r.guessCount : '-' }));
    const total = entries.reduce((acc, e) => acc + (typeof e.value === 'number' ? e.value : 0), 0);
    const summaryLines = [`I've completed all the modes of Slowpokle for ${dateStr}! \n`, ...entries.map(e => `${e.label}: ${e.value}`), `Total: ${total}`];
    const summaryText = summaryLines.join('\n');

    // Build detailed text when details view is active: include guesses per mode (reversed order)
    const detailedLines = [ `I've completed all the modes of Slowpokle for ${dateStr}! \n` ];
    results.forEach(r => {
        const guesses = (guessesByPage && guessesByPage[r.key]) || [];
        const names = guesses.slice().reverse().map(g => g.name).filter(Boolean);
        const displayNames = (r.solved && names.length > 0) ? ` (${names.join(', ')})` : '';
        const countDisplay = r.solved ? guesses.length : '-';
        detailedLines.push(`${r.label}: ${countDisplay}${displayNames}`);
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
                <div style={{ width: 260, maxWidth: '64vw', background: theme.modalBg, borderRadius: 8, padding: 14, boxShadow: '0 8px 36px rgba(0,0,0,0.35)', position: 'relative', zIndex: 20001, overflow: 'hidden', border: `1px solid ${theme.border}` }}>
                    <div aria-hidden style={{ position: 'absolute', inset: 0, backgroundImage: `url('icons/results.png')`, backgroundSize: 'contain', backgroundRepeat: 'no-repeat', backgroundPosition: 'center', opacity: 0.06, filter: 'grayscale(60%)', pointerEvents: 'none', margin: '25px' }} />

                <div style={{ position: 'relative', zIndex: 2 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 8, position: 'relative' }}>
                    <h3 style={{ margin: 0, fontSize: 18, color: theme.text }}>Results</h3>
                    <button onClick={onClose} aria-label="Close" title="Close" style={{
                        position: 'absolute',
                        right: 8,
                        top: 0,
                        transform: 'translateY(-2px)',
                        width: 44,
                        height: 40,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderRadius: 10,
                        background: theme.closeBg,
                        color: theme.panelBtnText,
                        fontSize: 20,
                        border: `1px solid ${theme.border}`,
                        cursor: 'pointer',
                        zIndex: 3,
                    }}>×</button>
                </div>

                <div style={{ marginBottom: 8, color: theme.text, fontSize: 13, whiteSpace: 'pre-wrap', fontFamily: 'Inter, Arial, sans-serif', textAlign: 'left' }}>
                    {!showDetails ? (
                        entries.map((e, i) => (
                                    <div key={i} style={{ display: 'flex', alignItems: 'center', padding: '2px 0', lineHeight: '1.2' }}>
                                        <span style={{ fontWeight: 400, fontSize: 12, opacity: 0.95, flex: '1 1 auto', marginRight: 8, maxWidth: 75 }}>{e.label}:</span>
                                        <span style={{ fontWeight: 700, minWidth: 24, textAlign: 'right', flex: '0 0 auto' }}>{e.value}</span>
                                    </div>
                        ))
                    ) : (
                        <div style={{ color: theme.text, fontSize: 13 }}>
                            {results.map((r, i) => {
                                const guesses = (guessesByPage && guessesByPage[r.key]) || [];
                                // Reverse guesses order for display
                                const names = guesses.slice().reverse().map(g => g.name).filter(Boolean);
                                const count = guesses.length;
                                const countDisplay = r.solved ? count : '-';
                                return (
                                    <div key={i} style={{ padding: '4px 0' }}>
                                        <span style={{ fontWeight: 400 }}>{r.label}:</span> <strong>{countDisplay}</strong>
                                        {r.solved && names.length > 0 ? (
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
                            {copied && <div style={{ color: theme.copied, fontSize: 13 }}>Copied to clipboard</div>}
                            <button onClick={() => setShowDetails(s => !s)} aria-pressed={showDetails} aria-label="Toggle details" title="Show details" style={{ height: 36, padding: '6px 10px', borderRadius: 8, background: showDetails ? theme.accent : theme.panelBtnBg, color: showDetails ? '#fff' : theme.panelBtnText, border: `1px solid ${theme.border}`, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                {showDetails ? 'Hide' : 'Details'}
                            </button>
                            <button onClick={handleCopy} aria-label="Copy summary" style={{ width: 40, height: 36, padding: 6, borderRadius: 8, background: theme.panelBtnBg, color: theme.panelBtnText, border: `1px solid ${theme.border}`, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
                                    <path d="M16 1H4a2 2 0 0 0-2 2v12" stroke={theme.svgStroke} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                                    <rect x="8" y="5" width="13" height="13" rx="2" stroke={theme.svgStroke} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
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
