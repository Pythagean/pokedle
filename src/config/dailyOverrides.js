/**
 * Daily Pokemon and Card Overrides
 * 
 * Use this to hardcode specific Pokemon for specific dates.
 * Date format: YYYYMMDD (as string or number)
 * 
 * Example:
 * {
 *   "20251225": {
 *     classic: 225,      // Delibird for Christmas
 *     card: {
 *       pokemonId: 225,
 *       cardType: "special",      // optional: normal, full_art, shiny, special
 *       cardFile: "225-15.jpg"    // optional: specific card file
 *     },
 *     // OR specify just the cardFile (will auto-detect cardType):
 *     // card: { pokemonId: 225, cardFile: "225-15.jpg" },
 *     pokedex: 225,
 *     details: 225,
 *     colours: 225,
 *     map: 225
 *   }
 * }
 */

export const DAILY_OVERRIDES = {
  // Example: Christmas 2025 - Delibird
  "20251225": {
    classic: 225,
    card: { pokemonId: 225, cardFile: "225-12.jpg" },
    pokedex: 225,
    details: 225,
    colours: 225,
    map: 225
  },
  "20251224": {
    card: { pokemonId: 180, cardFile: "180-30.jpg" }
  },
  
  // Add your overrides here:
};

/**
 * Get override for a specific date and page key
 * @param {number|string} dateSeed - Date in YYYYMMDD format
 * @param {string} pageKey - Page key (classic, card, pokedex, etc.)
 * @returns {number|object|null} Pokemon ID or card config object, or null if no override
 */
export function getDailyOverride(dateSeed, pageKey) {
  const dateStr = String(dateSeed);
  const dayOverrides = DAILY_OVERRIDES[dateStr];
  
  if (!dayOverrides) return null;
  
  return dayOverrides[pageKey] || null;
}
