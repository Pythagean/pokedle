import React from 'react';

export default function NavBar({ pages, currentPage, onChange }) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'center',
        gap: 16,
        marginBottom: 32,
        flexWrap: 'wrap',
      }}
    >
      {pages.map(p => (
        <button
          key={p.key}
          onClick={() => onChange(p.key)}
          style={{
            padding: '8px 18px',
            borderRadius: 8,
            background: currentPage === p.key ? '#1976d2' : '#eee',
            color: currentPage === p.key ? '#fff' : '#222',
            border: 'none',
            fontWeight: 600,
            fontSize: 16,
            cursor: 'pointer',
            boxShadow: currentPage === p.key ? '0 2px 8px #1976d233' : 'none',
            transition: 'background 0.2s, color 0.2s',
            marginBottom: 8,
            minWidth: 90,
            maxWidth: '100vw',
          }}
        >
          {p.label}
        </button>
      ))}
      <style>{`
        @media (max-width: 600px) {
          .navbar-btn {
            font-size: 14px !important;
            padding: 7px 10px !important;
            min-width: 70px !important;
          }
          .navbar {
            flex-direction: column !important;
            gap: 8px !important;
            align-items: stretch !important;
          }
        }
      `}</style>
    </div>
  );
}
