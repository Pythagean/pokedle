// Central configuration for hint thresholds used across pages
// HINT_THRESHOLDS is an ordered array of guess counts at which additional
// clues unlock. For example [4, 8, 12, 16] means:
// - 0..3 guesses => 1 clue
// - >=4 => 2 clues
// - >=8 => 3 clues
// - >=12 => 4 clues
// - >=16 => 5 clues

// Internal helper used by the exported functions. Accepts an explicit
// thresholds array so callers (pages/components) can pass custom rules.
function _getClueCountForThresholds(numGuesses, thresholds) {
  if (!Array.isArray(thresholds) || thresholds.length === 0) return 1;
  let extra = 0;
  for (let i = 0; i < thresholds.length; i++) {
    if (numGuesses >= thresholds[i]) extra++;
  }
  return 1 + extra;
}

// Internal helper to find next threshold index for a given thresholds array.
function _getNextThresholdIndexForThresholds(numGuesses, thresholds) {
  for (let i = 0; i < thresholds.length; i++) {
    if (numGuesses < thresholds[i]) return i;
  }
  return -1;
}

// Public API kept backward-compatible: callers can omit `thresholds` to use
// the shared `HINT_THRESHOLDS`, or pass their own array to scope rules to a
// specific page/mode.
export function getClueCount(numGuesses, thresholds = HINT_THRESHOLDS) {
  return _getClueCountForThresholds(numGuesses, thresholds);
}

export function getNextThresholdIndex(numGuesses, thresholds = HINT_THRESHOLDS) {
  return _getNextThresholdIndexForThresholds(numGuesses, thresholds);
}

// Returns the actual next threshold value (e.g. 4), or null if none remain.
export function getNextThreshold(numGuesses, thresholds = HINT_THRESHOLDS) {
  const idx = _getNextThresholdIndexForThresholds(numGuesses, thresholds);
  return idx === -1 ? null : thresholds[idx];
}

// Returns how many guesses remain until the next threshold, or null if none.
export function guessesUntilNextThreshold(numGuesses, thresholds = HINT_THRESHOLDS) {
  const next = getNextThreshold(numGuesses, thresholds);
  if (next === null) return null;
  return Math.max(0, next - numGuesses);
}

// Factory: create a small helper object bound to a custom thresholds array.
// Useful for pages that want to call multiple helpers without passing the
// thresholds array each time.
export function makeHintConfig(thresholds = HINT_THRESHOLDS) {
  return {
    thresholds,
    getClueCount: (numGuesses) => getClueCount(numGuesses, thresholds),
    getNextThresholdIndex: (numGuesses) => getNextThresholdIndex(numGuesses, thresholds),
    getNextThreshold: (numGuesses) => getNextThreshold(numGuesses, thresholds),
    guessesUntilNextThreshold: (numGuesses) => guessesUntilNextThreshold(numGuesses, thresholds),
  };
}

// Per-page threshold constants and convenience configs
// Adjust these arrays to change unlocking behavior per page/mode.
// Locations: [additional locations, methods, types]
export const LOCATIONS_HINT_THRESHOLDS = [2, 4, 6];
export const LocationsHints = makeHintConfig(LOCATIONS_HINT_THRESHOLDS);

export const POKEDEX_HINT_THRESHOLDS = [4, 8, 12];
export const PokedexHints = makeHintConfig(POKEDEX_HINT_THRESHOLDS);

// Colours page thresholds (types, generation)
export const COLOURS_HINT_THRESHOLDS = [3, 6];
export const ColourHints = makeHintConfig(COLOURS_HINT_THRESHOLDS);

// Card page thresholds:
// [fullArtTypesThreshold, revealFullCardThreshold, normalTypesThreshold]
export const CARD_HINT_THRESHOLDS = [4, 4, 8];
export const CardHints = makeHintConfig(CARD_HINT_THRESHOLDS);

// Eyes page thresholds:
// [fullImageThreshold, generationHintThreshold]
export const EYES_HINT_THRESHOLDS = [2, 4, 6];
export const EyesHints = makeHintConfig(EYES_HINT_THRESHOLDS);
