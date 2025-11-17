import React, { useState, useMemo, useRef, useEffect } from 'react';
import GuessInput from '../components/GuessInput';
import CongratsMessage from '../components/CongratsMessage';

function usePokemonData() {
  const [pokemonData, setPokemonData] = useState(null);
  useEffect(() => {
    fetch('data/pokemon_data.json')
      .then(res => res.json())
      .then(setPokemonData);
  }, []);
  return pokemonData;
}

function mulberry32(a) {
  return function () {
    var t = a += 0x6D2B79F5;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  }
}

function getSeedFromUTCDate(date) {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return parseInt(`${year}${month}${day}`, 10);
}

function ClassicPage({ pokemonData, guesses, setGuesses }) {
  const MAX_PLACEHOLDER_ROWS = 1;
  const [guess, setGuess] = useState('');
  const [highlightedIdx, setHighlightedIdx] = useState(-1);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const inputRef = useRef(null);
  const dropdownRef = useRef(null);

  // Get today's date as seed, use page key for deterministic daily selection
  const today = new Date();
  const seed = getSeedFromUTCDate(today) + 7 * 1000 + 'classic'.charCodeAt(0); // UTC-based
  const rng = useMemo(() => mulberry32(seed), [seed]);
  const dailyIndex = useMemo(() => pokemonData ? Math.floor(rng() * pokemonData.length) : 0, [rng, pokemonData]);
  const dailyPokemon = pokemonData ? pokemonData[dailyIndex] : null;
  const rowsToRender = Math.max(1, guesses.length);
  // One additional box added for Secondary Colours
  const BOX_COUNT = 7;
  const BOX_DELAY_STEP = 0.3; // seconds between boxes (updated to match per-box delays)
  const BOX_ANIM_DURATION_MS = 420; // matches CSS animation duration
  const [revealRow, setRevealRow] = useState(null);
  const prevGuessesLenRef = useRef(guesses.length);
  const revealRowRef = useRef(null);

  useEffect(() => {
    // If a new guess was prepended, animate the top row
    if (guesses.length > prevGuessesLenRef.current) {
      setRevealRow(0);
      prevGuessesLenRef.current = guesses.length;
      return;
    }
    prevGuessesLenRef.current = guesses.length;
  }, [guesses.length]);

  // When a revealRow is active, listen for the last box's animationend to clear it.
  useEffect(() => {
    if (revealRow === null) return;
    const container = revealRowRef.current;
    if (!container) return;
    const boxes = container.querySelectorAll('.feedback-box');
    if (!boxes || boxes.length === 0) return;
    const lastBox = boxes[boxes.length - 1];
    let cleared = false;
    const onEnd = () => {
      if (cleared) return;
      cleared = true;
      setRevealRow(null);
    };
    lastBox.addEventListener('animationend', onEnd);
    // Fallback timeout in case animationend doesn't fire
    const fallbackMs = Math.ceil(((BOX_COUNT - 1) * BOX_DELAY_STEP * 1000) + BOX_ANIM_DURATION_MS + 150);
    const t = setTimeout(onEnd, fallbackMs);
    return () => {
      lastBox.removeEventListener('animationend', onEnd);
      clearTimeout(t);
    };
  }, [revealRow, BOX_ANIM_DURATION_MS, BOX_COUNT, BOX_DELAY_STEP]);

  // Autocomplete options
  const pokemonNameMap = useMemo(() => {
    if (!pokemonData) return new Map();
    const map = new Map();
    for (const p of pokemonData) {
      map.set(p.name, { id: p.id, name: p.name });
    }
    return map;
  }, [pokemonData]);
  const pokemonNames = useMemo(() => pokemonData ? pokemonData.map(p => p.name) : [], [pokemonData]);
  const guessedNames = new Set(guesses.map(g => g.name));
  const filteredOptions = guess.length > 0
    ? pokemonNames
      .filter(name => name.toLowerCase().startsWith(guess.toLowerCase()))
      .filter(name => !guessedNames.has(name))
      .slice(0, 10)
      .map(name => pokemonNameMap.get(name))
    : [];

  // Collapse dropdown on outside click
  useEffect(() => {
    if (!dropdownOpen) return;
    function handleClick(e) {
      if (
        inputRef.current && !inputRef.current.contains(e.target) &&
        dropdownRef.current && !dropdownRef.current.contains(e.target)
      ) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [dropdownOpen]);

  // Preload common assets (arrow) so it appears instantly when used
  useEffect(() => {
    const arrowImg = new Image();
    arrowImg.src = 'images/arrow-up.svg';
    // no-op handlers to keep reference until unmount
    arrowImg.onload = () => {};
    arrowImg.onerror = () => {};
    return () => {
      arrowImg.onload = null;
      arrowImg.onerror = null;
    };
  }, []);

  // Check if the daily Pokemon has been guessed
  const solved = dailyPokemon && guesses.some(g => g.name === dailyPokemon.name);

  if (!pokemonData) return <div>Loading Pokémon...</div>;

  // Comparison logic for feedback
  function getComparison(guessPoke, answerPoke) {
    if (!guessPoke || !answerPoke) return {};
    function partialMatch(arr1, arr2) {
      return arr1.some(item => arr2.includes(item));
    }
    const getEvoStage = poke => poke.evolution_stage || 1;
    const guessEvo = getEvoStage(guessPoke);
    const answerEvo = getEvoStage(answerPoke);
    return {
      name: guessPoke.name === answerPoke.name ? 'match' : 'miss',
      color: (guessPoke.main_colour || guessPoke.color) === (answerPoke.main_colour || answerPoke.color) ? 'match' : 'miss',
      secondary_colours: JSON.stringify(guessPoke.secondary_colours) === JSON.stringify(answerPoke.secondary_colours)
        ? 'match'
        : (partialMatch(guessPoke.secondary_colours, answerPoke.secondary_colours) ? 'partial' : 'miss'),
      types: JSON.stringify(guessPoke.types) === JSON.stringify(answerPoke.types)
        ? 'match'
        : (partialMatch(guessPoke.types, answerPoke.types) ? 'partial' : 'miss'),
      habitat: guessPoke.habitat === answerPoke.habitat ? 'match' : 'miss',
      height: guessPoke.height === answerPoke.height ? 'match' : (guessPoke.height > answerPoke.height ? 'down' : 'up'),
      weight: guessPoke.weight === answerPoke.weight ? 'match' : (guessPoke.weight > answerPoke.weight ? 'down' : 'up'),
      evolution: guessEvo === answerEvo ? 'match' : (guessEvo > answerEvo ? 'down' : 'up'),
    };
  }

  function handleGuessSubmit(e, overrideGuess) {
    if (e) e.preventDefault();
    const guessValue = overrideGuess !== undefined ? overrideGuess : guess;
    const guessName = guessValue.trim().toLowerCase();
    const guessedPokemon = pokemonData.find(p => p.name.toLowerCase() === guessName);
    if (!guessedPokemon) return;
    setGuesses([guessedPokemon, ...guesses]);
    setGuess('');
    setHighlightedIdx(-1);
    if (inputRef.current) inputRef.current.focus();
  }

  return (
    <div style={{ textAlign: 'center', marginTop: 10 }}>
      <div style={{ width: '100%', justifyContent: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, marginBottom: 8 }}>
          <h2 style={{ margin: 0 }}>Classic Mode</h2>
        </div>
      </div>
      <div className="classic-main-container" style={{ margin: '24px auto', maxWidth: 800, width: '100%', fontSize: 18, background: '#f5f5f5', borderRadius: 8, padding: 18, border: '1px solid #ddd', whiteSpace: 'pre-line', boxSizing: 'border-box' }}>
        {solved ? (
          <CongratsMessage guessCount={guesses.length} mode="Classic Mode" />
        ) : (
          <form
            onSubmit={e => {
              e.preventDefault();
              if (highlightedIdx >= 0 && filteredOptions.length > 0) {
                handleGuessSubmit(null, filteredOptions[highlightedIdx].name);
                setDropdownOpen(false);
              } else if (
                guess.length > 0 &&
                filteredOptions.length > 0 &&
                filteredOptions.some(opt => opt.name.toLowerCase() === guess.trim().toLowerCase())
              ) {
                handleGuessSubmit(null, guess);
                setDropdownOpen(false);
              }
            }}
            style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}
          >
            <GuessInput
              guess={guess}
              setGuess={setGuess}
              highlightedIdx={highlightedIdx}
              setHighlightedIdx={setHighlightedIdx}
              filteredOptions={filteredOptions}
              dropdownOpen={dropdownOpen}
              setDropdownOpen={setDropdownOpen}
              inputRef={inputRef}
              dropdownRef={dropdownRef}
              handleGuessSubmit={handleGuessSubmit}
            />
          </form>
        )}
        </div>
        <div className="classic-grid-fit" style={{ width: '100%' }}>
          <div className="classic-grid-header" style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', fontWeight: 600, gap: 4, marginBottom: 8, alignItems: 'center', width: '100%' }}>
            <div style={{ textAlign: 'center', fontSize: '1em' }}>Pokemon</div>
            <div style={{ textAlign: 'center', fontSize: '1em' }}>Types</div>
            <div style={{ textAlign: 'center', fontSize: '1em' }}>Main Colour</div>
            <div style={{ textAlign: 'center', fontSize: '1em' }}>Secondary Colours</div>
            <div style={{ textAlign: 'center', fontSize: '1em' }}>Habitat</div>
            <div style={{ textAlign: 'center', fontSize: '1em' }}>Height</div>
            <div style={{ textAlign: 'center', fontSize: '1em' }}>Weight</div>
          </div>
          <div className="classic-feedback-scroll" style={{ width: '100%', overflowX: 'auto' }}>
            <div>
              {Array.from({ length: rowsToRender }).map((_, rowIdx) => {
                  if (rowIdx < guesses.length) {
                  const poke = guesses[rowIdx];
                  const cmp = getComparison(poke, dailyPokemon);
                  const heightStatus = cmp.height === 'match' ? 'match' : 'miss';
                  const weightStatus = cmp.weight === 'match' ? 'match' : 'miss';
                  const secondaryStatus = cmp.secondary_colours === 'match' ? 'match' : (cmp.secondary_colours === 'partial' ? 'partial' : 'miss');
                  return (
                    <div key={poke.name + rowIdx} ref={rowIdx === revealRow ? revealRowRef : null} className={`feedback-grid ${revealRow === rowIdx ? 'reveal-row' : ''}`} style={{ gridTemplateColumns: 'repeat(7, 1fr)', width: '100%' }}>
                      <div className="feedback-box feedback-pokemon-box" style={revealRow === rowIdx ? { animationDelay: `${0 * BOX_DELAY_STEP}s` } : undefined}>
                        <div className="feedback-pokemon-img">
                          <img
                            src={`https://raw.githubusercontent.com/Pythagean/pokedle_assets/main/sprites/${poke.id}-front.png`}
                            alt={poke.name}
                            onError={e => { e.target.style.display = 'none'; }}
                          />
                        </div>
                        <div className="feedback-box-content" aria-hidden="true"></div>
                      </div>
                        <div className={`feedback-box ${cmp.types}`} style={revealRow === rowIdx ? { animationDelay: `${1 * BOX_DELAY_STEP}s` } : undefined}>
                          <div className="feedback-box-content">{poke.types.join(', ')}</div>
                        </div>
                        <div className={`feedback-box ${cmp.color}`} style={revealRow === rowIdx ? { animationDelay: `${2 * BOX_DELAY_STEP}s` } : undefined}>
                          <div className="feedback-box-content">{poke.main_colour || poke.color}</div>
                        </div>
                        <div className={`feedback-box ${secondaryStatus}`} style={revealRow === rowIdx ? { animationDelay: `${3 * BOX_DELAY_STEP}s` } : undefined}>
                          <div className="feedback-box-content">{poke.secondary_colours && poke.secondary_colours.length ? poke.secondary_colours.join(', ') : 'None'}</div>
                        </div>
                        <div className={`feedback-box ${cmp.habitat}`} style={revealRow === rowIdx ? { animationDelay: `${4 * BOX_DELAY_STEP}s` } : undefined}>
                          <div className="feedback-box-content">{poke.habitat}</div>
                        </div>
                        <div className={`feedback-box ${heightStatus}`} style={revealRow === rowIdx ? { position: 'relative', animationDelay: `${5 * BOX_DELAY_STEP}s` } : { position: 'relative' }}>
                        {cmp.height !== 'match' && (
                          <div className="bg-icon" aria-hidden="true">
                            <img src={`images/arrow-up.svg`} alt="" className={cmp.height === 'up' ? '' : 'flip-vertical'} />
                          </div>
                        )}
                        <div className="feedback-box-content">
                          <span style={{ position: 'relative', zIndex: 2 }}>{poke.height}m</span>
                        </div>
                      </div>
                      <div className={`feedback-box ${weightStatus}`} style={revealRow === rowIdx ? { position: 'relative', animationDelay: `${6 * BOX_DELAY_STEP}s` } : { position: 'relative' }}>
                        {cmp.weight !== 'match' && (
                          <div className="bg-icon" aria-hidden="true">
                            <img src={`images/arrow-up.svg`} alt="" className={cmp.weight === 'up' ? '' : 'flip-vertical'} />
                          </div>
                        )}
                        <div className="feedback-box-content">
                          <span style={{ position: 'relative', zIndex: 2 }}>{poke.weight}kg</span>
                        </div>
                      </div>
                    </div>
                  );
                }

                // Placeholder row
                return (
                  <div key={`placeholder-${rowIdx}`} className="feedback-grid" style={{ gridTemplateColumns: 'repeat(7, 1fr)', width: '100%' }}>
                    {Array.from({ length: 7 }).map((__, colIdx) => (
                      <div key={`ph-${rowIdx}-${colIdx}`} className={`feedback-box placeholder`} style={revealRow === rowIdx ? { animationDelay: `${colIdx * BOX_DELAY_STEP}s` } : undefined}>
                        <div className="feedback-box-content">?</div>
                      </div>
                    ))}
                      </div>
                    );
                  })}
            </div>
          </div>
        </div>
      
      <style>{`
        @media (max-width: 700px) {
          .classic-grid-header > div {
            font-size: 0.85em !important;
          }
          .classic-main-container {
            max-width: 88vw !important;
            width: 88vw !important;
            margin-left: 0 !important;
            margin-right: 0 !important;
            border-radius: 0 !important;
          }
        }
        @media (max-width: 600px) {
          .classic-grid-header > div {
            font-size: 0.7em !important;
          }
        }
        .feedback-grid {
          display: grid;
          grid-template-columns: repeat(7, 1fr);
          gap: 8px;
          margin-bottom: 8px;
          align-items: center;
          width: 100%;
        }
        .feedback-box {
          width: 100%;
          aspect-ratio: 1 / 1;
          /* Fallback for browsers without aspect-ratio support */
          height: 0;
          padding-bottom: 100%;
          position: relative;
          border: 2px solid #b2dfdb;
          border-radius: 8px;
          background: #c8e6c9;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 14px;
          font-weight: 500;
          box-sizing: border-box;
          margin-bottom: 0;
          text-align: center;
          overflow: hidden;
          white-space: pre-line;
        }
        .feedback-box > * {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
        }
        .bg-icon {
          position: absolute;
          top: 50%;
          left: 50%;
          width: 110%;
          height: 110%;
          transform: translate(-50%, -50%);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 0;
          pointer-events: none;
        }
        .bg-icon img {
          width: 100%;
          height: 100%;
          object-fit: contain;
          display: block;
          opacity: 0.28;
          pointer-events: none;
          transform: none;
        }
        .bg-icon img.flip-vertical {
          transform: scaleY(-1);
        }
        .feedback-pokemon-img {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 90%;
          height: 90%;
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 2;
        }
        .feedback-pokemon-img img {
          width: 100%;
          height: 100%;
          object-fit: contain;
        }
        .feedback-box-content {
          z-index: 2;
        }
        .feedback-pokemon-box {
          background: #fff !important;
          border-color: #333 !important;
        }
        .heading-row {
          margin-bottom: 8px;
        }
        .heading-box {
          background: #fff;
          border: none;
          box-shadow: none;
          font-weight: 700;
          font-size: 12px;
        }
        .match {
          background: #a5d6a7 !important;
          border-color: #388e3c !important;
        }
        .partial {
          background: #fff59d !important;
          border-color: #fbc02d !important;
        }
        .miss {
          background: #ef9a9a !important;
          border-color: #b71c1c !important;
        }
        @media (max-width: 700px) {
          .feedback-grid, .classic-grid-fit > div {
            width: 100% !important;
            min-width: 0 !important;
          }
           /* Keep all six boxes on one line; give each a small min width
             so boxes are larger on very narrow screens and allow horizontal
             scrolling via the wrapper '.classic-feedback-scroll'. */
          .feedback-grid {
            grid-template-columns: repeat(7, minmax(53px, 1fr)) !important;
            gap: 4px !important;
          }
          .feedback-box {
            font-size: 12px !important;
            border-radius: 8px !important;
            /* aspect-ratio keeps boxes square */
          }
          .feedback-pokemon-box img {
            width: 100% !important;
            height: 100% !important;
          }
          /* Ensure the arrow SVG stays visible and scales on mobile */
          .bg-icon {
            width: 100% !important;
            height: 100% !important;
          }
          .bg-icon img {
            opacity: 0.28 !important;
            width: 100% !important;
            height: 100% !important;
          }
        }
        /* Placeholder rows shown before any guesses are made */
        .placeholder {
          background: #fff !important;
          border-color: #d0d0d0 !important;
          color: #333 !important;
        }
        .placeholder .feedback-box-content {
          font-weight: 700;
          font-size: 1.1rem;
        }
        /* Reveal animation (clip-path wipe) for newly added guess row */
        @media (prefers-reduced-motion: no-preference) {
          .reveal-row .feedback-box {
            animation-name: reveal-wipe;
            animation-duration: 420ms;
            animation-fill-mode: both;
            animation-timing-function: ease;
            transform-origin: center center;
            will-change: clip-path, opacity;
          }

          @keyframes reveal-wipe {
            0% { clip-path: inset(0 100% 0 0); opacity: 1; transform: scale(0.95); }
            60% { clip-path: inset(0 20% 0 0); }
            80% { clip-path: inset(0 0 0 0); opacity: 1; transform: scale(1); }
          }
        }
        @media (prefers-reduced-motion: reduce) {
          .reveal-row .feedback-box {
            animation: none !important;
            clip-path: none !important;
            opacity: 1 !important;
            transform: none !important;
          }
        }
      `}</style>
    </div>
  );
}

export default ClassicPage;