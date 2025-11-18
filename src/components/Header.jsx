import React from 'react';
import ReactDOM from 'react-dom';
import './Header.css';

export default function Header({ pages, page, setPage, titleImg, showCompletionButton = false, onCompletionClick = null, highlightCompletion = false, completionActive = false }) {
    return ReactDOM.createPortal(
        <>
                        <style>{`
                /* Desktop defaults: show both icon and label */
                .main-header nav button .nav-icon { display: inline-block !important; }
                .main-header nav button .nav-label { display: inline-block !important; }

                /* Completion highlight and badge */
                /* Prevent page-level horizontal scroll when the header pulses */
                html, body { overflow-x: hidden; }
                @keyframes completion-pulse {
                    0% { transform: scale(1); box-shadow: 0 0 0 0 rgba(25,118,210,0.35); }
                    70% { transform: scale(1.02); box-shadow: 0 10px 30px -6px rgba(25,118,210,0.25); }
                    100% { transform: scale(1); box-shadow: 0 0 0 8px rgba(25,118,210,0); }
                }
                .completion-highlight {
                    /* Run the pulse for ~60 iterations (about 60s at 1s per loop) to aid debugging */
                    animation: completion-pulse 1s ease-in-out 0s 3;
                    position: relative !important;
                    z-index: 2;
                    transform-origin: center center;
                    will-change: transform;
                    backface-visibility: hidden;
                    -webkit-backface-visibility: hidden;
                }
                .completion-badge {
                    position: absolute;
                    top: 6px;
                    right: 10px;
                    display: inline-block;
                    width: 12px;
                    height: 12px;
                    background: #ff5252;
                    border-radius: 999px;
                    box-shadow: 0 1px 3px rgba(0,0,0,0.2);
                    border: 2px solid #fff;
                }
                @media (prefers-reduced-motion: reduce) {
                    .completion-highlight { animation: none !important; }
                }

                @media (max-width: 600px) {
                    .main-header { height: 60px !important; padding: 0 4px !important; }
                    .main-header img { height: 36px !important; margin-right: 8px !important; }
                    .main-header nav button { font-size: 13px !important; padding: 6px 4px !important; }
                    .main-header { height: 60px !important; padding: 4px 4px !important; }
                    .main-header img { height: 30px !important; margin-right: 6px !important; max-width: 120px !important; max-height: 60px !important; }
                                        /* Keep nav items on one horizontal row on mobile; allow horizontal scrolling if needed */
                                        .main-header nav { gap: 3px !important; flex-wrap: nowrap !important; justify-content: flex-start !important; overflow-x: auto !important; }
                                        .main-header nav button { font-size: 13px !important; padding: 4px !important; min-width: 44px !important; width: 44px !important; height: 44px !important; margin-bottom: 0 !important; flex: 0 0 auto !important; }
                                        /* On small mobile screens show icon-only */
                                        .main-header nav button .nav-label { display: inline !important; }
                                        .main-header nav button .nav-icon { display: inline-block !important; }
                    /* Left-align header content on narrow screens by removing the auto-centering margin */
                    .main-header .main-header-inner { margin: 0 !important; max-width: none !important; padding-left: 8px !important; }
                }
                                        @media (max-width: 480px) {
                                                .main-header nav button { padding: 0px !important; min-width: 34px !important; width: 34px !important; height: 44px !important; border-radius: 4px !important; }
                                                .main-header nav button .nav-label { display: none !important; }
                                                .main-header nav button .nav-icon { display: inline-block !important; width: 40px !important; height: 40px !important; margin-right: 0 !important; }
                                                        .main-header nav button { height: 44px !important; border-radius: 8px !important; border: 2px solid #1976d2 !important; box-shadow: none !important; outline: none !important; }
                                                        .main-header nav button:focus { outline: none !important; box-shadow: none !important; }
                                                        .main-header nav button .nav-label { display: none !important; }
                                                        .main-header nav button .nav-icon { display: inline-block !important; width: 28px !important; height: 44px !important; margin-right: 0 !important; }
                                                        .main-header nav button[style*="background: #1976d2"] { border: none !important; }
                                        }
            `}</style>
            <div className="main-header" style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                width: '100%',
                background: '#d8ecffff',
                borderBottom: '1px solid #e0e0e0',
                boxShadow: '0 2px 8px #0001',
                padding: 0,
                margin: 0,
                zIndex: 10000,
            }}>
                <div className="main-header-inner" style={{
                    display: 'flex',
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'flex-start',
                    maxWidth: 1300,
                       margin: '0 auto',
                       padding: '0 12px',
                       paddingLeft: '0px',
                       paddingRight: 48,
                    height: 96,
                    gap: 0,
                }}>
                    <div style={{ flex: '0 0 auto', display: 'flex', alignItems: 'center', height: '100%' }}>
                        <img
                            src={titleImg}
                            alt="Pokédle"
                            style={{
                                height: 72,
                                width: 'auto',
                                display: 'block',
                                objectFit: 'contain',
                                marginRight: 12,
                                marginLeft: 0,
                                maxWidth: 120,
                                maxHeight: 80,
                            }}
                        />
                    </div>
                    <div style={{ flex: 1, display: 'flex', alignItems: 'center', height: '100%', overflowX: 'hidden'}}>
                        <nav style={{ display: 'flex', gap: 6, flexWrap: 'wrap', width: '100%', paddingRight: 8 }}>
                            {pages.map(p => {
                                const isSelected = !completionActive && page === p.key;
                                return (
                                    <button
                                        key={p.key}
                                        onClick={() => setPage(p.key)}
                                        aria-label={p.label}
                                        title={p.label}
                                        aria-pressed={isSelected}
                                        style={{
                                            padding: '10px 12px',
                                            borderRadius: 12,
                                            background: isSelected ? '#1976d2' : '#f4f4f4ff',
                                            color: isSelected ? '#fff' : '#1976d2',
                                            border: isSelected ? 'none' : '2px solid #1976d2',
                                            fontWeight: 700,
                                            fontSize: 18,
                                            cursor: 'pointer',
                                            boxShadow: isSelected ? '0 2px 8px #1976d233' : 'none',
                                            transition: 'background 0.2s, color 0.2s',
                                            marginLeft: 0,
                                            marginRight: 0,
                                            minWidth: 90,
                                            marginBottom: 8,
                                            whiteSpace: 'nowrap',
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                        }}
                                    >
                                        <img src={`icons/${p.key}.png`} alt="" className="nav-icon" style={{ display: 'inline-block', width: 30, height: 30, marginRight: 8, objectFit: 'contain' }} />
                                        <span className="nav-label">{p.label}</span>
                                    </button>
                                );
                            })}
                            <button
                                key="completion-summary"
                                onClick={() => onCompletionClick && onCompletionClick()}
                                aria-label="Results"
                                title="Results"
                                className={highlightCompletion ? 'completion-highlight' : undefined}
                                style={{
                                    padding: '10px 12px',
                                    borderRadius: 12,
                                    background: completionActive ? '#1976d2' : '#f4f4f4ff',
                                    color: completionActive ? '#fff' : '#1976d2',
                                    border: completionActive ? 'none' : '2px solid #1976d2',
                                    fontWeight: 700,
                                    fontSize: 18,
                                    cursor: 'pointer',
                                    boxShadow: completionActive ? '0 2px 8px #1976d233' : 'none',
                                    transition: 'background 0.2s, color 0.2s',
                                    marginLeft: 0,
                                    marginRight: 0,
                                    minWidth: 90,
                                    marginBottom: 8,
                                    whiteSpace: 'nowrap',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                }}
                            >
                                <img src={`icons/results.png`} alt="" className="nav-icon" style={{ display: 'inline-block', width: 30, height: 30, marginRight: 8, objectFit: 'contain' }} />
                                <span className="nav-label">Results</span>
                                {highlightCompletion ? <span className="completion-badge" aria-hidden="true" /> : null}
                            </button>
                        </nav>
                    </div>
                </div>
            </div>
        </>,
        document.body
    );
}
