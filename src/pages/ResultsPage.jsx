import React, { useState } from 'react';

export default function ResultsPage({ results = [], guessesByPage = {}, onBack }) {
    const [copied, setCopied] = useState(false);
    const [showDetails, setShowDetails] = useState(false);

    // Fallback: if no results provided, attempt to read a global exported value
    if ((!results || results.length === 0) && typeof window !== 'undefined' && window.__pokedle_results__) {
        results = window.__pokedle_results__;
    }

    const d = new Date();
    const dateStr = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
    const entries = (results || []).map(r => ({ label: r.label, value: r.solved ? r.guessCount : '-' }));
    const total = entries.reduce((acc, e) => acc + (typeof e.value === 'number' ? e.value : 0), 0);
    const summaryLines = [`I've completed all the modes of Pokédle for ${dateStr}! \n`, ...entries.map(e => `${e.label}: ${e.value}`), `Total: ${total}`];
    const summaryText = summaryLines.join('\n');

    const detailedLines = [ `I've completed all the modes of Pokédle for ${dateStr}! \n` ];
    (results || []).forEach(r => {
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
            setTimeout(() => setCopied(false), 1300);
        } catch (e) {
            // ignore
        }
    };

    return (
        <div style={{ padding: 0, maxWidth: 580, margin: '0px auto', fontFamily: 'Inter, Arial, sans-serif', width: 'calc(100% - 48px)' }}>
            <div style={{ textAlign: 'center', marginTop: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
                    <h2 style={{ marginBottom: 10 }}>Results</h2>
                </div>
            </div>

            <div style={{ position: 'relative', borderRadius: 6, padding: 18, background: 'rgba(255,255,255,0.98)', border: '1px solid #f0f0f0', overflow: 'hidden' }}>
                <div aria-hidden style={{ position: 'absolute', inset: 0, backgroundImage: `url('icons/results.png')`, backgroundSize: 'contain', backgroundRepeat: 'no-repeat', backgroundPosition: 'center', opacity: 0.06, filter: 'grayscale(40%)', pointerEvents: 'none', margin: '55px' }} />
                {!showDetails ? (
                    entries.map((e, i) => (
                        <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr auto', alignItems: 'center', padding: '10px 0', lineHeight: '1.1', borderBottom: i !== entries.length - 1 ? '1px solid #fafafa' : 'none' }}>
                            <span style={{ fontWeight: 500, fontSize: 15, color: '#222', justifySelf: 'start', textAlign: 'left' }}>{e.label}:</span>
                            <span style={{ fontWeight: 700, fontSize: 16, textAlign: 'right', justifySelf: 'end' }}>{e.value}</span>
                        </div>
                    ))
                ) : (
                    <div>
                        {results.map((r, i) => {
                            const guesses = (guessesByPage && guessesByPage[r.key]) || [];
                            const names = guesses.slice().reverse().map(g => g.name).filter(Boolean);
                            const count = guesses.length;
                            const countDisplay = r.solved ? count : '-';
                            // Determine the correct name for this page (card page stores pokemon under daily.pokemon)
                            let correctName = null;
                            try {
                                if (r && r.daily) {
                                    correctName = r.daily.pokemon ? r.daily.pokemon.name : r.daily.name;
                                }
                            } catch (e) {
                                correctName = null;
                            }
                            return (
                                <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr auto', alignItems: 'center', padding: '8px 0', lineHeight: '1.3', borderBottom: i !== results.length - 1 ? '1px solid #fafafa' : 'none' }}>
                                    <span style={{ fontWeight: 500, fontSize: 15, color: '#222', justifySelf: 'start', textAlign: 'left' }}>
                                        {r.label}
                                        {names.length > 0 ? (
                                            <>
                                                {' ('}
                                                {names.map((n, idx) => (
                                                    <React.Fragment key={idx}>
                                                        {idx > 0 ? ', ' : ''}
                                                        {n === correctName ? <strong>{n}</strong> : n}
                                                    </React.Fragment>
                                                ))}
                                                {')'}
                                            </>
                                        ) : null}
                                        :
                                    </span>
                                    <span style={{ fontWeight: 700, fontSize: 16, textAlign: 'right', justifySelf: 'end' }}>{countDisplay}</span>
                                </div>
                            );
                        })}
                    </div>
                )}
                {copied && <div style={{ color: '#1976d2', fontSize: 14 }}>Copied to clipboard</div>}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 18 }}>
                    <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                        
                        <button onClick={() => setShowDetails(s => !s)} style={{ height: 40, padding: '8px 12px', borderRadius: 8, background: showDetails ? '#1976d2' : '#efefef', color: showDetails ? '#fff' : '#111', border: '1px solid #e0e0e0', cursor: 'pointer', fontSize: 14 }}>{showDetails ? 'Hide Guesses' : 'Show Guesses'}</button>
                        <button onClick={handleCopy} title="Copy" style={{ height: 40, minWidth: 64, borderRadius: 8, border: '1px solid #e0e0e0', background: '#efefef', cursor: 'pointer', padding: '0 12px', fontSize: 14 }}>Copy</button>
                    </div>
                    <div style={{ fontWeight: 700, fontSize: 16, textAlign: 'right' }}>{`Total: ${total}`}</div>
                </div>
                
            </div>
        </div>
    );
}
