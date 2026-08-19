// Keys to preserve when clearing localStorage (user identity and settings)
const PRESERVED_KEYS = [
  'pokedle_anon_id',
  'pokedle_dark_mode',
  'pokedle_card_name',
];

/**
 * Clears localStorage except for essential user identity and settings keys.
 * This allows the app to reload user data from the server on next session.
 */
export function clearGuessesFromStorage() {
  try {
    const keysToRemove = [];
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key) continue;
      
      // Keep preserved keys, remove everything else
      if (!PRESERVED_KEYS.includes(key)) {
        keysToRemove.push(key);
      }
    }
    
    keysToRemove.forEach(key => localStorage.removeItem(key));
    
    console.log(`[Storage] Cleared ${keysToRemove.length} entries, preserved ${PRESERVED_KEYS.length} essential keys`);
    return { success: true, cleared: keysToRemove.length };
  } catch (e) {
    console.error('[Storage] Failed to clear localStorage:', e);
    return { success: false, error: e?.message ?? String(e) };
  }
}
