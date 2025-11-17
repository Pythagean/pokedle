import React from 'react';
import ReactDOM from 'react-dom';
import './Header.css';

export default function Header({ pages, page, setPage, titleImg }) {
    return ReactDOM.createPortal(
        <>
            <style>{`
        @media (max-width: 600px) {
          .main-header { height: 60px !important; padding: 0 4px !important; }
          .main-header img { height: 36px !important; margin-right: 8px !important; }
          .main-header nav button { font-size: 13px !important; padding: 6px 4px !important; }
          .main-header { height: 70px !important; padding: 4px 4px !important; }
          .main-header img { height: 56px !important; margin-right: 12px !important; max-width: 120px !important; max-height: 60px !important; }
                    /* Keep nav items on one horizontal row on mobile; allow horizontal scrolling if needed */
                    .main-header nav { gap: 3px !important; flex-wrap: nowrap !important; justify-content: flex-start !important; overflow-x: auto !important; }
                    .main-header nav button { font-size: 13px !important; padding: 4px !important; min-width: 44px !important; width: 44px !important; height: 44px !important; margin-bottom: 0 !important; flex: 0 0 auto !important; }
                    /* Mobile: hide textual label and show icon instead on very small screens */
                    .main-header nav button .nav-label { display: inline !important; }
                    .main-header nav button .nav-icon { display: none !important; }
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
        }
      `}</style>
            <div className="main-header" style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                width: '100%',
                background: '#f8fafc',
                borderBottom: '1px solid #e0e0e0',
                boxShadow: '0 2px 8px #0001',
                padding: 0,
                margin: 0,
                zIndex: 10000,
            }}>
                <div style={{
                    display: 'flex',
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'flex-start',
                    maxWidth: 1100,
                    margin: '0 auto',
                    padding: '0 12px',
                    paddingLeft: '6px',
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
                                marginRight: 24,
                                marginLeft: 0,
                                maxWidth: 120,
                                maxHeight: 80,
                            }}
                        />
                    </div>
                    <div style={{ flex: 1, display: 'flex', alignItems: 'center', height: '100%', overflowX: 'auto' }}>
                        <nav style={{ display: 'flex', gap: 12, flexWrap: 'wrap', width: '100%' }}>
                            {pages.map(p => (
                                <button
                                    key={p.key}
                                    onClick={() => setPage(p.key)}
                                    aria-label={p.label}
                                    title={p.label}
                                    style={{
                                        padding: '10px 22px',
                                        borderRadius: 12,
                                        background: page === p.key ? '#1976d2' : 'transparent',
                                        color: page === p.key ? '#fff' : '#1976d2',
                                        border: page === p.key ? 'none' : '2px solid #1976d2',
                                        fontWeight: 700,
                                        fontSize: 18,
                                        cursor: 'pointer',
                                        boxShadow: page === p.key ? '0 2px 8px #1976d233' : 'none',
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
                                    <img src={`icons/${p.key}.png`} alt="" className="nav-icon" style={{ display: 'none', width: 40, height: 40, marginRight: 2 }} />
                                    <span className="nav-label">{p.label}</span>
                                </button>
                            ))}
                        </nav>
                    </div>
                </div>
            </div>
        </>,
        document.body
    );
}
