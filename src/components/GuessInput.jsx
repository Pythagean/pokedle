import React, { useState, useEffect } from 'react';

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
  const [loadedSprites, setLoadedSprites] = useState({});

  // Prefetch sprite images for visible filtered options so they show up quicker
  useEffect(() => {
    if (!filteredOptions || filteredOptions.length === 0) return undefined;
    const images = [];
    filteredOptions.forEach(opt => {
      if (!opt || !opt.id) return;
      const url = `https://raw.githubusercontent.com/Pythagean/pokedle_assets/main/sprites/${opt.id}-front.png`;
      // If we already know the state, skip creating a new Image
      if (loadedSprites[opt.id]) return;
      const img = new Image();
      img.src = url;
      img.onload = () => setLoadedSprites(prev => ({ ...prev, [opt.id]: true }));
      img.onerror = () => setLoadedSprites(prev => ({ ...prev, [opt.id]: 'error' }));
      images.push(img);
    });
    return () => {
      images.forEach(i => {
        i.onload = null;
        i.onerror = null;
      });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filteredOptions]);

  // Sort filtered options alphabetically for the dropdown display
  const sortedOptions = React.useMemo(() => {
    if (!filteredOptions || filteredOptions.length === 0) return [];
    // create a shallow copy and sort by name using localeCompare for consistency
    return [...filteredOptions].sort((a, b) => (a && b && a.name) ? a.name.localeCompare(b.name) : 0);
  }, [filteredOptions]);

  // When highlighted index changes, ensure the highlighted item is visible in the dropdown
  useEffect(() => {
    if (!dropdownOpen) return;
    if (typeof highlightedIdx !== 'number' || highlightedIdx < 0) return;
    const list = dropdownRef && dropdownRef.current;
    if (!list) return;
    try {
      const items = list.querySelectorAll('li');
      if (!items || items.length === 0) return;
      const idx = Math.min(highlightedIdx, items.length - 1);
      const el = items[idx];
      if (el && typeof el.scrollIntoView === 'function') {
        // Use nearest so it doesn't always jump; keep behavior instant for accessibility
        el.scrollIntoView({ block: 'nearest', inline: 'nearest' });
      }
    } catch (e) {
      // ignore
    }
  }, [highlightedIdx, dropdownOpen, dropdownRef]);
  return (
    <div style={{ position: 'relative', minWidth: 120, flex: 1, maxWidth: '100%' }}>
      <input
        className="guess-input"
        ref={inputRef}
        type="text"
        value={guess}
        onChange={e => {
          setGuess(e.target.value);
          setHighlightedIdx(-1);
          setDropdownOpen(true);
        }}
        onFocus={() => {
          if (guess.length > 0 && sortedOptions.length > 0) setDropdownOpen(true);
        }}
        onBlur={() => {
          // Don't close here, handled by outside click
        }}
        onKeyDown={e => {
          if (e.key === 'ArrowDown' && sortedOptions.length > 0) {
            e.preventDefault();
            setHighlightedIdx(idx => (idx + 1) % sortedOptions.length);
            setDropdownOpen(true);
          } else if (e.key === 'ArrowUp' && sortedOptions.length > 0) {
            e.preventDefault();
            setHighlightedIdx(idx => (idx + sortedOptions.length - 1) % sortedOptions.length);
            setDropdownOpen(true);
          }
          // Do not handle Enter here; let form onSubmit handle it
        }}
        placeholder="Enter a Pokémon name..."
        style={{ width: '100%', minWidth: 120, maxWidth: 500, padding: 10, borderRadius: 8, border: '1px solid #bbb', fontSize: 16, boxSizing: 'border-box', background: '#fff', color: '#111' }}
        autoComplete="off"
      />
      {dropdownOpen && guess.length > 0 && sortedOptions.length > 0 && (
        <ul
          className="guess-dropdown"
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
            width: '100%',
            minWidth: 120,
          }}
        >
          {sortedOptions.map((opt, i) => (
            <li
              key={opt.name}
              style={{
                padding: '8px 12px',
                cursor: 'pointer',
                background: i === highlightedIdx ? '#e3f2fd' : undefined,
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                fontSize: 15,
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
              <div style={{ width: 32, height: 32, marginRight: 6, position: 'relative', flex: '0 0 32px' }}>
                {/* Placeholder box shown while sprite loads (or on error) */}
                <div style={{
                  width: 32,
                  height: 32,
                  borderRadius: 4,
                  background: '#f2f2f2',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  {/* Use local pokeball icon while sprite is loading or on error */}
                  {loadedSprites[opt.id] !== true && (
                    <img
                  src={`data/pokeball.ico`}
                  alt="pokeball"
                  style={{
                    width: 20,
                    height: 20,
                    objectFit: 'contain',
                    position: 'absolute',
                    left: '50%',
                    top: '50%',
                    transform: 'translate(-50%, -50%)',
                    transition: 'opacity 200ms ease',
                    opacity: loadedSprites[opt.id] === true ? 0 : 1,
                    zIndex: 1,
                  }}
                  onError={e => { e.target.style.display = 'none'; }}
                />
                  )}
                </div>
                <img
                  src={`https://raw.githubusercontent.com/Pythagean/pokedle_assets/main/sprites/${opt.id}-front.png`}
                  alt={opt.name}
                  onLoad={() => setLoadedSprites(prev => ({ ...prev, [opt.id]: true }))}
                  onError={() => setLoadedSprites(prev => ({ ...prev, [opt.id]: 'error' }))}
                  style={{
                    width: 32,
                    height: 32,
                    objectFit: 'contain',
                    position: 'absolute',
                    left: '50%',
                    top: '50%',
                    transform: 'translate(-50%, -50%)',
                    transition: 'opacity 200ms ease',
                    opacity: loadedSprites[opt.id] === true ? 1 : 0,
                     zIndex: 2,
                  }}
                />
              </div>
              <span>{opt.name}</span>
            </li>
          ))}
        </ul>
      )}
      {/* Responsive mobile styles for GuessInput */}
      <style>{`
        @media (max-width: 600px) {
          .guess-input {
            min-width: 60px !important;
            max-width: 300px !important;
            font-size: 14px !important;
            padding: 7px 8px !important;
          }
          .guess-dropdown {
            font-size: 13px !important;
            min-width: 60px !important;
            max-width: 300px !important;
          }
        }
      `}</style>
    </div>
  );
}
