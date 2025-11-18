import { useState, useMemo, useRef, useEffect } from 'react';
import ReactDOM from 'react-dom';
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
  // YYYYMMDD as integer
  return parseInt(date.toISOString().slice(0,10).replace(/-/g, ''), 10);
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
        const utcDay = (new Date()).getUTCDay();
        let cardType = 'normal';
        if (utcDay === 0) cardType = 'special';
        else if (utcDay === 6) cardType = (localRng() < 0.5 ? 'full_art' : 'shiny');
    
        const manifestList = cardManifest[cardType]?.[chosen.id];
        if (manifestList && manifestList.length > 0) return chosen;
        attempts++;
      }
      return null;
    }

    return PAGES.map(p => {
      const meta = SEED_OFFSETS[p.key] || { offset: p.key.length * 1000, letter: p.key.charAt(0) };
      let seedFor;
      if (p.key === 'card') {
        // Card page uses a special base seed and additional manifest-based filtering
        const cardAnswer = getCardAnswer();
        const pageGuesses = guessesByPage[p.key] || [];
        const solved = cardAnswer && pageGuesses.some(g => g.name === cardAnswer.name);
        return { key: p.key, label: p.label, daily: cardAnswer, solved, guessCount: solved ? pageGuesses.length : null };
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
    try {
      const summary = perPageResults.map(r => ({ key: r.key, id: r.daily?.id ?? null, name: r.daily?.name ?? null, solved: !!r.solved, guessCount: r.guessCount ?? null }));
      console.log('Pokedle per-page daily selection:', summary);
      console.log('Pokedle dailyByPage map:', dailyByPage);
    } catch (e) {
      console.log('Error logging perPageResults', e);
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
        if (!p || !p.id) return;
        const id = p.id;
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
      });
    } catch (e) {
      // ignore
    }
    return () => { imgs.length = 0; };
  }, [perPageResults]);

  const allCompleted = perPageResults.length > 0 && perPageResults.every(r => r.solved);
  const [completionOpen, setCompletionOpen] = useState(false);

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
      <Header pages={PAGES} page={page} setPage={setPage} titleImg={titleImg} showCompletionButton={allCompleted} onCompletionClick={() => setCompletionOpen(true)} />
      {/* Page Content - separate scrollable container so header stays fixed */}
        <div
          className="main-app"
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
          {page === 'classic' && <ClassicPage pokemonData={pokemonData} daily={dailyByPage.classic} guesses={guessesByPage.classic} setGuesses={newGuesses => setGuessesByPage(g => ({ ...g, classic: newGuesses }))} />}
        {page === 'pokedex' && <PokedexPage pokemonData={pokemonData} daily={dailyByPage.pokedex} guesses={guessesByPage.pokedex} setGuesses={newGuesses => setGuessesByPage(g => ({ ...g, pokedex: newGuesses }))} />}
  {page === 'stats' && <StatsPage pokemonData={pokemonData} guesses={guessesByPage.stats} setGuesses={newGuesses => setGuessesByPage(g => ({ ...g, stats: newGuesses }))} />}
  {page === 'ability' && <AbilityPage pokemonData={pokemonData} guesses={guessesByPage.ability} setGuesses={newGuesses => setGuessesByPage(g => ({ ...g, ability: newGuesses }))} />}
  {page === 'moves' && <MovesPage pokemonData={pokemonData} guesses={guessesByPage.moves} setGuesses={newGuesses => setGuessesByPage(g => ({ ...g, moves: newGuesses }))} />}
  {page === 'category' && <CategoryPage pokemonData={pokemonData} guesses={guessesByPage.category} setGuesses={newGuesses => setGuessesByPage(g => ({ ...g, category: newGuesses }))} />}
  {page === 'silhouette' && <SilhouettePage pokemonData={pokemonData} silhouetteMeta={silhouetteMeta} daily={dailyByPage.silhouette} guesses={guessesByPage.silhouette} setGuesses={newGuesses => setGuessesByPage(g => ({ ...g, silhouette: newGuesses }))} />}
  {page === 'zoom' && <ZoomPage pokemonData={pokemonData} daily={dailyByPage.zoom} guesses={guessesByPage.zoom} setGuesses={newGuesses => setGuessesByPage(g => ({ ...g, zoom: newGuesses }))} />}
  {page === 'colours' && <ColoursPage pokemonData={pokemonData} daily={dailyByPage.colours} guesses={guessesByPage.colours} setGuesses={newGuesses => setGuessesByPage(g => ({ ...g, colours: newGuesses }))} />}
  {page === 'locations' && <LocationsPage pokemonData={pokemonData} guesses={guessesByPage.locations} setGuesses={newGuesses => setGuessesByPage(g => ({ ...g, locations: newGuesses }))} />}
  {page === 'card' && <CardPage pokemonData={pokemonData} cardManifest={cardManifest} daily={dailyByPage.card} guesses={guessesByPage.card} setGuesses={newGuesses => setGuessesByPage(g => ({ ...g, card: newGuesses }))} />}
  {page === 'gameinfo' && <GameInfoPage pokemonData={pokemonData} daily={dailyByPage.gameinfo} guesses={guessesByPage.gameinfo || []} setGuesses={newGuesses => setGuessesByPage(g => ({ ...g, gameinfo: newGuesses }))} />}
      </div>
      <CompletionPopup open={completionOpen} onClose={() => setCompletionOpen(false)} results={perPageResults} />
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