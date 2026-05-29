// Gen 6+ type effectiveness chart
// TYPE_CHART[attackingType][defendingType] = multiplier (omitted = 1x neutral)
const TYPE_CHART = {
  normal:   { rock: 0.5, ghost: 0, steel: 0.5 },
  fighting: { normal: 2, ice: 2, poison: 0.5, rock: 2, bug: 0.5, ghost: 0, steel: 2, psychic: 0.5, flying: 0.5, dark: 2, fairy: 0.5 },
  flying:   { fighting: 2, rock: 0.5, bug: 2, steel: 0.5, grass: 2, electric: 0.5 },
  poison:   { grass: 2, poison: 0.5, ground: 0.5, rock: 0.5, ghost: 0.5, steel: 0, fairy: 2 },
  ground:   { poison: 2, rock: 2, bug: 0.5, steel: 2, fire: 2, grass: 0.5, electric: 2, flying: 0 },
  rock:     { fighting: 0.5, flying: 2, ground: 0.5, bug: 2, steel: 0.5, fire: 2, ice: 2 },
  bug:      { fighting: 0.5, flying: 0.5, poison: 0.5, ghost: 0.5, steel: 0.5, fire: 0.5, fairy: 0.5, grass: 2, psychic: 2, dark: 2 },
  ghost:    { normal: 0, fighting: 0, ghost: 2, psychic: 2, dark: 0.5 },
  steel:    { steel: 0.5, fire: 0.5, water: 0.5, electric: 0.5, poison: 0, ice: 2, rock: 2, fairy: 2 },
  fire:     { rock: 0.5, fire: 0.5, water: 0.5, dragon: 0.5, bug: 2, steel: 2, grass: 2, ice: 2 },
  water:    { water: 0.5, grass: 0.5, dragon: 0.5, ground: 2, rock: 2, fire: 2 },
  grass:    { flying: 0.5, poison: 0.5, bug: 0.5, steel: 0.5, fire: 0.5, grass: 0.5, dragon: 0.5, ground: 2, rock: 2, water: 2 },
  electric: { grass: 0.5, electric: 0.5, dragon: 0.5, ground: 0, flying: 2, water: 2 },
  psychic:  { psychic: 0.5, steel: 0.5, dark: 0, fighting: 2, poison: 2 },
  ice:      { steel: 0.5, water: 0.5, ice: 0.5, flying: 2, ground: 2, grass: 2, dragon: 2 },
  dragon:   { steel: 0.5, fairy: 0, dragon: 2 },
  dark:     { fighting: 0.5, dark: 0.5, fairy: 0.5, psychic: 0, ghost: 2, dark: 2 },
  fairy:    { poison: 0.5, steel: 0.5, fire: 0.5, dragon: 0, fighting: 2, dark: 2 },
};

function _computeMultipliers(defenderTypes) {
  const defending = defenderTypes.map(t => t.toLowerCase());
  const result = {};
  for (const [atkType, matchups] of Object.entries(TYPE_CHART)) {
    let multiplier = 1;
    for (const defType of defending) {
      const m = matchups[defType];
      if (m !== undefined) multiplier *= m;
    }
    result[atkType] = multiplier;
  }
  return result;
}

export function getWeaknesses(defenderTypes) {
  const mult = _computeMultipliers(defenderTypes);
  return Object.keys(mult).filter(t => mult[t] >= 2);
}

export function getResistances(defenderTypes) {
  const mult = _computeMultipliers(defenderTypes);
  return Object.keys(mult).filter(t => mult[t] > 0 && mult[t] < 1);
}

export function getImmunities(defenderTypes) {
  const mult = _computeMultipliers(defenderTypes);
  return Object.keys(mult).filter(t => mult[t] === 0);
}
