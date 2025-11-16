import React, { useState, useMemo, useRef, useEffect } from 'react';
import GuessInput from '../components/GuessInput';
// import pokemonData from '../../data/pokemon_data.json';

function usePokemonData() {
  const [pokemonData, setPokemonData] = useState(null);
  useEffect(() => {
    fetch('data/pokemon_data.json')
      .then(res => res.json())
      .then(setPokemonData);
  }, []);
  return pokemonData;
}


// Get a YYYYMMDD string from UTC date
function getSeedFromUTCDate(date) {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return parseInt(`${year}${month}${day}`, 10);
}
function mulberry32(a) {
  return function() {
    var t = a += 0x6D2B79F5;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  }
}
export default function PokedexPage({ guesses, setGuesses, dailySeed }) {
  const inputRef = useRef(null);
  const pokemonData = usePokemonData();
  
  const today = new Date();
  const defaultSeed = dailySeed || (getSeedFromUTCDate(today) + 7 * 1000 + 'p'.charCodeAt(0)); // UTC-based
  const [resetSeed, setResetSeed] = useState(null);
  const [resetCount, setResetCount] = useState(0);
  const seed = resetSeed !== null ? resetSeed : defaultSeed;
  const rng = useMemo(() => mulberry32(seed), [seed]);
  const dailyIndex = useMemo(() => pokemonData ? Math.floor(rng() * pokemonData.length) : 0, [rng, pokemonData]);
  const dailyPokemon = pokemonData ? pokemonData[dailyIndex] : null;

  // Pick random flavor text entries for the clues/hints
  const flavorEntries = dailyPokemon ? (dailyPokemon.flavor_text_entries || []) : [];
  // Always show at least one clue
  const mainFlavorIdx = useMemo(() => flavorEntries.length > 0 ? Math.floor(rng() * flavorEntries.length) : 0, [rng, flavorEntries.length]);
  // For hints, pick other random indices (but not the main one)
  const getOtherRandomIdx = (excludeIdx, usedIdxs = []) => {
    if (flavorEntries.length <= 1) return excludeIdx;

    let idx;
    let attempts = 0;
    do {
      idx = Math.floor(rng() * flavorEntries.length);
      attempts++;
    } while ((idx === excludeIdx || usedIdxs.includes(idx)) && attempts < 10);
    return idx;
  };
  // After 4 guesses, show a second clue; after 8, a third
  const showSecondHint = guesses.length >= 4;
  const showThirdHint = guesses.length >= 8;
  const secondFlavorIdx = useMemo(() => getOtherRandomIdx(mainFlavorIdx), [mainFlavorIdx, flavorEntries.length, rng]);
  const thirdFlavorIdx = useMemo(() => getOtherRandomIdx(mainFlavorIdx, [secondFlavorIdx]), [mainFlavorIdx, secondFlavorIdx, flavorEntries.length, rng]);

  // Guessing state (controlled input for GuessInput)
  const [guess, setGuess] = useState('');
  const [highlightedIdx, setHighlightedIdx] = useState(-1);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);
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
    ? pokemonNames.filter(name => name.toLowerCase().startsWith(guess.toLowerCase())).filter(name => !guessedNames.has(name)).slice(0, 10).map(name => pokemonNameMap.get(name))
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

  // Only show the most recent guess
  const lastGuess = guesses[0];
  const isCorrect = lastGuess && lastGuess.name === dailyPokemon.name;

  return (
    <div style={{ textAlign: 'center', marginTop: 10 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
        <h2 style={{ margin: 0 }}>Pokedex Mode</h2>
        <button
          style={{ padding: '4px 12px', borderRadius: 6, background: resetCount >= 2 ? '#ccc' : '#eee', border: '1px solid #bbb', fontWeight: 600, fontSize: 14, cursor: resetCount >= 2 ? 'not-allowed' : 'pointer', opacity: resetCount >= 2 ? 0.5 : 1 }}
          onClick={() => {
            if (resetCount >= 2) return;
            setGuesses([]);
            // Pick a new random seed for this page
            setResetSeed(Math.floor(Math.random() * 1000000000));
            setResetCount(resetCount + 1);
          }}
          disabled={resetCount >= 2}
        >
          Reset
        </button>
      </div>
      <div style={{ margin: '24px auto', maxWidth: 500, fontSize: 18, background: '#f5f5f5', borderRadius: 8, padding: 18, border: '1px solid #ddd', whiteSpace: 'pre-line' }}>
        <div style={{ fontWeight: 600, marginBottom: 8 }}>
          {guesses.length >= 4 ? 'What Pokémon has these Pokédex entries?' : 'What Pokémon has this Pokédex entry?'}
        </div>
        <div style={{ color: '#333', marginBottom: (showSecondHint || (guesses.length > 0 && guesses.length < 4)) ? 12 : 0 }}>{flavorEntries[mainFlavorIdx]}</div>
        {/* Second hint or placeholder */}
        {showSecondHint && flavorEntries.length > 1 ? (
          <div style={{ color: '#333', marginBottom: (showThirdHint || (guesses.length >= 4 && guesses.length < 8)) ? 12 : 0, borderTop: '1px dashed #bbb', paddingTop: 10 }}>
            {flavorEntries[secondFlavorIdx]}
          </div>
        ) : (guesses.length > 0 && guesses.length < 4 && flavorEntries.length > 1 && (
          <div style={{ color: '#aaa', marginBottom: guesses.length + 1 < 4 ? 12 : 0, borderTop: '1px dashed #eee', paddingTop: 10 }}>
            Second Pokedex entry in {4 - guesses.length} guess{4 - guesses.length === 1 ? '' : 'es'}
          </div>
        ))}
        {/* Third hint or placeholder */}
        {showThirdHint && flavorEntries.length > 2 ? (
          <div style={{ color: '#333', borderTop: '1px dashed #bbb', paddingTop: 10 }}>
            {flavorEntries[thirdFlavorIdx]}
          </div>
        ) : (guesses.length >= 4 && guesses.length < 8 && flavorEntries.length > 2 && (
          <div style={{ color: '#aaa', borderTop: '1px dashed #eee', paddingTop: 10 }}>
            Third Pokedex entry in {8 - guesses.length} guess{8 - guesses.length === 1 ? '' : 'es'}
          </div>
        ))}
        {/* Types hint or placeholder */}
        {guesses.length >= 12 ? (
          <div style={{ color: '#333', borderTop: '1px dashed #bbb', paddingTop: 10 }}>
            <span style={{ fontWeight: 700 }}>Types:</span> {dailyPokemon.types && dailyPokemon.types.length > 0 ? dailyPokemon.types.join(', ') : 'Unknown'}
          </div>
        ) : (guesses.length >= 8 && guesses.length < 12 && (
          <div style={{ color: '#aaa', borderTop: '1px dashed #eee', paddingTop: 10 }}>
            Types revealed in {12 - guesses.length} guess{12 - guesses.length === 1 ? '' : 'es'}
          </div>
        ))}
      </div>
      {!isCorrect && (
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
      )}
      {lastGuess && (
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: 24, flexDirection: 'column', alignItems: 'center' }}>
          <div style={{
            background: isCorrect ? '#a5d6a7' : '#ef9a9a',
            border: `2px solid ${isCorrect ? '#388e3c' : '#b71c1c'}`,
            borderRadius: 12,
            padding: 12,
            minWidth: 100,
            minHeight: 100,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 15,
            fontWeight: 600,
            boxShadow: '0 2px 8px #0001',
            marginBottom: guesses.length > 1 ? 16 : 0,
          }}>
            <img
              src={`/data/sprites/${lastGuess.id}-front.png`}
              alt={lastGuess.name}
              style={{ width: 40, height: 40, objectFit: 'contain', marginBottom: 8, transform: 'scale(2.0)' }}
              onError={e => { e.target.style.display = 'none'; }}
            />
            <span>{lastGuess.name}</span>
          </div>
          {guesses.length > 1 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, justifyContent: 'center' }}>
              {guesses.slice(1).map((g, i) => (
                <div key={g.name + i} style={{
                  background: g.name === dailyPokemon.name ? '#a5d6a7' : '#ef9a9a',
                  border: `2px solid ${g.name === dailyPokemon.name ? '#388e3c' : '#b71c1c'}`,
                  borderRadius: 8,
                  padding: 6,
                  minWidth: 60,
                  minHeight: 60,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 12,
                  fontWeight: 600,
                }}>
                  <img
                    src={`/data/sprites/${g.id}-front.png`}
                    alt={g.name}
                    style={{ width: 24, height: 24, objectFit: 'contain', marginBottom: 4, transform: 'scale(1.5)' }}
                    onError={e => { e.target.style.display = 'none'; }}
                  />
                  <span>{g.name}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
