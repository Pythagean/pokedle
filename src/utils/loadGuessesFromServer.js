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

/**
 * Fetches today's saved guesses from the server for this anonymous user or logged-in account.
 * Returns a guessesByPage object (partial keys only for modes with guesses), or null.
 */
export async function loadGuessesFromServer(pokemonData, date = null, session = null) {
  try {
    const pokledleNumber = getPokledleNumber(date);
    const authToken = session?.access_token ?? SUPABASE_ANON_KEY;

    let url;
    if (session?.user?.id) {
      // Logged-in user: fetch by user_id (JWT-verified server-side)
      url = `${EDGE_FUNCTION_URL}?pokedle_number=${pokledleNumber}&user_id=${encodeURIComponent(session.user.id)}`;
    } else {
      const anonId = localStorage.getItem('pokedle_anon_id');
      if (!anonId) return null;
      url = `${EDGE_FUNCTION_URL}?pokedle_number=${pokledleNumber}&anon_id=${encodeURIComponent(anonId)}`;
    }

    const res = await fetch(url, { headers: { Authorization: `Bearer ${authToken}` } });
    if (!res.ok) {
      console.warn('[Storage] Edge Function returned status', res.status);
      return null;
    }

    const body = await res.json();
    console.log('[Storage] Edge Function response:', body);

    const { results } = body;
    if (!results?.length) {
      console.warn('[Storage] No results from Edge Function');
      return null;
    }

    const result = results[0];
    console.log('[Storage] First result:', result);

    // Restore from compact replay JSONB: { pageKey: [pokemonId, ...] } newest-first
    // replay is only present when the Edge Function has been deployed with anon_id filtering
    if (!result.replay || typeof result.replay !== 'object') {
      console.warn('[Storage] No replay field in result');
      return null;
    }

    const restored = {};
    for (const [key, ids] of Object.entries(result.replay)) {
      if (!Array.isArray(ids) || ids.length === 0) continue;
      const full = ids.map(id => pokemonData.find(p => p.id === id)).filter(Boolean);
      if (full.length > 0) restored[key] = full;
    }

    console.log('[Storage] Restored guesses:', restored);
    return Object.keys(restored).length > 0 ? restored : null;
  } catch (e) {
    console.warn('[Storage] Failed to load guesses from server:', e?.message ?? e);
    return null;
  }
}
