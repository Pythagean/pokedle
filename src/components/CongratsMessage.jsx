import React, { useEffect, useState } from 'react';
import { RESET_HOUR_UTC } from '../config/resetConfig';

// Phrase dictionary shared between component and export
export const PHRASES = [
  // 1-10 guesses
  { text: 'Nice going, Trainer!', mode: 'all', min: 1, max: 3 },
  { text: 'That was super effective!', mode: 'all', min: 1, max: 3 },
  { text: "Excellent work, Trainer!", mode: 'all', min: 1, max: 4 },
  { text: "Incredible! That guess was worthy of a Legendary Trainer", mode: 'all', min: 1, max: 2 },
  { text: 'Your Pokédex has been updated', mode: 'all', min: 1, max: 10 },
  { text: 'Your Pokédex skills are top-tier', mode: 'all', min: 1, max: 3 },
  { text: 'A Trainer with knowledge that rivals Professor {professor}', mode: 'all', min: 1, max: 3 },
  { text: 'Those Pokédex instincts never miss', mode: 'all', min: 1, max: 4 },
  { text: 'You trained hard and it paid off', mode: 'all', min: 1, max: 4 },
  { text: 'Your Poké Ball aim is improving', mode: 'all', min: 1, max: 4 },
  { text: 'Your Trainer senses are on point', mode: 'all', min: 1, max: 3 },
  { text: 'Super effective guess!', mode: 'all', min: 1, max: 3 },
  { text: 'A legendary performance!', mode: 'all', min: 1, max: 2 },
  { text: 'Your Pokédex is up to date', mode: 'all', min: 1, max: 5 },
  { text: 'You identified it like a true field researcher', mode: 'all', min: 1, max: 4 },
  { text: 'Another entry confirmed in the Pokédex', mode: 'all', min: 1, max: 5 },
  { text: 'Your fieldwork continues to impress', mode: 'all', min: 1, max: 4 },
  { text: 'The Pokédex thanks you for your contribution', mode: 'all', min: 1, max: 7 },    
  
  // Medium guesses (5-9)
  { text: 'A bit of wandering tall grass, but you made it out!', mode: 'all', min: 4, max: 9 },
  { text: 'That Pokémon tried to hide, but you outsmarted it… eventually!', mode: 'all', min: 4, max: 9 },
  { text: 'A few missed attacks, but you still landed the final blow', mode: 'all', min: 4, max: 9 },
  { text: 'It was a tough encounter, but you caught it in the end!', mode: 'all', min: 4, max: 9 },
  { text: 'You stumbled a bit like a Magikarp out of water, but victory is yours', mode: 'all', min: 4, max: 9 },
  { text: 'A slow start like a Slaking, but you finished strong', mode: 'all', min: 4, max: 9 },
  { text: 'That battle was tough, but you came out on top', mode: 'all', min: 4, max: 9 },
  { text: 'A few misses, but your catching skills are sharp', mode: 'all', min: 4, max: 9 },
  { text: 'You caught it… eventually!', mode: 'all', min: 4, max: 9 },
  { text: 'You wrestled that guess into submission like a {fighting}', mode: 'all', min: 4, max: 9 },
  { text: 'You\'ve added valuable data to Pokémon research', mode: 'all', min: 3, max: 9 },
  { text: 'Careful study rewards those who persist', mode: 'all', min: 4, max: 9 },

  // 10+ guesses
  { text: 'Looks like you\'re blasting off again', mode: 'all', min: 8, max: 9999 },
  { text: 'Phew — finally!', mode: 'all', min: 8, max: 9999 },
  { text: 'Oof — that was rough', mode: 'all', min: 8, max: 9999 },
  { text: 'You\'re as precise as a Poké Ball throw on a {legendary}', mode: 'all', min: 8, max: 9999 },
  { text: 'Hey, even Snorlax takes a while to wake up', mode: 'all', min: 8, max: 15 },
  { text: 'You got there… eventually', mode: 'all', min: 7, max: 13 },
  { text: 'Whew, that one almost fled the battle', mode: 'all', min: 7, max: 9999 },
  { text: 'Your Pokédex must\'ve been on low battery', mode: 'all', min: 7, max: 9999 },
  { text: 'A rocky start, but you pulled through', mode: 'all', min: 7, max: 9999 },
  { text: '{slow} would\'ve done it faster', mode: 'all', min: 8, max: 9999 },
  { text: 'Good thing guesses don\'t cost Poké Balls', mode: 'all', min: 7, max: 9999 },
  { text: 'Even Professor {professor} would\'ve sighed', mode: 'all', min: 7, max: 9999 },
  { text: 'That had you wandering like a lost {lost}', mode: 'all', min: 7, max: 9999 },
  { text: 'Professor Oak is disappointed, but not surprised', mode: 'all', min: 8, max: 9999 },
  { text: 'The Pokémon fell asleep waiting, but you got there', mode: 'all', min: 8, max: 9999 },
  { text: 'Good grief…', mode: 'all', min: 10, max: 9999 },
  { text: 'That Pokémon wasn\'t hiding—you just weren\'t looking', mode: 'all', min: 10, max: 9999 },
  { text: 'You hurt yourself in confusion', mode: 'all', min: 10, max: 9999 },
  { text: 'Big Ooof', mode: 'all', min: 9, max: 9999 },
  { text: 'Ouch!', mode: 'all', min: 10, max: 9999 },
  { text: 'Holy Moly', mode: 'all', min: 10, max: 9999 },
  { text: 'Did you have your eyes closed?', mode: 'all', min: 8, max: 9999 },

  // Classic mode specific
  { text: 'You know your typings better than a Gym Leader', mode: 'Classic', min: 1, max: 5 },
  { text: 'You analyse Pokémon like a true Battle Tower champion', mode: 'Classic', min: 1, max: 4 },
  { text: 'Your Pokédex knowledge is evolving nicely', mode: 'Classic', min: 1, max: 5 },
  { text: 'Your Pokédex knowledge took a nap', mode: 'Classic', min: 9, max: 9999 },
  { text: 'Should have guessed {should}', mode: 'Classic', min: 8, max: 9999 },

  // Card mode specific
  { text: 'A perfect pull from the booster pack', mode: 'Card', min: 1, max: 3 },
  { text: 'Your eye for TCG details is unmatched', mode: 'Card', min: 1, max: 4 },
  { text: 'That was a rare find, Trainer', mode: 'Card', min: 1, max: 3 },
  { text: 'You read that card like a Poképro', mode: 'Card', min: 1, max: 5 },
  { text: 'An ultra-rare play worthy of a Master', mode: 'Card', min: 1, max: 4 },
  { text: 'An eye for cardboard treasure, Trainer', mode: 'Card', min: 1, max: 4 },
  { text: 'The Pokéloot senses are strong with you', mode: 'Card', min: 1, max: 5 },
  { text: 'That card couldn\'t hide from your sharp eyes!', mode: 'Card', min: 1, max: 4 },
  { text: 'You flipped the deck in your favor!', mode: 'Card', min: 1, max: 5 },
  { text: 'Another rare find for your collection!', mode: 'Card', min: 1, max: 5 },
  { text: 'You played your cards perfectly!', mode: 'Card', min: 1, max: 4 },
  { text: 'Excellent observation! Another card properly catalogued.', mode: 'Card', min: 1, max: 4 },
  { text: 'Your collection knowledge is impressive.', mode: 'Card', min: 1, max: 4 },
  { text: 'Your knowledge of printed cardboard is second to none!', mode: 'Card', min: 1, max: 2 },
  { text: 'That blur played hard to catch, but you got it!', mode: 'Card', min: 5, max: 9999 },
  { text: 'A little tricky, but your Trainer instincts prevailed!', mode: 'Card', min: 5, max: 9999 },
  { text: 'That blur must\'ve been extra blurry today', mode: 'Card', min: 7, max: 9999 },
  { text: 'You pulled a few dud packs before the rare hit', mode: 'Card', min: 7, max: 9999 },
  { text: 'Maybe stick to pre-constructed decks', mode: 'Card', min: 7, max: 9999 },
  { text: 'You enhanced… and enhanced… and enhanced…', mode: 'Card', min: 8, max: 9999 },

  // Pokedex mode specific
  { text: 'You know your Pokédex better than a Rotom Dex', mode: 'Pokédex', min: 1, max: 4 },
  { text: 'You read field reports like a true Pokémon Professor', mode: 'Pokédex', min: 1, max: 4 },
  { text: 'Your Pokélore knowledge is next-level', mode: 'Pokédex', min: 1, max: 4 },
  { text: 'No description can fool you', mode: 'Pokédex', min: 1, max: 5 },
  { text: 'That Pokédex entry didn\'t stand a chance', mode: 'Pokédex', min: 1, max: 5 },
  { text: 'You recognised the behaviour instantly', mode: 'Pokédex', min: 1, max: 5 },
  { text: 'Even Professor {professor} would be impressed', mode: 'Pokédex', min: 1, max: 5 },
  { text: 'Your Pokédex knowledge took a nap', mode: 'Pokédex', min: 9, max: 9999 },
  { text: 'A bit of a puzzle, but you cracked its Pokédex entry!', mode: 'Pokédex', min: 6, max: 9999 },

  // Silhouette mode specific
  { text: 'Silhouette sleuth', mode: 'Silhouette', min: 1, max: 2 },
  { text: 'Even the shadows can\'t hide from you', mode: 'Silhouette', min: 1, max: 4 },
  { text: 'You spotted the Pokémon before the lights came on', mode: 'Silhouette', min: 1, max: 6 },
  { text: 'No need to teach a Pokémon Flash!', mode: 'Silhouette', min: 1, max: 4 },
  { text: 'Outstanding! Your observation skills are as sharp as a {stinger}\'s stinger', mode: 'Silhouette', min: 1, max: 4 },
  { text: 'Outstanding! Your observation skills are as sharp as a {fangs}\'s fangs', mode: 'Silhouette', min: 1, max: 4 },
  { text: 'Outstanding! Your observation skills are as sharp as a {scythes}\'s scythes', mode: 'Silhouette', min: 1, max: 5 },
  { text: 'Outstanding! Your observation skills are as sharp as a {claws}\'s claws', mode: 'Silhouette', min: 1, max: 5 },
  { text: 'You\'ve played a lot of "Who\'s That Pokémon?!"', mode: 'Silhouette', min: 1, max: 4 },
  { text: 'You detect shapes like a {bat} in a cave', mode: 'Silhouette', min: 1, max: 3 },
  { text: 'Even with Flash, it would\'ve been rough', mode: 'Silhouette', min: 8, max: 9999 },
  { text: 'CSI: Pokémon took longer than expected', mode: 'Silhouette', min: 9, max: 9999 },
  { text: 'You enhanced… and enhanced… and enhanced…', mode: 'Silhouette', min: 8, max: 9999 },

  // Zoom mode specific
  { text: 'Sharp eye', mode: 'Zoom', min: 1, max: 2 },
  { text: 'Outstanding! Your observation skills are as sharp as a {stinger}\'s stinger', mode: 'Zoom', min: 1, max: 4 },
  { text: 'Outstanding! Your observation skills are as sharp as a {fangs}\'s fangs', mode: 'Zoom', min: 1, max: 4 },
  { text: 'Outstanding! Your observation skills are as sharp as a {scythes}\'s scythes', mode: 'Zoom', min: 1, max: 5 },
  { text: 'Outstanding! Your observation skills are as sharp as a {claws}\'s claws', mode: 'Zoom', min: 1, max: 5 },
  { text: 'Your eyesight is sharper than a Pidgeot', mode: 'Zoom', min: 1, max: 3 },
  { text: 'Your eye for details is Mega-Evolved', mode: 'Zoom', min: 1, max: 4 },
  { text: 'Not a single pixel slipped past your vision', mode: 'Zoom', min: 1, max: 5 },
  { text: 'Sharper than a Keen Eye ability', mode: 'Zoom', min: 1, max: 5 },
  { text: 'Did you try guessing Ditto?', mode: 'Zoom', min: 8, max: 9999 },
  { text: 'CSI: Pokémon took longer than expected', mode: 'Zoom', min: 9, max: 9999 },
  { text: 'You enhanced… and enhanced… and enhanced…', mode: 'Zoom', min: 8, max: 9999 },

  // Colour mode specific
  { text: 'Silhouette sleuth', mode: 'Colours', min: 1, max: 2 },
  { text: 'Outstanding! Your observation skills are as sharp as a {stinger}\'s stinger', mode: 'Colours', min: 1, max: 4 },
  { text: 'Outstanding! Your observation skills are as sharp as a {fangs}\'s fangs', mode: 'Colours', min: 1, max: 4 },
  { text: 'Outstanding! Your observation skills are as sharp as a {scythes}\'s scythes', mode: 'Colours', min: 1, max: 5 },
  { text: 'Outstanding! Your observation skills are as sharp as a {claws}\'s claws', mode: 'Colours', min: 1, max: 5 },
  { text: 'A true expert in Pokémon palettes', mode: 'Colours', min: 1, max: 4 },
  { text: 'A pro in Pokémon palettes', mode: 'Colours', min: 1, max: 4 },
  { text: 'Your colour sense is super effective', mode: 'Colours', min: 1, max: 5 },
  { text: 'You can spot a Pokémon by hue alone', mode: 'Colours', min: 1, max: 5 },
  { text: 'Your eye for colours would impress a Smeargle', mode: 'Colours', min: 1, max: 4 },
  { text: 'Pixel-perfect detection, Trainer', mode: 'Colours', min: 1, max: 4 },
  { text: 'You see Pokémon hues like a Smeargle studying palettes', mode: 'Colours', min: 1, max: 5 },
  { text: 'A chromatic genius in the making', mode: 'Colours', min: 1, max: 3 },
  { text: 'No tint or tone can escape you', mode: 'Colours', min: 1, max: 6 },
  { text: 'Even Smeargle would\'ve raised an eyebrow', mode: 'Colours', min: 8, max: 9999 },

  // Locations
  { text: 'You know your Pokédex better than a Rotom Dex', mode: 'Locations', min: 1, max: 5 },
  { text: 'Your Locations knowledge is elite-four tier', mode: 'Locations', min: 1, max: 5 },
  { text: 'Abilities and stats bend to your will', mode: 'Locations', min: 1, max: 5 },
  { text: 'You analyse Pokémon like a true Battle Tower champion', mode: 'Locations', min: 1, max: 5 },
  { text: 'Your data sense is stronger than a Porygon\'s analysis', mode: 'Locations', min: 1, max: 5 },
  { text: 'Even Professor {professor} would be impressed', mode: 'Locations', min: 1, max: 6 },
  { text: 'You read Pokémon metadata like the PokéNerd you are', mode: 'Locations', min: 1, max: 2 },
  { text: 'Your Pokédex knowledge took a nap', mode: 'Locations', min: 9, max: 9999 },
  { text: 'Even a Rotom Dex would\'ve glitched on that one', mode: 'Locations', min: 8, max: 9999 },
];

