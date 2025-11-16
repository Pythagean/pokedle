import React, { useState, useMemo, useRef, useEffect } from 'react';
import GuessInput from '../components/GuessInput';

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

function ClassicPage({ guesses, setGuesses }) {
  const pokemonData = usePokemonData();
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

  if (!pokemonData) return <div>Loading data...</div>;

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
      color: guessPoke.color === answerPoke.color ? 'match' : 'miss',
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
    <div>
      <div style={{ width: '100%', justifyContent: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, marginBottom: 8 }}>
          <h2 style={{ margin: 0 }}>Classic Mode</h2>
        </div>
      </div>
      <div className="classic-main-container" style={{ margin: '24px auto', maxWidth: 800, width: '100%', fontSize: 18, background: '#f5f5f5', borderRadius: 8, padding: 18, border: '1px solid #ddd', whiteSpace: 'pre-line', boxSizing: 'border-box' }}>
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
          style={{ display: 'flex', gap: 8, justifyContent: 'center', marginBottom: 32, flexWrap: 'wrap' }}
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
        <div className="classic-grid-fit" style={{ width: '100%' }}>
          <div className="classic-grid-header" style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', fontWeight: 600, gap: 4, marginBottom: 8, alignItems: 'center', width: '100%' }}>
            <div style={{ textAlign: 'center', fontSize: '1em' }}>Pokemon</div>
            <div style={{ textAlign: 'center', fontSize: '1em' }}>Color</div>
            <div style={{ textAlign: 'center', fontSize: '1em' }}>Types</div>
            <div style={{ textAlign: 'center', fontSize: '1em' }}>Habitat</div>
            <div style={{ textAlign: 'center', fontSize: '1em' }}>Height (m)</div>
            <div style={{ textAlign: 'center', fontSize: '1em' }}>Weight (kg)</div>
          </div>
          <div className="classic-feedback-scroll" style={{ width: '100%', overflowX: 'auto' }}>
            <div>
              {guesses.map((poke, idx) => {
                const cmp = getComparison(poke, dailyPokemon);
                const ArrowIcon = ({ dir }) => {
                  const color = '#333';
                  if (dir === 'up') {
                    return (
                      <svg width="24" height="24" viewBox="0 0 32 32" style={{ display: 'inline', verticalAlign: 'middle' }}>
                        <rect x="11" y="12" width="10" height="14" fill={color} />
                        <path d="M 16 4 L 10 12 L 22 12 Z" fill={color} />
                      </svg>
                    );
                  } else if (dir === 'down') {
                    return (
                      <svg width="24" height="24" viewBox="0 0 32 32" style={{ display: 'inline', verticalAlign: 'middle' }}>
                        <rect x="11" y="6" width="10" height="14" fill={color} />
                        <path d="M 16 28 L 10 20 L 22 20 Z" fill={color} />
                      </svg>
                    );
                  } else {
                    return null;
                  }
                };
                const heightStatus = cmp.height === 'match' ? 'match' : 'miss';
                const weightStatus = cmp.weight === 'match' ? 'match' : 'miss';
                return (
                  <div key={poke.name + idx} className="feedback-grid" style={{ gridTemplateColumns: 'repeat(6, 1fr)', width: '100%' }}>
                    <div className="feedback-box feedback-pokemon-box">
                      <img
                        src={`https://raw.githubusercontent.com/Pythagean/pokedle_assets/main/sprites/${poke.id}-front.png`}
                        alt={poke.name}
                        style={{ width: 32, height: 32, objectFit: 'contain', display: 'block', margin: '0 auto', transform: 'scale(1)' }}
                        onError={e => { e.target.style.display = 'none'; }}
                      />
                    </div>
                    <div className={`feedback-box ${cmp.color}`}>{poke.color}</div>
                    <div className={`feedback-box ${cmp.types}`}>{poke.types.join(', ')}</div>
                    <div className={`feedback-box ${cmp.habitat}`}>{poke.habitat}</div>
                    <div className={`feedback-box ${heightStatus}`} style={{ position: 'relative' }}>
                      {cmp.height !== 'match' && (
                        <svg width="40" height="40" viewBox="0 0 100 100" style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', opacity: 0.2, pointerEvents: 'none' }}>
                          {cmp.height === 'up' ? (
                            <>
                              <rect x="35" y="40" width="30" height="40" fill="#333" />
                              <path d="M 50 15 L 23 40 L 77 40 Z" fill="#333" />
                            </>
                          ) : (
                            <>
                              <rect x="35" y="20" width="30" height="40" fill="#333" />
                              <path d="M 50 85 L 23 60 L 77 60 Z" fill="#333" />
                            </>
                          )}
                        </svg>
                      )}
                      <span style={{ position: 'relative', zIndex: 1 }}>{poke.height}</span>
                    </div>
                    <div className={`feedback-box ${weightStatus}`} style={{ position: 'relative' }}>
                      {cmp.weight !== 'match' && (
                        <svg width="40" height="40" viewBox="0 0 100 100" style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', opacity: 0.2, pointerEvents: 'none' }}>
                          {cmp.weight === 'up' ? (
                            <>
                              <rect x="35" y="40" width="30" height="40" fill="#333" />
                              <path d="M 50 15 L 23 40 L 77 40 Z" fill="#333" />
                            </>
                          ) : (
                            <>
                              <rect x="35" y="20" width="30" height="40" fill="#333" />
                              <path d="M 50 85 L 23 60 L 77 60 Z" fill="#333" />
                            </>
                          )}
                        </svg>
                      )}
                      <span style={{ position: 'relative', zIndex: 1 }}>{poke.weight}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
      <style>{`
        @media (max-width: 700px) {
          .classic-grid-header > div {
            font-size: 0.85em !important;
          }
          .classic-main-container {
            max-width: 100vw !important;
            width: 100vw !important;
            margin-left: 0 !important;
            margin-right: 0 !important;
            border-radius: 0 !important;
            padding-left: 0 !important;
            padding-right: 0 !important;
          }
        }
        @media (max-width: 600px) {
          .classic-grid-header > div {
            font-size: 0.7em !important;
          }
          .classic-main-container {
            padding: 6px 0 6px 0 !important;
          }
        }
        .feedback-grid {
          display: grid;
          grid-template-columns: repeat(6, 1fr);
          gap: 4px;
          margin-bottom: 8px;
          align-items: center;
          width: 100%;
        }
        .feedback-box {
          width: 100%;
          height: 38px;
          border: 2px solid #b2dfdb;
          border-radius: 8px;
          background: #c8e6c9;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 11px;
          font-weight: 500;
          box-sizing: border-box;
          transition: background 0.2s, border 0.2s;
          margin-bottom: 0;
          text-align: center;
          overflow: hidden;
          white-space: pre-line;
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
          .classic-main-container {
            padding: 4px 0 4px 0 !important;
          }
          .feedback-grid, .classic-grid-fit > div {
            width: 100% !important;
            min-width: 0 !important;
          }
          .feedback-box {
            font-size: 10px !important;
            height: 32px !important;
            border-radius: 6px !important;
          }
          .feedback-pokemon-box img {
            width: 22px !important;
            height: 22px !important;
          }
        }
      `}</style>
    </div>
  );
}

export default ClassicPage;