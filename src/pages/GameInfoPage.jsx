import React, { useState, useMemo, useRef, useEffect } from 'react';
import GuessInput from '../components/GuessInput';
import CongratsMessage from '../components/CongratsMessage';
import ResetCountdown from '../components/ResetCountdown';
import { RESET_HOUR_UTC } from '../config/resetConfig';
import InfoButton from '../components/InfoButton';
import Confetti from '../components/Confetti';
import { GAMEINFO_HINT_THRESHOLDS, getClueCount, getNextThresholdIndex } from '../config/hintConfig';
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
    let d = date;
    if (date.getUTCHours() >= RESET_HOUR_UTC) {
        d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() + 1, 0, 0, 0));
    }
    const year = d.getUTCFullYear();
    const month = String(d.getUTCMonth() + 1).padStart(2, '0');
    const day = String(d.getUTCDate()).padStart(2, '0');
    return parseInt(`${year}${month}${day}`, 10);
}

const BASE_CLUE_TYPES = ['stats', 'ability', 'moves', 'category', 'locations', 'held_items', 'shape'];

function GameInfoPage({ pokemonData, guesses, setGuesses, daily }) {
    const infoRef = useRef(null);
    const [infoVisible, setInfoVisible] = useState(false);
    const [locationFileMap, setLocationFileMap] = useState(null);
    const [mapPopup, setMapPopup] = useState({ visible: false, title: null, url: null });
    const inputRef = useRef(null);
    const lastGuessRef = useRef(null);
    const [showConfetti, setShowConfetti] = useState(false);
    const prevCorrectRef = useRef(false);
    
    const today = new Date();
    const defaultSeed = (getSeedFromUTCDate(today) + 13 * 1000 + 'g'.charCodeAt(0)); // UTC-based
    const [resetSeed, setResetSeed] = useState(null);
    const [resetCount, setResetCount] = useState(0);
    const seed = resetSeed !== null ? resetSeed : defaultSeed;
    const rng = useMemo(() => mulberry32(seed), [seed]);
    const dailyIndex = useMemo(() => pokemonData ? Math.floor(rng() * pokemonData.length) : 0, [rng, pokemonData]);
    const computedDaily = pokemonData ? pokemonData[dailyIndex] : null;
    const dailyPokemon = daily || computedDaily;

    // Build and shuffle clues for the day
    const cluesForDay = useMemo(() => {
        if (!dailyPokemon) return [];
        let clues = BASE_CLUE_TYPES.filter(type => {
            if (type === 'held_items') {
                return Array.isArray(dailyPokemon.held_items) && dailyPokemon.held_items.length > 0;
            }
            return true;
        });
        // Shuffle clues
        for (let i = clues.length - 1; i > 0; i--) {
            const j = Math.floor(rng() * (i + 1));
            [clues[i], clues[j]] = [clues[j], clues[i]];
        }
        // Ensure 'shape' is not the first clue
        const shapeIdx = clues.indexOf('shape');
        if (shapeIdx === 0 && clues.length > 1) {
            // Swap with the second clue
            [clues[0], clues[1]] = [clues[1], clues[0]];
        }
        return clues;
    }, [seed, dailyPokemon, rng]);

    // Load mapping of location -> filename (produced by scripts/match_location_maps.py)
    useEffect(() => {
        let cancelled = false;
        async function loadMap() {
            const tryUrls = [
                'data/location_to_file_map.json',
                'scripts/location_to_file_map.json',
                'location_to_file_map.json'
            ];
            for (const url of tryUrls) {
                try {
                    const resp = await fetch(url);
                    if (!resp.ok) {
                        console.debug('[GameInfoPage] mapping not found at', url, 'status', resp.status);
                        continue;
                    }
                    const j = await resp.json();
                    if (!cancelled) {
                        setLocationFileMap(j);
                        console.debug('[GameInfoPage] loaded location map from', url);
                    }
                    return;
                } catch (e) {
                    console.debug('[GameInfoPage] error fetching mapping from', url, e);
                    continue;
                }
            }
            console.debug('[GameInfoPage] no location mapping file found in any known location');
        }
        loadMap();
        return () => { cancelled = true; };
    }, []);

    // Determine which clues to show based on guesses (use page-specific config)
    const clueCount = getClueCount(guesses.length, GAMEINFO_HINT_THRESHOLDS);
    const shownClues = cluesForDay.slice(0, clueCount);

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

    if (!pokemonData) return <div>Loading Pokémon game data...</div>;

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
    const isCorrect = lastGuess && dailyPokemon && lastGuess.name === dailyPokemon.name;

    useEffect(() => {
        const key = `pokedle_confetti_gameinfo_${seed}`;
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

    // Clue renderers
    function renderClue(type) {
            if (type === 'stats') {
                const stats = dailyPokemon.stats || {};
                const statOrder = ['hp', 'attack', 'defense', 'special-attack', 'special-defense', 'speed'];
                const statLabels = {
                    hp: 'HP', attack: 'Atk', defense: 'Def', 'special-attack': 'Sp.Atk', 'special-defense': 'Sp.Def', speed: 'Speed',
                };
                // Per-stat maximums for normalization
                const statMax = {
                    hp: 255,
                    attack: 180,
                    defense: 180,
                    'special-attack': 180,
                    'special-defense': 180,
                    speed: 180,
                };

                return (
                    <div style={{ marginBottom: 10 }}>
                        <div style={{ fontWeight: 600, marginBottom: 8 }}>Base Stats:</div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                            {statOrder.map(s => {
                                const v = Number(stats[s] || 0);
                                const maxFor = statMax[s] || 255;
                                const pct = Math.round((v / maxFor) * 100);
                                return (
                                    <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 12 }} aria-label={`${statLabels[s]}: ${v}`}>
                                        <div style={{ width: 72, fontSize: 13, color: '#333', fontWeight: 600 }}>{statLabels[s]}</div>
                                        <div style={{ flex: 1, height: 14, background: '#e8eef6', borderRadius: 8, overflow: 'hidden' }}>
                                            <div style={{ height: '100%', width: `${pct}%`, background: '#1976d2', borderRadius: 8, transition: 'width 360ms cubic-bezier(.2,.8,.2,1)' }} />
                                        </div>
                                        <div style={{ width: 44, textAlign: 'right', fontWeight: 700, color: '#111' }}>{v}</div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                );
            }
        if (type === 'ability') {
            const abilities = dailyPokemon.abilities || [];
            return (
                <div style={{ marginBottom: 10 }}>
                    <div style={{ fontWeight: 600 }}>Abilities:</div>
                    <div style={{ color: '#333' }}>{abilities.length > 0 ? abilities.join(', ') : 'No abilities'}</div>
                </div>
            );
        }
        if (type === 'moves') {
            const moves = dailyPokemon.moves || [];
            return (
                <div style={{ marginBottom: 10 }}>
                    <div style={{ fontWeight: 600 }}>Moves Learnt by Level Up:</div>
                    <div style={{ color: '#333' }}>{moves.length > 0 ? moves.join(', ') : 'No moves'}</div>
                </div>
            );
        }
        if (type === 'category') {
            const genus = dailyPokemon.genus || '';
            return (
                <div style={{ marginBottom: 10 }}>
                    <div style={{ fontWeight: 600 }}>Category:</div>
                    <div style={{ color: '#333' }}>{genus}</div>
                </div>
            );
        }
        if (type === 'locations') {
            const locations = dailyPokemon.location_area_encounters || [];
            const formatDisplay = (raw) => {
                if (!raw) return raw;
                // if slug-like (viridian-city) convert to readable
                if (/^[a-z0-9\-_]+$/.test(raw)) {
                    const pretty = raw.replace(/[-_]+/g, ' ');
                    return pretty.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
                }
                return raw;
            };

            const onOpenMap = (loc) => (e) => {
                e.preventDefault();
                const key = loc;
                const filename = locationFileMap && locationFileMap[key];
                if (!filename) {
                    // try fallback by normalizing slug/display
                    const altKey = formatDisplay(key);
                    const alt = locationFileMap && locationFileMap[altKey];
                    if (alt) {
                        setMapPopup({ visible: true, title: altKey, url: `https://raw.githubusercontent.com/Pythagean/pokedle_assets/main/maps/${alt}` });
                        return;
                    }
                    // no mapping available
                    setMapPopup({ visible: true, title: formatDisplay(key), url: null });
                    return;
                }
                console.log('Opening map for', key, '->', filename);
                console.log(`https://raw.githubusercontent.com/Pythagean/pokedle_assets/main/maps/${filename}`);
                setMapPopup({ visible: true, title: formatDisplay(key), url: `https://raw.githubusercontent.com/Pythagean/pokedle_assets/main/maps/${filename}` });
            };

            return (
                <div style={{ marginBottom: 10 }}>
                    <div style={{ fontWeight: 600 }}>Wild Encounter Locations:</div>
                    <div style={{ color: '#333', display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                        {locations.length > 0 ? locations.map((loc, i) => (
                            <div key={String(loc) + i}>
                                <a href="#" onClick={onOpenMap(loc)} style={{ color: '#1976d2', textDecoration: 'underline', cursor: 'pointer' }}>
                                    {formatDisplay(loc)}
                                </a>
                                {i < locations.length - 1 ? <span style={{ color: '#666' }}>,</span> : null}
                            </div>
                        )) : 'No locations (only obtainable by evolution)'}
                    </div>
                </div>
            );
        }
        if (type === 'held_items') {
            const heldItems = dailyPokemon.held_items || [];
            return (
                <div style={{ marginBottom: 10 }}>
                    <div style={{ fontWeight: 600 }}>Held Items:</div>
                    <div style={{ color: '#333' }}>{heldItems.length > 0 ? heldItems.join(', ') : 'No held items'}</div>
                </div>
            );
        }
        if (type === 'shape') {
            const shape = dailyPokemon.shape || '';
            return (
                <div style={{ marginBottom: 10 }}>
                    <div style={{ fontWeight: 600 }}>Shape:</div>
                    <div style={{ color: '#333' }}>{shape || 'Unknown'}</div>
                </div>
            );
        }
        return null;
    }

    return (
        <div style={{ textAlign: 'center', marginTop: 10 }}>
            {/* Map popup overlay */}
            {mapPopup.visible && (
                <div
                    role="dialog"
                    aria-modal="true"
                    onClick={() => setMapPopup({ visible: false, title: null, url: null })}
                    style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000 }}>
                    <div onClick={e => e.stopPropagation()} style={{ background: '#fff', padding: 12, borderRadius: 8, maxWidth: '90%', maxHeight: '90%', boxShadow: '0 6px 30px rgba(0,0,0,0.5)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                            <div style={{ fontWeight: 700 }}>{mapPopup.title || 'Map'}</div>
                            <button onClick={() => setMapPopup({ visible: false, title: null, url: null })} style={{ marginLeft: 12 }}>Close</button>
                        </div>
                        {mapPopup.url ? (
                            <img src={mapPopup.url} alt={mapPopup.title || 'map'} style={{ maxWidth: '80vw', maxHeight: '80vh', display: 'block' }} onError={(e)=>{e.target.style.display='none';}} />
                        ) : (
                            <div style={{ padding: 24, color: '#666' }}>No map available for this location.</div>
                        )}
                    </div>
                </div>
            )}
            <Confetti active={showConfetti} centerRef={isCorrect ? lastGuessRef : null} />
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
                <h2 style={{ margin: 0 }}>Game Info Mode</h2>
                <InfoButton
                    ariaLabel="How to Play"
                    placement="right"
                    marginTop={130}
                    content={
                        <div style={{ textAlign: 'left' }}>
                            Guess the Pokémon from a random set of clues based on in-game information!<br /><br />
                            One random clue (Base Stats, Abilities, Moves Learnt by Level Up, Category, Shape, Wild Encounter Locations: or Held Items) is shown first.<br /><br />
                            After 2, 4, 6, 8, 10 and 12 guesses, you will receive additional clues.
                        </div>
                    }
                />
                {/* <button
                    style={{ padding: '4px 12px', borderRadius: 6, background: resetCount >= 2 ? '#ccc' : '#eee', border: '1px solid #bbb', fontWeight: 600, fontSize: 14, cursor: resetCount >= 2 ? 'not-allowed' : 'pointer', opacity: resetCount >= 2 ? 0.5 : 1 }}
                    onClick={() => {
                        if (resetCount >= 2) return;
                        setGuesses([]);
                        setResetSeed(Math.floor(Math.random() * 1000000000));
                        setResetCount(resetCount + 1);
                    }}
                    disabled={resetCount >= 2}
                >
                    Reset
                </button> */}
            </div>
                        <div style={{ margin: '24px auto', maxWidth: 500, fontSize: 18, background: '#f5f5f5', borderRadius: 8, padding: 18, border: '1px solid #ddd', whiteSpace: 'pre-line' }}>
                                {!isCorrect && <div style={{ fontWeight: 600, marginBottom: 8 }}>Guess the Pokémon from the clues below:</div>}
                                {isCorrect && (
                                    <>
                                        <CongratsMessage guessCount={guesses.length} mode="Game Data" />
                                        <ResetCountdown active={isCorrect} resetHourUtc={RESET_HOUR_UTC} />
                                    </>
                                )}
                                {shownClues.map(type => renderClue(type))}
                                {/* Hint placeholder text for next clue, specifying clue type */}
                                {!isCorrect && (() => {
                                    const nextIdx = getNextThresholdIndex(guesses.length, GAMEINFO_HINT_THRESHOLDS);
                                    if (nextIdx !== -1 && cluesForDay.length > shownClues.length) {
                                        const nextThreshold = GAMEINFO_HINT_THRESHOLDS[nextIdx];
                                        const cluesLeft = nextThreshold - guesses.length;
                                        const nextClueType = cluesForDay[shownClues.length];
                                        // Human-friendly clue type names
                                        const clueTypeLabels = {
                                            stats: 'Base Stats',
                                            ability: 'Abilities',
                                            moves: 'Moves Learned by Level Up',
                                            category: 'Category',
                                            locations: 'Wild Encounter Locations',
                                            held_items: 'Held Items',
                                            shape: 'Shape',
                                        };
                                        return (
                                            <div style={{ color: '#888', borderTop: '1px dashed #eee', paddingTop: 10, marginTop: 16, fontSize: 15 }}>
                                                <span>Next clue (<b>{clueTypeLabels[nextClueType] || nextClueType}</b>) in {cluesLeft} guess{cluesLeft === 1 ? '' : 'es'}!</span>
                                            </div>
                                        );
                                    }
                                    return null;
                                })()}
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

export default GameInfoPage;
