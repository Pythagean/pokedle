const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
const EDGE_FUNCTION_URL = `${SUPABASE_URL}/functions/v1/pokedle-results`;

const EPOCH_MS = new Date('2025-11-24T00:00:00Z').getTime();
const MS_PER_DAY = 86_400_000;
const RESET_HOUR_UTC = 18;

function getPokledleNumber() {
  const d = new Date();
  if (d.getUTCHours() >= RESET_HOUR_UTC) {
    d.setUTCDate(d.getUTCDate() + 1);
  }
  d.setUTCHours(0, 0, 0, 0);
  return Math.floor((d.getTime() - EPOCH_MS) / MS_PER_DAY) + 1;
}

/**
 * Updates the player's submitted result record for today.
 * Silently skips if no result_id is stored (i.e. not yet submitted).
 *
 * @param {{ player?: string, groupCode?: string }} fields
 */
export async function updateResult({ player, groupCode } = {}) {
  try {
    const pokledleNumber = getPokledleNumber();
    const resultId = localStorage.getItem(`pokedle_result_id_${pokledleNumber}`);
    if (!resultId) return { skipped: true };

    const patch = {};
    if (player !== undefined) patch.player = player;
    if (groupCode !== undefined) patch.group_code = groupCode;
    if (Object.keys(patch).length === 0) return { skipped: true };

    const response = await fetch(EDGE_FUNCTION_URL, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({ result_id: Number(resultId), ...patch }),
    });

    const data = await response.json();
    if (response.ok) return { success: true };
    console.error('[pokedle] Failed to update result:', data);
    return { success: false, error: data.error };
  } catch (err) {
    console.error('[pokedle] Error updating result:', err);
    return { success: false, error: err?.message ?? String(err) };
  }
}
