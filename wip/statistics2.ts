import * as pkmn from '@pkmn.cc/data';

import { SparseSpread, Spread, STATS, StatsTable } from './stats';

interface RawStatistics {
  data: { [name: string]: MovesetStatistics };
}

interface MovesetStatistics {
  'Raw count': number;
  usage: number;
  'Viability Ceiling': [number, number, number, number];
  Abilities: { [key: string]: number };
  Items: { [key: string]: number };
  Spreads: { [key: string]: number };
  Happiness: { [key: string]: number };
  Moves: { [key: string]: number };
  Teammates: { [key: string]: number };
  'Checks and Counters': { [key: string]: EncounterStatistics };
}

interface EncounterStatistics {
  koed: number;
  switched: number;
  n: number;
  p: number;
  d: number;
  score: number;
}

interface Statistics {
  pokemon: {[species: string]: PokemonStatistics};
  metagame: MetagameStatistics;
}

interface PokemonStatistics {
  usage: number;

  stats: StatStatistics;

  abilities: {[name: string]: number};
  items: {[name: string]: number};
  moves: {[name: string]: number}; 
  teammates: {[name: string]: number};
  counters: {[name: string]: number};
}

interface MetagameStatistics {
  pokemon: {[name: string]: number};
  abilities: {[name: string]: number};
  items: {[name: string]: number};
  moves: {[name: string]: number}; 
}

interface StatStatistics {
  buckets: {[bucket: string]: number};
  spreads: {[spread: string]: number}
  natures: {[name: string]: number};
  mixed: { atk: number; def: number };
  percentiles: StatsTable<number[]>;
  percents: StatsTable<Array<[number, number]>>;
}

interface WeightedPair<T> {
  key: T;
  weight: number;
}

function cutoff(chance: number, matches: number) {
  return 1 - (1 - chance) ^ (1 / matches);
}


function  process(raw: RawStatistics, names?: string[], gen?: pkmn.Generation) {
  const result: { [name: string]: Statistics } = {};
  for (const name of names || Object.keys(raw.data)) {
    const pokemon: MovesetStatistics = raw.data[name];

    // TODO
    spreads(pokemon, pkmn.Species.get(name, gen)!.baseStats, gen);
 
  }
}


/// TODO vvvv


function spreads(pokemon: MovesetStatistics, base: StatsTable<number>, gen?: pkmn.Generation): StatStatistics {
  let totalWeight = 0;
  const totalMixed = { atk: 0, def: 0 };

  const natureWeights: { [nature: string]: number } = {};
  const statWeights: { [stat in pkmn.Stat]?: { [val: number]: number } } = {};
  const grouped: { [spread: string]: number } = {};
  for (const [spread, weight] of Object.entries(pokemon['Spreads'])) {
    totalWeight += weight;
    const { bucketed, nature, stats, mixed } = bucketSpreadAndCalcStats(spread, base, gen);

    if (mixed.atk) totalMixed.atk += weight;
    if (mixed.def) totalMixed.def += weight;

    natureWeights[nature] = (natureWeights[nature] || 0) + weight;
    const s = SparseSpread.display(bucketed, true);
    grouped[s] = (grouped[s] || 0) + weight;

    let stat: pkmn.Stat;
    for (stat in STATS) {
      const val = stats[stat];
      statWeights[stat] = statWeights[stat] || {};
      if (typeof statWeights[stat]![val] === 'undefined') {
        statWeights[stat]![val] = 0;
      }
      statWeights[stat]![val] += weight;
    }
  }

  const spreads = {[spread: string]: number} = {};
  for (const [spread, weight] of Object.entries(pokemon['Spreads'])) {
  }

  const buckets: {[spread: string]: number} = {};
  for (const [key, value] of Object.entries(grouped)) {
    const weight = (value / totalWeight) * 100;
    buckets[Spread.fromString(key)!.toString()] = weight;
  }

  const natures: {[name: string]: number} = {};
  for (const [key, value] of Object.entries(natureWeights)) {
    const weight = (value / totalWeight) * 100;
    natures[pkmn.Natures.get(key)!.toString()] = weight;
  }

  const mixed = {
    atk: (totalMixed.atk / totalWeight) * 100,
    def: (totalMixed.def / totalWeight) * 100,
  };

  const orderedStatWeights: StatsTable<Array<WeightedPair<number>>> = {
    hp: [],
    atk: [],
    def: [],
    spa: [],
    spd: [],
    spe: [],
  };
  let stat: pkmn.Stat;
  for (stat in STATS) {
    for (const [val, weight] of Object.entries(statWeights[stat]!)) {
      orderedStatWeights[stat].push({
        key: Number(val),
        weight: (weight / totalWeight) * 100,
      });
    }
    orderedStatWeights[stat].sort((a, b) => a.key - b.key);
  }

  const percents: StatsTable<Array<[number, number]>> = {
    hp: [],
    atk: [],
    def: [],
    spa: [],
    spd: [],
    spe: [],
  };
  const percentiles: StatsTable<number[]> = {
    hp: [],
    atk: [],
    def: [],
    spa: [],
    spd: [],
    spe: [],
  };
  for (stat in STATS) {
    const prev = { val: 0, weight: 0 };
    let last = 100;
    for (const pair of orderedStatWeights[stat]!) {
      const weight = 100 - prev.weight;
      percents[stat].push([pair.key, weight]);
      const val = Number(pair.key);
      while (weight < last && last-- > 0) {
        percentiles[stat].push(prev.val);
      }
      prev.val = val;
      prev.weight = prev.weight + pair.weight;
    }
    for (let i = percentiles[stat].length; i < 100; i++) {
      percentiles[stat].push(prev.val);
    }
  }

  return { buckets, spreads, natures, mixed, percents, percentiles };
}

function bucketSpreadAndCalcStats(spread: string, base: pkmn.StatsTable, gen?: pkmn.Generation) {
  const [n, revs] = spread.split(':');
  const nature = pkmn.Natures.get(n)!;
  const rawEVs = revs.split('/');

  const invested = {
    hp: false,
    atk: false,
    def: false,
    spa: false,
    spd: false,
    spe: false,
  };
  const evs = { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 };
  const stats = { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 };

  let stat: pkmn.Stat;
  for (stat in stats) {
    const ev = Number(rawEVs[STATS[stat]]) || 0;
    const bucket = Math.floor(ev / 16) * 16;
    evs[stat] = bucket === 240 ? 252 : bucket;
    invested[stat] = nature.plus === stat || ev > 0;
    stats[stat] = pkmn.Stats.calc(stat, base[stat], 31, ev, 100, nature, gen);
  }

  const bucketed = { nature, evs, ivs: {} };

  const mixed = {
    atk: invested.atk && invested.spa,
    def: invested.def && invested.spd,
  };

  return { bucketed, nature: n, stats, mixed };
}