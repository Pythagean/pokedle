const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
const EDGE_FUNCTION_URL = `${SUPABASE_URL}/functions/v1/pokedle-results`;

const EPOCH_MS = new Date('2025-11-24T00:00:00Z').getTime();
const MS_PER_DAY = 86_400_000;
const RESET_HOUR_UTC = 18;

function getPokledleNumber(date) {
  const d = new Date(date ?? Date.now());
  if (d.getUTCHours() >= RESET_HOUR_UTC) d.setUTCDate(d.getUTCDate() + 1);
  d.setUTCHours(0, 0, 0, 0);
  return Math.floor((d.getTime() - EPOCH_MS) / MS_PER_DAY) + 1;
}

function getDateFromPokledleNumber(pokledleNumber) {
  const ms = (pokledleNumber - 1) * MS_PER_DAY + EPOCH_MS;
  return new Date(ms);
}

/**
 * Converts a Date to YYYYMMDD string
 */
function formatDateKey(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}${m}${d}`;
}

/**
 * Fetches the last N days of results history from the server.
 * Uses user_id when authenticated, falls back to anon_id.
 * Returns array of { date: 'YYYYMMDD', results: [...] } in newest-first order, or null.
 */
export async function loadHistoryFromServer(days = 50, session = null) {
  try {
    const userId = session?.user?.id ?? null;
    const authToken = session?.access_token ?? SUPABASE_ANON_KEY;
    const anonId = localStorage.getItem('pokedle_anon_id');

    // Need at least one identifier
    if (!userId && !anonId) return null;

    // Calculate pokedle_numbers for the last N days
    const today = new Date();
    const pokledleNumbers = [];
    for (let i = 0; i < days; i++) {
      const dt = new Date(today);
      dt.setDate(today.getDate() - i);
      pokledleNumbers.push(getPokledleNumber(dt));
    }

    // Fetch results for each day (all in parallel)
    const promises = pokledleNumbers.map(num => {
      const param = userId
        ? `user_id=${encodeURIComponent(userId)}`
        : `anon_id=${encodeURIComponent(anonId)}`;
      return fetch(
        `${EDGE_FUNCTION_URL}?pokedle_number=${num}&${param}`,
        { headers: { Authorization: `Bearer ${authToken}` } }
      )
        .then(res => res.ok ? res.json() : null)
        .catch(() => null);
    });

    const responses = await Promise.all(promises);

    // Transform results into history format
    const history = [];
    pokledleNumbers.forEach((pokledleNum, idx) => {
      const response = responses[idx];
      if (!response?.results?.length) return;

      const result = response.results[0];
      const dt = getDateFromPokledleNumber(pokledleNum);
      const dateKey = formatDateKey(dt);

      // Transform single result row into array of mode results
      const modeResults = [];
      const modes = ['classic', 'card', 'pokedex', 'details', 'colours', 'locations'];
      modes.forEach(mode => {
        const value = result[mode];
        if (typeof value === 'number' && value > 0) {
          modeResults.push({
            label: mode,
            solved: true,
            guessCount: value,
          });
        }
      });

      history.push({
        date: dateKey,
        results: modeResults,
      });
    });

    // Return newest-first order
    return history.length > 0 ? history : null;
  } catch (e) {
    console.warn('[Storage] Failed to load history from server:', e?.message ?? e);
    return null;
  }
}
