import React, { useState, useMemo, useRef, useEffect } from 'react';
import GuessInput from '../components/GuessInput';
import CongratsMessage from '../components/CongratsMessage';
import ResetCountdown from '../components/ResetCountdown';
import { RESET_HOUR_UTC } from '../config/resetConfig';
import InfoButton from '../components/InfoButton';
import Confetti from '../components/Confetti';
import { LOCATIONS_HINT_THRESHOLDS, getClueCount, getNextThresholdIndex } from '../config/hintConfig';
import { TYPE_COLORS } from '../config/typeColors';
// import pokemonData from '../../data/pokemon_data.json';

function mulberry32(a) {
    return function () {
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

const BASE_CLUE_TYPES = ['locations'];

function LocationsPage({ pokemonData, guesses, setGuesses, daily, useShinySprites = false }) {
    const infoRef = useRef(null);
    const [infoVisible, setInfoVisible] = useState(false);
    const [locationFileMap, setLocationFileMap] = useState(null);
    const [mapPopup, setMapPopup] = useState({ visible: false, title: null, url: null });
    const inputRef = useRef(null);
    const lastGuessRef = useRef(null);
    const [showConfetti, setShowConfetti] = useState(false);
    const prevCorrectRef = useRef(false);
    const [overrideId, setOverrideId] = useState('');

    const today = new Date();
    const defaultSeed = (getSeedFromUTCDate(today) + 13 * 1000 + 'g'.charCodeAt(0)); // UTC-based
    const [resetSeed, setResetSeed] = useState(null);
    const [resetCount, setResetCount] = useState(0);
    const seed = resetSeed !== null ? resetSeed : defaultSeed;
    const rng = useMemo(() => mulberry32(seed), [seed]);
    const dailyIndex = useMemo(() => pokemonData ? Math.floor(rng() * pokemonData.length) : 0, [rng, pokemonData]);
    const computedDaily = pokemonData ? pokemonData[dailyIndex] : null;
    
    // Allow override by ID for testing
    const overridePokemon = overrideId && pokemonData ? pokemonData.find(p => p.id === parseInt(overrideId, 10)) : null;
    const dailyPokemon = overridePokemon || daily || computedDaily;

    // Build clues for the day — Location Mode focused: show locations in stages, then types, then evolution stage
    const cluesForDay = useMemo(() => {
        if (!dailyPokemon) return [];
        return ['locations', 'types', 'evolution_stage'];
    }, [dailyPokemon]);

    // Load mapping of location -> filename (produced by scripts/match_location_maps.py)
    useEffect(() => {
        let cancelled = false;
        async function loadMap() {
            const tryUrls = [
                '../../data/location_to_file_map.json',
            ];
            for (const url of tryUrls) {
                try {
                    const resp = await fetch(url);
                    if (!resp.ok) {
                        console.debug('[LocationsPage] mapping not found at', url, 'status', resp.status);
                        continue;
                    }
                    const j = await resp.json();
                    if (!cancelled) {
                        setLocationFileMap(j);
                        console.debug('[LocationsPage] loaded location map from', url);
                    }
                    return;
                } catch (e) {
                    console.debug('[LocationsPage] error fetching mapping from', url, e);
                    continue;
                }
            }
            console.debug('[LocationsPage] no location mapping file found in any known location');
        }
        loadMap();
        return () => { cancelled = true; };
    }, []);

    // Determine which clues to show based on guesses (use page-specific config)
    // LOCATIONS_HINT_THRESHOLDS = [2, 4, 6] → [all locations, types, evolution stage]
    // Note: threshold[0]=2 is handled inside locations renderer for additional locations
    const clueThresholds = [LOCATIONS_HINT_THRESHOLDS[1], LOCATIONS_HINT_THRESHOLDS[2]]; // [4, 6] for types and evolution
    const clueCount = getClueCount(guesses.length, clueThresholds);
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

    if (!pokemonData) return <div>Loading Pokémon locations...</div>;

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
        const key = `pokedle_confetti_locations_${seed}`;
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

    // Clue renderers
    function renderClue(type) {

        if (type === 'category') {
            const genus = dailyPokemon.genus || '';
            return (
                <div style={{ marginBottom: 10 }}>
                    <div style={{ fontWeight: 600, fontSize: 18 }}>Category:</div>
                    <div style={{ color: '#333', fontSize: 14 }}>{genus}</div>
                </div>
            );
        }
        if (type === 'locations') {
            const getRawName = (loc) => {
                if (!loc) return '';
                if (typeof loc === 'string') return loc;
                if (typeof loc === 'object') return loc.name || '';
                return String(loc);
            };

            const getGenNumber = (p) => {
                if (!p) return null;
                const cand = p.generation ?? p.generation_int ?? p.generation_id ?? p.gen ?? p.gen_id ?? null;
                if (typeof cand === 'number') return cand;
                if (typeof cand === 'string') {
                    const m = cand.match(/\d+/);
                    if (m) return parseInt(m[0], 10);
                }
                if (p.generation && typeof p.generation === 'object' && p.generation.name) {
                    const n = p.generation.name;
                    const m = String(n).match(/\d+/);
                    if (m) return parseInt(m[0], 10);
                    const roman = String(n).replace(/^generation[-_]?/i, '').toLowerCase();
                    const romanMap = { i: 1, ii: 2, iii: 3, iv: 4, v: 5, vi: 6, vii: 7, viii: 8, ix: 9, x: 10 };
                    if (romanMap[roman]) return romanMap[roman];
                }
                return null;
            };

            const genNumber = getGenNumber(dailyPokemon);
            const genGameSets = {
                1: new Set(['red', 'blue', 'yellow' ]),
                2: new Set(['gold', 'silver', 'crystal']),
                3: new Set(['ruby', 'sapphire', 'emerald', 'firered', 'leafgreen'])
            };
            const genGames = genGameSets[genNumber] || null;

            // Prefer direct wild encounter locations; fall back to pre-evolution encounter data
            // Check if Pokemon has any locations in its own generation
            let rawLocations = dailyPokemon.location_area_encounters || [];
            let usingPreevolutionForGen = false;
            let usingPreevolutionForAdditional = false;
            
            let hasGenLocations = false;
            if (genGames && rawLocations && rawLocations.length > 0) {
                hasGenLocations = rawLocations.some(loc => {
                    if (!loc || typeof loc !== 'object' || !Array.isArray(loc.games)) return false;
                    return loc.games.some(game => genGames.has(game.toLowerCase()));
                });
            }

            // If no gen-specific locations exist, use preevolution data for gen section
            if (!hasGenLocations && Array.isArray(dailyPokemon.preevolution_location_area_encounters) && dailyPokemon.preevolution_location_area_encounters.length > 0) {
                rawLocations = dailyPokemon.preevolution_location_area_encounters;
                usingPreevolutionForGen = true;
                usingPreevolutionForAdditional = true; // Default to true, may override below
            }

            // Split locations by gen-specific vs non-gen-specific games
            // Gen locations: locations with gen-specific games (showing only those games)
            // Additional locations: locations with non-gen-specific games (showing only those games)
            const genLocations = [];
            let additionalLocations = [];
            
            if (genGames) {
                rawLocations.forEach(loc => {
                    if (!loc || typeof loc !== 'object' || !Array.isArray(loc.games)) return;
                    
                    const genGamesForLoc = loc.games.filter(game => genGames.has(game.toLowerCase()));
                    const otherGamesForLoc = loc.games.filter(game => !genGames.has(game.toLowerCase()));
                    
                    if (genGamesForLoc.length > 0) {
                        genLocations.push({ ...loc, games: genGamesForLoc });
                    }
                    if (otherGamesForLoc.length > 0) {
                        additionalLocations.push({ ...loc, games: otherGamesForLoc });
                    }
                });
            } else {
                // No gen filtering - show all in gen section
                genLocations.push(...rawLocations);
            }

            // If we're using preevolution for gen locations, but the actual Pokemon has locations in other gens,
            // use those for the additional locations section instead of preevolution's additional locations
            if (usingPreevolutionForGen && dailyPokemon.location_area_encounters && dailyPokemon.location_area_encounters.length > 0) {
                const actualAdditionalLocations = [];
                if (genGames) {
                    dailyPokemon.location_area_encounters.forEach(loc => {
                        if (!loc || typeof loc !== 'object' || !Array.isArray(loc.games)) return;
                        // Only include locations from OTHER generations (not the Pokemon's own gen)
                        const otherGamesForLoc = loc.games.filter(game => !genGames.has(game.toLowerCase()));
                        if (otherGamesForLoc.length > 0) {
                            actualAdditionalLocations.push({ ...loc, games: otherGamesForLoc });
                        }
                    });
                } else {
                    actualAdditionalLocations.push(...dailyPokemon.location_area_encounters);
                }
                
                // If the actual Pokemon has additional locations, use those instead
                if (actualAdditionalLocations.length > 0) {
                    additionalLocations = actualAdditionalLocations;
                    usingPreevolutionForAdditional = false;
                }
            }

            // Determine what to show based on thresholds from hintConfig
            // LOCATIONS_HINT_THRESHOLDS = [2, 4, 6] → [all locations, types, evolution stage]
            const showGenLocations = true; // Always shown with methods
            const showAdditionalLocations = guesses.length >= LOCATIONS_HINT_THRESHOLDS[0];
            const showMethods = true; // Always show methods now

            // Calculate which generations the additional locations are from
            const additionalGenerations = new Set();
            if (additionalLocations.length > 0) {
                additionalLocations.forEach(loc => {
                    if (loc && typeof loc === 'object' && Array.isArray(loc.games)) {
                        loc.games.forEach(game => {
                            const gameLower = game.toLowerCase();
                            // Map games to their generations
                            if (['red', 'blue', 'yellow'].includes(gameLower)) additionalGenerations.add(1);
                            else if (['gold', 'silver', 'crystal'].includes(gameLower)) additionalGenerations.add(2);
                            else if (['ruby', 'sapphire', 'emerald', 'firered', 'leafgreen'].includes(gameLower)) additionalGenerations.add(3);
                        });
                    }
                });
            }
            const sortedAdditionalGens = Array.from(additionalGenerations).sort((a, b) => a - b);
            let additionalGensText = 'ALL generations';
            if (sortedAdditionalGens.length === 1) {
                additionalGensText = `Gen ${sortedAdditionalGens[0]}`;
            } else if (sortedAdditionalGens.length === 2) {
                additionalGensText = `Gen ${sortedAdditionalGens[0]} and ${sortedAdditionalGens[1]}`;
            } else if (sortedAdditionalGens.length > 2) {
                const lastGen = sortedAdditionalGens[sortedAdditionalGens.length - 1];
                const otherGens = sortedAdditionalGens.slice(0, -1).map(g => `Gen ${g}`).join(', ');
                additionalGensText = `${otherGens}, and Gen ${lastGen}`;
            }

            let headerText = 'Wild Encounter Locations:';
            if (usingPreevolutionForGen) {
                headerText = (
                    <span>
                        This Pokémon <span style={{ color: '#eb3d3dff' }}>can't be found in the wild</span> - its pre-evolution(s) can be in these locations in Gen {genNumber}:
                    </span>
                );
            } else if (!showAdditionalLocations) {
                headerText = `This Pokémon can be found in these locations in Gen ${genNumber}:`;
            } else {
                headerText = `This Pokémon can be found in these locations in Gen ${genNumber}:`;
            }

            const formatDisplay = (loc) => {
                const raw = (getRawName(loc) || '').trim();
                if (!raw) return raw;
                let pretty;
                if (/^[a-z0-9\-_]+$/.test(raw)) {
                    pretty = raw.replace(/[-_]+/g, ' ');
                    pretty = pretty.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
                } else {
                    pretty = raw;
                }
                if (/\bSafari\b/i.test(pretty)) return pretty;
                const parts = pretty.split(/\s+/);
                if (parts.length > 1) return parts.slice(1).join(' ');
                return pretty;
            };

            return (
                <div style={{ marginBottom: 10 }}>
                    {/* Gen-specific locations section */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, justifyContent: 'center' }}>
                        <div style={{ fontWeight: 600, fontSize: 15 }}>{headerText}</div>
                    </div>
                    
                    {/* Show breeding-only message if applicable */}
                    {dailyPokemon.can_only_be_caught_by_breeding && (
                        <div style={{ 
                            color: '#eb3d3dff', 
                            fontSize: 14, 
                            fontWeight: 600, 
                            textAlign: 'center', 
                            marginBottom: 12,
                            padding: '8px 12px',
                        }}>
                            This Pokémon can only be obtained through breeding and cannot be found in the wild.
                        </div>
                    )}
                    
                    <div className="locations-container" style={{ color: '#333', display: 'flex', flexWrap: 'wrap', gap: '20px 30px', justifyContent: 'center', fontSize: 14, maxWidth: '100%' }}>
                        {/* Show gen locations */}
                        {showGenLocations && genLocations.length > 0 && genLocations.filter(loc => {
                            // Filter out locations with only Rock Smash method for Gen 1 (but only before All Locations threshold)
                            if (!showAdditionalLocations && genNumber === 1 && loc && typeof loc === 'object' && loc.method) {
                                return !/rock\s*smash/i.test(String(loc.method));
                            }
                            return true;
                        }).map((loc, i) => {
                            const raw = getRawName(loc);
                            const slug = (raw || '').replace(/\s+/g, '_');
                            let filename = null;
                            if (locationFileMap) {
                                filename = locationFileMap[slug] || locationFileMap[raw] || locationFileMap[raw && raw.replace(/[-_]+/g, ' ')] || locationFileMap[raw && raw.toLowerCase()] || locationFileMap[slug && slug.toLowerCase()];
                            }
                            const url = filename ? `https://raw.githubusercontent.com/Pythagean/pokedle_assets/main/maps/${filename}` : (raw ? `https://raw.githubusercontent.com/Pythagean/pokedle_assets/main/maps/${slug}.png` : null);
                            return (
                                <div key={`${getRawName(loc) || String(i)}_${i}`} className="location-card">
                                        {url ? (
                                            <>
                                                <img src={url} alt={formatDisplay(loc)}
                                                    style={{ maxWidth: 220, maxHeight: 130, width: 'auto', height: 'auto', objectFit: 'contain', background: '#fafafa', borderRadius: 6, border: '2px solid #959595ff', cursor: 'pointer', display: 'block' }}
                                                    onError={(e) => { e.target.style.display = 'none'; const ph = e.target.nextSibling; if (ph) ph.style.display = 'flex'; }}
                                                    onClick={() => {
                                                        const locationUrl = filename 
                                                            ? `https://raw.githubusercontent.com/Pythagean/pokedle_assets/main/locations/${filename}` 
                                                            : (raw ? `https://raw.githubusercontent.com/Pythagean/pokedle_assets/main/locations/${slug}.png` : null);
                                                        setMapPopup({ visible: true, title: formatDisplay(loc), url: locationUrl });
                                                    }}
                                                />
                                                <div style={{ display: 'none', minWidth: 220, minHeight: 130, background: '#fafafa', alignItems: 'center', justifyContent: 'center', color: '#666', borderRadius: 6, border: '1px dashed #ddd' }}>No map</div>
                                            </>
                                        ) : (
                                            <div style={{ width: 220, height: 130, background: '#fafafa', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#666', borderRadius: 6, border: '1px dashed #ddd' }}>No map</div>
                                        )}
                                        <div 
                                            style={{ marginTop: 6, fontSize: 13, textAlign: 'center', color: '#1976d2', cursor: 'pointer', textDecoration: 'underline' }}
                                            onClick={() => {
                                                const locationUrl = filename 
                                                    ? `https://raw.githubusercontent.com/Pythagean/pokedle_assets/main/locations/${filename}` 
                                                    : (raw ? `https://raw.githubusercontent.com/Pythagean/pokedle_assets/main/locations/${slug}.png` : null);
                                                setMapPopup({ visible: true, title: formatDisplay(loc), url: locationUrl });
                                            }}
                                        >
                                            {formatDisplay(loc)}
                                        </div>
                                        {showMethods && (() => {
                                            let method = null;
                                            let games = null;
                                            if (loc && typeof loc === 'object') {
                                                method = loc.method || null;
                                                games = loc.games || null;
                                            }
                                            if (!method && typeof loc === 'string') method = null;
                                            const hasInfo = method || (games && games.length > 0);
                                            if (hasInfo) {
                                                let prettyMethod = method ? String(method).replace(/[-_]+/g, ' ').split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ') : null;
                                                // Remove Rock Smash for Gen 1 Pokemon (but only before All Locations threshold)
                                                if (!showAdditionalLocations && genNumber === 1 && prettyMethod && /rock\s*smash/i.test(prettyMethod)) {
                                                    prettyMethod = null;
                                                }
                                                // Games are already filtered at this point
                                                const gameOrder = ['red', 'blue', 'yellow', 'gold', 'silver', 'crystal', 'ruby', 'sapphire', 'emerald'];
                                                const sortedGames = (games && games.length > 0) ? [...games].sort((a, b) => {
                                                    const aLower = String(a).toLowerCase();
                                                    const bLower = String(b).toLowerCase();
                                                    const aIdx = gameOrder.indexOf(aLower);
                                                    const bIdx = gameOrder.indexOf(bLower);
                                                    if (aIdx === -1 && bIdx === -1) return 0;
                                                    if (aIdx === -1) return 1;
                                                    if (bIdx === -1) return -1;
                                                    return aIdx - bIdx;
                                                }) : [];
                                                const prettyGames = sortedGames.length > 0 ? sortedGames.map(g => {
                                                    const gl = String(g).toLowerCase();
                                                    if (gl === 'firered') return 'FireRed';
                                                    if (gl === 'leafgreen') return 'LeafGreen';
                                                    return String(g).replace(/[-_]+/g, ' ').split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
                                                }).join(', ') : null;
                                                return (
                                                    <div style={{ marginTop: 4, fontSize: 12, textAlign: 'center', color: '#666', display: 'flex', flexDirection: 'column', gap: 2, justifyContent: 'center', alignItems: 'center' }}>
                                                        {prettyGames && (
                                                            <div style={{ display: 'flex', gap: 6, justifyContent: 'center', alignItems: 'center' }}>
                                                                <span style={{ fontWeight: 700 }}>Games:</span>
                                                                <span style={{ fontWeight: 400 }}>{prettyGames}</span>
                                                            </div>
                                                        )}
                                                        {prettyMethod && (
                                                            <div style={{ display: 'flex', gap: 6, justifyContent: 'center', alignItems: 'center' }}>
                                                                <span style={{ fontWeight: 700 }}>Method:</span>
                                                                <span style={{ fontWeight: 400 }}>{prettyMethod} ({loc.chance} chance)</span>
                                                            </div>
                                                        )}
                                                        {(
                                                            <div style={{ display: 'flex', gap: 6, justifyContent: 'center', alignItems: 'center' }}>
                                                                <span style={{ fontWeight: 700 }}>Levels:</span>
                                                                <span style={{ fontWeight: 400 }}>{loc.level_range}</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            }
                                            return null;
                                        })()}
                                </div>
                            );
                        })}
                        {!showGenLocations && genLocations.length === 0 && additionalLocations.length === 0 && 'No locations (only obtainable by evolution)'}
                    </div>

                    {/* Additional locations section */}
                    {showAdditionalLocations && (
                        <>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 24, marginBottom: 6, justifyContent: 'center' }}>
                                <div style={{ fontWeight: 600, fontSize: 15 }}>
                                    {usingPreevolutionForAdditional 
                                        ? (
                                            <>
                                                This Pokémon <span style={{ color: '#eb3d3dff' }}>can't be found in the wild in ANY generation</span>. Its pre-evolution(s) can be found in these locations in {additionalGensText}:
                                            </>
                                        )
                                        : (
                                            <>
                                            This Pokémon can be found in these locations in {additionalGensText}:
                                            </>
                                        )}
                                </div>
                            </div>
                            {additionalLocations.length === 0 ? (
                                <div style={{ color: '#eb3d3dff', fontSize: 14, textAlign: 'center', marginTop: 8 }}>
                                    <strong>No additional locations found in other generations.</strong>
                                </div>
                            ) : (
                            <div className="locations-container" style={{ color: '#333', display: 'flex', flexWrap: 'wrap', gap: '20px 12px', justifyContent: 'center', fontSize: 14, maxWidth: '100%' }}>
                                {additionalLocations.filter(loc => {
                                    // Filter out locations with only Rock Smash method for Gen 1 (but only before All Locations threshold)
                                    if (!showAdditionalLocations && genNumber === 1 && loc && typeof loc === 'object' && loc.method) {
                                        return !/rock\s*smash/i.test(String(loc.method));
                                    }
                                    return true;
                                }).map((loc, i) => {
                                    const raw = getRawName(loc);
                                    const slug = (raw || '').replace(/\s+/g, '_');
                                    let filename = null;
                                    if (locationFileMap) {
                                        filename = locationFileMap[slug] || locationFileMap[raw] || locationFileMap[raw && raw.replace(/[-_]+/g, ' ')] || locationFileMap[raw && raw.toLowerCase()] || locationFileMap[slug && slug.toLowerCase()];
                                    }
                                    const url = filename ? `https://raw.githubusercontent.com/Pythagean/pokedle_assets/main/maps/${filename}` : (raw ? `https://raw.githubusercontent.com/Pythagean/pokedle_assets/main/maps/${slug}.png` : null);
                                    return (
                                        <div key={`${getRawName(loc) || String(i)}_additional_${i}`} className="location-card">
                                                {url ? (
                                                    <>
                                                        <img src={url} alt={formatDisplay(loc)}
                                                            style={{ maxWidth: 160, maxHeight: 120, width: 'auto', height: 'auto', objectFit: 'contain', background: '#fafafa', borderRadius: 6, border: '2px solid #959595ff', cursor: 'pointer', display: 'block' }}
                                                            onError={(e) => { e.target.style.display = 'none'; const ph = e.target.nextSibling; if (ph) ph.style.display = 'flex'; }}
                                                            onClick={() => {
                                                                const locationUrl = filename 
                                                                    ? `https://raw.githubusercontent.com/Pythagean/pokedle_assets/main/locations/${filename}` 
                                                                    : (raw ? `https://raw.githubusercontent.com/Pythagean/pokedle_assets/main/locations/${slug}.png` : null);
                                                                setMapPopup({ visible: true, title: formatDisplay(loc), url: locationUrl });
                                                            }}
                                                        />
                                                        <div style={{ display: 'none', minWidth: 160, minHeight: 120, background: '#fafafa', alignItems: 'center', justifyContent: 'center', color: '#666', borderRadius: 6, border: '1px dashed #ddd' }}>No map</div>
                                                    </>
                                                ) : (
                                                    <div style={{ minWidth: 160, minHeight: 120, background: '#fafafa', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#666', borderRadius: 6, border: '1px dashed #ddd' }}>No map</div>
                                                )}
                                                <div 
                                                    style={{ marginTop: 6, fontSize: 13, textAlign: 'center', color: '#1976d2', cursor: 'pointer', textDecoration: 'underline' }}
                                                    onClick={() => {
                                                        const locationUrl = filename 
                                                            ? `https://raw.githubusercontent.com/Pythagean/pokedle_assets/main/locations/${filename}` 
                                                            : (raw ? `https://raw.githubusercontent.com/Pythagean/pokedle_assets/main/locations/${slug}.png` : null);
                                                        setMapPopup({ visible: true, title: formatDisplay(loc), url: locationUrl });
                                                    }}
                                                >
                                                    {formatDisplay(loc)}
                                                </div>
                                                {showMethods && (() => {
                                                    let method = null;
                                                    let games = null;
                                                    if (loc && typeof loc === 'object') {
                                                        method = loc.method || null;
                                                        games = loc.games || null;
                                                    }
                                                    if (!method && typeof loc === 'string') method = null;
                                                    const hasInfo = method || (games && games.length > 0);
                                                    if (hasInfo) {
                                                        let prettyMethod = method ? String(method).replace(/[-_]+/g, ' ').split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ') : null;
                                                        // Remove Rock Smash for Gen 1 Pokemon (but only before All Locations threshold)
                                                        if (!showAdditionalLocations && genNumber === 1 && prettyMethod && /rock\s*smash/i.test(prettyMethod)) {
                                                            prettyMethod = null;
                                                        }
                                                        const gameOrder = ['red', 'blue', 'yellow', 'gold', 'silver', 'crystal', 'ruby', 'sapphire', 'emerald'];
                                                        const sortedGames = (games && games.length > 0) ? [...games].sort((a, b) => {
                                                            const aLower = String(a).toLowerCase();
                                                            const bLower = String(b).toLowerCase();
                                                            const aIdx = gameOrder.indexOf(aLower);
                                                            const bIdx = gameOrder.indexOf(bLower);
                                                            if (aIdx === -1 && bIdx === -1) return 0;
                                                            if (aIdx === -1) return 1;
                                                            if (bIdx === -1) return -1;
                                                            return aIdx - bIdx;
                                                        }) : [];
                                                        const prettyGames = sortedGames.length > 0 ? sortedGames.map(g => {
                                                            const gl = String(g).toLowerCase();
                                                            if (gl === 'firered') return 'FireRed';
                                                            if (gl === 'leafgreen') return 'LeafGreen';
                                                            return String(g).replace(/[-_]+/g, ' ').split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
                                                        }).join(', ') : null;
                                                        return (
                                                            <div style={{ marginTop: 4, fontSize: 12, textAlign: 'center', color: '#666', display: 'flex', flexDirection: 'column', gap: 2, justifyContent: 'center', alignItems: 'center' }}>
                                                                {prettyGames && (
                                                                    <div style={{ display: 'flex', gap: 6, justifyContent: 'center', alignItems: 'center' }}>
                                                                        <span style={{ fontWeight: 700 }}>Games:</span>
                                                                        <span style={{ fontWeight: 400 }}>{prettyGames}</span>
                                                                    </div>
                                                                )}
                                                                {prettyMethod && (
                                                                    <div style={{ display: 'flex', gap: 6, justifyContent: 'center', alignItems: 'center' }}>
                                                                        <span style={{ fontWeight: 700 }}>Method:</span>
                                                                        <span style={{ fontWeight: 400 }}>{prettyMethod} ({loc.chance} chance)</span>
                                                                    </div>
                                                                )}
                                                                {(
                                                                    <div style={{ display: 'flex', gap: 6, justifyContent: 'center', alignItems: 'center' }}>
                                                                        <span style={{ fontWeight: 700 }}>Levels:</span>
                                                                        <span style={{ fontWeight: 400 }}>{loc.level_range}</span>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        );
                                                    }
                                                    return null;
                                                })()}
                                        </div>
                                    );
                                })}
                            </div>
                            )}
                        </>
                    )}
                    {/* Hint placeholders for what's coming next */}
                    {/* {!isCorrect && !showAdditionalLocations && additionalLocations.length > 0 && (
                        <div style={{ color: '#888', borderTop: '1px dashed #eee', paddingTop: 10, marginTop: 16, fontSize: 15 }}>
                            Additional locations from other regions revealed in {LOCATIONS_HINT_THRESHOLDS[0] - guesses.length} guess{LOCATIONS_HINT_THRESHOLDS[0] - guesses.length === 1 ? '' : 'es'}
                        </div>
                    )}
                    {!isCorrect && showAdditionalLocations && !showMethods && (
                        <div style={{ color: '#888', borderTop: '1px dashed #eee', paddingTop: 10, marginTop: 16, fontSize: 15 }}>
                            Encounter methods revealed in {LOCATIONS_HINT_THRESHOLDS[1] - guesses.length} guess{LOCATIONS_HINT_THRESHOLDS[1] - guesses.length === 1 ? '' : 'es'}
                        </div>
                    )} */}
                </div>
            );
        }
        if (type === 'types') {
            const types = dailyPokemon.types || [];
            if (types.length === 0) return null;
            return (
                <div style={{ marginBottom: 10 }}>
                    <div style={{ fontWeight: 600, fontSize: 18, marginBottom: 8 }}>Type{types.length > 1 ? 's' : ''}:</div>
                    <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
                        {types.map(t => {
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
            );
        }
        if (type === 'held_items') {
            const heldItems = dailyPokemon.held_items || [];
            return (
                <div style={{ marginBottom: 10 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, justifyContent: 'center' }}>
                        <div style={{ fontWeight: 600, fontSize: 18 }}>Held Items:</div>
                        <InfoButton
                            ariaLabel="About held items"
                            placement="right"
                            marginTop={0}
                            content={
                                <div style={{ textAlign: 'left' }}>
                                    Held Items are items this Pokémon may be found holding in the wild
                                </div>
                            }
                        />
                    </div>
                    <div style={{ color: '#333', fontSize: 14 }}>
                        {heldItems.length > 0 ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'center' }}>
                                {heldItems.map((it, i) => {
                                    const display = (typeof it === 'string') ? it : (it.display_name || it.name || '');
                                    const effect = (it && typeof it === 'object') ? (it.effect || null) : null;
                                    let cleanedEffect = null;
                                    if (typeof effect === 'string') {
                                        // Trim surrounding whitespace and remove trailing full-stops/whitespace
                                        const c = String(effect).trim().replace(/[.\s]+$/u, '');
                                        cleanedEffect = c.length > 0 ? c : null;
                                    }
                                    return (
                                        <div key={(display || i) + i} title={cleanedEffect || ''} style={{ textAlign: 'center' }}>
                                            <strong>{display}</strong>{cleanedEffect ? ` (${cleanedEffect})` : null}
                                        </div>
                                    );
                                })}
                            </div>
                        ) : 'No held items'}
                    </div>
                </div>
            );
        }
        if (type === 'evolution_stage') {
            const stage = dailyPokemon.evolution_stage || 1;
            const stageText = stage === 1 ? '1st' : stage === 2 ? '2nd' : stage === 3 ? '3rd' : `${stage}th`;
            const spriteUrl = `https://raw.githubusercontent.com/Pythagean/pokedle_assets/main/sprites_trimmed/${stage}-front.png`;
            return (
                <div style={{ marginBottom: 10 }}>
                    <div style={{ fontWeight: 600, fontSize: 18 }}>Evolution Stage:</div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
                        
                        <div style={{ color: '#333', fontSize: 16, fontWeight: 600, marginTop: 5 }}>{stageText}</div>
                        <img 
                            src={spriteUrl} 
                            alt={`Stage ${stage}`}
                            style={{ width: 24, height: 24, objectFit: 'contain', transform: 'scale(1.5)' }}
                            onError={(e) => { e.target.style.display = 'none'; }}
                        />
                    </div>
                </div>
            );
        }
        return null;
    }

    return (
        <div style={{ textAlign: 'center', marginTop: 10 }}>
            <style>{`
                .location-card {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    width: calc(33.333% - 8px);
                    min-width: 180px;
                    max-width: 220px;
                    flex: 0 1 auto;
                }
                @media (max-width: 768px) {
                    .location-card {
                        width: calc(50% - 10px) !important;
                        min-width: 0 !important;
                        max-width: none !important;
                    }
                    .location-card img {
                        max-width: 150px !important;
                        max-height: 140px !important;
                    }
                    .locations-container {
                        gap: 20px 20px !important;
                    }
                }
            `}</style>
            {/* Map popup overlay */}
            {mapPopup.visible && (
                <div
                    role="dialog"
                    aria-modal="true"
                    onClick={() => setMapPopup({ visible: false, title: null, url: null })}
                    style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000 }}>
                    <div onClick={e => e.stopPropagation()} style={{ background: '#fff', padding: 12, borderRadius: 8, maxWidth: '90%', maxHeight: '70%', boxShadow: '0 6px 30px rgba(0,0,0,0.5)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                            <div style={{ fontWeight: 700 }}>{mapPopup.title || 'Map'}</div>
                            <button onClick={() => setMapPopup({ visible: false, title: null, url: null })} style={{ marginLeft: 12 }}>Close</button>
                        </div>
                        {mapPopup.url ? (
                            <img src={mapPopup.url} alt={mapPopup.title || 'map'} style={{ maxWidth: '80vw', maxHeight: '60vh', display: 'block', margin: '0 auto' }} onError={(e) => { e.target.style.display = 'none'; }} />
                        ) : (
                            <div style={{ padding: 24, color: '#666' }}>No map available for this location.</div>
                        )}
                    </div>
                </div>
            )}
            <Confetti active={showConfetti} centerRef={isCorrect ? lastGuessRef : null} />
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
                <h2 style={{ margin: 0 }}>Locations Mode</h2>
                <InfoButton
                    ariaLabel="How to Play"
                    placement="right"
                    marginTop={190}
                    content={
                        <div style={{ textAlign: 'left' }}>
                            Guess the Pokémon from the in-game Locations.<br /><br />
                            <strong>Initial Clue:</strong> Shows locations from the Pokémon's introduction generation (Gen 1: R/B/Y, Gen 2: G/S/C, Gen 3: R/S/E) with encounter methods.<br />
                            <strong>After 2 guesses:</strong> Reveals all other locations from different generations.<br />
                            <strong>After 4 guesses:</strong> Shows the Pokémon's type(s).<br />
                            <strong>After 6 guesses:</strong> Shows the evolution stage.<br /><br />
                            If the Pokémon has no wild locations, pre-evolution encounter locations are used.
                            <br /><br />
                            The <strong>method</strong> used to find the Pokémon can be any of these: Walk, Surf, Headbutt, Rock Smash, Seaweed, Trade, Roaming, Gift Egg, Gift, Only One, Old Rod, Good Rod, Super Rod
                        </div>
                    }
                />

                {/* <button
                    style={{ padding: '4px 12px', borderRadius: 6, background: resetCount >= 200 ? '#ccc' : '#eee', border: '1px solid #bbb', fontWeight: 600, fontSize: 14, cursor: resetCount >= 200 ? 'not-allowed' : 'pointer', opacity: resetCount >= 200 ? 0.5 : 1 }}
                    onClick={() => {
                        if (resetCount >= 2) return;
                        setGuesses([]);
                        setResetSeed(Math.floor(Math.random() * 1000000000));
                        setResetCount(resetCount + 1);
                    }}
                    disabled={resetCount >= 200}
                >
                    Reset
                </button> */}
            </div>
            {/* <div style={{ margin: '12px auto', maxWidth: 500, display: 'flex', gap: 8, alignItems: 'center', justifyContent: 'center' }}>
                <label htmlFor="override-id" style={{ fontSize: 14, fontWeight: 600 }}>Test Pokémon ID:</label>
                <input
                    id="override-id"
                    type="number"
                    value={overrideId}
                    onChange={(e) => setOverrideId(e.target.value)}
                    placeholder="Enter ID (1-151)"
                    style={{ padding: '6px 10px', borderRadius: 4, border: '1px solid #ccc', width: 140, fontSize: 14 }}
                />
                {overridePokemon && (
                    <span style={{ fontSize: 13, color: '#666' }}>({overridePokemon.name})</span>
                )}
            </div> */}
            <div style={{ margin: '24px auto', maxWidth: 500, fontSize: 18, background: '#f5f5f5', borderRadius: 8, padding: 18, border: '1px solid #ddd', whiteSpace: 'pre-line' }}>
                {!isCorrect && <div style={{ fontWeight: 600, marginBottom: 8 }}>Which Pokémon is found in these locations?</div>}
                {isCorrect && (
                    <>
                        <CongratsMessage guessCount={guesses.length} mode="Location Mode" />
                        <ResetCountdown active={isCorrect} resetHourUtc={RESET_HOUR_UTC} />
                    </>
                )}
                {shownClues.map(type => renderClue(type))}
                {/* Hint placeholder text for next clue - custom logic for Locations page */}
                {!isCorrect && (() => {
                    // Determine what hint will be revealed next based on current guess count
                    const showAdditionalLocs = guesses.length >= LOCATIONS_HINT_THRESHOLDS[0];
                    const showTypes = guesses.length >= LOCATIONS_HINT_THRESHOLDS[1];
                    const showEvolution = guesses.length >= LOCATIONS_HINT_THRESHOLDS[2];
                    
                    if (!showAdditionalLocs) {
                        // Next: Additional locations at threshold[0] (2 guesses)
                        const cluesLeft = LOCATIONS_HINT_THRESHOLDS[0] - guesses.length;
                        return (
                            <div style={{ color: '#888', borderTop: '1px dashed #eee', paddingTop: 10, marginTop: 16, fontSize: 15 }}>
                                <span>Next clue (<b>All Locations</b>) in {cluesLeft} guess{cluesLeft === 1 ? '' : 'es'}!</span>
                            </div>
                        );
                    } else if (!showTypes) {
                        // Next: Types at threshold[1] (4 guesses)
                        const cluesLeft = LOCATIONS_HINT_THRESHOLDS[1] - guesses.length;
                        return (
                            <div style={{ color: '#888', borderTop: '1px dashed #eee', paddingTop: 10, marginTop: 16, fontSize: 15 }}>
                                <span>Next clue (<b>Types</b>) in {cluesLeft} guess{cluesLeft === 1 ? '' : 'es'}!</span>
                            </div>
                        );
                    } else if (!showEvolution) {
                        // Next: Evolution stage at threshold[2] (6 guesses)
                        const cluesLeft = LOCATIONS_HINT_THRESHOLDS[2] - guesses.length;
                        return (
                            <div style={{ color: '#888', borderTop: '1px dashed #eee', paddingTop: 10, marginTop: 16, fontSize: 15 }}>
                                <span>Next clue (<b>Evolution Stage</b>) in {cluesLeft} guess{cluesLeft === 1 ? '' : 'es'}!</span>
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

export default LocationsPage;
