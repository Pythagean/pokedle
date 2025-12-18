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
  //Xmas Eve
  "20251224": {
    card: { pokemonId: 180, cardFile: "180-30.jpg" }
  },
  // Xmas Day
  "20251225": {
    classic: 204,
    card: { pokemonId: 225, cardFile: "225-12.jpg" },
    pokedex: 361,
    details: 234,
    colours: 124,
    map: 120
  },
  // Boxing Day
  "20251226": {
    classic: 107,
    card: { pokemonId: 68 },
    pokedex: 297,
    details: 166,
    colours: 62,
    map: 296
  },
  // New year - New Me
  "20260101": {
    classic: 175,
    card: { pokemonId: 173 },
    pokedex: 239,
    details: 298,
    colours: 240,
    map: 172
  },
  //Brayden's Birthday
  "20260128": {
    classic: 6,
    card: { pokemonId: 94 },
    pokedex: 98,
    details: 244,
    colours: 334,
    map: 249
  },
  //Chinese New Year 
  "20260217": {
    classic: 130,
    card: { pokemonId: 334 },
    pokedex: 149,
    details: 373,
    colours: 384,
    map: 78
  },
  //Pokemon Day
  "20260227": {
    classic: 1,
    card: { pokemonId: 133 },
    pokedex: 25,
    details: 151,
    colours: 4,
    map: 7
  },
  //St Patrick's Day
  "20260317": {
    classic: 251,
    card: { pokemonId: 1 },
    pokedex: 11,
    details: 271,
    colours: 188,
    map: 152
  },
  //April Fools' Day
  "20260401": {
    classic: 79,
    card: { pokemonId: 79 },
    pokedex: 79,
    details: 79,
    colours: 108,
    map: 79
  },
  //Easter Monday
  "20260406": {
    classic: 175,
    card: { pokemonId: 25, cardFile: "25-170.jpg" },
    pokedex: 299,
    details: 102,
    colours: 184,
    map: 113
  },
  //Mothers Day
  "20260510": {
    classic: 31,
    card: { pokemonId: 115 },
    pokedex: 105,
    details: 217,
    colours: 242,
    map: 241
  },
  //World  Ocean's Day
  "20260608": {
    classic: 321,
    card: { pokemonId: 382 },
    pokedex: 350,
    details: 73,
    colours: 171,
    map: 131
  },
  //International cat day
  "20260808": {
    classic: 52,
    card: { pokemonId: 196 },
    pokedex: 301,
    details: 53,
    colours: 243,
    map: 300
  },
  //International dog day
  "20260826": {
    classic: 59,
    card: { pokemonId: 262 },
    pokedex: 228,
    details: 244,
    colours: 210,
    map: 209
  },
  // Jordan's Birthday
  "20261016": {
    classic: 143,
    card: { pokemonId: 330 },
    pokedex: 376,
    details: 6,
    colours: 212,
    map: 160
  },
  // Halloween
  "20261031": {
    classic: 93,
    card: { pokemonId: 229 },
    pokedex: 332,
    details: 200,
    colours: 94,
    map: 354
  }

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
