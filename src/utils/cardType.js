// Shared helper to decide card type based on UTC weekday and a PRNG
export function getCardTypeByDay(utcDay, rng) {
  // utcDay: 0=Sunday, 6=Saturday
  if (utcDay === 0) return 'special'; // Sunday -> illustration/special
  if (utcDay === 6) return rng() < 0.9 ? 'full_art' : 'shiny'; // Saturday -> 90/10
  return 'normal'; // Mon-Fri
}
