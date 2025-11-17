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

export default function SilhouettePage({ guesses, setGuesses, dailySeed }) {
  const inputRef = useRef(null);
  const pokemonData = usePokemonData();
  
  // Deterministic daily pokemon selection for this page, but allow reset for debugging
  const today = new Date();
  const defaultSeed = dailySeed || (getSeedFromUTCDate(today) + 7 * 1000 + 's'.charCodeAt(0)); // UTC-based
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
  const [silhouetteMeta, setSilhouetteMeta] = useState(null);
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

  // Load precomputed silhouette metadata (cx, cy, bw, bh)
  useEffect(() => {
    fetch('data/silhouette_meta.json')
      .then(r => r.json())
      .then(setSilhouetteMeta)
      .catch(() => {});
  }, []);

  // --- Mirroring Logic ---
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

  if (!pokemonData) return <div>Loading Pokémon silhouettes...</div>;

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

  // Silhouette and real image paths (external repo for both)
  const silhouettePath = `https://raw.githubusercontent.com/Pythagean/pokedle_assets/main/silhouettes/${dailyPokemon.id}.png`;
  const realImagePath = `https://raw.githubusercontent.com/Pythagean/pokedle_assets/main/images/${dailyPokemon.id}.png`;

  // Zoom logic: start at 2.8, go to 0.9 over 10 steps (guesses), quadratic ease-out
  const maxZoom = 2.8;
  const minZoom = 0.9;
  const maxSteps = 10;
  // Quadratic ease-in: t = guesses.length / (maxSteps - 1), zoom = maxZoom - (maxZoom - minZoom) * (1 - (1-t)^2)
  let t = Math.min(guesses.length, maxSteps - 1) / (maxSteps - 1);
  let zoom = maxZoom - (maxZoom - minZoom) * (1 - Math.pow(1 - t, 2));
  

  // Pan logic: at max zoom, center on edge; at min zoom, center (0.5,0.5)
  // (x, y) in 0..1, where (0,0)=top-left, (1,1)=bottom-right
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
  // Determine focal point: prefer precomputed silhouette center, fallback to edge-based target
  const idKey = dailyPokemon ? String(dailyPokemon.id) : null;
  const zeroPadKey = dailyPokemon ? String(dailyPokemon.id).padStart(3, '0') : null;
  let focalMeta = null;
  if (silhouetteMeta && idKey) {
    if (silhouetteMeta[idKey]) focalMeta = silhouetteMeta[idKey];
    else if (zeroPadKey && silhouetteMeta[zeroPadKey]) focalMeta = silhouetteMeta[zeroPadKey];
  }
  // Compute a target that focuses on the silhouette's edge (not its center)
  // so zooming reveals an edge instead of a solid blob. If we have precomputed
  // bbox metadata (cx,cy,bw,bh) pick a point slightly inside the bbox edge
  // in the direction of `edge` (top/right/bottom/left). Otherwise fall back
  // to the generic edge targets.
  let targetX, targetY;
  if (focalMeta) {
    // 1) If we have sampled edge points, pick one deterministically at random
    if (Array.isArray(focalMeta.edge_points) && focalMeta.edge_points.length > 0) {
      const pts = focalMeta.edge_points;
      const pickRng = mulberry32(seed + 22222);
      const idx = Math.floor(pickRng() * pts.length);
      const pick = pts[Math.max(0, Math.min(pts.length - 1, idx))];
      if (pick && typeof pick.x === 'number' && typeof pick.y === 'number') {
        targetX = pick.x;
        targetY = pick.y;
      }
    }

    // 2) If not chosen above, prefer per-edge medians (edge_top/right/bottom/left)
    if (typeof targetX !== 'number' || typeof targetY !== 'number') {
      const edgeMap = { 0: 'edge_top', 1: 'edge_right', 2: 'edge_bottom', 3: 'edge_left' };
      const edgeKey = edgeMap[edge];
      const edgePoint = edgeKey && focalMeta[edgeKey] ? focalMeta[edgeKey] : null;
      if (edgePoint && typeof edgePoint.x === 'number' && typeof edgePoint.y === 'number') {
        targetX = edgePoint.x;
        targetY = edgePoint.y;
      }
    }

    // 3) If still no point, pick the edge_points member closest to the chosen edge
    if (typeof targetX !== 'number' || typeof targetY !== 'number') {
      if (Array.isArray(focalMeta.edge_points) && focalMeta.edge_points.length > 0) {
        const pts = focalMeta.edge_points;
        const ideal = edge === 0 ? { x: 0.5, y: 0.0 } : edge === 1 ? { x: 1.0, y: 0.5 } : edge === 2 ? { x: 0.5, y: 1.0 } : { x: 0.0, y: 0.5 };
        let best = pts[0];
        let bestDist = (best.x - ideal.x) ** 2 + (best.y - ideal.y) ** 2;
        for (let i = 1; i < pts.length; i++) {
          const p = pts[i];
          const d = (p.x - ideal.x) ** 2 + (p.y - ideal.y) ** 2;
          if (d < bestDist) { bestDist = d; best = p; }
        }
        targetX = best.x;
        targetY = best.y;
      }
    }

    // 4) Final fallback: inward-edge point computed from bbox
    if (typeof targetX !== 'number' || typeof targetY !== 'number') {
      const cx = typeof focalMeta.cx === 'number' ? focalMeta.cx : 0.5;
      const cy = typeof focalMeta.cy === 'number' ? focalMeta.cy : 0.5;
      const bw = typeof focalMeta.bw === 'number' ? focalMeta.bw : 1.0;
      const bh = typeof focalMeta.bh === 'number' ? focalMeta.bh : 1.0;
      const minX = Math.max(0, cx - bw / 2);
      const maxX = Math.min(1, cx + bw / 2);
      const minY = Math.max(0, cy - bh / 2);
      const maxY = Math.min(1, cy + bh / 2);
      const EDGE_PAD = 0.06; // fraction inward from bbox edge
      if (edge === 0) { // top
        targetY = Math.max(0, minY + EDGE_PAD);
        targetX = cx;
      } else if (edge === 1) { // right
        targetX = Math.min(1, maxX - EDGE_PAD);
        targetY = cy;
      } else if (edge === 2) { // bottom
        targetY = Math.min(1, maxY - EDGE_PAD);
        targetX = cx;
      } else if (edge === 3) { // left
        targetX = Math.max(0, minX + EDGE_PAD);
        targetY = cy;
      } else {
        targetX = cx;
        targetY = cy;
      }
      // clamp just in case
      targetX = Math.max(0, Math.min(1, targetX));
      targetY = Math.max(0, Math.min(1, targetY));
    }
  } else {
    targetX = edgeX;
    targetY = edgeY;
  }

  // Do not flip targetX here — mirroring is handled at render time via
  // `transform-origin` and the debug overlay's `display` helper which both
  // account for `shouldMirror`. Keeping `targetX` as logical image coords
  // avoids double-flipping in the overlay.

  // centerX/centerY interpolate between the 'zoomed-in' target (targetX/targetY)
  // and the neutral center (0.5, 0.5) as zoom decreases
  const centerX = targetX * (1 - interp) + 0.5 * interp;
  const centerY = targetY * (1 - interp) + 0.5 * interp;
  // Translate so that (centerX, centerY) is at the center of the view
  // For scale s, translation in percent: (0.5 - center) * 100 * s
  const translateX = (0.5 - centerX) * 100 * zoom;
  const translateY = (0.5 - centerY) * 100 * zoom;

  if (isCorrect) {
    zoom = 0.9;
    
  }
  // Combine mirroring and zoom — use transform-origin only (no translate)
  // Using translate after scale causes double-scaling and mispositioning; relying on
  // transform-origin to focus the zoom is simpler and more reliable.
  let scaleX = shouldMirror ? -1 : 1;
  imgStyle.transition = 'transform 0.12s cubic-bezier(.4,2,.6,1)';
  // transform-origin should track the interpolated center. If mirrored, flip the X origin.
  const originX = shouldMirror ? (1 - centerX) : centerX;
  const originY = typeof centerY === 'number' ? centerY : 0.5; // fallback safety
  imgStyle.transformOrigin = `${originX * 100}% ${originY * 100}%`;
  imgStyle.transform = `scale(${scaleX * zoom}, ${zoom})`;

  if (zoom === 0.9) {
    imgStyle.width = '100%';
    imgStyle.height = '100%';
    imgStyle.objectFit = 'contain';
  }

  return (
    <div style={{ textAlign: 'center', marginTop: 10 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
        <h2 style={{ margin: 0 }}>Silhouette Mode</h2>
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
            aria-label="What is Silhouette Mode?"
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
            Guess the Pokémon from its silhouette!<br /><br />
            Each incorrect guess zooms out to reveal more of the silhouette.<br /><br />
            <b>Note:</b> The silhouette may be <b>mirrored</b> (flipped horizontally) for extra challenge.
          </div>
        </div>
        <button
          style={{ padding: '4px 12px', borderRadius: 6, background: resetCount >= 20 ? '#ccc' : '#eee', border: '1px solid #bbb', fontWeight: 600, fontSize: 14, cursor: resetCount >= 2 ? 'not-allowed' : 'pointer', opacity: resetCount >= 2 ? 0.5 : 1 }}
          onClick={() => {
            if (resetCount >= 20) return;
            setGuesses([]);
            // Use Date.now() + Math.random() for a more unique seed
            setResetSeed(Date.now() + Math.floor(Math.random() * 1000000000));
            setResetCount(resetCount + 1);
          }}
          disabled={resetCount >= 20}
        >
          Reset
        </button>
        <button
          style={{ padding: '4px 8px', borderRadius: 6, background: debugOverlay ? '#ffe0b2' : '#f0f0f0', border: '1px solid #bbb', fontWeight: 600, fontSize: 13, cursor: 'pointer', marginLeft: 6 }}
          onClick={() => setDebugOverlay(d => !d)}
          aria-pressed={debugOverlay}
          aria-label="Toggle silhouette debug overlay"
        >
          {debugOverlay ? 'Debug: ON' : 'Debug'}
        </button>
      </div>
      <div style={{ margin: '24px auto', maxWidth: 500, fontSize: 18, background: '#f5f5f5', borderRadius: 8, padding: 18, border: '1px solid #ddd', whiteSpace: 'pre-line' }}>
        <div style={{ fontWeight: 600, marginBottom: 8 }}>Which Pokémon is this?</div>
         <div className="silhouette-viewport" style={{ margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', background: '#fff' }}>
           <div style={{ position: 'relative', width: '100%', height: '100%' }}>
             {imgLoaded && (
               isCorrect ? (
                 <img
                   src={realImagePath}
                   alt={dailyPokemon.name}
                   className="silhouette-img"
                   style={{ ...imgStyle, filter: 'none', transform: 'scale(0.9,0.9)' }}
                   onLoad={() => setImgLoaded(true)}
                   onError={e => { setImgLoaded(false); }}
                 />
               ) : (
                 <img
                   src={silhouettePath}
                   alt="Silhouette"
                   className="silhouette-img"
                   style={imgStyle}
                   onLoad={() => setImgLoaded(true)}
                   onError={e => { setImgLoaded(false); }}
                 />
               )
             )}

             {debugOverlay && (
               <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
                 {/* draw bbox, per-edge points and chosen focal point if metadata exists */}
                 {focalMeta && (() => {
                   const cx = typeof focalMeta.cx === 'number' ? focalMeta.cx : 0.5;
                   const cy = typeof focalMeta.cy === 'number' ? focalMeta.cy : 0.5;
                   const bw = typeof focalMeta.bw === 'number' ? focalMeta.bw : 1.0;
                   const bh = typeof focalMeta.bh === 'number' ? focalMeta.bh : 1.0;
                   const minX = Math.max(0, cx - bw / 2);
                   const maxX = Math.min(1, cx + bw / 2);
                   const minY = Math.max(0, cy - bh / 2);
                   const maxY = Math.min(1, cy + bh / 2);
                   const et = focalMeta.edge_top || null;
                   const er = focalMeta.edge_right || null;
                   const eb = focalMeta.edge_bottom || null;
                   const el = focalMeta.edge_left || null;
                   const eps = Array.isArray(focalMeta.edge_points) ? focalMeta.edge_points : null;

                   // If mirrored, display positions should be flipped horizontally
                   const display = (x, y) => {
                     const dx = shouldMirror ? (1 - x) : x;
                     const dy = y; // vertical unchanged
                     return { x: dx, y: dy };
                   };

                   const bboxLeft = shouldMirror ? (1 - maxX) : minX;
                   const bboxTop = minY;
                   const bboxWidth = maxX - minX;
                   const bboxHeight = maxY - minY;

                   const dc = display(cx, cy);
                   const det = et ? display(et.x, et.y) : null;
                   const der = er ? display(er.x, er.y) : null;
                   const deb = eb ? display(eb.x, eb.y) : null;
                   const del = el ? display(el.x, el.y) : null;
                   const dt = display(targetX, targetY);

                   return (
                     <>
                       <div style={{ position: 'absolute', left: `${bboxLeft * 100}%`, top: `${bboxTop * 100}%`, width: `${bboxWidth * 100}%`, height: `${bboxHeight * 100}%`, border: '2px solid rgba(255,0,0,0.95)', background: 'rgba(255,0,0,0.04)' }} />
                       <div style={{ position: 'absolute', left: `${dc.x * 100}%`, top: `${dc.y * 100}%`, transform: 'translate(-50%,-50%)', width: 12, height: 12, borderRadius: 6, background: 'yellow', border: '2px solid #333' }} title="bbox center" />
                       {et && <div style={{ position: 'absolute', left: `${det.x * 100}%`, top: `${det.y * 100}%`, transform: 'translate(-50%,-50%)', width: 10, height: 10, borderRadius: 5, background: 'magenta', border: '2px solid #333' }} title="edge top" />}
                       {er && <div style={{ position: 'absolute', left: `${der.x * 100}%`, top: `${der.y * 100}%`, transform: 'translate(-50%,-50%)', width: 10, height: 10, borderRadius: 5, background: 'orange', border: '2px solid #333' }} title="edge right" />}
                       {deb && <div style={{ position: 'absolute', left: `${deb.x * 100}%`, top: `${deb.y * 100}%`, transform: 'translate(-50%,-50%)', width: 10, height: 10, borderRadius: 5, background: 'lime', border: '2px solid #333' }} title="edge bottom" />}
                       {del && <div style={{ position: 'absolute', left: `${del.x * 100}%`, top: `${del.y * 100}%`, transform: 'translate(-50%,-50%)', width: 10, height: 10, borderRadius: 5, background: 'cyan', border: '2px solid #333' }} title="edge left" />}
                       {eps && eps.map((p, i) => {
                         const dp = display(p.x, p.y);
                         return <div key={i} style={{ position: 'absolute', left: `${dp.x * 100}%`, top: `${dp.y * 100}%`, transform: 'translate(-50%,-50%)', width: 6, height: 6, borderRadius: 3, background: 'rgba(128,0,128,0.9)', border: '1px solid #222' }} title={`edge point ${i}`} />;
                       })}
                       <div style={{ position: 'absolute', left: `${dt.x * 100}%`, top: `${dt.y * 100}%`, transform: 'translate(-50%,-50%)', width: 14, height: 14, borderRadius: 7, background: '#00bcd4', border: '2px solid #003' }} title="chosen target" />
                       <div style={{ position: 'absolute', left: `${dt.x * 100 + 2}%`, top: `${dt.y * 100 + 2}%`, color: '#000', background: '#fff', fontSize: 11, padding: '2px 4px', borderRadius: 4 }}>{`t:${dt.x.toFixed(2)},${dt.y.toFixed(2)}`}</div>
                     </>
                   );
                 })()}
               </div>
             )}
           </div>
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

/* Component-specific responsive CSS for silhouette viewport */
const _silhouetteStyles = `
.silhouette-viewport {
  margin: 0 auto;
  width: min(90vw, 360px);
  aspect-ratio: 1 / 1;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  background: #fff;
  max-width: 100%;
}
.silhouette-img { display: block; width: 100%; height: 100%; object-fit: contain; }

@media (min-width: 521px) {
  .silhouette-viewport { width: 360px; }
}

@media (max-width: 520px) {
  .silhouette-viewport { width: min(90vw, 320px); }
}

@media (max-width: 360px) {
  .silhouette-viewport { width: 92vw; }
}
`;

// Inject styles into the document (only once)
if (typeof document !== 'undefined' && !document.getElementById('pokedle-silhouette-styles')) {
  const s = document.createElement('style');
  s.id = 'pokedle-silhouette-styles';
  s.innerHTML = _silhouetteStyles;
  document.head.appendChild(s);
}
