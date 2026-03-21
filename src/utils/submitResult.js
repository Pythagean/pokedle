const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
const EDGE_FUNCTION_URL = `${SUPABASE_URL}/functions/v1/pokedle-results`;

const EPOCH_MS = new Date('2025-11-24T00:00:00Z').getTime();
const MS_PER_DAY = 86_400_000;
const RESET_HOUR_UTC = 18;

function getEffectiveUTCMidnight(date) {
  const d = new Date(date);
  if (d.getUTCHours() >= RESET_HOUR_UTC) {
    d.setUTCDate(d.getUTCDate() + 1);
  }
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

function getPokledleNumber() {
  const today = getEffectiveUTCMidnight(new Date());
  return Math.floor((today.getTime() - EPOCH_MS) / MS_PER_DAY) + 1;
}

function getOrCreateAnonId() {
  const key = 'pokedle_anon_id';
  let id = localStorage.getItem(key);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(key, id);
  }
  return id;
}

const FALLBACK_NAMES = ['Red', 'Blue', 'Ash', 'Gary', 'Brock', 'Misty', 'Erika', 'Lt. Surge', 'Sabrina', 'Koga', 'Blaine', 'Giovanni', 
    'Lance', 'Cynthia', 'Steven', 'Wallace', 'Dawn', 'May', 'Serena', 'Lillie', 'Gloria', 'Hop', 'Rosa', 'Jessie', 'James', 'Ethan', 'Silver', 'Brendan' ];

function getPlayerName() {
  const stored = localStorage.getItem('pokedle_card_name');
  if (stored && stored.trim().length > 0) return stored.trim();
  return FALLBACK_NAMES[Math.floor(Math.random() * FALLBACK_NAMES.length)];
}

// Maps the app's internal mode key to the matching DB column / guess mode label
const MODE_TO_COLUMN = {
  classic:  'classic',
  card:     'card',
  pokedex:  'pokedex',
  details:  'details',
  colours:  'colours',
  map:      'locations',
};

/**
 * Submits the player's daily result to Supabase via the Edge Function.
 * Safe to call multiple times — uses localStorage to prevent duplicate submissions.
 *
 * @param {{ perPageResults: Array, guessesByPage: Object, todaySeed: number }} params
 */
export async function submitResult({ perPageResults, guessesByPage, todaySeed }) {
  try {
    const submittedKey = `pokedle_submitted_${todaySeed}`;
    if (localStorage.getItem(submittedKey)) return { alreadySubmitted: true };

    const anonId = getOrCreateAnonId();
    const pokledleNumber = getPokledleNumber();

    // Build per-mode score columns from actual guess array lengths
    const result = {
      pokedle_number: pokledleNumber,
      anon_id: anonId,
      player: getPlayerName(),
      client_version: typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : null,
      device_info: {
        userAgent: navigator.userAgent,
        platform: navigator.platform,
        language: navigator.language,
        screenW: window.screen.width,
        screenH: window.screen.height,
      },
    };
    let total = 0;
    for (const r of perPageResults) {
      const col = MODE_TO_COLUMN[r.key];
      if (!col) continue;
      const count = (guessesByPage[r.key] || []).length || null;
      result[col] = count;
      if (count) total += count;
    }
    result.total = total || null;

    // Flat list of every individual guess as { mode, guess: pokemonId, guess_number, correct }
    const guesses = [];
    for (const r of perPageResults) {
      const col = MODE_TO_COLUMN[r.key];
      if (!col) continue;
      const modeGuesses = guessesByPage[r.key] || [];
      const dailyName = r.daily?.name ?? r.daily?.pokemon?.name ?? null;
      const total = modeGuesses.length;
      modeGuesses.forEach((g, idx) => {
        const id = g.id ?? g.pokemon_id ?? null;
        if (id != null) guesses.push({
          mode: col,
          guess: id,
          guess_number: total - idx, // array is newest-first, so invert to get chronological order
          correct: dailyName != null && g.name === dailyName,
        });
      });
    }

    const response = await fetch(EDGE_FUNCTION_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({ result, guesses, anon_id: anonId }),
    });

    const data = await response.json();

    if (response.ok) {
      localStorage.setItem(submittedKey, '1');
      if (data.result_id != null) {
        localStorage.setItem(`pokedle_result_id_${pokledleNumber}`, String(data.result_id));
      }
      return { success: true, resultId: data.result_id };
    }

    console.error('[pokedle] Failed to submit result:', data);
    return { success: false, error: data.error };
  } catch (err) {
    console.error('[pokedle] Error submitting result:', err);
    return { success: false, error: err?.message ?? String(err) };
  }
}
