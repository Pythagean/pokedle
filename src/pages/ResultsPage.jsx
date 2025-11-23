import React, { useState, useEffect } from 'react';

export default function ResultsPage({ results = [], guessesByPage = {}, onBack }) {
    const [copied, setCopied] = useState(false);
    const [showDetails, setShowDetails] = useState(false);
    const [isMobile, setIsMobile] = useState(false);

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

    // Load history of simple daily summaries from localStorage (written by App)
    const [history, setHistory] = useState([]);
    useEffect(() => {
        try {
            const raw = localStorage.getItem('pokedle_results_history');
            if (!raw) return;
            const parsed = JSON.parse(raw);
            if (!Array.isArray(parsed)) return;
            // Keep the full parsed history in reverse-chronological order (newest first)
            const full = parsed.slice().reverse();
            setHistory(full);
        } catch (e) {
            // ignore
        }
    }, []);

    // detect mobile (match CSS breakpoint) so we can widen content on small screens
    useEffect(() => {
        if (typeof window === 'undefined' || !window.matchMedia) return;
        const mq = window.matchMedia('(max-width: 600px)');
        const set = () => setIsMobile(mq.matches);
        set();
        try {
            mq.addEventListener('change', set);
        } catch (e) {
            // Safari fallback
            mq.addListener(set);
        }
        return () => {
            try { mq.removeEventListener('change', set); } catch (e) { mq.removeListener(set); }
        };
    }, []);

    const outerStyle = {
        padding: 0,
        maxWidth: isMobile ? '100%' : 780,
        margin: '0px auto',
        alignItems: 'center',
        fontFamily: 'Inter, Arial, sans-serif',
        width: isMobile ? 'calc(100% - 20px)' : 'calc(100% - 48px)'
    };

    const summaryMax = isMobile ? '100%' : 580;
    const historyMax = isMobile ? '100%' : 780;

    return (
        <div style={outerStyle}>
            <div style={{ textAlign: 'center', marginTop: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
                    <h2 style={{ marginBottom: 10 }}>Results</h2>
                </div>
            </div>

            <div style={{ position: 'relative', borderRadius: 6, padding: 18, background: 'rgba(255,255,255,0.98)', border: '1px solid #f0f0f0', overflow: 'hidden', maxWidth: summaryMax, alignContent: 'center', marginLeft: 'auto', marginRight: 'auto' }}>
                <div aria-hidden style={{ position: 'absolute', inset: 0, backgroundImage: `url('icons/results.png')`, backgroundSize: 'contain', backgroundRepeat: 'no-repeat', backgroundPosition: 'center', opacity: 0.06, filter: 'grayscale(40%)', pointerEvents: 'none', margin: '65px' }} />
                {/* Small section header for today's summary */}
                <div style={{ textAlign: 'center', marginBottom: 8 }}>
                    <div style={{ fontWeight: 700, textAlign: 'center' }}>Today</div>
                </div>

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
                        <button onClick={handleCopy} title="Copy" style={{ height: 40, minWidth: 64, borderRadius: 8, border: '1px solid #e0e0e0', background: '#efefef', cursor: 'pointer', padding: '0 12px', fontSize: 14, color: '#111', WebkitTextFillColor: '#111', forcedColorAdjust: 'none' }}>Copy</button>
                    </div>
                    <div style={{ fontWeight: 700, fontSize: 16, textAlign: 'right' }}>{`Total: ${total}`}</div>
                </div>
                
            </div>
            {/* Previous days history (last 10) - moved to its own container */}
                {history && history.length > 0 ? (
                <div style={{ marginTop: 14, maxWidth: historyMax, marginLeft: 'auto', marginRight: 'auto', padding: 12, borderRadius: 6, background: '#fff', border: '1px solid #f0f0f0' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 8 }}>
                        <div style={{ fontWeight: 700, textAlign: 'center' }}>Last 7 Days</div>
                    </div>
                    <div style={{ overflowX: 'auto' }}>
                        {(() => {
                            // Modes down the left, dates across the top
                            const modes = ['Classic', 'Card', 'Pokedex', 'Silhouette', 'Zoom', 'Colours', 'Game Data'];
                            // Always show the most recent 7 days. If data is missing for a date, show an empty row.
                            const DAYS = 7;
                            const today = new Date();
                            const last7 = [];
                            for (let i = 0; i < DAYS; i++) {
                                const dt = new Date(today);
                                dt.setDate(today.getDate() - i);
                                const y = dt.getFullYear();
                                const m = String(dt.getMonth() + 1).padStart(2, '0');
                                const d = String(dt.getDate()).padStart(2, '0');
                                last7.push(`${y}${m}${d}`);
                            }
                            const displayedHistory = last7.map(dateKey => {
                                const found = history.find(h => String(h.date) === dateKey);
                                return found || { date: dateKey, results: [] };
                            });
                            const dates = displayedHistory.map(h => {
                                // h.date is YYYYMMDD
                                const y = parseInt(String(h.date).slice(0,4), 10);
                                const mth = parseInt(String(h.date).slice(4,6), 10) - 1;
                                const dnum = parseInt(String(h.date).slice(6,8), 10);
                                const weekdayNames = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
                                const dt = new Date(y, mth, dnum);
                                const wd = dt.getDay();
                                return weekdayNames[wd] || '';
                            });

                            // First column for mode labels (narrower), then one column per date, then a Total column
                            // Use a reasonable min width for date columns so they remain readable on mobile
                            const gridCols = `70px repeat(${dates.length}, minmax(24px, 1fr)) 72px`;

                            // Precompute lookup map for quick access: dateIndex -> label -> value
                            const lookup = {};
                            displayedHistory.forEach((h, idx) => {
                                const map = {};
                                (h.results || []).forEach(r => {
                                    if (!r || !r.label) return;
                                    map[String(r.label).toLowerCase()] = (r.solved && typeof r.guessCount === 'number') ? r.guessCount : '-';
                                });
                                lookup[idx] = map;
                            });

                            // compute totals per date (column) and overall total
                            const dateTotals = displayedHistory.map(h => {
                                return (h.results || []).reduce((acc, r) => acc + ((r.solved && typeof r.guessCount === 'number') ? r.guessCount : 0), 0);
                            });
                            const overallTotal = dateTotals.reduce((a, b) => a + b, 0);

                            return (
                                <div>
                                    {/* header row: empty cell then date columns then Total */}
                                    <div style={{ display: 'grid', gridTemplateColumns: gridCols, gap: 8, alignItems: 'center', padding: '8px 6px', borderBottom: '1px solid #f6f6f6', fontSize: 13 }}>
                                        <div style={{ fontWeight: 700, textAlign: 'left', paddingLeft: 6 }}>Mode</div>
                                        {dates.map((dLabel, i) => (
                                            <div key={i} style={{ fontWeight: 700, textAlign: 'center' }}>{dLabel}</div>
                                        ))}
                                        <div style={{ fontWeight: 700, textAlign: 'right' }}>Total</div>
                                    </div>


                                    {/* mode rows */}
                                    {modes.map((mode, mi) => {
                                        // sum across dates for this mode
                                        let modeTotal = 0;
                                        let anyNumber = false;
                                        const cells = displayedHistory.map((h, hi) => {
                                            const map = lookup[hi] || {};
                                            const val = map[String(mode).toLowerCase()];
                                            if (typeof val === 'number') {
                                                modeTotal += val;
                                                anyNumber = true;
                                                return val;
                                            }
                                            return '-';
                                        });

                                        return (
                                            <div key={mi} style={{ display: 'grid', gridTemplateColumns: gridCols, gap: 8, alignItems: 'center', padding: '8px 6px', borderBottom: mi !== modes.length - 1 ? '1px solid #fafafa' : 'none', fontSize: 13 }}>
                                                <div style={{ fontWeight: 500, textAlign: 'left', paddingLeft: 3 }}>{mode}</div>
                                                {cells.map((v, i) => (
                                                    <div key={i} style={{ textAlign: 'center' }}>{v}</div>
                                                ))}
                                                <div style={{ textAlign: 'right', fontWeight: 800 }}>{anyNumber ? modeTotal : '-'}</div>
                                            </div>
                                        );
                                    })}

                                    {/* totals row per date (moved to bottom) */}
                                    <div style={{ display: 'grid', gridTemplateColumns: gridCols, gap: 8, alignItems: 'center', padding: '8px 6px', borderTop: '1px solid #eee', fontSize: 13, background: '#fbfbfb', marginTop: 6 }}>
                                        <div style={{ fontWeight: 700, textAlign: 'left', paddingLeft: 6 }}>Total</div>
                                        {dateTotals.map((dt, i) => (
                                            <div key={i} style={{ fontWeight: 800, textAlign: 'center' }}>{dt}</div>
                                        ))}
                                        <div style={{ fontWeight: 800, textAlign: 'right' }}>{overallTotal}</div>
                                    </div>
                                </div>
                            );
                        })()}
                    </div>
                </div>
            ) : null}
        </div>
    );
}
