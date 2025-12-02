import React, { useState, useMemo, useRef, useEffect } from 'react';
import GuessInput from '../components/GuessInput';
import CongratsMessage from '../components/CongratsMessage';
import ResetCountdown from '../components/ResetCountdown';
import { RESET_HOUR_UTC } from '../config/resetConfig';
import InfoButton from '../components/InfoButton';
import Confetti from '../components/Confetti';
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

export default function ZoomPage({ pokemonData, guesses, setGuesses, daily, zoomMeta, useShinySprites = false }) {
  const inputRef = useRef(null);
  const lastGuessRef = useRef(null);
  const [showConfetti, setShowConfetti] = useState(false);
  const prevCorrectRef = useRef(false);
 
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
  const [imgNatural, setImgNatural] = useState({ w: null, h: null });
  const [debugOverlay, setDebugOverlay] = useState(false);
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

  // Determine zoom focal point from zoomMeta if available. zoomMeta is expected
  // to map image keys (id or zero-padded id) to arrays of [x,y] pixel coordinates.
  const idKey = dailyPokemon ? String(dailyPokemon.id) : null;
  const zeroPadKey = dailyPokemon ? String(dailyPokemon.id).padStart(3, '0') : null;
  const zoomPoints = useMemo(() => {
    if (!zoomMeta || !idKey) return null;
    return zoomMeta[idKey] || zoomMeta[zeroPadKey] || null;
  }, [zoomMeta, idKey, zeroPadKey]);

  // Choose a deterministic index from the available points using the seed
  const chosenZoomPoint = useMemo(() => {
    if (!zoomPoints || !Array.isArray(zoomPoints) || zoomPoints.length === 0) return null;
    const pickRng = mulberry32(seed + 22222);
    const idx = Math.floor(pickRng() * zoomPoints.length);
    const p = zoomPoints[idx];
    if (!p || p.length < 2) return null;
    return { x: Number(p[0]), y: Number(p[1]) };
  }, [zoomPoints, seed]);

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

  // Zoom logic: start at `maxZoom` and progress toward `minZoom` over `maxSteps` guesses.
  // Use a cubic ease-in so the first zoom-outs are small and the reveal increases gradually.
  const maxZoom = 12.0;
  const minZoom = 0.9;
  const maxSteps = 13;
  const t = Math.min(guesses.length, maxSteps - 1) / (maxSteps - 1);
  const easePower = 1.15; // cubic easing; increase to make initial steps even gentler
  const eased = Math.pow(t, easePower);
  const computedZoom = maxZoom - (maxZoom - minZoom) * eased;
  const zoom = isCorrect ? 0.9 : computedZoom;
  // console.log('ZoomPage: zoom=', zoom, 't=', t, 'eased=', eased, 'guesses=', guesses.length);
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

  // Compute target from chosen zoom point if available and we have image natural size;
  // otherwise fall back to the previous edge-based target behavior.
  let targetX = edgeX;
  let targetY = edgeY;
  if (chosenZoomPoint && imgNatural.w && imgNatural.h) {
    // Normalize pixel coordinates to 0..1 image-space
    targetX = chosenZoomPoint.x / imgNatural.w;
    targetY = chosenZoomPoint.y / imgNatural.h;
  }

  // Center the focal point in the container
  // We translate so the focal point moves to 50%, then scale from center
  let scaleX = shouldMirror ? -1 : 1;
  
  if (isCorrect) {
    // When correct, remove all transformations to show the image naturally
    imgStyle.transform = 'none';
    // Smoothly animate to the unzoomed state on correct guess
    imgStyle.transition = 'transform 3000ms cubic-bezier(.2,.8,.2,1)';
    imgStyle.transformOrigin = '50% 50%';
  } else {
    // Calculate translation: move focal point to center (50%, 50%)
    // The focal point is at targetX, targetY in image space (0..1)
    // We want it at 0.5, 0.5 after translation
    const translateX = -(0.5 - targetX) * 100;
    const translateY = (0.5 - targetY) * 100;
    
    // Apply translate first, then scale from center
    imgStyle.transform = `translate(${translateX}%, ${translateY}%) scale(${scaleX * zoom}, ${zoom})`;
    // No transition during normal zoom steps — snap instantly
    imgStyle.transition = 'none';
    imgStyle.transformOrigin = `50% 50%`;
  }
  if (zoom === 0.9) {
    imgStyle.width = '100%';
    imgStyle.height = '100%';
    imgStyle.objectFit = 'contain';
  }

  useEffect(() => {
    const key = `pokedle_confetti_zoom_${seed}`;
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

  return (
    <div style={{ textAlign: 'center', marginTop: 10, width: '100%' }}>
      <Confetti active={showConfetti} centerRef={isCorrect ? lastGuessRef : null} />
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
          marginTop={110}
          content={
            <div style={{ textAlign: 'left' }}>
              Guess the Pokémon from a zoomed-in image!<br /><br />
              Each incorrect guess zooms out to reveal more of the real image.<br /><br />
              <b>Note:</b> The image may be <b>mirrored</b> (flipped horizontally) for extra challenge.
            </div>
          }
        />
        {/* <button
          style={{ padding: '4px 8px', borderRadius: 6, background: debugOverlay ? '#ffe0b2' : '#f0f0f0', border: '1px solid #bbb', fontWeight: 600, fontSize: 13, cursor: 'pointer', marginLeft: 6 }}
          onClick={() => setDebugOverlay(d => !d)}
          aria-pressed={debugOverlay}
          aria-label="Toggle zoom debug overlay"
        >
          {debugOverlay ? 'Debug: ON' : 'Debug'}
        </button> */}
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
            <CongratsMessage guessCount={guesses.length} mode="Zoom" />
            <ResetCountdown active={isCorrect} resetHourUtc={RESET_HOUR_UTC} />
          </>
        )}
         <div className="zoom-img-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', background: '#fff' }}>
           <div style={{ position: 'relative', width: '100%', height: '100%' }}>
             {imgLoaded && (
              <img
                 src={realImagePath}
                 alt={dailyPokemon.name}
                 draggable={false}
                 onDragStart={e => e.preventDefault()}
                 onContextMenu={e => e.preventDefault()}
                 style={{ ...imgStyle, position: 'absolute', inset: 0 }}
                 onLoad={e => {
                   setImgLoaded(true);
                   try {
                     setImgNatural({ w: e.target.naturalWidth, h: e.target.naturalHeight });
                   } catch (err) {}
                 }}
                 onError={e => { setImgLoaded(false); }}
               />
             )}

             {debugOverlay && zoomPoints && Array.isArray(zoomPoints) && imgNatural.w && imgNatural.h && (
               (() => {
                 const overlayStyle = {
                   position: 'absolute', inset: 0, pointerEvents: 'none',
                   // Apply the same transform as the image so the overlay marker aligns visually
                   transform: imgStyle.transform,
                   transformOrigin: imgStyle.transformOrigin,
                 };
                 
                 // Render all zoom points
                 return (
                   <div style={overlayStyle}>
                     {zoomPoints.map((point, idx) => {
                       if (!point || point.length < 2) return null;
                       const ptX = Number(point[0]);
                       const ptY = Number(point[1]);
                       // Normalize to 0..1 space (no manual mirroring - the overlay transform handles it)
                       const normX = ptX / imgNatural.w;
                       const normY = ptY / imgNatural.h;
                       const px = Math.max(0, Math.min(100, normX * 100));
                       const py = Math.max(0, Math.min(100, normY * 100));
                       
                       // Check if this is the chosen point
                       const isChosen = chosenZoomPoint && ptX === chosenZoomPoint.x && ptY === chosenZoomPoint.y;
                       const markerSize = isChosen ? 18 : 10;
                       const marker = {
                         position: 'absolute', left: `${px}%`, top: `${py}%`, transform: 'translate(-50%, -50%)',
                         width: markerSize, height: markerSize, borderRadius: markerSize / 2,
                         background: isChosen ? 'rgba(255,0,0,0.95)' : 'rgba(255,165,0,0.7)',
                         border: isChosen ? '3px solid white' : '2px solid white',
                         boxShadow: isChosen ? '0 2px 8px rgba(0,0,0,0.4)' : '0 1px 4px rgba(0,0,0,0.3)',
                         zIndex: isChosen ? 10 : 5
                       };
                       return <div key={idx} style={marker} />;
                     })}
                   </div>
                 );
               })()
             )}
           </div>
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
            useShinySprites={useShinySprites}
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
