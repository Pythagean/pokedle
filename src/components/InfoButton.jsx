import React, { useState, useRef, useEffect } from 'react';

export default function InfoButton({ ariaLabel = 'Info', content, placement = 'right', marginTop = 100 }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ left: 0, top: 0 });
  const btnRef = useRef(null);
  const popupRef = useRef(null);

  function openPopup() {
    const btn = btnRef.current;
    if (!btn) return setOpen(true);
    const rect = btn.getBoundingClientRect();
    const gap = 12;
    const popupWidth = 320;
    let left;
    if (placement === 'right') {
      left = Math.round(rect.right + gap);
      // if too close to viewport right edge, move left
      if (left + popupWidth > window.innerWidth - 8) {
        left = Math.max(8, rect.left - gap - popupWidth);
      }
    } else {
      left = Math.round(rect.left - gap - popupWidth);
      if (left < 8) left = 8;
    }
    const top = Math.round(rect.top + rect.height / 2);
    setPos({ left, top });
    setOpen(true);
  }

  function closePopup() {
    setOpen(false);
  }

  useEffect(() => {
    if (!open) return;
    function onKey(e) {
      if (e.key === 'Escape') closePopup();
    }
    function onDown(e) {
      const popup = popupRef.current;
      const btn = btnRef.current;
      if (!popup) return;
      if (popup.contains(e.target) || (btn && btn.contains(e.target))) return;
      closePopup();
    }
    window.addEventListener('keydown', onKey);
    window.addEventListener('mousedown', onDown);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('mousedown', onDown);
    };
  }, [open]);

  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      <button
        ref={btnRef}
        style={{
          width: 22,
          height: 22,
          borderRadius: '50%',
          background: '#e3eafc',
          border: '1px solid #90caf9',
          color: '#1976d2',
          fontWeight: 700,
          fontSize: 15,
          cursor: 'pointer',
          padding: 0,
          lineHeight: '22px',
          textAlign: 'center',
          marginLeft: 2
        }}
        tabIndex={0}
        aria-label={ariaLabel}
        aria-haspopup="dialog"
        onClick={() => (open ? closePopup() : openPopup())}
        onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open ? closePopup() : openPopup(); } }}
      >
        ?
      </button>

      {open && (
        <div
          ref={popupRef}
          role="dialog"
          aria-label={ariaLabel}
          style={{
            position: 'fixed',
            top: pos.top,
            left: pos.left,
            transform: 'translateY(-50%)',
            width: 320,
            maxWidth: 'calc(100vw - 24px)',
            zIndex: 9999,
            background: '#fff',
            border: '1px solid #ddd',
            borderRadius: 8,
            boxShadow: '0 6px 20px rgba(0,0,0,0.12)',
            padding: 12,
            pointerEvents: 'auto',
            marginTop,
          }}
        >
          <div style={{ position: 'relative', paddingRight: 28, height: 24 }}>
            <strong style={{ fontSize: 15, position: 'absolute', left: '50%', transform: 'translateX(-50%)' }}>{ariaLabel}</strong>
            <button aria-label="Close" onClick={closePopup} style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', border: 'none', background: 'transparent', fontSize: 18, cursor: 'pointer' }}>×</button>
          </div>
          <div style={{ marginTop: 8, color: '#222', lineHeight: 1.4, fontSize: 14 }}>{content}</div>
        </div>
      )}
    </div>
  );
}
