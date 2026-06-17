import React, { useRef, useEffect, useState } from 'react';
import ReactDOM from 'react-dom';
import './Header.css';

export default function Header({ pages, page, setPage, titleImg, showCompletionButton = false, onCompletionClick = null, highlightCompletion = false, completionActive = false, completedPages = {}, compactNav = false, onMenuClick = null, menuOpen = false, onPatchNotesClick = null, onAboutClick = null, onYesterdayClick = null, yesterdayMode = false, darkMode = false, onDarkModeToggle = null }) {
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
                    width: 6px;
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
                    .slowpoke-icon { height: 64px !important; }
                    .header-title-img { display: none !important; }
                    .main-header { height: 60px !important; padding: 0 4px !important; }
                    .main-header img { height: 36px !important; margin-right: 8px !important; }
                    .main-header nav button, .nav-hamburger-btn { font-size: 13px !important; padding: 6px 4px !important; }
                    .main-header { height: 60px !important; padding: 4px 4px !important; }
                    .main-header img { height: 40px !important; margin-right: 6px !important; max-width: 120px !important; max-height: 60px !important; }
                                        /* Keep nav items on one horizontal row on mobile; allow horizontal scrolling if needed */
                                        .main-header nav { gap: 4px !important; flex-wrap: nowrap !important; justify-content: center !important; overflow-x: auto !important; }
                                        .main-header nav button, .nav-hamburger-btn { font-size: 13px !important; padding: 4px !important; min-width: 44px !important; width: 44px !important; height: 44px !important; margin-bottom: 0 !important; flex: 0 0 auto !important; }
                                        /* On small mobile screens show icon-only */
                                        .main-header nav button .nav-label { display: inline !important; }
                                        .main-header nav button .nav-icon { display: inline-block !important; }
                    /* Left-align header content on narrow screens by removing the auto-centering margin */
                    .main-header .main-header-inner { margin: 0 !important; max-width: none !important; padding-left: 4px !important; padding-right: 4px !important; }
                }
                                        @media (max-width: 480px) {
                                                .main-header nav button, .nav-hamburger-btn { padding: 0px !important; min-width: 34px !important; width: 34px !important; height: 44px !important; border-radius: 4px !important; }
                                                .main-header nav button .nav-label { display: none !important; }
                                                .main-header nav button .nav-icon { display: inline-block !important; width: 40px !important; height: 40px !important; margin-right: 0 !important; }
                                                        .main-header nav button, .nav-hamburger-btn { height: 44px !important; border-radius: 8px !important; border: 2px solid #ff8a9a !important; box-shadow: none !important; outline: none !important; }
                                                        .main-header nav button:focus, .nav-hamburger-btn:focus { outline: none !important; box-shadow: none !important; }
                                                        .main-header nav button .nav-label { display: none !important; }
                                                        .main-header nav button .nav-icon { display: inline-block !important; width: 28px !important; height: 44px !important; margin-right: 0 !important; }
                                                        .main-header nav button[style*="background: #ffaab5"], .nav-hamburger-btn[style*="background: #ffaab5"] { border: none !important; }
                                        .nav-hamburger-wrap { margin-bottom: 5px !important; }
                                        }
            `}</style>
            <div className="main-header" style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                width: '100%',
                background: darkMode ? '#2a2a2a' : '#e7e9edff',
                borderBottom: darkMode ? '5px solid #404040' : '5px solid #f1f2f4ff',
                boxShadow: darkMode ? '0 6px 6px rgba(0, 0, 0, 0.3)' : '0 6px 6px rgba(0, 0, 0, 0.07)',
                padding: 0,
                margin: 0,
                zIndex: 10000,
                transition: 'background 0.3s, border-color 0.3s, box-shadow 0.3s',
            }}>
                <div className="main-header-inner" style={{
                    display: 'flex',
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'flex-start',
                    width: '100%',
                    maxWidth: 1300,
                       margin: '0 auto',
                       padding: '0 8px',
                       paddingLeft: '0px',
                    height: 76,
                    gap: 0,
                }}>
                    <div style={{ flex: '0 0 auto', display: 'flex', alignItems: 'center', height: '100%' }}>
                        <img
                            src={titleImg}
                            alt="Slowpokle"
                            className="header-title-img"
                            style={{
                                height: 100,
                                width: 'auto',
                                display: 'block',
                                objectFit: 'contain',
                                marginRight: 6,
                                marginLeft: 0,
                                maxWidth: 160,
                                maxHeight: 100,
                            }}
                        />
                    </div>
                    <div className="slowpoke-icon-wrap" style={{ flex: '0 0 auto', display: 'flex', alignItems: 'center', height: 'auto', paddingLeft: 5, marginBottom: 2 }}>
                        <img
                            src="data/slowpoke_icon.png"
                            alt=""
                            aria-hidden="true"
                            className="slowpoke-icon"
                            style={{
                                height: 54,
                                width: 'auto',
                                display: 'block',
                                objectFit: 'contain',
                                marginRight: 8,
                                marginBottom: 3
                            }}
                        />
                    </div>
                            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', overflowX: 'auto', minWidth: 0 }}>
                                <nav style={{ display: 'flex', gap: 6, flexWrap: 'nowrap', justifyContent: 'center', paddingRight: 8, overflowX: 'auto', whiteSpace: 'nowrap' }}>
                                {pages.map(p => {
                                const isSelected = page === p.key;
                                const isCompleted = !!completedPages[p.key];
                                const isDisabled = !isSelected && isCompleted;
                                const baseBtnStyle = {
                                    padding: compactNav ? '2px' : '7px 9px',
                                    borderRadius: 12,
                                    background: isSelected ? '#ffaab5' : (isDisabled ? (darkMode ? '#4a4a4a' : '#f0f0f0') : (darkMode ? '#4a4a4a' : '#f4f4f4ff')),
                                    color: isSelected ? '#fff' : (isDisabled ? (darkMode ? '#888' : '#888') : (darkMode ? '#ff9db5' : '#DE627B')),
                                    border: isSelected ? '2px solid transparent' : (isDisabled ? (darkMode ? '2px solid #666' : '2px solid #929292ff') : (darkMode ? '2px solid #666' : '2px solid #DE627B')),
                                    fontWeight: 700,
                                    fontSize: 15,
                                    cursor: isDisabled ? 'pointer' : 'pointer',
                                    boxShadow: isSelected ? '0 2px 8px #ffaab533' : 'none',
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
                                            <img src={`icons/${p.key}${isSelected ? '_selected' : ''}.png`} alt="" className="nav-icon" style={imgStyle} />
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
                        </nav>
                    </div>
                    {/* Hamburger menu button - pinned to right */}
                    <div ref={hamburgerRef} className="nav-hamburger-wrap" style={{ flex: '0 0 auto', display: 'flex', alignItems: 'center', marginLeft: 4, paddingRight: 10 }}>
                        <button
                            onClick={() => onMenuClick && onMenuClick()}
                            aria-label="Menu"
                            title="Menu"
                            aria-expanded={menuOpen}
                            className="nav-hamburger-btn"
                            style={{
                                padding: compactNav ? '2px' : '7px 9px',
                                borderRadius: 12,
                                background: menuOpen ? '#ffaab5' : (darkMode ? '#4a4a4a' : '#f4f4f4ff'),
                                color: menuOpen ? '#fff' : (darkMode ? '#ff9db5' : '#DE627B'),
                                border: menuOpen ? '2px solid transparent' : (darkMode ? '2px solid #666' : '2px solid #fc7083'),
                                fontWeight: 700,
                                fontSize: 15,
                                cursor: 'pointer',
                                boxShadow: menuOpen ? '0 2px 8px #ffaab533' : 'none',
                                transition: 'background 0.2s, color 0.2s',
                                minWidth: compactNav ? 44 : 44,
                                whiteSpace: 'nowrap',
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flex: '0 0 auto',
                            }}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width={compactNav ? 24 : 32} height={compactNav ? 24 : 32} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
                                <line x1="3" y1="6" x2="21" y2="6" />
                                <line x1="3" y1="12" x2="21" y2="12" />
                                <line x1="3" y1="18" x2="21" y2="18" />
                            </svg>
                        </button>
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
                        background: darkMode ? '#3a3a3a' : '#fff',
                        border: darkMode ? '2px solid #555' : '2px solid #ffaab5',
                        borderRadius: 12,
                        boxShadow: darkMode ? '0 8px 24px rgba(0,0,0,0.5)' : '0 8px 24px rgba(0,0,0,0.12)',
                        minWidth: 180,
                        zIndex: 20000,
                        overflow: 'hidden',
                        transition: 'background 0.3s, border-color 0.3s',
                    }}
                >
                    {[[yesterdayMode ? '📅' : '📅', yesterdayMode ? "Today's Slowpokle" : "Yesterday's Slowpokle", () => { onYesterdayClick && onYesterdayClick(); onMenuClick && onMenuClick(); }], [darkMode ? '☀️' : '🌙', darkMode ? 'Light Mode' : 'Dark Mode (beta)', () => { onDarkModeToggle && onDarkModeToggle(); onMenuClick && onMenuClick(); }], [<img key="pokegrid" src="icons/pokegrid.png" alt="" style={{ width: 18, height: 18, objectFit: 'contain' }} />, 'Pokegrid', () => { window.open('https://pythagean.github.io/pokegrid/', '_blank', 'noopener,noreferrer'); onMenuClick && onMenuClick(); }],  ['📋', 'Patch Notes', () => { onPatchNotesClick && onPatchNotesClick(); onMenuClick && onMenuClick(); }], ['☕', 'Donate', () => { window.open('https://ko-fi.com/pythagean', '_blank', 'noopener,noreferrer'); onMenuClick && onMenuClick(); }], ['ℹ️', 'About', () => { onAboutClick && onAboutClick(); onMenuClick && onMenuClick(); }]].map(([icon, label, handler], i) => (
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
                                borderTop: i > 0 ? (darkMode ? '1px solid #555' : '1px solid #e8edf3') : 'none',
                                fontSize: 15,
                                fontWeight: 600,
                                color: darkMode ? '#ff9db5' : '#DE627B',
                                cursor: 'pointer',
                                textAlign: 'left',
                            }}
                            onMouseEnter={e => e.currentTarget.style.background = darkMode ? '#4a4a4a' : '#e3f0fc'}
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