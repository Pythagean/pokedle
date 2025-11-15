import React, { useState, useMemo, useRef, useEffect } from 'react';
import GuessInput from '../components/GuessInput';
// import pokemonData from '../../data/pokemon_data.json';

function usePokemonData() {
  const [pokemonData, setPokemonData] = useState(null);
  useEffect(() => {
    fetch('/data/pokemon_data.json')
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

export default function ColoursPage({ guesses, setGuesses, dailySeed }) {
  const inputRef = useRef(null);
  const pokemonData = usePokemonData();
  const today = new Date();
  const defaultSeed = dailySeed || (getSeedFromUTCDate(today) + 9 * 1000 + 'c'.charCodeAt(0)); // UTC-based
  const [resetSeed, setResetSeed] = useState(null);
  const [resetCount, setResetCount] = useState(0);
  const seed = resetSeed !== null ? resetSeed : defaultSeed;
  const rng = useMemo(() => mulberry32(seed), [seed]);
  const dailyIndex = useMemo(() => pokemonData ? Math.floor(rng() * pokemonData.length) : 0, [rng, pokemonData]);
  const dailyPokemon = pokemonData ? pokemonData[dailyIndex] : null;

  // Guessing state (controlled input for GuessInput)
  const [guess, setGuess] = useState('');
  const [highlightedIdx, setHighlightedIdx] = useState(-1);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);
  const [imgLoaded, setImgLoaded] = useState(true);
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

  // Colour block image paths (updated for new structure)
  const colourPath = `https://raw.githubusercontent.com/Pythagean/pokedle_assets/main/colours/artwork/${dailyPokemon.id}.png`;
  const spriteColourPath = `https://raw.githubusercontent.com/Pythagean/pokedle_assets/main/colours/sprite/${dailyPokemon.id}.png`;

  // --- Hints logic (types, sprite colours) ---
  const types = dailyPokemon.types || [];
  let typeHint = null;
  let typeHintPlaceholder = null;
  let spriteColourHint = null;
  let spriteColourHintPlaceholder = null;
  if (guesses.length >= 8) {
    // Show all types
    if (types.length === 1) {
      typeHint = <span><span style={{ fontWeight: 700 }}>Type:</span> <span>{types[0]}</span></span>;
    } else if (types.length === 2) {
      typeHint = <span><span style={{ fontWeight: 700 }}>Types:</span> <span>{types[0]}, {types[1]}</span></span>;
    }
  }
  if (guesses.length >= 4) {
    // Always show sprite colour blocks after 4 guesses
    spriteColourHint = (
      <div style={{ margin: '16px auto 0', maxWidth: 350, textAlign: 'center' }}>
        <div style={{ fontWeight: 600, fontSize: 17, marginBottom: 8 }}>In-game sprite colours:</div>
        <img
          src={spriteColourPath}
          alt="Sprite colours"
          style={{
            width: 'auto',
            maxWidth: '100%',
            height: 100,
            display: 'block',
            margin: '0 auto',
            objectFit: 'contain',
            borderRadius: 6,
            border: '1px solid #bbb',
            background: '#fff'
          }}
        />
      </div>
    );
    if (guesses.length < 8 && types.length > 0) {
      typeHintPlaceholder = <span style={{ color: '#888' }}>The Pokémon's type{types.length === 2 ? 's' : ''} will be revealed in {8 - guesses.length} guess{8 - guesses.length === 1 ? '' : 'es'}!</span>;
    }
  }
  if (guesses.length > 0 && guesses.length < 4) {
    // Placeholder for sprite colours
    spriteColourHintPlaceholder = <span style={{ color: '#888' }}>The in-game sprite colours will be revealed in {4 - guesses.length} guess{4 - guesses.length === 1 ? '' : 'es'}!</span>;
  }

  return (
    <div style={{ textAlign: 'center', marginTop: 40 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
        <h2 style={{ margin: 0 }}>Colours Mode</h2>
        <div style={{ position: 'relative', display: 'inline-block' }}>
          <button
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
            aria-label="What is Colours Mode?"
            onMouseEnter={e => {
              const tooltip = e.currentTarget.nextSibling;
              if (tooltip) tooltip.style.visibility = 'visible';
            }}
            onMouseLeave={e => {
              const tooltip = e.currentTarget.nextSibling;
              if (tooltip) tooltip.style.visibility = 'hidden';
            }}
            onFocus={e => {
              const tooltip = e.currentTarget.nextSibling;
              if (tooltip) tooltip.style.visibility = 'visible';
            }}
            onBlur={e => {
              const tooltip = e.currentTarget.nextSibling;
              if (tooltip) tooltip.style.visibility = 'hidden';
            }}
          >
            ?
          </button>
          <div
            style={{
              visibility: 'hidden',
              background: '#333',
              color: '#fff',
              textAlign: 'left',
              borderRadius: 6,
              padding: '8px 12px',
              position: 'absolute',
              zIndex: 100,
              left: '110%',
              top: '50%',
              transform: 'translateY(-50%)',
              minWidth: 220,
              fontSize: 14,
              boxShadow: '0 2px 8px #0002',
              pointerEvents: 'none',
              whiteSpace: 'normal',
            }}
            role="tooltip"
          >
            The image below shows the most common colours found in the Pokémon. (based on Ken Sugimori's artwork)<br /><br />
            The colours are arranged from most to least common, left to right.<br />
          </div>
        </div>
        <button
          style={{ padding: '4px 12px', borderRadius: 6, background: resetCount >= 2 ? '#ccc' : '#eee', border: '1px solid #bbb', fontWeight: 600, fontSize: 14, cursor: resetCount >= 2 ? 'not-allowed' : 'pointer', opacity: resetCount >= 2 ? 0.5 : 1 }}
          onClick={() => {
            if (resetCount >= 2) return;
            setGuesses([]);
            setResetSeed(Date.now() + Math.floor(Math.random() * 1000000000));
            setResetCount(resetCount + 1);
          }}
          disabled={resetCount >= 2}
        >
          Reset
        </button>
      </div>
      <div style={{ margin: '24px auto', maxWidth: 500, fontSize: 18, background: '#f5f5f5', borderRadius: 8, padding: 18, border: '1px solid #ddd', whiteSpace: 'pre-line' }}>
        <div style={{ fontWeight: 600, marginBottom: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
          <span>Which Pokémon is made up of these colours?</span>
        </div>
        <div style={{ margin: '0 auto', width: 500, height: 250, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', background: '#fff', borderRadius: 8, border: '1px solid #ccc', gap: isCorrect ? 12 : 0 }}>
          {/* Colour block image */}
          {imgLoaded && (
            <img
              src={colourPath}
              alt="Colour blocks"
              style={{
                display: 'block',
                width: isCorrect ? '60%' : '100%',
                height: '100%',
                objectFit: isCorrect ? 'contain' : 'cover', // show entire image after correct guess
                margin: 0,
                padding: 0,
                border: 'none',
                background: '#fff',
                transition: 'width 0.3s, object-fit 0.3s'
              }}
              onLoad={() => setImgLoaded(true)}
              onError={e => { setImgLoaded(false); }}
            />
          )}
          {/* Real Pokémon image, only after correct guess */}
          {isCorrect && (
            <img
              src={`/data/images/${dailyPokemon.id}.png`}
              alt={dailyPokemon.name}
              style={{ display: 'block', width: '40%', height: '100%', objectFit: 'contain', margin: 0, padding: 0, border: 'none', background: 'none', transition: 'width 0.3s' }}
              draggable={false}
              onError={e => { e.target.style.display = 'none'; }}
            />
          )}
        </div>
        {/* Sprite colour blocks hint or placeholder */}
        {spriteColourHint}
        {spriteColourHintPlaceholder && (
          <div style={{ color: '#888', borderTop: '1px dashed #eee', paddingTop: 10, marginTop: 16, fontSize: 15 }}>{spriteColourHintPlaceholder}</div>
        )}
        {/* Hints section */}
        {typeHint && (
          <div style={{
            color: '#333',
            borderTop: '1px dashed #bbb',
            paddingTop: 10,
            marginTop: 16,
            fontSize: 16
          }}>{typeHint}</div>
        )}
        {typeHintPlaceholder && (
          <div style={{
            color: '#888',
            borderTop: '1px dashed #eee',
            paddingTop: 10,
            marginTop: 16,
            fontSize: 15
          }}>{typeHintPlaceholder}</div>
        )}
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
