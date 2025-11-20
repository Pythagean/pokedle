import React, { useState, useMemo, useRef, useEffect } from 'react';
import GuessInput from '../components/GuessInput';
import CongratsMessage from '../components/CongratsMessage';
import ResetCountdown from '../components/ResetCountdown';
import { RESET_HOUR_UTC } from '../config/resetConfig';
import InfoButton from '../components/InfoButton';
// import pokemonData from '../../data/pokemon_data.json';


// Get a YYYYMMDD string from UTC date
function getSeedFromUTCDate(date) {
  let d = date;
  if (date.getUTCHours() >= RESET_HOUR_UTC) {
    d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() + 1, 0, 0, 0));
  }
  const year = d.getUTCFullYear();
  const month = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
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

export default function ZoomPage({ pokemonData, guesses, setGuesses, daily }) {
  const inputRef = useRef(null);
  // Deterministic daily pokemon selection for this page, but allow reset for debugging
  const today = new Date();
  const defaultSeed = (getSeedFromUTCDate(today) + 8 * 1000 + 'z'.charCodeAt(0)); // UTC-based
  const [resetSeed, setResetSeed] = useState(null);
  const [resetCount, setResetCount] = useState(0);
  const seed = resetSeed !== null ? resetSeed : defaultSeed;
  const rng = useMemo(() => mulberry32(seed), [seed]);
  const dailyIndex = useMemo(() => pokemonData ? Math.floor(rng() * pokemonData.length) : 0, [rng, pokemonData]);
  const computedDaily = pokemonData ? pokemonData[dailyIndex] : null;
  const dailyPokemon = daily || computedDaily;

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

  if (!pokemonData) return <div>Loading Pokémon artwork...</div>;

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
    <div style={{ textAlign: 'center', marginTop: 10, width: '100%' }}>
      <style>{`
        /* Make the zoom image container always square and responsive */
        .zoom-img-container {
          width: 100%;
          max-width: 360px;
          aspect-ratio: 1 / 1;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
          background: #fff;
          margin: 0 auto;
          box-sizing: border-box;
        }
        @media (min-width: 521px) {
          .zoom-img-container { max-width: 360px; }
        }
        /* Grey wrapper: match SilhouettePage sizing so margins/padding are consistent */
        .zoom-main {
          margin: 24px auto;
          max-width: 500px;
          width: 100%;
          background: #f5f5f5;
          border-radius: 8px;
          padding: 18px;
          border: 1px solid #ddd;
          box-sizing: border-box;
        }
        @media (max-width: 520px) {
          .zoom-main { max-width: 92vw; padding: 12px; }
        }
        @media (max-width: 600px) {
          .zoom-main {
            margin-top: 16px !important;
          }
          .zoom-img-container {
            width: 100% !important;
            max-width: 320px !important;
          }
          /* Ensure the image never exceeds the viewport of the container to avoid clipping */
          .zoom-img-container img { max-width: 100%; max-height: 100%; display: block; }
          .zoom-form {
            flex-direction: column !important;
            gap: 4px !important;
            margin-bottom: 16px !important;
          }
        }
      `}</style>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
        <h2 style={{ margin: 0 }}>Zoom Mode</h2>
        <InfoButton
          ariaLabel="How to Play"
          placement="right"
          content={
            <div style={{ textAlign: 'left' }}>
              Guess the Pokémon from a zoomed-in image!<br /><br />
              Each incorrect guess zooms out to reveal more of the real image.<br /><br />
              <b>Note:</b> The image may be <b>mirrored</b> (flipped horizontally) for extra challenge.
            </div>
          }
        />
        {/* <button
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
        </button> */}
      </div>
      <div className="zoom-main" style={{ margin: '24px auto', fontSize: 18, background: '#f5f5f5', borderRadius: 8, padding: 18, border: '1px solid #ddd', whiteSpace: 'pre-line', width: '100%' }}>
        {!isCorrect && <div style={{ fontWeight: 600, marginBottom: 8 }}>Which Pokémon is this?</div>}
        {isCorrect && (
          <>
            <CongratsMessage guessCount={guesses.length} mode="Zoom Mode" />
            <ResetCountdown active={isCorrect} resetHourUtc={RESET_HOUR_UTC} />
          </>
        )}
         <div className="zoom-img-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', background: '#fff' }}>
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
          className="zoom-form"
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
              src={`https://raw.githubusercontent.com/Pythagean/pokedle_assets/main/sprites/${lastGuess.id}-front.png`}
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
                    src={`https://raw.githubusercontent.com/Pythagean/pokedle_assets/main/sprites/${g.id}-front.png`}
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
