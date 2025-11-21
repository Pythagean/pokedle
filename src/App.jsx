import { useState, useMemo, useRef, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { RESET_HOUR_UTC } from './config/resetConfig';
// import pokemonData from '../data/pokemon_data.json';
// import titleImg from '../data/title.png';

// Load pokemonData and titleImg from public/data at runtime
function usePokemonData() {
  const [pokemonData, setPokemonData] = useState(null);
  useEffect(() => {
    let cancelled = false;
    fetch('data/pokemon_data.json')
      .then(res => res.json())
      .then(data => {
        if (!cancelled) {
          setPokemonData(data);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);
  return pokemonData;
}

// Load card manifest once at app level to avoid repeated network calls
function useCardManifest() {
  const [cardManifest, setCardManifest] = useState(null);
  useEffect(() => {
    let cancelled = false;
    fetch('data/card_manifest.json')
      .then(res => res.json())
      .then(data => {
        if (!cancelled) setCardManifest(data);
      })
      .catch(() => {
        if (!cancelled) setCardManifest(null);
      });
    return () => { cancelled = true; };
  }, []);
  return cardManifest;
}

// Load silhouette metadata once at app level to avoid repeated network calls
function useSilhouetteMeta() {
  const [silhouetteMeta, setSilhouetteMeta] = useState(null);
  useEffect(() => {
    let cancelled = false;
    fetch('data/silhouette_meta.json')
      .then(res => res.json())
      .then(data => {
        if (!cancelled) setSilhouetteMeta(data);
      })
      .catch(() => {
        if (!cancelled) setSilhouetteMeta(null);
      });
    return () => { cancelled = true; };
  }, []);
  return silhouetteMeta;
}

function useTitleImg() {
  // Just return the public path
  return 'data/title.png';
}
import './App.css';


import ClassicPage from './pages/ClassicPage';
import PokedexPage from './pages/PokedexPage';
import SilhouettePage from './pages/SilhouettePage';
import ZoomPage from './pages/ZoomPage';
import ColoursPage from './pages/ColoursPage';
import CardPage from './pages/CardPage';
import GameInfoPage from './pages/GameInfoPage';
import Header from './components/Header';
import CompletionPopup from './components/CompletionPopup';


// Simple deterministic PRNG using a seed
function mulberry32(a) {
  return function() {
    var t = a += 0x6D2B79F5;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  }
}

function getSeedFromDate(date) {
  // YYYYMMDD as integer, using the app-wide UTC reset hour
  // If current UTC hour is on/after the reset hour, use the next UTC day
  let effective = date;
  if (date.getUTCHours() >= RESET_HOUR_UTC) {
    effective = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() + 1, 0, 0, 0));
  }
  return parseInt(effective.toISOString().slice(0,10).replace(/-/g, ''), 10);
}
const PAGES = [
  { key: 'classic', label: 'Classic' },
  { key: 'card', label: 'Card' },
  { key: 'pokedex', label: 'Pokedex' },
  { key: 'silhouette', label: 'Silhouette' },
  { key: 'zoom', label: 'Zoom' },
  { key: 'colours', label: 'Colours' },
  { key: 'gameinfo', label: 'Game Data' },
];

function App() {
  const pokemonData = usePokemonData();
  const cardManifest = useCardManifest();
  const silhouetteMeta = useSilhouetteMeta();
  const titleImg = useTitleImg();
  // Preload navigation icons (including the Results icon) so they appear immediately when header renders
  useEffect(() => {
    const imgs = [];
    try {
      const iconPaths = PAGES.map(p => `icons/${p.key}.png`).concat(['icons/results.png']);
      iconPaths.forEach(path => {
        const img = new Image();
        img.src = path;
        imgs.push(img);
      });
    } catch (e) {
      // ignore
    }
    return () => {
      // help GC
      imgs.length = 0;
    };
  }, []);
  const [page, setPage] = useState('classic');
  const [compactNav, setCompactNav] = useState(() => (typeof window !== 'undefined') ? window.innerWidth <= 1080 : false);
  // Mobile swipe navigation: track small viewport and attach touch handlers
  const mainAppRef = useRef(null);
  const [isMobileView, setIsMobileView] = useState(() => (typeof window !== 'undefined' && window.matchMedia) ? window.matchMedia('(max-width:700px)').matches : false);
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mq = window.matchMedia('(max-width:700px)');
    const onChange = e => setIsMobileView(e.matches);
    try {
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
    if (!isMobileView) return;
    let startX = 0;
    let startY = 0;
    let startTime = 0;
    let ignore = false;
    const THRESHOLD = 50; // px
    const MAX_TIME = 1000; // ms

    function onTouchStart(e) {
      if (!e.touches || e.touches.length === 0) return;
      const t = e.touches[0];
      // Only start tracking if the touch began inside the main-app container
      if (mainAppRef && mainAppRef.current && !mainAppRef.current.contains(t.target)) {
        ignore = true;
        return;
      }
      ignore = false;
      startX = t.clientX;
      startY = t.clientY;
      startTime = Date.now();
    }

    function onTouchEnd(e) {
      if (ignore) return;
      const t = (e.changedTouches && e.changedTouches[0]) || null;
      if (!t) return;
      const dx = t.clientX - startX;
      const dy = t.clientY - startY;
      const dt = Date.now() - startTime;
      if (dt > MAX_TIME) return;
      if (Math.abs(dx) < THRESHOLD) return;
      if (Math.abs(dx) < Math.abs(dy)) return; // primarily vertical gesture

      const idx = PAGES.findIndex(p => p.key === page);
      if (idx === -1) return;
      // Move one page left/right but do NOT wrap around — clamp at ends
      let newIdx = idx + (dx < 0 ? 1 : -1);
      newIdx = Math.max(0, Math.min(PAGES.length - 1, newIdx));
      if (newIdx !== idx) {
        // start animated transition between pages on mobile
        const direction = dx < 0 ? 'left' : 'right';
        startPageTransition(PAGES[newIdx].key, direction);
      }
    }

    document.addEventListener('touchstart', onTouchStart, { passive: true });
    document.addEventListener('touchend', onTouchEnd, { passive: true });
    return () => {
      document.removeEventListener('touchstart', onTouchStart);
      document.removeEventListener('touchend', onTouchEnd);
    };
  }, [isMobileView, page]);

  // Compact header mode: compute at app level and pass to Header
  useEffect(() => {
    function updateCompact() {
      try {
        const isNarrow = (typeof window !== 'undefined') && window.innerWidth <= 1080;
        setCompactNav(isNarrow);
      } catch (e) {}
    }
    updateCompact();
    window.addEventListener('resize', updateCompact);
    return () => window.removeEventListener('resize', updateCompact);
  }, []);
  // Store guesses per page
  const [guessesByPage, setGuessesByPage] = useState({
    classic: [],
    pokedex: [],
    stats: [],
    ability: [],
    moves: [],
    category: [],
    silhouette: [],
    zoom: [],
    colours: [],
    locations: [],
    card: []
  });
  const [highlightedIdx, setHighlightedIdx] = useState(-1);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const inputRef = useRef(null);
  const dropdownRef = useRef(null);
  // Page transition state for animated mobile swipes
  const [pageTransition, setPageTransition] = useState(null);

  function startPageTransition(toKey, direction) {
    if (!toKey || toKey === page) return;
    if (pageTransition) return; // already animating
    // direction: 'left' means go to next (from left->right), 'right' means previous
    setPageTransition({ from: page, to: toKey, direction, animate: false });
    // Trigger animation on next frame
    requestAnimationFrame(() => {
      setPageTransition(prev => prev ? { ...prev, animate: true } : prev);
    });
  }

  // Get today's date as seed, use page key for deterministic daily selection per page
  const today = new Date();
  const seed = getSeedFromDate(today) + page.length * 1000 + page.charCodeAt(0);
  const rng = useMemo(() => mulberry32(seed), [seed]);
  // Pick daily pokemon for the current page
  const dailyIndex = useMemo(() => pokemonData ? Math.floor(rng() * pokemonData.length) : 0, [rng, pokemonData]);
  const dailyPokemon = pokemonData ? pokemonData[dailyIndex] : null;
  // Compute per-page daily pokemon and solved status (run this hook unconditionally)
  const perPageResults = useMemo(() => {
    if (!pokemonData) return [];

    // Seed offsets per page to match the logic used inside each page component
    const SEED_OFFSETS = {
      classic: { offset: 7 * 1000, letter: 'c' },
      card: { offset: 9999, letter: null },
      pokedex: { offset: 7 * 1000, letter: 'p' },
      silhouette: { offset: 7 * 1000, letter: 's' },
      zoom: { offset: 8 * 1000, letter: 'z' },
      colours: { offset: 9 * 1000, letter: 'c' },
      gameinfo: { offset: 13 * 1000, letter: 'g' },
    };

    function getCardAnswer() {
      // Replicate CardPage selection logic to pick a pokemon that has a card manifest entry
      if (!cardManifest) return null;
      const baseSeed = getSeedFromDate(today) + 9999;
      let localRng = mulberry32(baseSeed);
      let attempts = 0;
      while (attempts < 200) {
        const idx = Math.floor(localRng() * pokemonData.length);
        const chosen = pokemonData[idx];
        // Try card types in the same way CardPage does (weekday vs weekend)
        // We can't know user debugDay, so use today's UTC day
        const now = new Date();
        let dayForCard = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0));
        if (now.getUTCHours() >= RESET_HOUR_UTC) {
          dayForCard = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1, 0, 0, 0));
        }
        const utcDay = dayForCard.getUTCDay();
        let cardType = 'normal';
        if (utcDay === 0) cardType = 'special';
        else if (utcDay === 6) cardType = (localRng() < 0.5 ? 'full_art' : 'shiny');

        const manifestList = cardManifest[cardType]?.[chosen.id];
        if (manifestList && manifestList.length > 0) {
          // pick a file deterministically
          const cardFile = manifestList[Math.floor(localRng() * manifestList.length)];
          const folder = `https://raw.githubusercontent.com/Pythagean/pokedle_assets/main/cards/${cardType}`;
          let cardObj = null;
          if (cardType === 'normal' || cardType === 'shiny') {
            cardObj = {
              cropped: `${folder}/cropped/${cardFile}`,
              resized: `${folder}/resized/${cardFile}`,
              cardFile,
              folder,
              cardType
            };
          } else {
            cardObj = {
              cropped: `${folder}/${cardFile}`,
              resized: `${folder}/${cardFile}`,
              cardFile,
              folder,
              cardType
            };
          }
          return { pokemon: chosen, card: cardObj };
        }
        attempts++;
      }
      return null;
    }

    return PAGES.map(p => {
      const meta = SEED_OFFSETS[p.key] || { offset: p.key.length * 1000, letter: p.key.charAt(0) };
      let seedFor;
        if (p.key === 'card') {
        // Card page uses a special base seed and additional manifest-based filtering
        const cardAnswerObj = getCardAnswer(); // { pokemon, card }
        const pageGuesses = guessesByPage[p.key] || [];
        const solved = cardAnswerObj && cardAnswerObj.pokemon && pageGuesses.some(g => g.name === cardAnswerObj.pokemon.name);
        return { key: p.key, label: p.label, daily: cardAnswerObj, solved, guessCount: solved ? pageGuesses.length : null };
      } else {
        seedFor = getSeedFromDate(today) + meta.offset + (meta.letter ? meta.letter.charCodeAt(0) : 0);
      }
      const rngFor = mulberry32(seedFor);
      const idx = Math.floor(rngFor() * pokemonData.length);
      const daily = pokemonData[idx];
      const pageGuesses = guessesByPage[p.key] || [];
      const solved = daily && pageGuesses.some(g => g.name === (daily.name));
      return { key: p.key, label: p.label, daily, solved, guessCount: solved ? pageGuesses.length : null };
    });
  }, [pokemonData, guessesByPage, today, cardManifest]);

  // Map of daily pokemon objects by page key for easy access and prop passing
  const dailyByPage = useMemo(() => {
    const map = {};
    perPageResults.forEach(r => { map[r.key] = r.daily || null; });
    return map;
  }, [perPageResults]);

  // Console-log a compact summary of the selected pokemon for debugging/visibility
  useEffect(() => {
    if (!perPageResults || perPageResults.length === 0) return;
    // Only log in development to avoid noisy production consoles
    if (typeof process !== 'undefined' && process.env && process.env.NODE_ENV === 'production') return;
    try {
      const summary = perPageResults.map(r => {
        const base = { key: r.key, solved: !!r.solved, guessCount: r.guessCount ?? null };
        if (!r.daily) return { ...base, id: null, name: null };
        // Card page returns an object { pokemon, card }
        if (r.key === 'card' && r.daily.pokemon) {
          return {
            ...base,
            id: r.daily.pokemon.id ?? null,
            name: r.daily.pokemon.name ?? null,
            cardFile: r.daily.card?.cardFile ?? null,
            cardType: r.daily.card?.cardType ?? r.daily.card?.card_type ?? null,
          };
        }
        return { ...base, id: r.daily.id ?? null, name: r.daily.name ?? null };
      });
      //console.log('Pokedle per-page daily selection:', summary);
      //console.log('Pokedle dailyByPage map:', dailyByPage);
    } catch (e) {
      if (typeof console !== 'undefined') console.log('Error logging perPageResults', e);
    }
  }, [perPageResults, dailyByPage]);

  // Preload common images (sprites, full image, silhouette) for each selected daily pokemon
  useEffect(() => {
    if (!perPageResults || perPageResults.length === 0) return;
    const imgs = [];
    try {
      const pushed = new Set();
      perPageResults.forEach(r => {
        const p = r.daily;
        if (!p) return;
        // if card page, r.daily may be { pokemon, card }
        const pokemonObj = p.pokemon ? p.pokemon : p;
        if (pokemonObj && pokemonObj.id) {
          const id = pokemonObj.id;
          const candidates = [
            `https://raw.githubusercontent.com/Pythagean/pokedle_assets/main/sprites/${id}-front.png`,
            `https://raw.githubusercontent.com/Pythagean/pokedle_assets/main/images/${id}.png`,
            `https://raw.githubusercontent.com/Pythagean/pokedle_assets/main/silhouettes/${id}.png`,
            `https://raw.githubusercontent.com/Pythagean/pokedle_assets/main/colours/sprite/${id}.png`
          ];
          candidates.forEach(u => {
            if (!pushed.has(u)) {
              pushed.add(u);
              const img = new Image();
              img.src = u;
              imgs.push(img);
            }
          });
        }
        // Preload card images if provided
        if (p.card) {
          const cp = p.card;
          const cardUrls = [];
          if (cp.resized) cardUrls.push(cp.resized);
          if (cp.cropped) cardUrls.push(cp.cropped);
          cardUrls.forEach(u => {
            if (!pushed.has(u)) {
              pushed.add(u);
              const img = new Image();
              img.src = u;
              imgs.push(img);
            }
          });
        }
      });
    } catch (e) {
      // ignore
    }
    return () => { imgs.length = 0; };
  }, [perPageResults]);

  const allCompleted = perPageResults.length > 0 && perPageResults.every(r => r.solved);
  const [completionOpen, setCompletionOpen] = useState(false);

  // Transient highlight flag: becomes true briefly when allCompleted transitions false->true
  const [completionJustCompleted, setCompletionJustCompleted] = useState(false);
  const prevAllCompletedRef = useRef(!!allCompleted);
  useEffect(() => {
    const prev = prevAllCompletedRef.current;
    if (!prev && allCompleted) {
      setCompletionJustCompleted(true);
      const t = setTimeout(() => setCompletionJustCompleted(false), 6000);
      return () => clearTimeout(t);
    }
    prevAllCompletedRef.current = allCompleted;
  }, [allCompleted]);

  if (!pokemonData) return <div>Loading data...</div>;

  // Helper to get/set guesses for current page
  const guesses = guessesByPage[page] || [];
  const setGuesses = (newGuesses) => {
    setGuessesByPage(g => ({ ...g, [page]: newGuesses }));
  };

  // (perPageResults, allCompleted, and completionOpen are declared earlier so
  // hooks run in a stable order regardless of data-loading state)

  // Comparison logic for feedback
  function getComparison(guessPoke, answerPoke) {
    if (!guessPoke || !answerPoke) return {};
    // Helper for partial match (e.g. one type matches)
    function partialMatch(arr1, arr2) {
      return arr1.some(item => arr2.includes(item));
    }
    // Evolution stage: fallback to 1 if not present
    const getEvoStage = poke => poke.evolution_stage || 1;
    const guessEvo = getEvoStage(guessPoke);
    const answerEvo = getEvoStage(answerPoke);
    return {
      name: guessPoke.name === answerPoke.name ? 'match' : 'miss',
      color: (guessPoke.main_colour || guessPoke.color) === (answerPoke.main_colour || answerPoke.color) ? 'match' : 'miss',
      types: JSON.stringify(guessPoke.types) === JSON.stringify(answerPoke.types)
        ? 'match'
        : (partialMatch(guessPoke.types, answerPoke.types) ? 'partial' : 'miss'),
      habitat: guessPoke.habitat === answerPoke.habitat ? 'match' : 'miss',
      height: guessPoke.height === answerPoke.height ? 'match' : (guessPoke.height > answerPoke.height ? 'down' : 'up'),
      weight: guessPoke.weight === answerPoke.weight ? 'match' : (guessPoke.weight > answerPoke.weight ? 'down' : 'up'),
      evolution: guessEvo === answerEvo ? 'match' : (guessEvo > answerEvo ? 'down' : 'up'),
    };
  }

  // Render a page component by key (keeps JSX mapping in one place)
  function renderPageByKey(key) {
    if (key === 'classic') return <ClassicPage pokemonData={pokemonData} daily={dailyByPage.classic} guesses={guessesByPage.classic} setGuesses={newGuesses => setGuessesByPage(g => ({ ...g, classic: newGuesses }))} />;
    if (key === 'pokedex') return <PokedexPage pokemonData={pokemonData} daily={dailyByPage.pokedex} guesses={guessesByPage.pokedex} setGuesses={newGuesses => setGuessesByPage(g => ({ ...g, pokedex: newGuesses }))} />;
    if (key === 'stats') return <StatsPage pokemonData={pokemonData} guesses={guessesByPage.stats} setGuesses={newGuesses => setGuessesByPage(g => ({ ...g, stats: newGuesses }))} />;
    if (key === 'ability') return <AbilityPage pokemonData={pokemonData} guesses={guessesByPage.ability} setGuesses={newGuesses => setGuessesByPage(g => ({ ...g, ability: newGuesses }))} />;
    if (key === 'moves') return <MovesPage pokemonData={pokemonData} guesses={guessesByPage.moves} setGuesses={newGuesses => setGuessesByPage(g => ({ ...g, moves: newGuesses }))} />;
    if (key === 'category') return <CategoryPage pokemonData={pokemonData} guesses={guessesByPage.category} setGuesses={newGuesses => setGuessesByPage(g => ({ ...g, category: newGuesses }))} />;
    if (key === 'silhouette') return <SilhouettePage pokemonData={pokemonData} silhouetteMeta={silhouetteMeta} daily={dailyByPage.silhouette} guesses={guessesByPage.silhouette} setGuesses={newGuesses => setGuessesByPage(g => ({ ...g, silhouette: newGuesses }))} />;
    if (key === 'zoom') return <ZoomPage pokemonData={pokemonData} daily={dailyByPage.zoom} guesses={guessesByPage.zoom} setGuesses={newGuesses => setGuessesByPage(g => ({ ...g, zoom: newGuesses }))} />;
    if (key === 'colours') return <ColoursPage pokemonData={pokemonData} daily={dailyByPage.colours} guesses={guessesByPage.colours} setGuesses={newGuesses => setGuessesByPage(g => ({ ...g, colours: newGuesses }))} />;
    if (key === 'locations') return <LocationsPage pokemonData={pokemonData} guesses={guessesByPage.locations} setGuesses={newGuesses => setGuessesByPage(g => ({ ...g, locations: newGuesses }))} />;
    if (key === 'card') return <CardPage pokemonData={pokemonData} daily={dailyByPage.card} guesses={guessesByPage.card} setGuesses={newGuesses => setGuessesByPage(g => ({ ...g, card: newGuesses }))} />;
    if (key === 'gameinfo') return <GameInfoPage pokemonData={pokemonData} daily={dailyByPage.gameinfo} guesses={guessesByPage.gameinfo || []} setGuesses={newGuesses => setGuessesByPage(g => ({ ...g, gameinfo: newGuesses }))} />;
    return null;
  }

  return (
    <>
      {/* Fixed header at top-level so it never scrolls with content */}
      <style>{`
        @media (max-width: 600px) {
          .main-app {
            padding: 30px 4px 4px 4px !important;
            min-height: calc(100vh - 60px) !important;
            height: auto !important;
          }
        }
      `}</style>
      {
        (() => {
          const completedPages = perPageResults.reduce((acc, r) => ({ ...acc, [r.key]: !!r.solved }), {});
          return <Header pages={PAGES} page={page} setPage={setPage} titleImg={titleImg} showCompletionButton={allCompleted} onCompletionClick={() => setCompletionOpen(true)} highlightCompletion={completionJustCompleted} completionActive={completionOpen} completedPages={completedPages} compactNav={compactNav} />;
        })()
      }
      {/* Page Content - separate scrollable container so header stays fixed */}
        <div
          className="main-app"
          ref={mainAppRef}
          style={{
            maxWidth: 900,
            margin: '0 auto',
            padding: '60px 0px 24px 0px',
            fontFamily: 'Inter, Arial, sans-serif',
            boxSizing: 'border-box',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'stretch',
            justifyContent: 'flex-start',
            minHeight: 'calc(100vh - 96px)',
            touchAction: 'pan-y',
          }}
        >
          <style>{`
            @media (max-width: 600px) {
          .main-app {
            padding: '30px 0px 24px 0px !important;',
          }
            }
          `}</style>
          {/* Page Content */}
          {!pageTransition && renderPageByKey(page)}
          {pageTransition && (
            <div style={{ position: 'relative', width: '100%', overflow: 'hidden' }}>
              <div
                style={{
                  display: 'flex',
                  width: '200%',
                  transition: 'transform 360ms cubic-bezier(.2,.8,.2,1)',
                  transform: pageTransition.animate
                    ? (pageTransition.direction === 'left' ? 'translateX(-50%)' : 'translateX(0%)')
                    : (pageTransition.direction === 'left' ? 'translateX(0%)' : 'translateX(-50%)')
                }}
                onTransitionEnd={() => {
                  // commit the page change and clear transition state
                  setPage(pageTransition.to);
                  setPageTransition(null);
                }}
              >
                {/* Order the slides so animation direction matches visual motion */}
                {pageTransition.direction === 'left' ? (
                  <>
                    <div style={{ width: '50%' }}>{renderPageByKey(pageTransition.from)}</div>
                    <div style={{ width: '50%' }}>{renderPageByKey(pageTransition.to)}</div>
                  </>
                ) : (
                  <>
                    <div style={{ width: '50%' }}>{renderPageByKey(pageTransition.to)}</div>
                    <div style={{ width: '50%' }}>{renderPageByKey(pageTransition.from)}</div>
                  </>
                )}
              </div>
            </div>
          )}
      </div>
      <CompletionPopup open={completionOpen} onClose={() => setCompletionOpen(false)} results={perPageResults} guessesByPage={guessesByPage} />
      <style>{`
        @media (max-width: 600px) {
          .main-app {
            min-height: calc(100vh - 80px) !important;
            height: auto !important;
          }
        }
      `}</style>
    </>
  );
}
export default App;