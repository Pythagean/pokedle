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
          .main-header { height: 100px !important; padding: 4px 4px !important; }
          .main-header img { height: 56px !important; margin-right: 12px !important; max-width: 120px !important; max-height: 60px !important; }
          .main-header nav { gap: 4px !important; flex-wrap: wrap !important; justify-content: center !important; }
          .main-header nav button { font-size: 13px !important; padding: 3px 3px !important; min-width: 50px !important; margin-bottom: 2px !important; flex: 1 1 28%; max-width: 28vw; }
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
                                    }}
                                >
                                    {p.label}
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