export const POKEMON = {
  "fast": ["Pidgeot", "Jolteon", "Rapidash", "Dodrio", "Pikachu"],
  "eyesight": ["Pidgeot"],
  "stinger": ["Weedle", "Beedrill", "Wurmple", "Ariados", "Spinarak", "Nidoking", "Nidorino"],
  "fangs": ["Zubat", "Golbat", "Rattata", "Raticate", "Arbok", "Ariados", "Mightyena", "Gyarados", "Feraligator", "Arcanine", "Houndoom", "Sharpedo"],
  "scythes": ["Scyther", "Kabutops"],
  "claws": ["Sandslash", "Fearow", "Sneasel", "Ursaring"],
  "spark": ["Pikachu", "Electabuzz", "Jolteon", "Electrode", "Pichu", "Ampharos"],
  "smart": ["Alakazam", "Slowking"],
  "legendary": ["Mewtwo", "Zapdos", "Moltres", "Articuno", "Raikou", "Entei", "Suicune", "Rayquaza", "Lugia", "Ho-Oh"],
  "professor": ["Oak", "Elm", "Birch"],
  "bat": ["Zubat", "Golbat", "Crobat"],
  "slow": ["Slowpoke", "Snorlax", "Slaking"],
  "lost": ["Psyduck"],
  "fighting": ["Machop", "Machoke", "Machamp", "Mankey", "Primeape", "Hitmonlee", "Hitmonchan", "Hitmontop", "Hariyama", "Tyrogue"],
  "should": ["Poliwhirl", "Weepingbell", "Primeape"],
};

