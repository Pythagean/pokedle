import React, { useState, useMemo, useRef, useEffect, useLayoutEffect } from 'react';
import GuessInput from '../components/GuessInput';
import CongratsMessage from '../components/CongratsMessage';
import ResetCountdown from '../components/ResetCountdown';
import { RESET_HOUR_UTC } from '../config/resetConfig';
import InfoButton from '../components/InfoButton';
import Confetti from '../components/Confetti';

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
  let d = date;
  if (date.getUTCHours() >= RESET_HOUR_UTC) {
    d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() + 1, 0, 0, 0));
  }
  const year = d.getUTCFullYear();
  const month = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return parseInt(`${year}${month}${day}`, 10);
}

function ClassicPage({ pokemonData, guesses, setGuesses, daily, useShinySprites = false }) {
  const MAX_PLACEHOLDER_ROWS = 1;
  const [guess, setGuess] = useState('');
  const [highlightedIdx, setHighlightedIdx] = useState(-1);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const inputRef = useRef(null);
  const dropdownRef = useRef(null);
  const lastGuessRef = useRef(null);
  const [showConfetti, setShowConfetti] = useState(false);
  const [confettiPending, setConfettiPending] = useState(false);
  const prevCorrectRef = useRef(false);

  // Get today's date as seed, use page key for deterministic daily selection
  const today = new Date();
  const seed = getSeedFromUTCDate(today) + 7 * 1000 + 'classic'.charCodeAt(0); // UTC-based
  const rng = useMemo(() => mulberry32(seed), [seed]);
  const dailyIndex = useMemo(() => pokemonData ? Math.floor(rng() * pokemonData.length) : 0, [rng, pokemonData]);
  const computedDaily = pokemonData ? pokemonData[dailyIndex] : null;
  const dailyPokemon = daily || computedDaily;
  const rowsToRender = Math.max(1, guesses.length);
  // Using 7 visible boxes (Main/Secondary colour columns temporarily hidden)
  const BOX_COUNT = 7;
  const BOX_DELAY_STEP = 0.3; // seconds between boxes (updated to match per-box delays)
  const BOX_ANIM_DURATION_MS = 420; // matches CSS animation duration
  // Placeholder fade timing (make this faster by reducing delay and duration)
  const PLACEHOLDER_BOX_DELAY = 0.12; // seconds between placeholder boxes
  const PLACEHOLDER_ANIM_DURATION_MS = 200; // ms for placeholder fade animation
  const [revealRow, setRevealRow] = useState(null);
  const prevGuessesLenRef = useRef(guesses.length);
  const revealRowRef = useRef(null);
  // Store DOM rects snapshots in a queue so fast successive captures aren't lost
  const prevRowRectsQueueRef = useRef([]);
  // Placeholder-first-guess handling
  const [isFadingPlaceholder, setIsFadingPlaceholder] = useState(false);
  const pendingFirstGuessRef = useRef(null);
  const placeholderRowRef = useRef(null);
  // Mobile detection for responsive headings (matches CSS breakpoint)
  const [isMobile, setIsMobile] = useState(() => (typeof window !== 'undefined' && window.matchMedia) ? window.matchMedia('(max-width:700px)').matches : false);
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mq = window.matchMedia('(max-width:700px)');
    const onChange = (e) => setIsMobile(e.matches);
    try {
      // modern browsers
      mq.addEventListener ? mq.addEventListener('change', onChange) : mq.addListener(onChange);
    } catch (e) {
      mq.addListener(onChange);
    }
    return () => {
      try {
        mq.removeEventListener ? mq.removeEventListener('change', onChange) : mq.removeListener(onChange);
      } catch (e) {
        mq.removeListener(onChange);
      }
    };
  }, []);

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
      .slice(0, 50)
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
    arrowImg.onload = () => { };
    arrowImg.onerror = () => { };
    return () => {
      arrowImg.onload = null;
      arrowImg.onerror = null;
    };
  }, []);

  // Preload hint images used in the InfoButton so they show instantly when opened
  useEffect(() => {
    try {
      const imgs = [];
      const urls = ['images/classic_hint_1.png', 'images/classic_hint_2.png', 'images/classic_hint_3.png'];
      urls.forEach(u => {
        const i = new Image();
        i.src = u;
        i.onload = () => { /* cached */ };
        i.onerror = () => { /* ignore */ };
        imgs.push(i);
      });
      return () => { imgs.length = 0; };
    } catch (e) {
      // ignore
    }
  }, []);

  // Check if the daily Pokemon has been guessed
  const solved = dailyPokemon && guesses.some(g => g.name === dailyPokemon.name);
  

  // Delay showing the CongratsMessage until after the revealRow animation completes
  // (declare this first so other effects can reference it without TDZ issues)
  const [congratsVisible, setCongratsVisible] = useState(false);
  useEffect(() => {
    if (solved) {
      // If no reveal is in progress, show immediately; otherwise wait until revealRow clears
      if (revealRow === null) setCongratsVisible(true);
      else setCongratsVisible(false);
    } else {
      setCongratsVisible(false);
    }
  }, [solved, revealRow]);

  // When the puzzle is solved, mark confetti as pending unless it was
  // already shown for this seed. We only actually start the confetti when
  // the congrats message becomes visible so the animation runs for the
  // full duration (avoids cutting it off when reveal animations delay it).
  useEffect(() => {
    const key = `pokedle_confetti_classic_${seed}`;
    let alreadyShown = false;
    try { alreadyShown = !!localStorage.getItem(key); } catch (e) { alreadyShown = false; }
    if (solved && !prevCorrectRef.current && !alreadyShown) {
      setConfettiPending(true);
    } else if (!solved) {
      setConfettiPending(false);
    }
    prevCorrectRef.current = solved;
  }, [solved, seed]);

  // Start the confetti when the congrats UI is visible and we have a pending
  // request. Persist the "shown" flag to localStorage and clear the pending
  // state. Keep the confetti visible for the same duration as before.
  useEffect(() => {
    if (!congratsVisible || !confettiPending) return;
    const key = `pokedle_confetti_classic_${seed}`;
    setShowConfetti(true);
    try { localStorage.setItem(key, '1'); } catch (e) {}
    const t = setTimeout(() => setShowConfetti(false), 2500);
    setConfettiPending(false);
    prevCorrectRef.current = true;
    return () => clearTimeout(t);
  }, [congratsVisible, confettiPending, seed]);

  if (!pokemonData) return <div>Loading Pokémon...</div>;

  // Comparison logic for feedback
  function getComparison(guessPoke, answerPoke) {
    if (!guessPoke || !answerPoke) return {};
    function partialMatch(arr1, arr2) {
      if (!Array.isArray(arr1) || !Array.isArray(arr2)) return false;
      return arr1.some(item => arr2.includes(item));
    }
    const getEvoStage = poke => poke.evolution_stage || 1;
    const guessEvo = getEvoStage(guessPoke);
    const answerEvo = getEvoStage(answerPoke);
    return {
      name: guessPoke.name === answerPoke.name ? 'match' : 'miss',
      generation: guessPoke.generation === answerPoke.generation ? 'match' : 'miss',
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
    // Capture current row positions before DOM updates for FLIP
    try {
      const rows = Array.from(document.querySelectorAll('.feedback-grid')) || [];
      const snapshot = rows.map(r => ({ key: r.dataset ? r.dataset.poke || null : null, rect: r.getBoundingClientRect() }));
      prevRowRectsQueueRef.current.push(snapshot);
    } catch (err) {
      // failed to capture prev rows — ignore
    }
    // If this is the first guess, fade the placeholder row first, then insert the guess
    if (guesses.length === 0) {
      pendingFirstGuessRef.current = guessedPokemon;
      setIsFadingPlaceholder(true);
      // clear input and focus
      setGuess('');
      setHighlightedIdx(-1);
      if (inputRef.current) inputRef.current.focus();
      return;
    }

    setGuesses([guessedPokemon, ...guesses]);
    setGuess('');
    setHighlightedIdx(-1);
    if (inputRef.current) inputRef.current.focus();
  }

  // When placeholder fade completes, insert the pending first guess and trigger reveal
  useEffect(() => {
    if (!isFadingPlaceholder) return;
    // If user prefers reduced motion, skip fade and insert immediately
    if (typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      if (pendingFirstGuessRef.current) {
        setGuesses([pendingFirstGuessRef.current, ...guesses]);
        setRevealRow(0);
        pendingFirstGuessRef.current = null;
      }
      setIsFadingPlaceholder(false);
      return;
    }

    const el = placeholderRowRef.current;
    let timeoutId;
    if (el) {
      const totalBoxes = 7;
      let ended = 0;
      const onChildEnd = (ev) => {
        // only count animationend from the placeholder boxes
        const target = ev.target;
        if (!target || !target.classList) return;
        if (!target.classList.contains('placeholder')) return;
        ended += 1;
        if (ended >= totalBoxes) {
          el.removeEventListener('animationend', onChildEnd);
          if (pendingFirstGuessRef.current) {
            setGuesses([pendingFirstGuessRef.current, ...guesses]);
            setRevealRow(0);
            pendingFirstGuessRef.current = null;
          }
          setIsFadingPlaceholder(false);
          if (timeoutId) clearTimeout(timeoutId);
        }
      };
      el.addEventListener('animationend', onChildEnd);
      // safety timeout in case some events are missed : max delay + duration + buffer
      const maxDelayMs = Math.ceil((PLACEHOLDER_BOX_DELAY * (totalBoxes - 1) * 1000) + PLACEHOLDER_ANIM_DURATION_MS + 100);
      timeoutId = setTimeout(() => {
        el.removeEventListener('animationend', onChildEnd);
        if (pendingFirstGuessRef.current) {
          setGuesses([pendingFirstGuessRef.current, ...guesses]);
          setRevealRow(0);
          pendingFirstGuessRef.current = null;
        }
        setIsFadingPlaceholder(false);
      }, maxDelayMs);
    } else {
      // fallback: insert after small delay based on new placeholder duration
      timeoutId = setTimeout(() => {
        if (pendingFirstGuessRef.current) {
          setGuesses([pendingFirstGuessRef.current, ...guesses]);
          setRevealRow(0);
          pendingFirstGuessRef.current = null;
        }
        setIsFadingPlaceholder(false);
      }, PLACEHOLDER_ANIM_DURATION_MS + 200);
    }

    return () => clearTimeout(timeoutId);
  }, [isFadingPlaceholder]);

  // After DOM update, run FLIP to animate previous rows moving down into place
  useLayoutEffect(() => {
    // Consume the oldest queued snapshot (if any)
    const prevRects = (prevRowRectsQueueRef.current && prevRowRectsQueueRef.current.length) ? prevRowRectsQueueRef.current.shift() : null;
    if (!prevRects) return;
    // If number of previous rects is zero, nothing to animate
    if (!prevRects.length) return;
    // Respect reduced-motion preference
    if (typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    // New rows after render
    const newRows = Array.from(document.querySelectorAll('.feedback-grid')) || [];
    // Map previous rows to their matching new element by data-poke key
    const animated = [];
    for (let j = 0; j < prevRects.length; j++) {
      const prev = prevRects[j];
      const prevKey = prev.key;
      // If prev row had no key (placeholder), skip
      if (!prevKey) continue;
      const newElem = newRows.find(el => el.dataset && el.dataset.poke === prevKey);
      if (!newElem) continue;
      const prevRect = prev.rect;
      const newRect = newElem.getBoundingClientRect();
      const deltaY = prevRect.top - newRect.top;
      if (Math.abs(deltaY) < 0.5) continue;
      // Apply inverse transform so element appears at old position
      // Also temporarily disable any CSS animations on the element so FLIP transition is not overridden
      newElem.style.animation = 'none';
      newElem.style.transition = 'none';
      newElem.style.willChange = 'transform';
      newElem.style.transform = `translateY(${deltaY}px)`;
      // Use double RAF to ensure the browser registers the starting transform
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          // Now animate to natural position
            newElem.style.transition = 'transform 360ms cubic-bezier(.2,.9,.3,1)';
            newElem.style.transform = '';
        });
      });
      // Cleanup on transition end
      const onEnd = (ev) => {
        if (ev.propertyName !== 'transform') return;
        newElem.removeEventListener('transitionend', onEnd);
        newElem.style.transition = '';
        newElem.style.transform = '';
        newElem.style.willChange = '';
        // restore any CSS animation
        newElem.style.animation = '';
      };
      newElem.addEventListener('transitionend', onEnd);
      animated.push(newElem);
    }

    if (animated.length === 0) return;

    // Cleanup after animations
    const cleanup = () => {
      animated.forEach(el => {
        el.style.transition = '';
        el.style.transform = '';
      });
    };

    const timers = animated.map(el => {
      const t = setTimeout(() => {
        // remove inline styles
        el.style.transition = '';
        el.style.transform = '';
      }, 420);
      return t;
    });

    return () => {
      timers.forEach(t => clearTimeout(t));
      cleanup();
    };
  }, [guesses.length]);

  return (
    <div style={{ textAlign: 'center', marginTop: 10 }}>
      <div style={{ width: '100%', justifyContent: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, marginBottom: 8 }}>
          <h2 style={{ margin: 0 }}>Classic Mode</h2>
          <InfoButton
            ariaLabel="How to Play"
            marginTop={310}
            placement="right"
            content={
              <div style={{ textAlign: 'left' }}>
                <div style={{ marginBottom: 8 }}>Guess the Pokémon for the current daily puzzle.</div>
                <div style={{ marginBottom: 8 }}>Each guess shows feedback across columns (Generation, Types, Evolution Stage, Habitat, Height, Weight).</div>
                <div style={{ fontWeight: 700, marginTop: 6, marginBottom: 6 }}>Example hints</div>
                <div style={{ width: '100%', textAlign: 'center' }}>
                  <div style={{ fontSize: 13, color: '#333', marginTop: 6 }}>A partial type match (Poison/Flying) - today’s Pokémon is includes either Poison or Flying:</div>
                  <img src="images/classic_hint_1.png" alt="Hint 1" style={{ maxWidth: '100%', height: 'auto', borderRadius: 6, border: '1px solid #ddd' }} />
                </div>
                <div style={{ width: '100%', textAlign: 'center' }}>
                  <div style={{ fontSize: 13, color: '#333', marginTop: 6 }}>Generation and Evolution Stage match - this shows the correct generation and that the Pokémon is at that evolution stage:</div>
                  <img src="images/classic_hint_2.png" alt="Hint 2" style={{ maxWidth: '100%', height: 'auto', borderRadius: 6, border: '1px solid #ddd' }} />
                </div>
                <div style={{ width: '100%', textAlign: 'center' }}>
                  <div style={{ fontSize: 13, color: '#333', marginTop: 6 }}>Height/Weight Arrows - Height and Weight arrows will scale based on how close the guessed pokemon's Height/Weight is:</div>
                  <img src="images/classic_hint_3.png" alt="Hint 2" style={{ maxWidth: '100%', height: 'auto', borderRadius: 6, border: '1px solid #ddd' }} />
                </div>
              </div>
            }
          />
        </div>
      </div>
      <div className="classic-main-container" style={{ margin: '24px auto', maxWidth: 800, width: '100%', fontSize: 18, background: '#f5f5f5', borderRadius: 8, padding: 18, border: '1px solid #ddd', whiteSpace: 'pre-line', boxSizing: 'border-box' }}>
        <Confetti active={showConfetti && congratsVisible} centerRef={solved ? lastGuessRef : null} />
        {congratsVisible ? (
          <>
            <CongratsMessage guessCount={guesses.length} mode="Classic" classic={true} guesses={guesses} answer={dailyPokemon} />
            <ResetCountdown active={true} resetHourUtc={RESET_HOUR_UTC} />
          </>
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
              useShinySprites={useShinySprites}
            />
          </form>
        )}
      </div>
      <div className="classic-grid-fit" style={{ width: '100%' }}>
        <div className="classic-grid-header" style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', fontWeight: 600, gap: 1, marginBottom: 8, alignItems: 'center', width: '100%' }}>
          <div style={{ textAlign: 'center', fontSize: '1em' }}>Pokémon</div>
          <div style={{ textAlign: 'center', fontSize: '1em' }}>{isMobile ? 'Gen' : 'Generation'}</div>
          <div style={{ textAlign: 'center', fontSize: '1em' }}>Types</div>
          {/* Main Colour column temporarily hidden */}
          {/* <div style={{ textAlign: 'center', fontSize: '1em' }}>Main Colour</div> */}
          {/* Secondary Colours column temporarily hidden */}
          {/* <div style={{ textAlign: 'center', fontSize: '1em' }}>Secondary Colours</div> */}
          <div style={{ textAlign: 'center', fontSize: '1em' }}>{isMobile ? 'Evo Stage' : 'Evolution Stage'}</div>
          <div style={{ textAlign: 'center', fontSize: '1em' }}>Habitat</div>
          <div style={{ textAlign: 'center', fontSize: '1em' }}>Height</div>
          <div style={{ textAlign: 'center', fontSize: '1em' }}>Weight</div>
        </div>
        <div className="classic-feedback-scroll" style={{ width: '100%', overflowX: 'auto', overflowY: 'visible', paddingTop: 10, overflow: 'hidden' }}>
          <div>
            {Array.from({ length: rowsToRender }).map((_, rowIdx) => {
              if (rowIdx < guesses.length) {
                const poke = guesses[rowIdx];
                const cmp = getComparison(poke, dailyPokemon);
                const heightStatus = cmp.height === 'match' ? 'match' : 'miss';
                const weightStatus = cmp.weight === 'match' ? 'match' : 'miss';
                // Scale the arrows proportional to how far the guess is from the answer.
                // Larger difference => bigger arrow. Clamp to a sensible range.
                function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
                let heightScale = 1;
                let weightScale = 1;
                try {
                  if (dailyPokemon && typeof poke.height === 'number' && typeof dailyPokemon.height === 'number') {
                    const hDiff = Math.abs((poke.height || 0) - (dailyPokemon.height || 0));
                    const norm = Math.max(1, dailyPokemon.height || 1);
                    heightScale = clamp((1 + (hDiff / norm)) * 0.3, 0.65, 1.1);
                  }
                  if (dailyPokemon && typeof poke.weight === 'number' && typeof dailyPokemon.weight === 'number') {
                    const wDiff = Math.abs((poke.weight || 0) - (dailyPokemon.weight || 0));
                    const normW = Math.max(1, dailyPokemon.weight || 1);
                    weightScale = clamp((1 + (wDiff / normW)) * 0.4, 0.65, 1.1);
                  }
                } catch (e) {
                  // fallback to defaults
                  heightScale = 1;
                  weightScale = 1;
                }
                const secondaryStatus = cmp.secondary_colours === 'match' ? 'match' : (cmp.secondary_colours === 'partial' ? 'partial' : 'miss');
                const generationStatus = cmp.generation === 'match' ? 'match' : 'miss';
                const evolutionStatus = cmp.evolution === 'match' ? 'match' : 'miss';
                // Keep height/weight text centered; no positional adjustments.
                return (
                  <div key={poke.name + rowIdx} ref={el => { if (rowIdx === revealRow) revealRowRef.current = el; if (rowIdx === 0) lastGuessRef.current = el; }} data-poke={poke.name} className={`feedback-grid ${revealRow === rowIdx ? 'reveal-row' : ''}`} style={{ gridTemplateColumns: 'repeat(7, 1fr)', width: '100%' }}>
                    <div className="feedback-box feedback-pokemon-box" style={revealRow === rowIdx ? { animationDelay: `${0 * BOX_DELAY_STEP}s` } : undefined}>
                      <div className="feedback-pokemon-img">
                        <img
                          src={`https://raw.githubusercontent.com/Pythagean/pokedle_assets/main/sprites_trimmed/${poke.id}-front.png`}
                          alt={poke.name}
                          onError={e => { e.target.style.display = 'none'; }}
                        />
                      </div>
                      <div
                        className="feedback-box-content"
                        aria-hidden={false}
                        style={{
                          position: 'absolute',
                          top: 'auto',
                          bottom: 6,
                          left: '50%',
                          transform: 'translateX(-50%)',
                          zIndex: 3,
                          fontSize: 12,
                          fontWeight: 700,
                          background: 'rgba(255,255,255,0.85)',
                          padding: '2px 6px',
                          borderRadius: 6,
                          maxWidth: '86%',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        {poke.name}
                      </div>
                    </div>
                    <div className={`feedback-box ${generationStatus} feedback-box-large-text`} style={revealRow === rowIdx ? { animationDelay: `${1 * BOX_DELAY_STEP}s` } : undefined}>
                      <div className="feedback-box-content">{poke.generation}</div>
                    </div>
                    <div className={`feedback-box ${cmp.types}`} style={revealRow === rowIdx ? { animationDelay: `${2 * BOX_DELAY_STEP}s` } : undefined}>
                      <div className="feedback-box-content">{poke.types.join(', ')}</div>
                    </div>
                    {/* Main Colour box temporarily hidden */}
                    {/* <div className={`feedback-box ${cmp.color}`} style={revealRow === rowIdx ? { animationDelay: `${3 * BOX_DELAY_STEP}s` } : undefined}>
                          <div className="feedback-box-content">{poke.main_colour || poke.color}</div>
                        </div> */}
                    {/* Secondary Colours box temporarily hidden */}
                    {/* <div className={`feedback-box ${secondaryStatus}`} style={revealRow === rowIdx ? { animationDelay: `${4 * BOX_DELAY_STEP}s` } : undefined}>
                          <div className="feedback-box-content">{poke.secondary_colours && poke.secondary_colours.length ? poke.secondary_colours.join(', ') : 'None'}</div>
                        </div> */}
                    <div className={`feedback-box ${evolutionStatus} feedback-box-large-text`} style={revealRow === rowIdx ? { animationDelay: `${3 * BOX_DELAY_STEP}s` } : undefined}>
                      <div className="feedback-box-content">{poke.evolution_stage || 1}</div>
                    </div>
                    <div className={`feedback-box ${cmp.habitat}`} style={revealRow === rowIdx ? { animationDelay: `${4 * BOX_DELAY_STEP}s` } : undefined}>
                      <div className="feedback-box-content">{poke.habitat}</div>
                    </div>
                    <div className={`feedback-box ${heightStatus} feedback-box-medium-text`} style={revealRow === rowIdx ? { position: 'relative', animationDelay: `${5 * BOX_DELAY_STEP}s` } : { position: 'relative' }}>
                      {cmp.height !== 'match' && (
                        <div className="bg-icon" aria-hidden="true">
                          <img
                            src={`images/arrow-up.svg`}
                            alt=""
                            className={cmp.height === 'up' ? '' : 'flip-vertical'}
                            style={{ transform: `${cmp.height === 'up' ? '' : 'scaleY(-1) '}scale(${heightScale})` }}
                          />
                        </div>
                      )}
                      <div className="feedback-box-content">
                        <span style={{ position: 'relative', zIndex: 2 }}>{poke.height}m</span>
                      </div>
                    </div>
                    <div className={`feedback-box ${weightStatus} feedback-box-medium-text`} style={revealRow === rowIdx ? { position: 'relative', animationDelay: `${6 * BOX_DELAY_STEP}s` } : { position: 'relative' }}>
                      {cmp.weight !== 'match' && (
                        <div className="bg-icon" aria-hidden="true">
                          <img
                            src={`images/arrow-up.svg`}
                            alt=""
                            className={cmp.weight === 'up' ? '' : 'flip-vertical'}
                            style={{ transform: `${cmp.weight === 'up' ? '' : 'scaleY(-1) '}scale(${weightScale})` }}
                          />
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
                <div key={`placeholder-${rowIdx}`} ref={rowIdx === 0 ? placeholderRowRef : null} className={`feedback-grid ${isFadingPlaceholder && rowIdx === 0 ? 'fade-placeholder' : ''}`} style={{ gridTemplateColumns: 'repeat(7, 1fr)', width: '100%' }}>
                    {Array.from({ length: 7 }).map((__, colIdx) => {
                    const phDelay = (isFadingPlaceholder && rowIdx === 0) ? `${colIdx * PLACEHOLDER_BOX_DELAY}s` : (revealRow === rowIdx ? `${colIdx * BOX_DELAY_STEP}s` : undefined);
                    const style = phDelay ? { animationDelay: phDelay } : (revealRow === rowIdx ? { animationDelay: `${colIdx * BOX_DELAY_STEP}s` } : undefined);
                    return (
                      <div key={`ph-${rowIdx}-${colIdx}`} className={`feedback-box placeholder`} style={style}>
                        <div className="feedback-box-content">?</div>
                      </div>
                    );
                  })}
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
          border-radius: 12px;
          background: #c8e6c9;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 14px;
          font-weight: 700;
          box-sizing: border-box;
          margin-bottom: 0;
          text-align: center;
          overflow: visible; /* allow scale animations to extend outside box without being clipped */
          white-space: pre-line;
        }
        .feedback-box-large-text {
          font-size: 20px;
          font-weight: 700;
        }
        .feedback-box-medium-text {
          font-size: 16px;
          font-weight: 700;
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
          width: 70%;
          height: 70%;
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
          font-weight: 700;
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
          background: #c1e4c2ff !important;
          border-color: #4ba34fff !important;
        }
        .partial {
          background: #f9f1a8ff !important;
          border-color: #faca4eff !important;
        }
        .miss {
          background: #f2acacff !important;
          border-color: #c03636ff !important;
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
            grid-template-columns: repeat(7, minmax(43px, 1fr)) !important;
            gap: 3px !important;
          }
          .feedback-box {
            font-size: 9px !important;
            border-radius: 12px !important;
            /* aspect-ratio keeps boxes square */
          }
            .feedback-box-large-text {
            font-size: 13px !important;
            }
            .feedback-box-medium-text {
            font-size: 11px !important;
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
            opacity: 0.34 !important;
            width: 100% !important;
            height: 100% !important;
          }
          /* On small screens hide the pokemon name label in the leftmost box */
          .feedback-pokemon-box .feedback-box-content { display: none !important; }
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
        /* Staggered cascade reveal for newly added guess row - uses per-box animation-delay set inline */
        @media (prefers-reduced-motion: no-preference) {
          .reveal-row .feedback-box {
            animation-name: cascade-reveal;
            animation-duration: 360ms;
            animation-fill-mode: both;
            animation-timing-function: cubic-bezier(.2,.9,.3,1);
            transform-origin: center center;
            will-change: transform, opacity;
            opacity: 0;
            transform: translateY(8px) scale(0.98);
          }

          /* Fade each placeholder box with staggered delays */
          .fade-placeholder .feedback-box {
            animation-name: placeholder-box-fade;
            animation-duration: 200ms;
            animation-fill-mode: both;
            animation-timing-function: ease;
            will-change: opacity, transform;
          }

          @keyframes placeholder-box-fade {
            0% { opacity: 1; transform: translateY(0) scale(1); }
            100% { opacity: 0; transform: translateY(-6px) scale(0.98); }
          }

          @keyframes cascade-reveal {
            0% { opacity: 0; transform: translateY(9px) scale(0.96); }
            60% { opacity: 0.7; transform: translateY(-4px) scale(1.04); }
            100% { opacity: 1; transform: translateY(0) scale(1); }
          }
        }
        @media (prefers-reduced-motion: reduce) {
          .reveal-row .feedback-box {
            animation: none !important;
            opacity: 1 !important;
            transform: none !important;
          }
          .fade-placeholder .feedback-box {
            animation: none !important;
            opacity: 0 !important;
            transform: none !important;
          }
        }
      `}</style>
    </div>
  );
}

export default ClassicPage;