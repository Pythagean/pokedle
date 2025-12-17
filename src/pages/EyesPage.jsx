import React, { useState, useMemo, useRef, useEffect } from 'react';
import GuessInput from '../components/GuessInput';
import CongratsMessage from '../components/CongratsMessage';
import ResetCountdown from '../components/ResetCountdown';
import { RESET_HOUR_UTC } from '../config/resetConfig';
import { EyesHints } from '../config/hintConfig';
import { TYPE_COLORS } from '../config/typeColors';
import InfoButton from '../components/InfoButton';
import Confetti from '../components/Confetti';

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
    return function () {
        var t = a += 0x6D2B79F5;
        t = Math.imul(t ^ t >>> 15, t | 1);
        t ^= t + Math.imul(t ^ t >>> 7, t | 61);
        return ((t ^ t >>> 14) >>> 0) / 4294967296;
    }
}

export default function EyesPage({ pokemonData, guesses, setGuesses, daily, eyesManifest, useShinySprites = false }) {
    const inputRef = useRef(null);
    const lastGuessRef = useRef(null);
    const [showConfetti, setShowConfetti] = useState(false);
    const prevCorrectRef = useRef(false);
    const [eyesLoaded, setEyesLoaded] = useState(false);
    const [realLoaded, setRealLoaded] = useState(false);

    // Use the daily pokemon passed from parent (already filtered for manifest availability)
    const dailyPokemon = daily;

    // Debug log to verify correct pokemon is being used
    useEffect(() => {
        if (dailyPokemon) {
            console.log('[EyesPage] Received daily Pokemon:', dailyPokemon.name, dailyPokemon.id);
        }
    }, [dailyPokemon]);

    // Calculate seed for confetti localStorage key
    const today = new Date();
    const seed = getSeedFromUTCDate(today) + 14 * 1000 + 'e'.charCodeAt(0);

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
        ? pokemonNames.filter(name => name.toLowerCase().startsWith(guess.toLowerCase())).filter(name => !guessedNames.has(name)).slice(0, 50).map(name => pokemonNameMap.get(name))
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

    if (!pokemonData) return <div>Loading Pokémon...</div>;
    if (!dailyPokemon) return <div>Loading...</div>;

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

    // Determine which image to show based on guess count
    // Use thresholds from hintConfig
    const [fullImageThreshold, generationHintThreshold, typesHintThreshold] = EyesHints.thresholds;
    const showFullImage = guesses.length >= fullImageThreshold;
    const eyesImagePath = showFullImage
        ? `https://raw.githubusercontent.com/Pythagean/pokedle_assets/main/eyes/full/${dailyPokemon.id}.png`
        : `https://raw.githubusercontent.com/Pythagean/pokedle_assets/main/eyes/trimmed/${dailyPokemon.id}.png`;
    const realImagePath = `https://raw.githubusercontent.com/Pythagean/pokedle_assets/main/images/${dailyPokemon.id}.png`;

    // Preload both images
    useEffect(() => {
        if (!dailyPokemon) return;
        try {
            const eyesImg = new Image();
            eyesImg.src = eyesImagePath;
            const realImg = new Image();
            realImg.src = realImagePath;
            eyesImg.onload = () => { /* cached */ };
            eyesImg.onerror = () => { /* ignore */ };
            realImg.onload = () => { /* cached */ };
            realImg.onerror = () => { /* ignore */ };
            return () => {
                eyesImg.onload = null;
                eyesImg.onerror = null;
                realImg.onload = null;
                realImg.onerror = null;
            };
        } catch (e) {
            // ignore
        }
    }, [dailyPokemon && dailyPokemon.id, eyesImagePath, realImagePath]);

    // Show generation hint after threshold
    const showGenerationHint = guesses.length >= generationHintThreshold;
    // Show types hint after threshold
    const showTypesHint = guesses.length >= typesHintThreshold;

    useEffect(() => {
        const key = `pokedle_confetti_eyes_${seed}`;
        let alreadyShown = false;
        try { alreadyShown = !!localStorage.getItem(key); } catch (e) { alreadyShown = false; }
        if (isCorrect && !prevCorrectRef.current && !alreadyShown) {
            setShowConfetti(true);
            try { localStorage.setItem(key, '1'); } catch (e) { }
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
        .eyes-img-container {
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
          border-radius: 8px;
        }
        @media (min-width: 521px) {
          .eyes-img-container { max-width: 360px; }
        }
        .eyes-main {
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
          .eyes-main { max-width: 92vw; padding: 12px; }
        }
        @media (max-width: 600px) {
          .eyes-main {
            margin-top: 16px !important;
          }
          .eyes-img-container {
            width: 100% !important;
            max-width: 320px !important;
          }
          .eyes-img-container img { max-width: 100%; max-height: 100%; display: block; }
          .eyes-form {
            flex-direction: column !important;
            gap: 4px !important;
            margin-bottom: 16px !important;
          }
        }
      `}</style>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
                <h2 style={{ margin: 0 }}>Details Mode</h2>
                <InfoButton
                    ariaLabel="Details Mode"
                    placement="right"
                    marginTop={110}
                    iconSize={22}
                    content={
                        <div style={{ textAlign: 'left' }}>
                            Details mode consists of 3 different game types, chosen based on the day of the week:
                            <ul>
                                <li><strong>Silhouette</strong> - Guess the Pokémon from its silhouette (Monday, Wednesday and Saturday)</li>
                                <li><strong>Zoom</strong> - Guess the Pokémon from a zoomed in image (Tuesday, Thursday and Sunday)</li>
                                <li><strong>Eyes</strong> - Guess the Pokémon from just the Pokémon's eyes (Fr-eyes-day... get it?)</li>
                            </ul>
                        </div>
                    }
                />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
                <h3 style={{ margin: 0 }}>Today is Eyes Day!</h3>
                <InfoButton
                    ariaLabel="How to Play"
                    placement="right"
                    marginTop={110}
                    iconSize={16}
                    fontSize={12}
                    content={
                        <div style={{ textAlign: 'left' }}>
                            Guess the Pokémon from just its eyes!<br /><br />
                            After {fullImageThreshold} incorrect guesses, the full face is revealed.<br /><br />
                            After {generationHintThreshold} incorrect guesses, the generation is revealed as a hint.<br /><br />
                            After {typesHintThreshold} incorrect guesses, the types are revealed as a hint.
                        </div>
                    }
                />
            </div>

            <div className="eyes-main">
                {!isCorrect && <div style={{ fontWeight: 600, marginBottom: 8 }}>Whose eyes are these?</div>}
                {isCorrect && (
                    <>
                        <CongratsMessage guessCount={guesses.length} mode="Eyes" />
                        <ResetCountdown active={isCorrect} resetHourUtc={RESET_HOUR_UTC} />
                    </>
                )}
                <div className="eyes-img-container" style={{ position: 'relative' }}>
                    {/* Eyes image (trimmed or full) */}
                    <img
                        src={eyesImagePath}
                        alt="Pokemon eyes"
                        draggable={false}
                        onDragStart={e => e.preventDefault()}
                        onContextMenu={e => e.preventDefault()}
                        style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'contain',
                            position: 'absolute',
                            inset: 0,
                            zIndex: 1,
                            opacity: (!isCorrect && eyesLoaded) ? 1 : 0,
                            transition: 'opacity 300ms ease',
                        }}
                        onLoad={e => {
                            setEyesLoaded(true);
                        }}
                        onError={e => {
                            setEyesLoaded(false);
                            console.error('Failed to load eyes image for ID:', dailyPokemon.id);
                        }}
                    />
                    {/* Real pokemon image (shown when correct) */}
                    <img
                        src={realImagePath}
                        alt={dailyPokemon.name}
                        draggable={false}
                        onDragStart={e => e.preventDefault()}
                        onContextMenu={e => e.preventDefault()}
                        style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'contain',
                            position: 'absolute',
                            inset: 0,
                            zIndex: 2,
                            opacity: (isCorrect && realLoaded) ? 1 : 0,
                            transition: 'opacity 300ms ease',
                        }}
                        onLoad={e => {
                            setRealLoaded(true);
                        }}
                        onError={e => {
                            setRealLoaded(false);
                        }}
                    />
                </div>

                {/* Show generation hint after 6 guesses */}
                {!isCorrect && showGenerationHint && dailyPokemon && dailyPokemon.generation && (
                    <div style={{
                        color: '#333',
                        borderTop: '1px dashed #bbb',
                        paddingTop: 10,
                        marginTop: 16,
                        fontSize: 16,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 8
                    }}>
                        <span style={{ fontWeight: 700 }}>Generation:</span>
                        <span>{dailyPokemon.generation}</span>
                        {(() => {
                            // Map generation to starter sprite ID (using first starter for each gen)
                            const genStarterMap = {
                                1: 1,   // Bulbasaur
                                2: 152, // Chikorita
                                3: 252, // Treecko
                                4: 387, // Turtwig
                                5: 495, // Snivy
                                6: 650, // Chespin
                                7: 722, // Rowlet
                                8: 810, // Grookey
                                9: 906  // Sprigatito
                            };
                            const gen = parseInt(String(dailyPokemon.generation).match(/\d+/)?.[0], 10);
                            const starterId = genStarterMap[gen];
                            if (!starterId) return null;
                            return (
                                <img
                                    src={`https://raw.githubusercontent.com/Pythagean/pokedle_assets/main/sprites_trimmed/${starterId}-front.png`}
                                    alt={`Gen ${gen} starter`}
                                    style={{ width: 32, height: 32, objectFit: 'contain', transform: 'scale(1.2)' }}
                                    onError={e => { e.target.style.display = 'none'; }}
                                />
                            );
                        })()}
                    </div>
                )}

                {/* Show types hint after 9 guesses */}
                {!isCorrect && showTypesHint && dailyPokemon && dailyPokemon.types && (
                    <div style={{
                        color: '#333',
                        borderTop: '1px dashed #bbb',
                        paddingTop: 10,
                        marginTop: 16,
                        fontSize: 16
                    }}>
                        <div style={{ fontWeight: 700, marginBottom: 8 }}>Type{dailyPokemon.types.length > 1 ? 's' : ''}:</div>
                        <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
                            {dailyPokemon.types.map(t => {
                                const tLower = String(t).toLowerCase();
                                const bgColor = TYPE_COLORS[tLower] || '#777';
                                return (
                                    <div
                                        key={t}
                                        style={{
                                            background: bgColor,
                                            color: '#fff',
                                            padding: '6px 16px',
                                            borderRadius: 6,
                                            fontWeight: 700,
                                            fontSize: 15,
                                            textTransform: 'capitalize',
                                            boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                                        }}
                                    >
                                        {t}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}


                {/* Show hint about upcoming reveals */}
                {!isCorrect && !showFullImage && (
                    <div style={{ color: '#888', fontSize: 15, marginTop: 12 }}>
                        The position of the eyes in the image will be revealed in {fullImageThreshold - guesses.length} guess{fullImageThreshold - guesses.length === 1 ? '' : 'es'}!
                    </div>
                )}
                {!isCorrect && showFullImage && !showGenerationHint && (
                    <div style={{ color: '#888', fontSize: 15, marginTop: 12 }}>
                        Generation will be revealed in {generationHintThreshold - guesses.length} guess{generationHintThreshold - guesses.length === 1 ? '' : 'es'}!
                    </div>
                )}
                {!isCorrect && showFullImage && showGenerationHint && !showTypesHint && (
                    <div style={{ color: '#888', fontSize: 15, marginTop: 12 }}>
                        Types will be revealed in {typesHintThreshold - guesses.length} guess{typesHintThreshold - guesses.length === 1 ? '' : 'es'}!
                    </div>
                )}
            </div>

            {!isCorrect && (
                <form
                    className="eyes-form"
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