// Export function to get phrase text for TCG cards
export function getCongratsPhrase(guessCount, mode = 'all', divideBy = 1) {
  // Divide guess count if specified
  const adjustedGuessCount = Math.max(1, Math.floor(guessCount / divideBy));
  
  // Filter candidates by mode and adjusted guess count
  const candidates = PHRASES.filter(p => {
    const pm = (p.mode || '').toLowerCase();
    const m = (mode || '').toLowerCase();
    const modeMatch = pm === 'all' || pm === m || m.includes(pm) || pm.includes(m);
    return modeMatch && adjustedGuessCount >= p.min && adjustedGuessCount <= p.max;
  });
  
  if (candidates.length === 0) return '';
  
  // Pick random candidate and substitute tokens
  const chosen = candidates[Math.floor(Math.random() * candidates.length)];
  let text = chosen.text || '';
  
  text = text.replace(/\{(\w+)\}/g, (full, key) => {
    const list = POKEMON[key];
    if (!Array.isArray(list) || list.length === 0) return full;
    const idx = Math.floor(Math.random() * list.length);
    return list[idx];
  });
  
  return text;
}

export default function CongratsMessage({ guessCount, mode = 'Silhouette Mode', classic = false, guesses = [], answer = null }) {
  const [phraseResetSeed, setPhraseResetSeed] = useState(null);
  useEffect(() => {
    // Inject styles into the document (only once)
    if (typeof document !== 'undefined' && !document.getElementById('pokedle-congrats-styles')) {
      const s = document.createElement('style');
      s.id = 'pokedle-congrats-styles';
      s.innerHTML = congratsStyles;
      document.head.appendChild(s);
    }
  }, []);

  // Emoji pools by guess-count ranges. Pick a random emoji from the
  // appropriate pool when the component mounts or when `guessCount`
  // changes so the celebration feels lively.
  const EMOJI_POOLS = {
    excellent: ['🎯', '🏆', '✨', '🌟'],
    veryGood: ['🔥', '💥', '⚡️', '🎉'],
    good: ['⚡️', '👍', '👏', '😄'],
    meh: ['👍', '🙂', '🙂', '😌'],
    poor: ['🫢', '😅', '🙃', '🤏'],
    awful: ['💀', '😬', '😵', '😵‍💫']
  };

  function pickPool(n) {
    if (n === 1) return EMOJI_POOLS.excellent;
    if (n >= 2 && n <= 3) return EMOJI_POOLS.veryGood;
    if (n >= 4 && n <= 5) return EMOJI_POOLS.good;
    if (n >= 6 && n <= 8) return EMOJI_POOLS.meh;
    if (n >= 9 && n <= 12) return EMOJI_POOLS.poor;
    return EMOJI_POOLS.awful;
  }

  const [celebrationEmoji, setCelebrationEmoji] = useState(null);

  useEffect(() => {
    // Persist one emoji per player per day/mode/guessCount so it remains
    // stable across reloads for that player. Use effective UTC day.
    try {
      const now = new Date();
      let effDay = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0));
      if (now.getUTCHours() >= RESET_HOUR_UTC) {
        effDay = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1, 0, 0, 0));
      }
      const dayStr = effDay.toISOString().slice(0, 10).replace(/-/g, '');
      const storageKey = `pokedle_emoji_${dayStr}_${(mode || '').replace(/\s+/g, '_')}_${guessCount}_${phraseResetSeed || 0}`;
      let stored = null;
      try { stored = localStorage.getItem(storageKey); } catch (e) { stored = null; }
      if (stored) {
        setCelebrationEmoji(stored);
        return;
      }
      const pool = pickPool(guessCount || 0);
      const pick = pool[Math.floor(Math.random() * pool.length)];
      setCelebrationEmoji(pick);
      try { localStorage.setItem(storageKey, pick); } catch (e) {}
    } catch (e) {
      // Fallback: non-persistent random pick
      const pool = pickPool(guessCount || 0);
      setCelebrationEmoji(pool[Math.floor(Math.random() * pool.length)]);
    }
  }, [guessCount, mode, phraseResetSeed]);

  // Compute Pokedle day number. The first day is today (day 1).
  const effectiveUTCDate = (d) => {
    const dt = new Date(d);
    let day = new Date(Date.UTC(dt.getUTCFullYear(), dt.getUTCMonth(), dt.getUTCDate(), 0, 0, 0));
    if (dt.getUTCHours() >= RESET_HOUR_UTC) {
      day = new Date(Date.UTC(dt.getUTCFullYear(), dt.getUTCMonth(), dt.getUTCDate() + 1, 0, 0, 0));
    }
    return day;
  };

  const MS_PER_DAY = 24 * 60 * 60 * 1000;
  const todayEffective = effectiveUTCDate(new Date());
  // Epoch: first day is 2025-11-24 (use effective UTC date so RESET_HOUR_UTC applies)
  const epoch = effectiveUTCDate(new Date('2025-11-24T00:00:00Z'));
  const dayNumber = Math.floor((todayEffective.getTime() - epoch.getTime()) / MS_PER_DAY) + 1;

  // Phrase dictionary: each entry has text, mode ('all' allowed), and inclusive guess range (min..max)
  const PHRASES = [
    // 1-10 guesses
    { text: 'Nice going, Trainer!', mode: 'all', min: 1, max: 3 },
    { text: 'That was super effective!', mode: 'all', min: 1, max: 3 },
    { text: "Excellent work, Trainer!", mode: 'all', min: 1, max: 4 },
    { text: "Incredible! That guess was worthy of a Legendary Trainer", mode: 'all', min: 1, max: 2 },
    { text: 'Your Pokédex has been updated', mode: 'all', min: 1, max: 10 },
    { text: 'Your Pokédex skills are top-tier', mode: 'all', min: 1, max: 3 },
    { text: 'A Trainer with knowledge that rivals Professor {professor}', mode: 'all', min: 1, max: 3 },
    { text: 'Those Pokédex instincts never miss', mode: 'all', min: 1, max: 4 },
    { text: 'You trained hard and it paid off', mode: 'all', min: 1, max: 4 },
    { text: 'Your Poké Ball aim is improving', mode: 'all', min: 1, max: 4 },
    { text: 'Your Trainer senses are on point', mode: 'all', min: 1, max: 3 },
    { text: 'Super effective guess!', mode: 'all', min: 1, max: 3 },
    { text: 'A legendary performance!', mode: 'all', min: 1, max: 2 },
    { text: 'Your Pokédex is up to date', mode: 'all', min: 1, max: 5 },
    { text: 'You identified it like a true field researcher', mode: 'all', min: 1, max: 4 },
    { text: 'Another entry confirmed in the Pokédex', mode: 'all', min: 1, max: 5 },
    { text: 'Your fieldwork continues to impress', mode: 'all', min: 1, max: 4 },
    { text: 'The Pokédex thanks you for your contribution', mode: 'all', min: 1, max: 7 },    
    
    // Medium guesses (5-9)
    { text: 'A bit of wandering tall grass, but you made it out!', mode: 'all', min: 4, max: 9 },
    { text: 'That Pokémon tried to hide, but you outsmarted it… eventually!', mode: 'all', min: 4, max: 9 },
    { text: 'A few missed attacks, but you still landed the final blow', mode: 'all', min: 4, max: 9 },
    { text: 'It was a tough encounter, but you caught it in the end!', mode: 'all', min: 4, max: 9 },
    { text: 'You stumbled a bit like a Magikarp out of water, but victory is yours', mode: 'all', min: 4, max: 9 },
    { text: 'A slow start like a Slaking, but you finished strong', mode: 'all', min: 4, max: 9 },
    { text: 'That battle was tough, but you came out on top', mode: 'all', min: 4, max: 9 },
    { text: 'A few misses, but your catching skills are sharp', mode: 'all', min: 4, max: 9 },
    { text: 'You caught it… eventually!', mode: 'all', min: 4, max: 9 },
    { text: 'You wrestled that guess into submission like a {fighting}', mode: 'all', min: 4, max: 9 },
    { text: 'You’ve added valuable data to Pokémon research', mode: 'all', min: 3, max: 9 },
    { text: 'Careful study rewards those who persist', mode: 'all', min: 4, max: 9 },

    // 10+ guesses
    { text: 'Looks like you’re blasting off again', mode: 'all', min: 8, max: 9999 },
    { text: 'Phew — finally!', mode: 'all', min: 8, max: 9999 },
    { text: 'Oof — that was rough', mode: 'all', min: 8, max: 9999 },
    { text: 'You’re as precise as a Poké Ball throw on a {legendary}', mode: 'all', min: 8, max: 9999 },
    { text: 'Hey, even Snorlax takes a while to wake up', mode: 'all', min: 8, max: 15 },
    { text: 'You got there… eventually', mode: 'all', min: 7, max: 13 },
    { text: 'Whew, that one almost fled the battle', mode: 'all', min: 7, max: 9999 },
    { text: 'Your Pokédex must’ve been on low battery', mode: 'all', min: 7, max: 9999 },
    { text: 'A rocky start, but you pulled through', mode: 'all', min: 7, max: 9999 },
    { text: '{slow} would’ve done it faster', mode: 'all', min: 8, max: 9999 },
    { text: 'Good thing guesses don’t cost Poké Balls', mode: 'all', min: 7, max: 9999 },
    { text: 'Even Professor {professor} would’ve sighed', mode: 'all', min: 7, max: 9999 },
    { text: 'That had you wandering like a lost {lost}', mode: 'all', min: 7, max: 9999 },
    { text: 'Professor Oak is disappointed, but not surprised', mode: 'all', min: 8, max: 9999 },
    { text: 'The Pokémon fell asleep waiting, but you got there', mode: 'all', min: 8, max: 9999 },
    { text: 'Good grief…', mode: 'all', min: 10, max: 9999 },
    { text: 'That Pokémon wasn’t hiding—you just weren’t looking', mode: 'all', min: 10, max: 9999 },
    { text: 'You hurt yourself in confusion', mode: 'all', min: 10, max: 9999 },
    { text: 'Big Ooof', mode: 'all', min: 9, max: 9999 },
    { text: 'Ouch!', mode: 'all', min: 10, max: 9999 },
    { text: 'Holy Moly', mode: 'all', min: 10, max: 9999 },
    { text: 'Did you have your eyes closed?', mode: 'all', min: 8, max: 9999 },

    // Classic mode specific
    { text: 'You know your typings better than a Gym Leader', mode: 'Classic', min: 1, max: 5 },
    { text: 'You analyse Pokémon like a true Battle Tower champion', mode: 'Classic', min: 1, max: 4 },
    { text: 'Your Pokédex knowledge is evolving nicely', mode: 'Classic', min: 1, max: 5 },
    { text: 'Your Pokédex knowledge took a nap', mode: 'Classic', min: 9, max: 9999 },
    { text: 'Should have guessed {should}', mode: 'Classic', min: 8, max: 9999 },

    // Card mode specific
    { text: 'A perfect pull from the booster pack', mode: 'Card', min: 1, max: 3 },
    { text: 'Your eye for TCG details is unmatched', mode: 'Card', min: 1, max: 4 },
    { text: 'That was a rare find, Trainer', mode: 'Card', min: 1, max: 3 },
    { text: 'You read that card like a Poképro', mode: 'Card', min: 1, max: 5 },
    { text: 'An ultra-rare play worthy of a Master', mode: 'Card', min: 1, max: 4 },
    { text: 'An eye for cardboard treasure, Trainer', mode: 'Card', min: 1, max: 4 },
    { text: 'The Pokéloot senses are strong with you', mode: 'Card', min: 1, max: 5 },
    { text: 'That card couldn’t hide from your sharp eyes!', mode: 'Card', min: 1, max: 4 },
    { text: 'You flipped the deck in your favor!', mode: 'Card', min: 1, max: 5 },
    { text: 'Another rare find for your collection!', mode: 'Card', min: 1, max: 5 },
    { text: 'You played your cards perfectly!', mode: 'Card', min: 1, max: 4 },
    { text: 'Excellent observation! Another card properly catalogued.', mode: 'Card', min: 1, max: 4 },
    { text: 'Your collection knowledge is impressive.', mode: 'Card', min: 1, max: 4 },
    { text: 'Your knowledge of printed cardboard is second to none!', mode: 'Card', min: 1, max: 2 },
    { text: 'That blur played hard to catch, but you got it!', mode: 'Card', min: 5, max: 9999 },
    { text: 'A little tricky, but your Trainer instincts prevailed!', mode: 'Card', min: 5, max: 9999 },
    { text: 'That blur must’ve been extra blurry today', mode: 'Card', min: 7, max: 9999 },
    { text: 'You pulled a few dud packs before the rare hit', mode: 'Card', min: 7, max: 9999 },
    { text: 'Maybe stick to pre-constructed decks', mode: 'Card', min: 7, max: 9999 },
    { text: 'You enhanced… and enhanced… and enhanced…', mode: 'Card', min: 8, max: 9999 },

    // Pokedex mode specific
    { text: 'You know your Pokédex better than a Rotom Dex', mode: 'Pokédex', min: 1, max: 4 },
    { text: 'You read field reports like a true Pokémon Professor', mode: 'Pokédex', min: 1, max: 4 },
    { text: 'Your Pokélore knowledge is next-level', mode: 'Pokédex', min: 1, max: 4 },
    { text: 'No description can fool you', mode: 'Pokédex', min: 1, max: 5 },
    { text: 'That Pokédex entry didn’t stand a chance', mode: 'Pokédex', min: 1, max: 5 },
    { text: 'You recognised the behaviour instantly', mode: 'Pokédex', min: 1, max: 5 },
    { text: 'Even Professor {professor} would be impressed', mode: 'Pokédex', min: 1, max: 5 },
    { text: 'Your Pokédex knowledge took a nap', mode: 'Pokédex', min: 9, max: 9999 },
    { text: 'A bit of a puzzle, but you cracked its Pokédex entry!', mode: 'Pokédex', min: 6, max: 9999 },

    // Silhouette mode specific
    { text: 'Silhouette sleuth', mode: 'Silhouette', min: 1, max: 2 },
    { text: 'Even the shadows can’t hide from you', mode: 'Silhouette', min: 1, max: 4 },
    { text: 'You spotted the Pokémon before the lights came on', mode: 'Silhouette', min: 1, max: 6 },
    { text: 'No need to teach a Pokémon Flash!', mode: 'Silhouette', min: 1, max: 4 },
    { text: 'Outstanding! Your observation skills are as sharp as a {stinger}\'s stinger', mode: 'Silhouette', min: 1, max: 4 },
    { text: 'Outstanding! Your observation skills are as sharp as a {fangs}\'s fangs', mode: 'Silhouette', min: 1, max: 4 },
    { text: 'Outstanding! Your observation skills are as sharp as a {scythes}\'s scythes', mode: 'Silhouette', min: 1, max: 5 },
    { text: 'Outstanding! Your observation skills are as sharp as a {claws}\'s claws', mode: 'Silhouette', min: 1, max: 5 },
    { text: 'You\'ve played a lot of “Who’s That Pokémon?!”', mode: 'Silhouette', min: 1, max: 4 },
    { text: 'You detect shapes like a {bat} in a cave', mode: 'Silhouette', min: 1, max: 3 },
    { text: 'Even with Flash, it would’ve been rough', mode: 'Silhouette', min: 8, max: 9999 },
    { text: 'CSI: Pokémon took longer than expected', mode: 'Silhouette', min: 9, max: 9999 },
    { text: 'You enhanced… and enhanced… and enhanced…', mode: 'Silhouette', min: 8, max: 9999 },

    // Zoom mode specific
    { text: 'Sharp eye', mode: 'Zoom', min: 1, max: 2 },
    { text: 'Outstanding! Your observation skills are as sharp as a {stinger}\'s stinger', mode: 'Zoom', min: 1, max: 4 },
    { text: 'Outstanding! Your observation skills are as sharp as a {fangs}\'s fangs', mode: 'Zoom', min: 1, max: 4 },
    { text: 'Outstanding! Your observation skills are as sharp as a {scythes}\'s scythes', mode: 'Zoom', min: 1, max: 5 },
    { text: 'Outstanding! Your observation skills are as sharp as a {claws}\'s claws', mode: 'Zoom', min: 1, max: 5 },
    { text: 'Your eyesight is sharper than a Pidgeot', mode: 'Zoom', min: 1, max: 3 },
    { text: 'Your eye for details is Mega-Evolved', mode: 'Zoom', min: 1, max: 4 },
    { text: 'Not a single pixel slipped past your vision', mode: 'Zoom', min: 1, max: 5 },
    { text: 'Sharper than a Keen Eye ability', mode: 'Zoom', min: 1, max: 5 },
    { text: 'Did you try guessing Ditto?', mode: 'Zoom', min: 8, max: 9999 },
    { text: 'CSI: Pokémon took longer than expected', mode: 'Zoom', min: 9, max: 9999 },
    { text: 'You enhanced… and enhanced… and enhanced…', mode: 'Zoom', min: 8, max: 9999 },

    // Colour mode specific
    { text: 'Silhouette sleuth', mode: 'Colours', min: 1, max: 2 },
    { text: 'Outstanding! Your observation skills are as sharp as a {stinger}\'s stinger', mode: 'Colours', min: 1, max: 4 },
    { text: 'Outstanding! Your observation skills are as sharp as a {fangs}\'s fangs', mode: 'Colours', min: 1, max: 4 },
    { text: 'Outstanding! Your observation skills are as sharp as a {scythes}\'s scythes', mode: 'Colours', min: 1, max: 5 },
    { text: 'Outstanding! Your observation skills are as sharp as a {claws}\'s claws', mode: 'Colours', min: 1, max: 5 },
    { text: 'A true expert in Pokémon palettes', mode: 'Colours', min: 1, max: 4 },
    { text: 'A pro in Pokémon palettes', mode: 'Colours', min: 1, max: 4 },
    { text: 'Your colour sense is super effective', mode: 'Colours', min: 1, max: 5 },
    { text: 'You can spot a Pokémon by hue alone', mode: 'Colours', min: 1, max: 5 },
    { text: 'Your eye for colours would impress a Smeargle', mode: 'Colours', min: 1, max: 4 },
    { text: 'Pixel-perfect detection, Trainer', mode: 'Colours', min: 1, max: 4 },
    { text: 'You see Pokémon hues like a Smeargle studying palettes', mode: 'Colours', min: 1, max: 5 },
    { text: 'A chromatic genius in the making', mode: 'Colours', min: 1, max: 3 },
    { text: 'No tint or tone can escape you', mode: 'Colours', min: 1, max: 6 },
    { text: 'Even Smeargle would’ve raised an eyebrow', mode: 'Colours', min: 8, max: 9999 },

    // Locations
    { text: 'You know your Pokédex better than a Rotom Dex', mode: 'Locations', min: 1, max: 5 },
    { text: 'Your Locations knowledge is elite-four tier', mode: 'Locations', min: 1, max: 5 },
    { text: 'Abilities and stats bend to your will', mode: 'Locations', min: 1, max: 5 },
    { text: 'You analyse Pokémon like a true Battle Tower champion', mode: 'Locations', min: 1, max: 5 },
    { text: 'Your data sense is stronger than a Porygon’s analysis', mode: 'Locations', min: 1, max: 5 },
    { text: 'Even Professor {professor} would be impressed', mode: 'Locations', min: 1, max: 6 },
    { text: 'You read Pokémon metadata like the PokéNerd you are', mode: 'Locations', min: 1, max: 2 },
    { text: 'Your Pokédex knowledge took a nap', mode: 'Locations', min: 9, max: 9999 },
    { text: 'Even a Rotom Dex would\'ve glitched on that one', mode: 'Locations', min: 8, max: 9999 },
  ];

  const POKEMON = {
    "fast": ["Pidgeot", "Jolteon", "Rapidash", "Dodrio", "Pikachu"],
    "eyesight": ["Pidgeot"],
    "stinger": ["Weedle", "Beedrill", "Wurmple", "Ariados", "Spinarak", "Nidoking", "Nidorino"],
    "fangs": ["Zubat", "Golbat", "Rattata", "Raticate", "Arbok", "Ariados", "Mightyena", "Gyarados", "Feraligator", "Arcanine", "Houndoom", "Sharpedo"],
    "scythes": ["Scyther", "Kabutops"],
    "claws": ["Sandslash", "Fearow", "Sneasel", "Ursaring"],
    "spark": ["Pikachu", "Electabuzz", "Jolteon", "Electrode", "Pichu", "Ampharos"],
    "smart": ["Alakazam", "Slowking"],
    "legendary": ["Mewtwo", "Zapdos", "Moltres", "Articuno", "Raikou", "Entei", "Suicune", "Rayquaza", "Lugia", "Ho-Oh"],
    "professor": ["Oak", "Elm", "Birch"],
    "bat": ["Zubat", "Golbat", "Crobat"],
    "slow": ["Slowpoke", "Snorlax", "Slaking"],
    "lost": ["Psyduck"],
    "fighting": ["Machop", "Machoke", "Machamp", "Mankey", "Primeape", "Hitmonlee", "Hitmonchan", "Hitmontop", "Hariyama", "Tyrogue"],
    "should": ["Poliwhirl", "Weepingbell", "Primeape"],
  };

  // Deterministic PRNG (mulberry32) and seed derived from effective YYYYMMDD + mode
  function mulberry32(a) {
    return function() {
      var t = a += 0x6D2B79F5;
      t = Math.imul(t ^ t >>> 15, t | 1);
      t ^= t + Math.imul(t ^ t >>> 7, t | 61);
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    }
  }

  const getYYYYMMDD = (d) => parseInt(effectiveUTCDate(d).toISOString().slice(0,10).replace(/-/g, ''), 10);
  const baseSeed = getYYYYMMDD(new Date());
  // mix in the mode string to vary selection per-mode/day
  // incorporate an optional temporary override seed (`phraseResetSeed`) when present
  let seed = (baseSeed >>> 0) + ((phraseResetSeed || 0) >>> 0);
  seed = seed >>> 0;
  for (let i = 0; i < (mode || '').length; i++) seed = (seed * 31 + mode.charCodeAt(i)) >>> 0;
  const rng = mulberry32(seed || 1);

  // Choose candidate phrases that match mode (or 'all') and guess range
  const candidates = PHRASES.filter(p => {
    const pm = (p.mode || '').toLowerCase();
    const m = (mode || '').toLowerCase();
    const modeMatch = pm === 'all' || pm === m || m.includes(pm) || pm.includes(m);
    return modeMatch && guessCount >= p.min && guessCount <= p.max;
  });

  // Pick a phrase per-player (non-deterministic across players) but keep it
  // stable for that player for the same day/mode/guessCount by persisting
  // the final text in localStorage. This gives different players different
  // messages while ensuring the same player sees the same message on reload.
  let phrasePrefix = '';
  if (candidates.length) {
    const dayKey = getYYYYMMDD(new Date());
    const storageKey = `pokedle_phrase_${dayKey}_${(mode||'').replace(/\s+/g,'_')}_${guessCount}_${phraseResetSeed||0}`;
    let stored = null;
    try { stored = localStorage.getItem(storageKey); } catch (e) { stored = null; }
    if (stored) {
      phrasePrefix = stored + ' ';
    } else {
      // Pick a random candidate and substitute tokens randomly, then persist
      const chosen = candidates[Math.floor(Math.random() * candidates.length)];
      let text = chosen.text || '';
      text = text.replace(/\{(\w+)\}/g, (full, key) => {
        const list = POKEMON[key];
        if (!Array.isArray(list) || list.length === 0) return full;
        const idx = Math.floor(Math.random() * list.length);
        return list[idx];
      });
      if (text) {
        phrasePrefix = text + ' ';
        try { localStorage.setItem(storageKey, text); } catch (e) {}
      }
    }
  }

  return (
    <div style={{ textAlign: 'center', margin: '12px 0' }}>
      <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 6 }}>Congratulations!</div>
      <div className="silhouette-congrats" style={{ marginTop: 6, display: 'flex', flexDirection: classic ? 'column' : 'row', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
            <div className="congrats-text" style={{ fontSize: 16, flex: '1 1 auto', minWidth: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ whiteSpace: 'normal' }}>
                {phrasePrefix}- You found the Pokédle #{dayNumber} <strong style={{ fontWeight: 700 }}>{mode}</strong> Pokémon in <strong>{guessCount}</strong> {guessCount === 1 ? 'guess' : 'guesses'}! {celebrationEmoji}
              </span>
            </div>
        
        {classic && Array.isArray(guesses) && answer && (
          <div role="list" aria-label="Guess results" style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'center', marginLeft: 8 }}>
            {guesses.map((g, i) => {
              const partialMatch = (arr1, arr2) => Array.isArray(arr1) && Array.isArray(arr2) && arr1.some(item => arr2.includes(item));
              const getEvoStage = poke => poke && (poke.evolution_stage || 1);
              const statuses = [];
              statuses.push(g.name === answer.name ? 'match' : 'miss');
              statuses.push(g.generation === answer.generation ? 'match' : 'miss');
              if (JSON.stringify(g.types) === JSON.stringify(answer.types)) statuses.push('match');
              else if (partialMatch(g.types, answer.types)) statuses.push('partial');
              else statuses.push('miss');
              statuses.push(getEvoStage(g) === getEvoStage(answer) ? 'match' : 'miss');
              statuses.push(g.habitat === answer.habitat ? 'match' : 'miss');
              statuses.push(g.height === answer.height ? 'match' : 'miss');
              statuses.push(g.weight === answer.weight ? 'match' : 'miss');
              const emojiFor = s => (s === 'match' ? '🟩' : s === 'partial' ? '🟨' : '🟥');
              // remove the first status (name) and convert to emojis
              // for height and weight (last 2), use arrows instead of colored boxes
              const feedback = statuses.slice(1, 7).map((s, idx) => {
                // indices 4 and 5 are height and weight
                if (idx === 4) { // height
                  if (s === 'match') return '🟩';
                  return g.height < answer.height ? '⬆️' : '⬇️';
                }
                if (idx === 5) { // weight
                  if (s === 'match') return '🟩';
                  return g.weight < answer.weight ? '⬆️' : '⬇️';
                }
                return emojiFor(s);
              });
              const emojiSeq = feedback.join('');
              return (
                <div key={g.name + i} role="listitem" aria-label={`Guess ${i + 1}`} style={{ userSelect: 'text', fontSize: 16, lineHeight: '18px', display: 'flex', gap: 8, alignItems: 'center' }}>
                  <span aria-hidden="true" style={{ fontFamily: 'monospace' }}>{emojiSeq}</span>
                </div>
              );
            })}
          </div>
        )}
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <button
          style={{
            padding: '4px',
            borderRadius: 6,
            background: '#e3eafc',
            border: '1px solid #626262ff',
            color: '#e9e9e9ff',
            fontWeight: 600,
            fontSize: 14,
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
            onClick={() => {
            const text = `${phrasePrefix}- I found the Pokedle #${dayNumber} ${mode} Pokémon in ${guessCount} ${guessCount === 1 ? 'guess' : 'guesses'}! ${celebrationEmoji}`;
            let toCopy = text;
            if (classic && Array.isArray(guesses) && answer) {
              const partialMatch = (arr1, arr2) => {
                if (!Array.isArray(arr1) || !Array.isArray(arr2)) return false;
                return arr1.some(item => arr2.includes(item));
              };
              const getEvoStage = poke => poke && (poke.evolution_stage || 1);
              const emojiFor = s => (s === 'match' ? '🟩' : s === 'partial' ? '🟨' : '🟥');
              const lines = guesses.map(g => {
                const statuses = [];
                statuses.push(g.name === answer.name ? 'match' : 'miss');
                statuses.push(g.generation === answer.generation ? 'match' : 'miss');
                if (JSON.stringify(g.types) === JSON.stringify(answer.types)) statuses.push('match');
                else if (partialMatch(g.types, answer.types)) statuses.push('partial');
                else statuses.push('miss');
                statuses.push(getEvoStage(g) === getEvoStage(answer) ? 'match' : 'miss');
                statuses.push(g.habitat === answer.habitat ? 'match' : 'miss');
                statuses.push(g.height === answer.height ? 'match' : 'miss');
                statuses.push(g.weight === answer.weight ? 'match' : 'miss');
                // drop the first (name) and convert to emojis
                // for height and weight (last 2), use arrows instead of colored boxes
                const feedback = statuses.slice(1, 7).map((s, idx) => {
                  // indices 4 and 5 are height and weight
                  if (idx === 4) { // height
                    if (s === 'match') return '🟩';
                    return g.height < answer.height ? '⬆️' : '⬇️';
                  }
                  if (idx === 5) { // weight
                    if (s === 'match') return '🟩';
                    return g.weight < answer.weight ? '⬆️' : '⬇️';
                  }
                  return emojiFor(s);
                });
                return feedback.join('');
              });
              toCopy = `${text}\n${lines.join('\n')}`;
            }
            if (navigator.clipboard) {
              navigator.clipboard.writeText(toCopy);
            }
          }}
          aria-label="Copy text to clipboard"
          title="Copy text to clipboard"
          type="button"
        >
          {/* Copy icon SVG */}
          <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden="true" focusable="false" style={{ display: 'block' }}>
            <rect x="6" y="6" width="9" height="9" rx="2" stroke="#626262ff" strokeWidth="1.5" fill="#fff" />
            <rect x="3" y="3" width="9" height="9" rx="2" stroke="#626262ff" strokeWidth="1.2" fill="#e3eafc" />
          </svg>
        </button>
        {/*
        <button
          type="button"
          onClick={() => {
            // generate a temporary random 32-bit seed and apply it
            let s = null;
            try {
              if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
                s = crypto.getRandomValues(new Uint32Array(1))[0];
              } else {
                s = (Date.now() ^ Math.floor(Math.random() * 0xffffffff)) >>> 0;
              }
            } catch (e) {
              s = (Date.now() ^ Math.floor(Math.random() * 0xffffffff)) >>> 0;
            }
            setPhraseResetSeed(s);
          }}
          title="Generate a new phrase (temporary)"
          aria-label="Generate a new phrase (temporary)"
          style={{
            padding: '4px 8px',
            borderRadius: 6,
            background: '#fff',
            border: '1px solid #626262ff',
            color: '#222',
            fontWeight: 600,
            fontSize: 13,
            cursor: 'pointer'
          }}
        >
          New phrase
        </button>
        <button
          type="button"
          onClick={() => setPhraseResetSeed(null)}
          title="Reset to default phrase for the day"
          aria-label="Reset to default phrase for the day"
          style={{
            padding: '4px 8px',
            borderRadius: 6,
            background: '#fff',
            border: '1px solid #626262ff',
            color: '#222',
            fontWeight: 600,
            fontSize: 13,
            cursor: 'pointer'
          }}
        >
          Reset phrase
        </button>
        */}
        </div>
      </div>
    </div>
  );
}

/* Congrats layout: keep on one line for larger screens, allow wrap on small screens */
const congratsStyles = `
.silhouette-congrats {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  flex-wrap: nowrap;
}
.silhouette-congrats .congrats-text {
  white-space: normal;
  overflow: visible;
  text-overflow: clip;
  flex: 1 1 auto;
  min-width: 0;
}

@media (max-width: 420px) {
  .silhouette-congrats { flex-wrap: wrap; gap: 8px; }
  .silhouette-congrats .congrats-text { white-space: normal; overflow: visible; text-overflow: clip; }
}
`;
