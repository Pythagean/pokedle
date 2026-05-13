// Shared helper to decide card type based on UTC weekday and a PRNG
export function getCardTypeByDay(utcDay, rng) {
  // utcDay: 0=Sunday, 6=Saturday
  if (utcDay === 0 || utcDay === 6) return 'special'; // Sunday & Saturday -> illustration/special
  return 'normal'; // Mon-Fri (5% full_art / 5% shiny upgrades handled in card selection)
}
