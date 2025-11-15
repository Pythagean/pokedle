import React from 'react';

export default function NavBar({ pages, currentPage, onChange }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', gap: 16, marginBottom: 32 }}>
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
          }}
        >
          {p.label}
        </button>
      ))}
    </div>
  );
}
