import React, { useEffect } from 'react';

export default function CongratsMessage({ guessCount, mode = 'Silhouette Mode', classic = false, guesses = [], answer = null }) {
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
      <div className="silhouette-congrats" style={{ marginTop: 6, display: 'flex', flexDirection: classic ? 'column' : 'row', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
        <div className="congrats-text" style={{ fontSize: 16 }}>
          {`You guessed today's ${mode} Pokémon in ${guessCount} ${guessCount === 1 ? 'guess' : 'guesses'}!`}
        </div>
        {classic && Array.isArray(guesses) && answer && (
          <div role="list" aria-label="Guess results" style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'center', marginLeft: 8 }}>
            {guesses.map((g, i) => {
              const partialMatch = (arr1, arr2) => Array.isArray(arr1) && Array.isArray(arr2) && arr1.some(item => arr2.includes(item));
              const getEvoStage = poke => poke && (poke.evolution_stage || 1);
              const statuses = [];
              statuses.push(g.name === answer.name ? 'match' : 'miss');
              statuses.push(g.generation === answer.generation ? 'match' : 'miss');
              if (JSON.stringify(g.types) === JSON.stringify(answer.types)) statuses.push('match');
              else if (partialMatch(g.types, answer.types)) statuses.push('partial');
              else statuses.push('miss');
              statuses.push(getEvoStage(g) === getEvoStage(answer) ? 'match' : 'miss');
              statuses.push(g.habitat === answer.habitat ? 'match' : 'miss');
              statuses.push(g.height === answer.height ? 'match' : 'miss');
              statuses.push(g.weight === answer.weight ? 'match' : 'miss');
              const emojiFor = s => (s === 'match' ? '🟩' : s === 'partial' ? '🟨' : '🟥');
              // remove the first status (name) and show the remaining feedback boxes
              const emojiSeq = statuses.slice(1, 7).map(emojiFor).join('');
              return (
                <div key={g.name + i} role="listitem" aria-label={`Guess ${i + 1}`} style={{ userSelect: 'text', fontSize: 16, lineHeight: '18px', display: 'flex', gap: 8, alignItems: 'center' }}>
                  <span aria-hidden="true" style={{ fontFamily: 'monospace' }}>{emojiSeq}</span>
                </div>
              );
            })}
          </div>
        )}
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
            const text = `I guessed today's ${mode} Pokémon in ${guessCount} ${guessCount === 1 ? 'guess' : 'guesses'}!`;
            let toCopy = text;
            if (classic && Array.isArray(guesses) && answer) {
              const partialMatch = (arr1, arr2) => {
                if (!Array.isArray(arr1) || !Array.isArray(arr2)) return false;
                return arr1.some(item => arr2.includes(item));
              };
              const getEvoStage = poke => poke && (poke.evolution_stage || 1);
              const emojiFor = s => (s === 'match' ? '🟩' : s === 'partial' ? '🟨' : '🟥');
              const lines = guesses.map(g => {
                const statuses = [];
                statuses.push(g.name === answer.name ? 'match' : 'miss');
                statuses.push(g.generation === answer.generation ? 'match' : 'miss');
                if (JSON.stringify(g.types) === JSON.stringify(answer.types)) statuses.push('match');
                else if (partialMatch(g.types, answer.types)) statuses.push('partial');
                else statuses.push('miss');
                statuses.push(getEvoStage(g) === getEvoStage(answer) ? 'match' : 'miss');
                statuses.push(g.habitat === answer.habitat ? 'match' : 'miss');
                statuses.push(g.height === answer.height ? 'match' : 'miss');
                statuses.push(g.weight === answer.weight ? 'match' : 'miss');
                // drop the first (name) and include the remaining six feedback boxes
                return statuses.slice(1, 7).map(emojiFor).join('');
              });
              toCopy = `${text}\n${lines.join('\n')}`;
            }
            if (navigator.clipboard) {
              navigator.clipboard.writeText(toCopy);
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
