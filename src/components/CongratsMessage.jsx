import React, { useEffect } from 'react';

export default function CongratsMessage({ guessCount, mode = 'Silhouette Mode' }) {
  useEffect(() => {
    // Inject styles into the document (only once)
    if (typeof document !== 'undefined' && !document.getElementById('pokedle-congrats-styles')) {
      const s = document.createElement('style');
      s.id = 'pokedle-congrats-styles';
      s.innerHTML = congratsStyles;
      document.head.appendChild(s);
    }
  }, []);

  return (
    <div style={{ textAlign: 'center', margin: '12px 0' }}>
      <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 6 }}>Congratulations!</div>
      <div className="silhouette-congrats" style={{ marginTop: 6 }}>
        <div className="congrats-text" style={{ fontSize: 16 }}>
          {`You guessed today's ${mode} Pokémon in ${guessCount} ${guessCount === 1 ? 'guess' : 'guesses'}!`}
        </div>
        <button
          style={{
            padding: '4px',
            borderRadius: 6,
            background: '#e3eafc',
            border: '1px solid #626262ff',
            color: '#e9e9e9ff',
            fontWeight: 600,
            fontSize: 14,
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
          onClick={() => {
            const text = `You guessed today's ${mode} Pokémon in ${guessCount} ${guessCount === 1 ? 'guess' : 'guesses'}!`;
            if (navigator.clipboard) {
              navigator.clipboard.writeText(text);
            }
          }}
          aria-label="Copy text to clipboard"
          title="Copy text to clipboard"
          type="button"
        >
          {/* Copy icon SVG */}
          <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden="true" focusable="false" style={{ display: 'block' }}>
            <rect x="6" y="6" width="9" height="9" rx="2" stroke="#626262ff" strokeWidth="1.5" fill="#fff" />
            <rect x="3" y="3" width="9" height="9" rx="2" stroke="#626262ff" strokeWidth="1.2" fill="#e3eafc" />
          </svg>
        </button>
      </div>
    </div>
  );
}

/* Congrats layout: keep on one line for larger screens, allow wrap on small screens */
const congratsStyles = `
.silhouette-congrats {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  flex-wrap: nowrap;
}
.silhouette-congrats .congrats-text {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

@media (max-width: 420px) {
  .silhouette-congrats { flex-wrap: wrap; gap: 8px; }
  .silhouette-congrats .congrats-text { white-space: normal; overflow: visible; text-overflow: clip; }
}
`;
