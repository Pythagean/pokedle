import React from 'react';

export default function GuessInput({
  guess,
  setGuess,
  highlightedIdx,
  setHighlightedIdx,
  filteredOptions,
  dropdownOpen,
  setDropdownOpen,
  inputRef,
  dropdownRef,
  handleGuessSubmit
}) {
  return (
    <div style={{ position: 'relative', minWidth: 220, flex: 1, maxWidth: '80%' }}>
      <input
        ref={inputRef}
        type="text"
        value={guess}
        onChange={e => {
          setGuess(e.target.value);
          setHighlightedIdx(-1);
          setDropdownOpen(true);
        }}
        onFocus={() => {
          if (guess.length > 0 && filteredOptions.length > 0) setDropdownOpen(true);
        }}
        onBlur={() => {
          // Don't close here, handled by outside click
        }}
        onKeyDown={e => {
          if (e.key === 'ArrowDown' && filteredOptions.length > 0) {
            e.preventDefault();
            setHighlightedIdx(idx => (idx + 1) % filteredOptions.length);
            setDropdownOpen(true);
          } else if (e.key === 'ArrowUp' && filteredOptions.length > 0) {
            e.preventDefault();
            setHighlightedIdx(idx => (idx + filteredOptions.length - 1) % filteredOptions.length);
            setDropdownOpen(true);
          }
          // Do not handle Enter here; let form onSubmit handle it
        }}
        placeholder="Enter a Pokémon name..."
        style={{ width: '100%', minWidth: 180, padding: 10, borderRadius: 8, border: '1px solid #bbb', fontSize: 16, boxSizing: 'border-box' }}
        autoFocus
        autoComplete="off"
      />
      {dropdownOpen && guess.length > 0 && filteredOptions.length > 0 && (
        <ul
          ref={dropdownRef}
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            top: '100%',
            background: '#fff',
            border: '1px solid #bbb',
            borderTop: 'none',
            maxHeight: 180,
            overflowY: 'auto',
            zIndex: 10,
            margin: 0,
            padding: 0,
            listStyle: 'none',
          }}
        >
          {filteredOptions.map((opt, i) => (
            <li
              key={opt.name}
              style={{
                padding: '8px 12px',
                cursor: 'pointer',
                background: i === highlightedIdx ? '#e3f2fd' : undefined,
                display: 'flex',
                alignItems: 'center',
                gap: 10,
              }}
              onMouseDown={() => {
                handleGuessSubmit(null, opt.name);
                setDropdownOpen(false);
                setTimeout(() => {
                  if (inputRef.current) inputRef.current.focus();
                }, 0);
              }}
              onMouseEnter={() => setHighlightedIdx(i)}
            >
              <img
                src={`https://raw.githubusercontent.com/Pythagean/pokedle_assets/main/sprites/${opt.id}-front.png`}
                alt={opt.name}
                style={{ width: 32, height: 32, objectFit: 'contain', marginRight: 6 }}
                onError={e => { e.target.style.display = 'none'; }}
              />
              <span>{opt.name}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
