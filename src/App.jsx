import { useState, useMemo, useRef, useEffect } from 'react';
// import pokemonData from '../data/pokemon_data.json';
// import titleImg from '../data/title.png';

// Load pokemonData and titleImg from public/data at runtime
function usePokemonData() {
  const [pokemonData, setPokemonData] = useState(null);
  useEffect(() => {
    fetch('/data/pokemon_data.json')
      .then(res => res.json())
      .then(setPokemonData);
  }, []);
  return pokemonData;
}

function useTitleImg() {
  // Just return the public path
  return '/data/title.png';
}
import './App.css';


import ClassicPage from './pages/ClassicPage';
import PokedexPage from './pages/PokedexPage';
import SilhouettePage from './pages/SilhouettePage';
import ZoomPage from './pages/ZoomPage';
import ColoursPage from './pages/ColoursPage';
import CardPage from './pages/CardPage';
import GameInfoPage from './pages/GameInfoPage';


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
  { key: 'gameinfo', label: 'Game Info' },
];

function App() {
  const pokemonData = usePokemonData();
  const titleImg = useTitleImg();
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

  if (!pokemonData) return <div>Loading data...</div>;

  // Helper to get/set guesses for current page
  const guesses = guessesByPage[page] || [];
  const setGuesses = (newGuesses) => {
    setGuessesByPage(g => ({ ...g, [page]: newGuesses }));
  };

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
      color: guessPoke.color === answerPoke.color ? 'match' : 'miss',
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
    <div style={{
      maxWidth: 900,
      margin: '0 auto',
      padding: '112px 24px 24px 24px', // 96px header + 16px gap
      fontFamily: 'Inter, Arial, sans-serif',
      minHeight: 'calc(100vh - 96px)',
      height: 'calc(100vh - 96px)',
      boxSizing: 'border-box',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'stretch',
      justifyContent: 'flex-start',
      overflow: 'hidden',
    }}>
      <div style={{
        width: '100vw',
        left: 0,
        top: 0,
        position: 'fixed',
        background: '#f8fafc',
        borderBottom: '1px solid #e0e0e0',
        boxShadow: '0 2px 8px #0001',
        padding: 0,
        margin: 0,
        zIndex: 100,
      }}>
        <div style={{
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          maxWidth: 1100,
          margin: '0 auto',
          padding: '0 32px',
          height: 96,
        }}>
          <div style={{ flex: '0 0 auto', display: 'flex', alignItems: 'center', height: '100%' }}>
            <img
              src={titleImg}
              alt="Pokédle"
              style={{
                height: 72,
                width: 'auto',
                display: 'block',
                objectFit: 'contain',
                marginRight: 32,
              }}
            />
          </div>
          <div style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
            <nav style={{ display: 'flex', gap: 12 }}>
              {PAGES.map(p => (
                <button
                  key={p.key}
                  onClick={() => setPage(p.key)}
                  style={{
                    padding: '10px 22px',
                    borderRadius: 8,
                    background: page === p.key ? '#1976d2' : 'transparent',
                    color: page === p.key ? '#fff' : '#1976d2',
                    border: page === p.key ? 'none' : '1.5px solid #1976d2',
                    fontWeight: 600,
                    fontSize: 18,
                    cursor: 'pointer',
                    boxShadow: page === p.key ? '0 2px 8px #1976d233' : 'none',
                    transition: 'background 0.2s, color 0.2s',
                    marginLeft: 0,
                    marginRight: 0,
                  }}
                >
                  {p.label}
                </button>
              ))}
            </nav>
          </div>
        </div>
      </div>
  {/* Page Content */}
  {page === 'classic' && <ClassicPage guesses={guessesByPage.classic} setGuesses={newGuesses => setGuessesByPage(g => ({ ...g, classic: newGuesses }))} />}
  {page === 'pokedex' && <PokedexPage guesses={guessesByPage.pokedex} setGuesses={newGuesses => setGuessesByPage(g => ({ ...g, pokedex: newGuesses }))} />}
  {page === 'stats' && <StatsPage guesses={guessesByPage.stats} setGuesses={newGuesses => setGuessesByPage(g => ({ ...g, stats: newGuesses }))} />}
  {page === 'ability' && <AbilityPage guesses={guessesByPage.ability} setGuesses={newGuesses => setGuessesByPage(g => ({ ...g, ability: newGuesses }))} />}
  {page === 'moves' && <MovesPage guesses={guessesByPage.moves} setGuesses={newGuesses => setGuessesByPage(g => ({ ...g, moves: newGuesses }))} />}
  {page === 'category' && <CategoryPage guesses={guessesByPage.category} setGuesses={newGuesses => setGuessesByPage(g => ({ ...g, category: newGuesses }))} />}
  {page === 'silhouette' && <SilhouettePage guesses={guessesByPage.silhouette} setGuesses={newGuesses => setGuessesByPage(g => ({ ...g, silhouette: newGuesses }))} />}
  {page === 'zoom' && <ZoomPage guesses={guessesByPage.zoom} setGuesses={newGuesses => setGuessesByPage(g => ({ ...g, zoom: newGuesses }))} />}
  {page === 'colours' && <ColoursPage guesses={guessesByPage.colours} setGuesses={newGuesses => setGuessesByPage(g => ({ ...g, colours: newGuesses }))} />}
  {page === 'locations' && <LocationsPage guesses={guessesByPage.locations} setGuesses={newGuesses => setGuessesByPage(g => ({ ...g, locations: newGuesses }))} />}
  {page === 'card' && <CardPage guesses={guessesByPage.card} setGuesses={newGuesses => setGuessesByPage(g => ({ ...g, card: newGuesses }))} />}
  {page === 'gameinfo' && <GameInfoPage guesses={guessesByPage.gameinfo || []} setGuesses={newGuesses => setGuessesByPage(g => ({ ...g, gameinfo: newGuesses }))} />}
    </div>
  );
}
export default App;
