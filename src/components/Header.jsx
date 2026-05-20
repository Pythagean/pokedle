import React, { useRef, useEffect, useState } from 'react';
import ReactDOM from 'react-dom';
import './Header.css';

export default function Header({ pages, page, setPage, titleImg, showCompletionButton = false, onCompletionClick = null, highlightCompletion = false, completionActive = false, completedPages = {}, compactNav = false, onMenuClick = null, menuOpen = false, onPatchNotesClick = null, onAboutClick = null, onYesterdayClick = null, yesterdayMode = false }) {
    const hamburgerRef = useRef(null);
    const dropdownRef = useRef(null);
    const [dropdownPos, setDropdownPos] = useState({ top: 0, right: 0 });

    // Recompute dropdown position whenever it opens
    useEffect(() => {
        if (!menuOpen || !hamburgerRef.current) return;
        const rect = hamburgerRef.current.getBoundingClientRect();
        setDropdownPos({
            top: rect.bottom + 6,
            right: window.innerWidth - rect.right,
        });
    }, [menuOpen]);

    useEffect(() => {
        if (!menuOpen) return;
        function handleClick(e) {
            const inHamburger = hamburgerRef.current && hamburgerRef.current.contains(e.target);
            const inDropdown = dropdownRef.current && dropdownRef.current.contains(e.target);
            if (!inHamburger && !inDropdown) {
                onMenuClick && onMenuClick();
            }
        }
        document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, [menuOpen, onMenuClick]);

    const headerPortal = ReactDOM.createPortal(
        <>
                        <style>{`
                /* Desktop defaults: show both icon and label */
                .main-header nav button .nav-icon { display: inline-block !important; }
                .main-header nav button .nav-label { display: inline-block !important; }
                .header-dropdown-item + .header-dropdown-item { border-top: 1px solid #e8edf3; }

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
                                        .main-header nav { gap: 2px !important; flex-wrap: nowrap !important; justify-content: flex-start !important; overflow-x: auto !important; }
                                        .main-header nav button { font-size: 13px !important; padding: 4px !important; min-width: 44px !important; width: 44px !important; height: 44px !important; margin-bottom: 0 !important; flex: 0 0 auto !important; }
                                        /* On small mobile screens show icon-only */
                                        .main-header nav button .nav-label { display: inline !important; }
                                        .main-header nav button .nav-icon { display: inline-block !important; }
                    /* Left-align header content on narrow screens by removing the auto-centering margin */
                    .main-header .main-header-inner { margin: 0 !important; max-width: none !important; padding-left: 4px !important; }
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
                background: '#e7e9edff',
                borderBottom: '5px solid #f1f2f4ff',
                boxShadow: '0 6px 6px rgba(0, 0, 0, 0.07)',
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
                    height: 76,
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
                            <div style={{ flex: 1, display: 'flex', alignItems: 'center', height: '100%', overflowX: 'auto', minWidth: 0 }}>
                                <nav style={{ display: 'flex', gap: 6, flexWrap: 'nowrap', width: '100%', paddingRight: 8, overflowX: 'auto', whiteSpace: 'nowrap' }}>
                                {pages.map(p => {
                                const isSelected = page === p.key;
                                const isCompleted = !!completedPages[p.key];
                                const isDisabled = !isSelected && isCompleted;
                                const baseBtnStyle = {
                                    padding: compactNav ? '2px' : '7px 9px',
                                    borderRadius: 12,
                                    background: isSelected ? '#1976d2' : (isDisabled ? '#f0f0f0' : '#f4f4f4ff'),
                                    color: isSelected ? '#fff' : (isDisabled ? '#888' : '#1976d2'),
                                    border: isSelected ? 'none' : (isDisabled ? '2px solid #929292ff' : '2px solid #1976d2'),
                                    fontWeight: 700,
                                    fontSize: 15,
                                    cursor: isDisabled ? 'pointer' : 'pointer',
                                    boxShadow: isSelected ? '0 2px 8px #1976d233' : 'none',
                                    transition: 'background 0.2s, color 0.2s',
                                    //marginLeft: p.key === 'results' ? 2 : 0,
                                    marginLeft: 0,
                                    marginRight: 0,
                                    minWidth: compactNav ? 44 : 90,
                                    whiteSpace: 'nowrap',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    opacity: isDisabled ? 0.65 : 1,
                                    flex: '0 0 auto',
                                };
                                const imgStyle = { display: 'inline-block', width: compactNav ? 24 : 32, height: compactNav ? 24 : 32, marginRight: compactNav ? 0 : 8, objectFit: 'contain', opacity: isDisabled ? 0.6 : 1 };
                                return (
                                    <div key={p.key} style={{ position: 'relative', display: 'inline-block', marginLeft: 0 }}>
                                        <button
                                            onClick={() => setPage(p.key)}
                                            aria-label={p.label}
                                            title={compactNav ? undefined : p.label}
                                            aria-pressed={isSelected}
                                            style={baseBtnStyle}
                                        >
                                            <img src={`icons/${p.key}.png`} alt="" className="nav-icon" style={imgStyle} />
                                            {!compactNav ? <span className="nav-label" style={{fontSize: 15}}>{p.label}</span> : null}
                                        </button>
                                        {isCompleted ? (
                                            <span aria-hidden="true" style={{
                                                position: 'absolute',
                                                top: 10,
                                                right: 6,
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                width: 21,
                                                height: 21,
                                                borderRadius: 9,
                                                background: 'rgba(255,255,255,0.95)',
                                                color: '#38ab3eff',
                                                fontSize: 16,
                                                fontWeight: 800,
                                                border: '1px solid rgba(46,125,50,0.15)',
                                                boxShadow: '0 1px 2px rgba(0,0,0,0.06)',
                                                pointerEvents: 'none',
                                            }}>✓</span>
                                        ) : null}
                                    </div>
                                );
                            })}
                            {/* Hamburger menu button */}
                            <div key="hamburger" ref={hamburgerRef} style={{ position: 'relative', display: 'inline-block', marginLeft: 8 }}>
                                <button
                                    key="hamburger"
                                    onClick={() => onMenuClick && onMenuClick()}
                                    aria-label="Menu"
                                    title="Menu"
                                    aria-expanded={menuOpen}
                                    style={{
                                        padding: compactNav ? '6px' : '7px 9px',
                                        borderRadius: 12,
                                        background: menuOpen ? '#1976d2' : '#f4f4f4ff',
                                        color: menuOpen ? '#fff' : '#1976d2',
                                        border: menuOpen ? 'none' : '2px solid #1976d2',
                                        fontWeight: 700,
                                        fontSize: 15,
                                        cursor: 'pointer',
                                        boxShadow: menuOpen ? '0 2px 8px #1976d233' : 'none',
                                        transition: 'background 0.2s, color 0.2s',
                                        marginLeft: 0,
                                        marginRight: 0,
                                        minWidth: compactNav ? 44 : 44,
                                        whiteSpace: 'nowrap',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        flex: '0 0 auto',
                                    }}
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" width={compactNav ? 24 : 28} height={compactNav ? 24 : 28} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
                                        <line x1="3" y1="6" x2="21" y2="6" />
                                        <line x1="3" y1="12" x2="21" y2="12" />
                                        <line x1="3" y1="18" x2="21" y2="18" />
                                    </svg>
                                </button>
                            </div>
                            
                            {/* <button
                                key="completion-summary"
                                onClick={() => onCompletionClick && onCompletionClick()}
                                aria-label="Results"
                                title={compactNav ? undefined : 'Results'}
                                className={highlightCompletion ? 'completion-highlight' : undefined}
                                style={{
                                    padding: compactNav ? '6px' : '7px 9px',
                                    borderRadius: 12,
                                    background: completionActive ? '#1976d2' : '#f4f4f4ff',
                                    color: completionActive ? '#fff' : '#1976d2',
                                    border: completionActive ? 'none' : '2px solid #3573b1ff',
                                    fontWeight: 700,
                                    fontSize: 20,
                                    cursor: 'pointer',
                                    boxShadow: completionActive ? '0 2px 8px #1976d233' : 'none',
                                    transition: 'background 0.2s, color 0.2s',
                                    marginLeft: 8,
                                    marginRight: 0,
                                    minWidth: compactNav ? 44 : 55,
                                    whiteSpace: 'nowrap',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    flex: '0 0 auto',
                                }}
                            >
                                <img src={`icons/results.png`} alt="" className="nav-icon" style={{ display: 'inline-block', width: compactNav ? 24 : 32, height: compactNav ? 24 : 32, marginRight: 0, objectFit: 'contain' }} />
                                {!compactNav ? <span className="nav-label" style={{fontSize: 15}}></span> : null}
                                {highlightCompletion ? <span className="completion-badge" aria-hidden="true" /> : null}
                            </button> */}
                        </nav>
                    </div>
                </div>
            </div>
            {/* Preload menu icons */}
            <img src="icons/pokegrid.png" alt="" aria-hidden="true" style={{ display: 'none' }} />
        </>,
        document.body
    );

    return (
        <>
            {headerPortal}
            {menuOpen && ReactDOM.createPortal(
                <div
                    ref={dropdownRef}
                    role="menu"
                    style={{
                        position: 'fixed',
                        top: dropdownPos.top,
                        right: dropdownPos.right,
                        background: '#fff',
                        border: '2px solid #1976d2',
                        borderRadius: 12,
                        boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
                        minWidth: 180,
                        zIndex: 20000,
                        overflow: 'hidden',
                    }}
                >
                    {[['📅', "Yesterday's Pokédle", () => { onYesterdayClick && onYesterdayClick(); onMenuClick && onMenuClick(); }], [<img key="pokegrid" src="icons/pokegrid.png" alt="" style={{ width: 18, height: 18, objectFit: 'contain' }} />, 'Pokegrid', () => { window.open('https://pythagean.github.io/pokegrid/', '_blank', 'noopener,noreferrer'); onMenuClick && onMenuClick(); }], ['☕', 'Donate', () => { window.open('https://ko-fi.com/pythagean', '_blank', 'noopener,noreferrer'); onMenuClick && onMenuClick(); }], ['📋', 'Patch Notes', () => { onPatchNotesClick && onPatchNotesClick(); onMenuClick && onMenuClick(); }], ['ℹ️', 'About', () => { onAboutClick && onAboutClick(); onMenuClick && onMenuClick(); }]].map(([icon, label, handler], i) => (
                        <button
                            key={label}
                            role="menuitem"
                            onClick={handler}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 10,
                                width: '100%',
                                padding: '12px 16px',
                                background: 'none',
                                border: 'none',
                                borderTop: i > 0 ? '1px solid #e8edf3' : 'none',
                                fontSize: 15,
                                fontWeight: 600,
                                color: '#1976d2',
                                cursor: 'pointer',
                                textAlign: 'left',
                            }}
                            onMouseEnter={e => e.currentTarget.style.background = '#e3f0fc'}
                            onMouseLeave={e => e.currentTarget.style.background = 'none'}
                        >
                            <span style={{ display: 'inline-flex', width: 24, justifyContent: 'center', alignItems: 'center', flexShrink: 0 }}>{icon}</span> {label}
                        </button>
                    ))}
                </div>,
                document.body
            )}
        </>
    );
}