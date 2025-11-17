import React, { useState, useMemo, useRef, useEffect } from 'react';
import GuessInput from '../components/GuessInput';
import CongratsMessage from '../components/CongratsMessage';
// import cardManifest from '../../data/card_manifest.json';
// import pokemonData from '../../data/pokemon_data.json';

function mulberry32(a) {
  return function() {
    var t = a += 0x6D2B79F5;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  }
}


// Get a YYYYMMDD string from UTC date
function getSeedFromUTCDate(date) {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return parseInt(`${year}${month}${day}`, 10);
}

function getCardTypeByDay(day, rng) {
  if (day === 0) return 'special'; // Sunday
  if (day === 6) return rng() < 0.5 ? 'full_art' : 'shiny'; // Saturday
  return 'normal'; // Mon-Fri
}

function CardPage({ pokemonData, cardManifest, guesses, setGuesses }) {
  
  const [reloadSeed, setReloadSeed] = useState(0); // for retrying if card not found
  const [resetCount, setResetCount] = useState(0);

  // Use UTC date and day for consistency
  const today = new Date();
  const utcDay = today.getUTCDay();
  // Debug: allow toggling day mode
  const [debugDay, setDebugDay] = useState(null); // null = real day, 0 = Sunday, 6 = Saturday, 1-5 = Weekday
  const effectiveDay = debugDay !== null ? debugDay : utcDay;
  
  const baseSeed = getSeedFromUTCDate(today) + 9999; // unique for card page, UTC-based
  const rng = useMemo(() => mulberry32(baseSeed + reloadSeed), [baseSeed, reloadSeed]);

  // Guess input state and handlers (controlled pattern)
  const [guess, setGuess] = useState('');
  const [highlightedIdx, setHighlightedIdx] = useState(-1);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const inputRef = useRef(null);
  const dropdownRef = useRef(null);

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

  // Helper to select a pokemon and card
  const { cardPath, answer, folder, cardFile, cardType } = useMemo(() => {
    if (!pokemonData || !cardManifest) {
      return { cardPath: null, answer: null, folder: null, cardFile: null, cardType: null };
    }
    let attempts = 0;
    let chosen = null;
    let chosenCard = null;
    let folder = null;
    let cardFile = null;
    let cardType = null;
    let localRng = mulberry32(baseSeed + reloadSeed);
    while (attempts < 50 && !chosenCard) {
      const idx = Math.floor(localRng() * pokemonData.length);
      chosen = pokemonData[idx];
      cardType = getCardTypeByDay(effectiveDay, localRng);
      // New folder structure
      if (cardType === 'normal' || cardType === 'shiny') {
        folder = `https://raw.githubusercontent.com/Pythagean/pokedle_assets/main/cards/${cardType}`;
      } else {
        folder = `https://raw.githubusercontent.com/Pythagean/pokedle_assets/main/cards/${cardType}`;
      }
      const manifestList = cardManifest[cardType]?.[chosen.id];
      if (manifestList && manifestList.length > 0) {
        cardFile = manifestList[Math.floor(localRng() * manifestList.length)];
        // For normal/shiny, cropped is in /cropped, resized is in /resized
        // For full_art/special, just in the folder
        if (cardType === 'normal' || cardType === 'shiny') {
          chosenCard = {
            cropped: `${folder}/cropped/${cardFile}`,
            resized: `${folder}/resized/${cardFile}`
          };
        } else {
          chosenCard = {
            cropped: `${folder}/${cardFile}`,
            resized: `${folder}/${cardFile}`
          };
        }
      }
      attempts++;
    }
    return { cardPath: chosenCard, answer: chosen, folder, cardFile, cardType };
  }, [baseSeed, reloadSeed, effectiveDay, pokemonData, cardManifest]);

  const [showHelp, setShowHelp] = useState(false);

  if (!pokemonData || !cardManifest) return <div>Shuffling Pokémon cards...</div>;

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

  // Determine if the correct guess has been made (after answer is defined)
  let blurLevel;
  const isCorrect = guesses.length > 0 && answer && guesses[0].name === answer.name;
  if (isCorrect) {
    blurLevel = 0;
  } else if (cardType === 'full_art' || cardType === 'special') {
    // Blur logic for full_art and special cards
    switch (true) {
      case guesses.length === 0:
        blurLevel = 25; break;
      case guesses.length === 1:
        blurLevel = 23; break;
      case guesses.length === 2:
        blurLevel = 20; break;
      case guesses.length === 3:
        blurLevel = 17; break;
      case guesses.length === 4:
        blurLevel = 15; break;
      case guesses.length === 5:
        blurLevel = 12; break;
      case guesses.length === 6:
        blurLevel = 10; break;
      case guesses.length === 7:
        blurLevel = 8; break;
      default:
        blurLevel = 7; break;
    }
  } else {
    // Blur logic for normal and shiny cards
    switch (true) {
      case guesses.length === 0:
        blurLevel = 20; break;
      case guesses.length === 1:
        blurLevel = 17; break;
      case guesses.length === 2:
        blurLevel = 15; break;
      case guesses.length === 3:
        blurLevel = 12; break;
      case guesses.length === 4:
        blurLevel = 10; break;
      case guesses.length === 5:
        blurLevel = 9; break;
      case guesses.length === 6:
        blurLevel = 8; break;
      case guesses.length === 7:
        blurLevel = 7; break;
      default:
        blurLevel = 7; break;
    }
  }
  // If correct, always show resized image
  const forceReveal = isCorrect;
  // Reveal full card after 4 guesses
  const revealFullCard = guesses.length >= 4;
  
  function handleReset() {
    if (resetCount >= 2) return;
    setGuesses([]);
    setReloadSeed(Date.now() + Math.floor(Math.random() * 1000000000));
    setResetCount(resetCount + 1);
  }

  return (
    <div style={{ textAlign: 'center', marginTop: 10 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, marginBottom: 8 }}>
        <h2 style={{ margin: 0 }}>Card Mode</h2>
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
            aria-label="What is Card Mode?"
            onMouseEnter={() => setShowHelp(true)}
            onMouseLeave={() => setShowHelp(false)}
            onFocus={() => setShowHelp(true)}
            onBlur={() => setShowHelp(false)}
          >
            ?
          </button>
          {showHelp && (
            <div
              style={{
                visibility: 'visible',
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
                minWidth: 250,
                fontSize: 14,
                boxShadow: '0 2px 8px #0002',
                pointerEvents: 'none',
                whiteSpace: 'normal',
              }}
              role="tooltip"
            >
              Guess the Pokémon from its TCG card art!<br /><br />
              The type of card picked is based on the day of the week:<br /><br />
              - <b>Weekdays:</b> Normal cards<br />
              - <b>Saturdays:</b> Full Art or Shiny cards<br />
              - <b>Sundays:</b> Illustration cards<br />
            </div>
          )}
        </div>
        {/* <button
          style={{ padding: '4px 12px', borderRadius: 6, background: resetCount >= 2 ? '#ccc' : '#eee', border: '1px solid #bbb', fontWeight: 600, fontSize: 14, cursor: resetCount >= 2 ? 'not-allowed' : 'pointer', opacity: resetCount >= 2 ? 0.5 : 1 }}
          onClick={handleReset}
          disabled={resetCount >= 2}
        >
          Reset
        </button> */}
        {/**
        // Debug text for folder/card type
        {folder && (
          <span style={{ marginLeft: 10, color: '#888', fontSize: 13, fontStyle: 'italic', alignSelf: 'center' }}>
            [debug: {folder.replace('data/cards_', '')}]
          </span>
        )}
        // Debug day dropdown
        <select
          style={{ marginLeft: 10, fontSize: 14, padding: '2px 6px', borderRadius: 4, border: '1px solid #bbb', background: '#f5f5f5', alignSelf: 'center' }}
          value={debugDay === null ? 'real' : debugDay}
          onChange={e => {
            const val = e.target.value;
            if (val === 'real') setDebugDay(null);
            else setDebugDay(Number(val));
          }}
        >
          <option value="real">Real Day</option>
          <option value={1}>Weekday</option>
          <option value={6}>Saturday</option>
          <option value={0}>Sunday</option>
        </select>
        */}
      </div>
        <div style={{ margin: '24px auto', maxWidth: 500, fontSize: 18, background: '#f5f5f5', borderRadius: 8, padding: 18, border: '1px solid #ddd', whiteSpace: 'pre-line' }}>
          {!isCorrect && <div style={{ fontWeight: 600, marginBottom: 8 }}>Which Pokémon is on this card?</div>}
          {isCorrect && <CongratsMessage guessCount={guesses.length} mode="Card Mode" />}
          <div className="card-viewport" style={{ position: 'relative', margin: '0 auto', overflow: 'hidden', borderRadius: 8, background: '#fff' }}>
            {cardFile ? (
              <>
                {/* For full_art or special: always show resized image */}
                {(cardType === 'full_art' || cardType === 'special') ? (
                  <img
                    src={cardPath.resized}
                    alt={answer ? answer.name : 'Pokemon Card'}
                    className="card-img card-img-resized"
                    style={{
                      borderRadius: 8,
                      filter: `blur(${blurLevel}px)`,
                      transition: 'filter 0.4s',
                    }}
                  />
                ) : (
                  <>
                    {/* For normal or shiny: use current switching logic */}
                    {/* Resized image as base, only visible when revealed or correct */}
                    {(revealFullCard || forceReveal) && (
                      <img
                        src={cardPath.resized}
                        alt={answer ? answer.name : 'Pokemon Card'}
                        className="card-img card-img-resized overlay"
                        style={{
                          zIndex: 1,
                          borderRadius: 8,
                          filter: `blur(${blurLevel}px)`,
                          transition: 'filter 0.4s',
                        }}
                      />
                    )}
                    {/* Cropped image overlay, blurred until reveal or correct */}
                    {!(revealFullCard || forceReveal) && (
                      <img
                        src={cardPath.cropped}
                        alt={answer ? answer.name : 'Pokemon Card'}
                        className="card-img card-img-cropped overlay"
                        style={{
                          zIndex: 2,
                          borderRadius: 8,
                          background: 'transparent',
                          filter: `blur(${blurLevel}px)`,
                          transition: 'filter 0.4s',
                          /* Display the cropped image smaller and inset within the viewport
                             so only a portion is visible (like a magnified crop). */
                          left: '8%',
                          top: '-10%',
                          width: '84%',
                          height: '84%',
                          objectFit: 'contain',
                        }}
                      />
                    )}
                  </>
                )}
              </>
            ) : (
              <span style={{ color: '#888' }}>No card found.</span>
            )}
          </div>
          {/* Blur debug line removed */}
          {/* Only show hint text if not guessed correctly */}
          {!isCorrect && (
            <>
              {(cardType === 'full_art' || cardType === 'special') ? (
                <>
                  {/* For full_art/special: Types revealed at 4 guesses */}
                  {guesses.length < 4 && (
                    <div style={{ color: '#888', fontSize: 15, marginTop: 12 }}>
                      Pokémon Types will be revealed in {Math.max(0, 4 - guesses.length)} guess{4 - guesses.length === 1 ? '' : 'es'}!
                    </div>
                  )}
                  {guesses.length >= 4 && answer && answer.types && (
                    <div style={{
                      color: '#333',
                      borderTop: '1px dashed #bbb',
                      paddingTop: 10,
                      marginTop: 16,
                      fontSize: 16
                    }}>
                      <span style={{ fontWeight: 700 }}>Type{answer.types.length > 1 ? 's' : ''}:</span> <span>{answer.types.join(', ')}</span>
                    </div>
                  )}
                </>
              ) : (
                <>
                  {/* For normal/shiny: Full card at 4 guesses, Types at 8 guesses */}
                  {!revealFullCard && (
                    <div style={{ color: '#888', fontSize: 15, marginTop: 12 }}>
                      The full card will be revealed in {Math.max(0, 4 - guesses.length)} guess{4 - guesses.length === 1 ? '' : 'es'}!
                    </div>
                  )}
                  {revealFullCard && guesses.length < 8 && (
                    <div style={{ color: '#888', fontSize: 15, marginTop: 12 }}>
                      Pokémon Types will be revealed in {8 - guesses.length} guess{8 - guesses.length === 1 ? '' : 'es'}!
                    </div>
                  )}
                  {guesses.length >= 8 && answer && answer.types && (
                    <div style={{
                      color: '#333',
                      borderTop: '1px dashed #bbb',
                      paddingTop: 10,
                      marginTop: 16,
                      fontSize: 16
                    }}>
                      <span style={{ fontWeight: 700 }}>Type{answer.types.length > 1 ? 's' : ''}:</span> <span>{answer.types.join(', ')}</span>
                    </div>
                  )}
                </>
              )}
            </>
          )}
        </div>
      {/* Hide guess input and button if correct guess */}
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
          style={{ display: 'flex', gap: 8, marginBottom: 24, flexWrap: 'wrap', justifyContent: 'center' }}
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
      {/* Guess boxes like AbilityPage */}
      {guesses.length > 0 && (
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: 24, flexDirection: 'column', alignItems: 'center' }}>
          <div style={{
            background: guesses[0].name === (answer && answer.name) ? '#a5d6a7' : '#ef9a9a',
            border: `2px solid ${guesses[0].name === (answer && answer.name) ? '#388e3c' : '#b71c1c'}`,
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
              src={`https://raw.githubusercontent.com/Pythagean/pokedle_assets/main/sprites/${guesses[0].id}-front.png`}
              alt={guesses[0].name}
              style={{ width: 40, height: 40, objectFit: 'contain', marginBottom: 8, transform: 'scale(2.0)' }}
              onError={e => { e.target.style.display = 'none'; }}
            />
            <span>{guesses[0].name}</span>
          </div>
          {guesses.length > 1 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, justifyContent: 'center' }}>
              {guesses.slice(1).map((g, i) => (
                <div key={g.name + i} style={{
                  background: g.name === (answer && answer.name) ? '#a5d6a7' : '#ef9a9a',
                  border: `2px solid ${g.name === (answer && answer.name) ? '#388e3c' : '#b71c1c'}`,
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
      {/* Removed Pick another card button */}
    </div>
  );
}

export default CardPage;

/* Component-specific responsive CSS for card viewport */
const _cardStyles = `
.card-viewport {
  position: relative;
  margin: 0 auto;
  width: 322px;
  height: 448px;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  border-radius: 8px;
  background: #fff;
}
.card-img { display: block; max-width: 100%; max-height: 100%; object-fit: contain; }
.card-img.overlay { position: absolute; left: 0; top: 0; width: 100%; height: 100%; object-fit: cover; }
.card-img-resized { width: 100%; height: 100%; object-fit: contain; }
.card-img-cropped { width: 100%; height: 100%; object-fit: cover; transform-origin: center; }

@media (max-width: 520px) {
  .card-viewport {
    width: min(90vw, 280px);
    height: calc(min(90vw, 280px) * 448 / 322);
  }
  .card-img.overlay { object-fit: cover; }
}

@media (max-width: 360px) {
  .card-viewport { width: 92vw; height: calc(92vw * 448 / 322); }
}
`;

// Inject styles into the document (only once)
if (typeof document !== 'undefined' && !document.getElementById('pokedle-card-styles')) {
  const s = document.createElement('style');
  s.id = 'pokedle-card-styles';
  s.innerHTML = _cardStyles;
  document.head.appendChild(s);
}

