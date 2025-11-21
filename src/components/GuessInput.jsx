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
  const wrapperRef = React.useRef(null);
  const [dropdownRect, setDropdownRect] = useState({ left: 0, width: null });

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
      console.log('GuessInput: ensure highlighted visible', { highlightedIdx });
      const items = list.querySelectorAll('li');
      if (!items || items.length === 0) return;
      const idx = Math.min(highlightedIdx, items.length - 1);
      const el = items[idx];
      if (el && typeof el.scrollIntoView === 'function') {
        // Use nearest so it doesn't always jump; keep behavior instant for accessibility
        console.log('GuessInput: scrolling highlighted item into view', { idx, total: items.length });
        el.scrollIntoView({ block: 'nearest', inline: 'nearest' });
      }
    } catch (e) {
      // ignore
    }
  }, [highlightedIdx, dropdownOpen, dropdownRef]);
  
  // Keep dropdown aligned to the input element (fix mobile misalignment)
  // Use ResizeObserver + RAF to avoid heavy MutationObserver work and reflow storms
  useEffect(() => {
    let rafId = null;
    function scheduleUpdate() {
      if (rafId) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        try {
          console.log('GuessInput: scheduleUpdate');
          const inputEl = inputRef && inputRef.current;
          const wrapperEl = wrapperRef && wrapperRef.current;
          if (inputEl && wrapperEl) {
            const inRect = inputEl.getBoundingClientRect();
            const wrapRect = wrapperEl.getBoundingClientRect();
            const left = Math.max(0, Math.round(inRect.left - wrapRect.left));
            const width = Math.round(inRect.width) || wrapperEl.clientWidth;
            console.log('GuessInput: measured rects', { inRect, wrapRect, left, width });
            setDropdownRect(prev => (prev.left === left && prev.width === width) ? prev : { left, width });
          } else {
            console.log('GuessInput: inputEl or wrapperEl missing', { inputEl, wrapperEl });
            setDropdownRect(prev => (prev.left === 0 && prev.width === null) ? prev : { left: 0, width: null });
          }
        } catch (e) {
          // ignore measurement errors
        }
      });
    }

    if (dropdownOpen) scheduleUpdate();
    window.addEventListener('resize', scheduleUpdate);

    let ro = null;
    try {
      if (typeof ResizeObserver !== 'undefined' && inputRef && inputRef.current) {
        ro = new ResizeObserver(scheduleUpdate);
        ro.observe(inputRef.current);
      }
    } catch (e) {
      // ignore
    }

    return () => {
      window.removeEventListener('resize', scheduleUpdate);
      if (rafId) cancelAnimationFrame(rafId);
      try { if (ro) ro.disconnect(); } catch (e) {}
    };
  }, [inputRef, dropdownOpen, sortedOptions.length]);

  // On mobile, when the dropdown opens, ensure the dropdown (preferred) or input is visible above the keyboard.
  useEffect(() => {
    if (!dropdownOpen) return;
    if (typeof window === 'undefined') return;
    // Only run this logic on narrow viewports (mobile)
    if (window.innerWidth > 700) return;
    console.log('GuessInput: mobile scroll adjustment running', { innerWidth: window.innerWidth, dropdownOpen, sortedCount: sortedOptions.length });

    // Delay so the OS keyboard can open and the dropdown can render
    const handle = setTimeout(() => {
      try {
        const dropdownEl = dropdownRef && dropdownRef.current;
        const targetEl = dropdownEl || (inputRef && inputRef.current);
        if (!targetEl) return;
        const rect = targetEl.getBoundingClientRect();
        const cushion = 12; // pixels to keep above keyboard
        // If bottom is obscured by keyboard area, scroll down so dropdown bottom sits cushion px above viewport bottom
        if (rect.bottom > (window.innerHeight - cushion)) {
          const scrollBy = rect.bottom - (window.innerHeight - cushion) + 200;
          window.scrollBy({ top: scrollBy + 36, left: 0, behavior: 'smooth' });
        } else if (rect.top < 0) {
          // If element is above viewport, bring it into view
          targetEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      } catch (e) {
        // ignore measurement errors
      }
    }, 350);

    return () => clearTimeout(handle);
  }, [dropdownOpen, inputRef, dropdownRef]);
  return (
    <div ref={wrapperRef} style={{ position: 'relative', minWidth: 120, flex: 1, maxWidth: '100%' }}>
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
            top: '100%',
            left: dropdownRect.left || 0,
            background: '#fff',
            border: '1px solid #bbb',
            borderTop: 'none',
            maxHeight: 180,
            overflowY: 'auto',
            zIndex: 10,
            margin: 0,
            padding: 0,
            listStyle: 'none',
            width: dropdownRect.width ? dropdownRect.width : '100%',
            minWidth: 120,
          }}
        >
          {sortedOptions.map((opt, i) => (
            <li
              key={opt.name}
              style={{
                padding: '12px 16px',
                cursor: 'pointer',
                background: i === highlightedIdx ? '#e3f2fd' : undefined,
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                fontSize: 17,
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
              <div style={{ width: 44, height: 44, marginRight: 8, position: 'relative', flex: '0 0 44px' }}>
                {/* Placeholder box shown while sprite loads (or on error) */}
                <div style={{
                  width: 44,
                  height: 44,
                  borderRadius: 6,
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
                    width: 28,
                    height: 28,
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
                    width: 40,
                    height: 40,
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
