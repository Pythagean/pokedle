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

    // Build clues for the day — Location Mode focused: show locations in stages, then types
    const cluesForDay = useMemo(() => {
        if (!dailyPokemon) return [];
        return ['locations', 'types'];
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
    const clueCount = getClueCount(guesses.length, LOCATIONS_HINT_THRESHOLDS);
    // Filter out 'types' unless we've reached the third threshold (6 guesses)
    const shownClues = cluesForDay.slice(0, clueCount).filter(clueType => {
        if (clueType === 'types') {
            return guesses.length >= LOCATIONS_HINT_THRESHOLDS[2];
        }
        return true;
    });

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
                    <div style={{ fontWeight: 600, marginBottom: 8, fontSize: 18 }}>Base Stats:</div>
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

            const prettyName = (raw) => {
                if (!raw) return raw;
                return String(raw).replace(/[-_]+/g, ' ').split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
            };

            return (
                <div style={{ marginBottom: 10 }}>
                    <div style={{ fontWeight: 600, fontSize: 18 }}>Abilities:</div>
                    <div style={{ color: '#333', textAlign: 'center', display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'center', fontSize: 14 }}>
                        {abilities.length > 0 ? (
                            abilities.map((a, i) => {
                                if (!a) return null;
                                if (typeof a === 'string') {
                                    return <div key={i}>{prettyName(a)}</div>;
                                }
                                const n = a.name || (a.ability && a.ability.name) || '';
                                const rawEff = a.effect || a.short_effect || a.flavor_text || null;
                                let eff = null;
                                if (rawEff) {
                                    // Trim surrounding whitespace and remove trailing full-stops/whitespace
                                    const cleaned = String(rawEff).trim().replace(/[.\s]+$/u, '');
                                    eff = cleaned.length > 0 ? cleaned : null;
                                }
                                return (
                                    <div key={n || i}>
                                        <strong>{prettyName(n)}</strong>{eff ? ` (${eff})` : null}
                                    </div>
                                );
                            })
                        ) : 'No abilities'}
                    </div>
                </div>
            );
        }
        if (type === 'moves') {
            const moves = dailyPokemon.moves || [];
            // Support legacy string-array moves and new [{name, level_learned_at}] format
            let movesByLevel = null;
            if (moves.length > 0 && typeof moves[0] === 'string') {
                // Legacy format: just show a single line
                movesByLevel = { none: moves };
            } else {
                movesByLevel = moves.reduce((acc, m) => {
                    if (!m) return acc;
                    const name = m.name || (typeof m === 'string' ? m : null);
                    const level = (m && (m.level_learned_at || m.level || 0)) ?? 0;
                    if (!name) return acc;
                    const key = String(level);
                    if (!acc[key]) acc[key] = [];
                    acc[key].push(name);
                    return acc;
                }, {});
            }

            const levelKeys = Object.keys(movesByLevel || {}).filter(k => k !== 'none').map(k => parseInt(k, 10));
            levelKeys.sort((a, b) => a - b);

            return (
                <div style={{ marginBottom: 10 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, justifyContent: 'center' }}>
                        <div style={{ fontWeight: 600, fontSize: 18 }}>Moves Learnt:</div>
                        <InfoButton
                            ariaLabel="About moves clue"
                            placement="right"
                            marginTop={0}
                            content={
                                <div style={{ textAlign: 'left' }}>
                                    Moves Learnt are from Gen 3, and only include those learnt by leveling up (no TMs, HMs, breeding, tutoring, or move tutors).<br />
                                </div>
                            }
                        />
                    </div>
                    <div style={{ color: '#333', textAlign: 'center', fontSize: 14 }}>
                        {Object.prototype.hasOwnProperty.call(movesByLevel, 'none') ? (
                            <div>{movesByLevel.none.join(', ')}</div>
                        ) : (
                            (levelKeys.length > 0 ? levelKeys.map(lvl => (
                                <div key={lvl} style={{ marginBottom: 4, textAlign: 'center' }}>
                                    <strong>Lvl {lvl}</strong> - {(movesByLevel[String(lvl)] || []).slice().sort().join(', ')}
                                </div>
                            )) : 'No moves')
                        )}
                    </div>
                </div>
            );
        }
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
            // Prefer direct wild encounter locations; fall back to pre-evolution encounter data
            let rawLocations = dailyPokemon.location_area_encounters || [];
            let usingPreevolution = false;
            if ((!rawLocations || rawLocations.length === 0) && Array.isArray(dailyPokemon.preevolution_location_area_encounters) && dailyPokemon.preevolution_location_area_encounters.length > 0) {
                rawLocations = dailyPokemon.preevolution_location_area_encounters;
                usingPreevolution = true;
            }

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
            const genRegionMap = { 1: 'Kanto', 2: 'Johto', 3: 'Hoenn' };
            const regionFilter = genRegionMap[genNumber] || null;

            // Calculate gen locations and additional locations
            const genLocations = regionFilter ? rawLocations.filter(loc => {
                if (!loc) return false;
                if (typeof loc === 'object' && loc.region) {
                    try {
                        if (new RegExp(`^${regionFilter}\\b`, 'i').test(String(loc.region))) return true;
                    } catch (e) { /* fall through */ }
                }
                const raw = getRawName(loc) || '';
                try {
                    return new RegExp(`^${regionFilter}\\b`, 'i').test(raw);
                } catch (e) {
                    return false;
                }
            }) : rawLocations;

            const genNames = new Set(genLocations.map(loc => getRawName(loc)));
            const additionalLocations = rawLocations.filter(loc => !genNames.has(getRawName(loc)));

            // Determine what to show based on thresholds from hintConfig
            // LOCATIONS_HINT_THRESHOLDS = [2, 4, 6] → [additional locations, methods, types]
            const showGenLocations = true; // Always shown
            const showAdditionalLocations = guesses.length >= LOCATIONS_HINT_THRESHOLDS[0];
            const showMethods = guesses.length >= LOCATIONS_HINT_THRESHOLDS[1];

            let headerText = 'Wild Encounter Locations:';
            if (!showAdditionalLocations) {
                headerText = `This Pokemon was first found in these locations in its home region:`;
            } else {
                headerText = 'This Pokemon can be found at these locations across Kanto, Johto, and Hoenn:';
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
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, justifyContent: 'center' }}>
                        <div style={{ fontWeight: 600, fontSize: 15 }}>{headerText}</div>
                    </div>
                    {usingPreevolution && (
                        <div style={{ marginTop: 6, marginBottom: 6, fontSize: 13, color: '#666', maxWidth: 420, textAlign: 'center', marginLeft: 'auto', marginRight: 'auto' }}>
                            This Pokémon <strong>can't be found in the wild</strong> - its pre-evolutions can be in these locations:
                        </div>
                    )}
                    <div style={{ color: '#333', display: 'flex', flexWrap: 'wrap', gap: '20px 12px', justifyContent: 'center', fontSize: 14, maxWidth: '100%' }}>
                        {/* Show gen locations */}
                        {showGenLocations && genLocations.length > 0 && genLocations.map((loc, i) => {
                            const raw = getRawName(loc);
                            const slug = (raw || '').replace(/\s+/g, '_');
                            let filename = null;
                            if (locationFileMap) {
                                filename = locationFileMap[slug] || locationFileMap[raw] || locationFileMap[raw && raw.replace(/[-_]+/g, ' ')] || locationFileMap[raw && raw.toLowerCase()] || locationFileMap[slug && slug.toLowerCase()];
                            }
                            const url = filename ? `https://raw.githubusercontent.com/Pythagean/pokedle_assets/main/maps/${filename}` : (raw ? `https://raw.githubusercontent.com/Pythagean/pokedle_assets/main/maps/${slug}.png` : null);
                            return (
                                <div key={`${getRawName(loc) || String(i)}_${i}`} className="location-card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 'calc(33.333% - 8px)', minWidth: 180, maxWidth: 220, flex: '0 1 auto' }}>
                                        {url ? (
                                            <>
                                                <img src={url} alt={formatDisplay(loc)}
                                                    style={{ maxWidth: 220, maxHeight: 130, width: 'auto', height: 'auto', objectFit: 'contain', background: '#fafafa', borderRadius: 6, border: '2px solid #959595ff', cursor: 'default', display: 'block' }}
                                                    onError={(e) => { e.target.style.display = 'none'; const ph = e.target.nextSibling; if (ph) ph.style.display = 'flex'; }}
                                                />
                                                <div style={{ display: 'none', minWidth: 220, minHeight: 130, background: '#fafafa', alignItems: 'center', justifyContent: 'center', color: '#666', borderRadius: 6, border: '1px dashed #ddd' }}>No map</div>
                                            </>
                                        ) : (
                                            <div style={{ width: 220, height: 130, background: '#fafafa', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#666', borderRadius: 6, border: '1px dashed #ddd' }}>No map</div>
                                        )}
                                        <div style={{ marginTop: 6, fontSize: 13, textAlign: 'center', color: '#333' }}>{formatDisplay(loc)}</div>
                                        {showMethods && (() => {
                                            let method = null;
                                            if (loc && typeof loc === 'object') method = loc.method || null;
                                            if (!method && typeof loc === 'string') method = null;
                                            if (method) {
                                                const pretty = String(method).replace(/[-_]+/g, ' ').split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
                                                return (
                                                    <div style={{ marginTop: 4, fontSize: 12, textAlign: 'center', color: '#666', display: 'flex', gap: 6, justifyContent: 'center', alignItems: 'center' }}>
                                                        <span style={{ fontWeight: 700 }}>Method:</span>
                                                        <span style={{ fontWeight: 400 }}>{pretty}</span>
                                                    </div>
                                                );
                                            }
                                            return null;
                                        })()}
                                </div>
                            );
                        })}
                        {/* Show additional locations */}
                        {showAdditionalLocations && additionalLocations.length > 0 && additionalLocations.map((loc, i) => {
                            const raw = getRawName(loc);
                            const slug = (raw || '').replace(/\s+/g, '_');
                            let filename = null;
                            if (locationFileMap) {
                                filename = locationFileMap[slug] || locationFileMap[raw] || locationFileMap[raw && raw.replace(/[-_]+/g, ' ')] || locationFileMap[raw && raw.toLowerCase()] || locationFileMap[slug && slug.toLowerCase()];
                            }
                            const url = filename ? `https://raw.githubusercontent.com/Pythagean/pokedle_assets/main/maps/${filename}` : (raw ? `https://raw.githubusercontent.com/Pythagean/pokedle_assets/main/maps/${slug}.png` : null);
                            return (
                                <div key={`${getRawName(loc) || String(i)}_additional_${i}`} className="location-card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 'calc(33.333% - 8px)', minWidth: 180, maxWidth: 220, flex: '0 1 auto' }}>
                                        {url ? (
                                            <>
                                                <img src={url} alt={formatDisplay(loc)}
                                                    style={{ maxWidth: 160, maxHeight: 120, width: 'auto', height: 'auto', objectFit: 'contain', background: '#fafafa', borderRadius: 6, border: '2px solid #959595ff', cursor: 'default', display: 'block' }}
                                                    onError={(e) => { e.target.style.display = 'none'; const ph = e.target.nextSibling; if (ph) ph.style.display = 'flex'; }}
                                                />
                                                <div style={{ display: 'none', minWidth: 160, minHeight: 120, background: '#fafafa', alignItems: 'center', justifyContent: 'center', color: '#666', borderRadius: 6, border: '1px dashed #ddd' }}>No map</div>
                                            </>
                                        ) : (
                                            <div style={{ minWidth: 160, minHeight: 120, background: '#fafafa', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#666', borderRadius: 6, border: '1px dashed #ddd' }}>No map</div>
                                        )}
                                        <div style={{ marginTop: 6, fontSize: 13, textAlign: 'center', color: '#333' }}>{formatDisplay(loc)}</div>
                                        {showMethods && (() => {
                                            let method = null;
                                            if (loc && typeof loc === 'object') method = loc.method || null;
                                            if (!method && typeof loc === 'string') method = null;
                                            if (method) {
                                                const pretty = String(method).replace(/[-_]+/g, ' ').split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
                                                return (
                                                    <div style={{ marginTop: 4, fontSize: 12, textAlign: 'center', color: '#666', display: 'flex', gap: 6, justifyContent: 'center', alignItems: 'center' }}>
                                                        <span style={{ fontWeight: 700 }}>Method:</span>
                                                        <span style={{ fontWeight: 400 }}>{pretty}</span>
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
        if (type === 'shape') {
            const shape = dailyPokemon.shape || '';
            return (
                <div style={{ marginBottom: 10 }}>
                    <div style={{ fontWeight: 600, fontSize: 18 }}>Shape:</div>
                    <div style={{ color: '#333', fontSize: 14 }}>{shape || 'Unknown'}</div>
                </div>
            );
        }
        return null;
    }

    return (
        <div style={{ textAlign: 'center', marginTop: 10 }}>
            <style>{`
                @media (max-width: 768px) {
                    .location-card {
                        width: calc(50% - 8px) !important;
                        min-width: 140px !important;
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
                    <div onClick={e => e.stopPropagation()} style={{ background: '#fff', padding: 12, borderRadius: 8, maxWidth: '90%', maxHeight: '90%', boxShadow: '0 6px 30px rgba(0,0,0,0.5)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                            <div style={{ fontWeight: 700 }}>{mapPopup.title || 'Map'}</div>
                            <button onClick={() => setMapPopup({ visible: false, title: null, url: null })} style={{ marginLeft: 12 }}>Close</button>
                        </div>
                        {mapPopup.url ? (
                            <img src={mapPopup.url} alt={mapPopup.title || 'map'} style={{ maxWidth: '80vw', maxHeight: '80vh', display: 'block' }} onError={(e) => { e.target.style.display = 'none'; }} />
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
                    marginTop={130}
                    content={
                        <div style={{ textAlign: 'left' }}>
                            Guess the Pokémon from the in-game <strong>Locations</strong>.<br /><br />
                            <strong>Clue 1)</strong> Shows locations from the Pokémon's introduction generation (e.g. Kanto for Gen&nbsp;1).<br />
                            <strong>After 2 guesses:</strong> Reveals additional locations from other generations.<br />
                            <strong>After 4 guesses:</strong> Adds the encounter <em>method</em> (e.g. "Surf", "Fishing") beneath the same maps.<br />
                            <strong>After 6 guesses:</strong> Shows the Pokémon's type(s).<br /><br />
                            If the Pokémon has no wild locations, pre-evolution encounter locations are used.
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
                    const showMethods = guesses.length >= LOCATIONS_HINT_THRESHOLDS[1];
                    const showTypes = guesses.length >= LOCATIONS_HINT_THRESHOLDS[2];
                    
                    if (!showAdditionalLocs) {
                        // Next: Additional locations at threshold[0] (2 guesses)
                        const cluesLeft = LOCATIONS_HINT_THRESHOLDS[0] - guesses.length;
                        return (
                            <div style={{ color: '#888', borderTop: '1px dashed #eee', paddingTop: 10, marginTop: 16, fontSize: 15 }}>
                                <span>Next clue (<b>Additional Locations</b>) in {cluesLeft} guess{cluesLeft === 1 ? '' : 'es'}!</span>
                            </div>
                        );
                    } else if (!showMethods) {
                        // Next: Methods at threshold[1] (4 guesses)
                        const cluesLeft = LOCATIONS_HINT_THRESHOLDS[1] - guesses.length;
                        return (
                            <div style={{ color: '#888', borderTop: '1px dashed #eee', paddingTop: 10, marginTop: 16, fontSize: 15 }}>
                                <span>Next clue (<b>Encounter Methods</b>) in {cluesLeft} guess{cluesLeft === 1 ? '' : 'es'}!</span>
                            </div>
                        );
                    } else if (!showTypes) {
                        // Next: Types at threshold[2] (6 guesses)
                        const cluesLeft = LOCATIONS_HINT_THRESHOLDS[2] - guesses.length;
                        return (
                            <div style={{ color: '#888', borderTop: '1px dashed #eee', paddingTop: 10, marginTop: 16, fontSize: 15 }}>
                                <span>Next clue (<b>Types</b>) in {cluesLeft} guess{cluesLeft === 1 ? '' : 'es'}!</span>
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
