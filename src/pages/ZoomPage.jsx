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

export default function ZoomPage({ guesses, setGuesses, dailySeed }) {
  const inputRef = useRef(null);
  const pokemonData = usePokemonData();
  // Deterministic daily pokemon selection for this page, but allow reset for debugging
  const today = new Date();
  const defaultSeed = dailySeed || (getSeedFromUTCDate(today) + 8 * 1000 + 'z'.charCodeAt(0)); // UTC-based
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

  // --- Mirroring Logic (from SilhouettePage) ---
  // Deterministic random: use seed + 54321 for mirroring decision
  const mirrorSeed = useMemo(() => mulberry32(seed + 54321)(), [seed]);
  const shouldMirror = mirrorSeed < 0.5;

  // --- Zoom/Pan Logic ---
  // Deterministic random for edge/position, resets with new seed
  const edgeSeed = useMemo(() => {
    // Use seed + 12345 to get a different deterministic value
    return mulberry32(seed + 12345)();
  }, [seed]);
  // Pick edge: 0=top, 1=right, 2=bottom, 3=left
  const edge = useMemo(() => Math.floor(edgeSeed * 4), [edgeSeed]);

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

  // Real image path
  const realImagePath = `https://raw.githubusercontent.com/Pythagean/pokedle_assets/main/images/${dailyPokemon.id}.png`;

  // Zoom logic: start at 4.0, go to 0.9 over 10 steps (guesses), quadratic ease-in
  const maxZoom = 15.0;
  const minZoom = 0.9;
  const maxSteps = 10;
  let t = Math.min(guesses.length, maxSteps - 1) / (maxSteps - 1);
  let zoom = maxZoom - (maxZoom - minZoom) * (1 - Math.pow(1 - t, 2));
  if (isCorrect) {
    zoom = 0.9;
  }
  let edgeX = 0.5, edgeY = 0.5;
  let transformOrigin = '50% 50%';
  let imgStyle = {
    objectFit: 'contain'
  };
  if (edge === 0) { // top
    edgeX = 0.5; edgeY = 0; transformOrigin = '20% 0%';
    imgStyle.width = '100%';
    imgStyle.height = '100%';
  } else if (edge === 1) { // right
    edgeX = 1; edgeY = 0.5; transformOrigin = '100% 20%';
    imgStyle.width = 'auto';
    imgStyle.height = '100%';
  } else if (edge === 2) { // bottom
    edgeX = 0.5; edgeY = 1; transformOrigin = '20% 100%';
    imgStyle.width = '100%';
    imgStyle.height = '100%';
  } else if (edge === 3) { // left
    edgeX = 0; edgeY = 0.5; transformOrigin = '0% 20%';
    imgStyle.width = '100%';
    imgStyle.height = '100%';
  }
  // Interpolation factor: 0 at max zoom, 1 at min zoom
  const interp = (maxZoom - zoom) / (maxZoom - minZoom);
  const centerX = edgeX * (1 - interp) + 0.5 * interp;
  const centerY = edgeY * (1 - interp) + 0.5 * interp;
  const translateX = (0.5 - centerX) * 100 * zoom;
  const translateY = (0.5 - centerY) * 100 * zoom;
  transformOrigin = '50% 50%';
  // Mirroring logic: flip horizontally if shouldMirror
  let scaleX = shouldMirror ? -1 : 1;
  imgStyle.transform = `scale(${scaleX * zoom},${zoom})`;
  imgStyle.transition = 'transform 0.1s cubic-bezier(.4,2,.6,1)';
  imgStyle.transformOrigin = transformOrigin;
  if (zoom === 0.9) {
    imgStyle.width = '100%';
    imgStyle.height = '100%';
    imgStyle.objectFit = 'contain';
  }

  return (
    <div style={{ textAlign: 'center', marginTop: 40 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
        <h2 style={{ margin: 0 }}>Zoom Mode</h2>
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
            aria-label="What is Zoom Mode?"
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
            Guess the Pokémon from a zoomed-in image!<br /><br />
            Each incorrect guess zooms out to reveal more of the real image.<br /><br />
            <b>Note:</b> The image may be <b>mirrored</b> (flipped horizontally) for extra challenge.
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
        <div style={{ fontWeight: 600, marginBottom: 8 }}>Which Pokémon is this?</div>
         <div style={{ margin: '0 auto', width: 360, height: 360, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', background: '#fff' }}>
           {imgLoaded && (
             <img
               src={realImagePath}
               alt={dailyPokemon.name}
               style={imgStyle}
               onLoad={() => setImgLoaded(true)}
               onError={e => { setImgLoaded(false); }}
             />
           )}
         </div>
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
