import React, { useState, useMemo, useRef, useEffect } from 'react';
import GuessInput from '../components/GuessInput';
import CongratsMessage from '../components/CongratsMessage';
import ResetCountdown from '../components/ResetCountdown';
import { RESET_HOUR_UTC } from '../config/resetConfig';
import InfoButton from '../components/InfoButton';
import Confetti from '../components/Confetti';
import { COLOURS_HINT_THRESHOLDS, ColourHints } from '../config/hintConfig';
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

export default function ColoursPage({ pokemonData, guesses, setGuesses, daily }) {
  const inputRef = useRef(null);
  const lastGuessRef = useRef(null);
  const [showConfetti, setShowConfetti] = useState(false);
  const prevCorrectRef = useRef(false);
  
  const today = new Date();
  const defaultSeed = (getSeedFromUTCDate(today) + 9 * 1000 + 'c'.charCodeAt(0)); // UTC-based
  const [resetSeed, setResetSeed] = useState(null);
  const [resetCount, setResetCount] = useState(0);
  const seed = resetSeed !== null ? resetSeed : defaultSeed;
  const rng = useMemo(() => mulberry32(seed), [seed]);
  const dailyIndex = useMemo(() => pokemonData ? Math.floor(rng() * pokemonData.length) : 0, [rng, pokemonData]);
  const computedDaily = pokemonData ? pokemonData[dailyIndex] : null;
  const dailyPokemon = daily || computedDaily;

  // Preload the full Pokémon image so it appears immediately after a correct guess
  useEffect(() => {
    if (!dailyPokemon) return;
    try {
      const url = `https://raw.githubusercontent.com/Pythagean/pokedle_assets/main/images/${dailyPokemon.id}.png`;
      const img = new Image();
      img.src = url;
      // Also preload the sprite colour blocks image used as a hint
      const spriteUrl = `https://raw.githubusercontent.com/Pythagean/pokedle_assets/main/colours/sprite/${dailyPokemon.id}.png`;
      const spriteImg = new Image();
      spriteImg.src = spriteUrl;
      // assign handlers to help with debugging in verbose dev runs
      img.onload = () => { /* loaded into browser cache */ };
      img.onerror = () => { /* ignore preload failures */ };
      spriteImg.onload = () => { /* loaded into browser cache */ };
      spriteImg.onerror = () => { /* ignore preload failures */ };
      return () => {
        img.onload = null;
        img.onerror = null;
        spriteImg.onload = null;
        spriteImg.onerror = null;
      };
    } catch (e) {
      // ignore
    }
  }, [dailyPokemon && dailyPokemon.id]);

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

  if (!pokemonData) return <div>Loading Pokémon colours...</div>;

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

  useEffect(() => {
    const key = `pokedle_confetti_colours_${seed}`;
    let alreadyShown = false;
    try { alreadyShown = !!localStorage.getItem(key); } catch (e) { alreadyShown = false; }
    if (isCorrect && !prevCorrectRef.current && !alreadyShown) {
      setShowConfetti(true);
      try { localStorage.setItem(key, '1'); } catch (e) {}
      const t = setTimeout(() => setShowConfetti(false), 2500);
      prevCorrectRef.current = true;
      return () => clearTimeout(t);
    }
    prevCorrectRef.current = isCorrect;
  }, [isCorrect, seed]);

  // Colour block image paths (updated for new structure)
  const colourPath = `https://raw.githubusercontent.com/Pythagean/pokedle_assets/main/colours/artwork/${dailyPokemon.id}.png`;
  const spriteColourPath = `https://raw.githubusercontent.com/Pythagean/pokedle_assets/main/colours/sprite/${dailyPokemon.id}.png`;

  // --- Hints logic (types, sprite colours) ---
  const types = dailyPokemon.types || [];
  const generation = dailyPokemon.generation || "N/A";
  let generationHint = null;
  let generationHintPlaceholder = null;
  let typeHint = null;
  let typeHintPlaceholder = null;
  let spriteColourHint = null;
  let spriteColourHintPlaceholder = null;
  // thresholds: [spriteColoursThreshold, typesThreshold, generationThreshold]
  const [spriteT, typesT, genT] = COLOURS_HINT_THRESHOLDS;

  if (guesses.length >= genT) {
    // Show generation
      generationHint = <span><span style={{ fontWeight: 700 }}>Generation:</span> <span>{generation}</span></span>;
  }
  if (guesses.length >= typesT) {
    // Show all types
    if (types.length === 1) {
      typeHint = <span><span style={{ fontWeight: 700 }}>Type:</span> <span>{types[0]}</span></span>;
    } else if (types.length === 2) {
      typeHint = <span><span style={{ fontWeight: 700 }}>Types:</span> <span>{types[0]}, {types[1]}</span></span>;
    }
  }
  // Always show the in-game sprite colours image.
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
      {/* Reveal the top_30 colours image when the sprite threshold is reached */}
      {guesses.length >= spriteT ? (
        <div style={{ marginTop: 12 }}>
          <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 6 }}>Top 30 colours (no grouping or aggregation):</div>
          <img
            src={`https://raw.githubusercontent.com/Pythagean/pokedle_assets/main/colours/top_30/${dailyPokemon.id}.png`}
            alt="Top 30 colours"
            style={{ width: 'auto', maxWidth: '100%', height: 100, display: 'block', margin: '0 auto', objectFit: 'contain', borderRadius: 6, border: '1px solid #bbb', background: '#fff' }}
          />
        </div>
      ) : null}
    </div>
  );

  // Keep existing generation/type placeholders logic unchanged — only the top_30 reveal is gated by spriteT.
  if (guesses.length < genT && guesses.length >= typesT) {
    generationHintPlaceholder = <span style={{ color: '#888' }}>The Pokémon's generation will be revealed in {genT - guesses.length} guess{genT - guesses.length === 1 ? '' : 'es'}!</span>;
  }
  if (guesses.length < typesT && types.length > 0 && guesses.length >= spriteT) {
    typeHintPlaceholder = <span style={{ color: '#888' }}>The Pokémon's type{types.length === 2 ? 's' : ''} will be revealed in {typesT - guesses.length} guess{typesT - guesses.length === 1 ? '' : 'es'}!</span>;
  }

  // Placeholder for top_30 image when not yet revealed
  if (guesses.length > 0 && guesses.length < spriteT) {
    spriteColourHintPlaceholder = <span style={{ color: '#888' }}>The top 30 colours will be revealed in {spriteT - guesses.length} guess{spriteT - guesses.length === 1 ? '' : 'es'}!</span>;
  }

  // If the puzzle has been solved, remove any placeholders for hints that haven't been shown.
  if (isCorrect) {
    generationHintPlaceholder = null;
    typeHintPlaceholder = null;
    spriteColourHintPlaceholder = null;
  }

  return (
    <div style={{ textAlign: 'center', marginTop: 10 }}>
      <Confetti active={showConfetti} centerRef={isCorrect ? lastGuessRef : null} />
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
        <h2 style={{ margin: 0 }}>Colours Mode</h2>
        <InfoButton
          ariaLabel="How to Play"
          placement="right"
          content={
            <div style={{ textAlign: 'left' }}>
              The image below shows the most common colours found in the Pokémon. (based on Ken Sugimori's artwork)<br /><br />
              The colours are arranged from most to least common, left to right.<br />
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
      <div style={{ margin: '24px auto', maxWidth: 500, fontSize: 18, background: '#f5f5f5', borderRadius: 8, padding: 18, border: '1px solid #ddd', whiteSpace: 'pre-line' }}>
        {!isCorrect && (
          <div style={{ fontWeight: 600, marginBottom: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            <span>Which Pokémon is made up of these colours?</span>
          </div>
        )}
        {isCorrect && (
          <>
          <CongratsMessage guessCount={guesses.length} mode="Colours" />
          <ResetCountdown active={isCorrect} resetHourUtc={RESET_HOUR_UTC} />
          </>
        )}
        <div className="colours-viewport" style={{ margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', background: '#fff', borderRadius: 8, border: '1px solid #ccc', gap: isCorrect ? 12 : 0 }}>
          {/* Colour block image */}
          {imgLoaded && (
            <img
              src={colourPath}
              alt=""
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
              src={`https://raw.githubusercontent.com/Pythagean/pokedle_assets/main/images/${dailyPokemon.id}.png`}
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
        {generationHint && (
          <div style={{
            color: '#333',
            borderTop: '1px dashed #bbb',
            paddingTop: 10,
            marginTop: 16,
            fontSize: 16
          }}>{generationHint}</div>
        )}
        {generationHintPlaceholder && (
          <div style={{
            color: '#888',
            borderTop: '1px dashed #eee',
            paddingTop: 10,
            marginTop: 16,
            fontSize: 15
          }}>{generationHintPlaceholder}</div>
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
          <div ref={lastGuessRef} style={{
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
              src={`https://raw.githubusercontent.com/Pythagean/pokedle_assets/main/sprites_trimmed/${lastGuess.id}-front.png`}
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
                    src={`https://raw.githubusercontent.com/Pythagean/pokedle_assets/main/sprites_trimmed/${g.id}-front.png`}
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

/* Component-specific responsive CSS for colours viewport */
const _coloursStyles = `
.colours-viewport {
  margin: 0 auto;
  width: min(90vw, 500px);
  aspect-ratio: 2 / 1; /* keep original 500x250 aspect ratio */
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  background: #fff;
  border-radius: 8px;
  border: 1px solid #ccc;
  gap: 0;
}
.colours-viewport img { width: 100%; height: 100%; object-fit: cover; display: block; }

@media (max-width: 520px) {
  .colours-viewport { width: min(78vw, 300px); }
}

@media (max-width: 360px) {
  .colours-viewport { width: 94vw; }
}
`;

if (typeof document !== 'undefined' && !document.getElementById('pokedle-colours-styles')) {
  const s = document.createElement('style');
  s.id = 'pokedle-colours-styles';
  s.innerHTML = _coloursStyles;
  document.head.appendChild(s);
}
