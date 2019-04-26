import * as pkmn from '@pkmn.cc/data';

import {STATS, StatsTable} from './stats';

export interface RawStatistics {
  'data': {[name: string]: RawProcessedStatistics};
}

export interface RawProcessedStatistics {
  'Moves': RawWeights;
  'Abilities': RawWeights;
  'Items': RawWeights;
  'Spreads': RawWeights;
  'usage': number;
}

export interface RawWeights {
  [id: string]: number;
}

export interface ProcessedStatistics {
  moves: Array<WeightedPair<string>>;
  abilities: Array<WeightedPair<string>>;
  items: Array<WeightedPair<string>>;
  spreads: SpreadWeights;
  usage: number;
}

export interface WeightedPair<T> {
  key: T;  // TODO key;
  weight: number;
}

export interface SpreadWeights {
  // bucketed spread to percent weight
  spreads: Array<WeightedPair<string>>;  // TODO
  // nature to percent weight
  natures: Array<WeightedPair<string>>;  // TODO
  // percent of spreads which are mixed
  mixed: {atk: number, def: number};
  // string stat value to cumulative total percent for each stat
  percents: StatsTable<Array<WeightedPair<string>>>;  // TODO
  // percentiles of stat values for each stat
  percentiles: StatsTable<number[]>;
}

export class Statistics {
  protected constructor() {}

  static url(date: string, fmt: string|pkmn.Format, weighted = true) {
    const format = typeof fmt === 'string' ? pkmn.Format.fromString(fmt) : fmt;
    if (!format) return undefined;
    const rating = weighted ? (format.id === 'gen7ou' ? 1825 : 1760) : 0;
    return `https://www.smogon.com/stats/${date}/chaos/${format}-${
        rating}.json`;
  }

  static display(name: string, stats: ProcessedStatistics, cutoff = 3.41) {
    let s = `${name} (${percent(stats.usage)})\n`;
    s += '===\n';

    const plus = {atk: 0, def: 0, spa: 0, spd: 0, spe: 0, hp: 0};
    const minus = {atk: 0, def: 0, spa: 0, spd: 0, spe: 0, hp: 0};
    for (const n of stats.spreads.natures) {
      const nature = pkmn.Natures.get(n.key)!;
      plus[nature.plus || 'hp'] += n.weight;
      minus[nature.minus || 'hp'] += n.weight;
    }
    s += `Nature (+): (${plus.hp.toFixed(1)})/${
        Object.values(plus).slice(0, 5).map(p => p.toFixed(1)).join('/')}%\n`;
    s += `Nature (-): (${minus.hp.toFixed(1)})/${
        Object.values(minus).slice(0, 5).map(p => p.toFixed(1)).join('/')}%\n`;
    s += `Mixed: ${percent(stats.spreads.mixed.atk)} / ${
        percent(stats.spreads.mixed.def)}\n`;
    s += '\n';

    const maxes = [];
    const mins = [];
    const medians = [];
    let stat: pkmn.Stat;
    for (stat in STATS) {
      const percent = stats.spreads.percents[stat];
      maxes.push(percent[percent.length - 1]);
      mins.push({
        key: percent[0].key,
        weight: percent.length > 1 ? 100 - percent[1].weight : 100
      });
      medians.push(stats.spreads.percentiles[stat][49]);
    }
    s += `Avg: ${medians.join('/')}\n`;
    s += `Max: ${maxes.map(p => p.key).join('/')}\n`;
    s += `Max%: ${maxes.map(p => p.weight.toFixed(1)).join('/')}%\n`;
    s += `Min: ${mins.map(p => p.key).join('/')}\n`;
    s += `Min%: ${mins.map(p => p.weight.toFixed(1)).join('/')}%\n`;
    s += '\n';

    s += displayWeightedPairs(stats.spreads.spreads, cutoff);
    s += '---\n';
    s += displayWeightedPairs(stats.abilities, cutoff);
    s += '---\n';
    s += displayWeightedPairs(stats.items, cutoff);
    s += '---\n';
    s += displayWeightedPairs(stats.moves, cutoff);

    return s;
  }

  static process(raw: RawStatistics, names?: string[], gen?: pkmn.Generation) {
    const result: {[name: string]: ProcessedStatistics} = {};
    for (const name of (names || Object.keys(raw.data))) {
      const pokemon: RawProcessedStatistics = raw.data[name];
      result[name] = {
        moves: moves(pokemon, gen),
        abilities: abilities(pokemon, gen),
        items: items(pokemon, gen),
        spreads: spreads(pokemon, pkmn.Species.get(name, gen)!.baseStats, gen),
        usage: pokemon.usage * 100,
      };
    }
    return result;
  }
}

function binarySearch<T>(array: T[], pred: (t: T) => boolean) {
  let lo = -1, hi = array.length;
  while (1 + lo < hi) {
    const mi = lo + ((hi - lo) >> 1);
    if (pred(array[mi])) {
      hi = mi;
    } else {
      lo = mi;
    }
  }
  return hi;
}

function atLeast<T>(stats: Array<WeightedPair<T>>, val: number) {
  const ret =
      binarySearch(stats, (pair: WeightedPair<T>) => pair.weight >= val);
  // NOTE: we want to make adding 1 to this index safe so we can
  // use it to optimize lookups during speed calculations.
  return ret === -1 ? -2 : ret;
}

function fromIndex<T>(stats: Array<WeightedPair<T>>, i: number) {
  if (i <= -1) return 100;
  if (i >= stats.length) return 0;
  return stats[i].weight;
}

function weighted(
    pokemon: RawProcessedStatistics,
    key: Exclude<keyof RawProcessedStatistics, 'usage'>, gen?: pkmn.Generation,
    factor = 1) {
  const weights = pokemon[key];
  const totalWeight = Object.values(weights).reduce((acc, v) => acc + v);

  const result: Array<WeightedPair<string>> = [];
  for (const id in weights) {
    const effect = pkmn.Effects.get(id, gen);
    const key = effect ? effect.name : id;
    const weight = (weights[id] / totalWeight) * factor * 100;
    result.push({key, weight});
  }

  return result.sort((a, b) => b.weight - a.weight);
}

function moves(pokemon: RawProcessedStatistics, gen?: pkmn.Generation) {
  return weighted(pokemon, 'Moves', gen, 4);
}

function abilities(pokemon: RawProcessedStatistics, gen?: pkmn.Generation) {
  return weighted(pokemon, 'Abilities', gen);
}

function items(pokemon: RawProcessedStatistics, gen?: pkmn.Generation) {
  return weighted(pokemon, 'Items', gen);
}

function spreads(
    pokemon: RawProcessedStatistics, base: pkmn.StatsTable,
    gen?: pkmn.Generation) {
  let totalWeight = 0;
  const totalMixed = {atk: 0, def: 0};

  const natureWeights: {[nature: string]: number} = {};
  const statWeights: {[stat in pkmn.Stat]?: {[val: string]: number}} = {};
  const grouped: {[spread: string]: number} = {};
  for (const [spread, weight] of Object.entries(pokemon['Spreads'])) {
    totalWeight += weight;
    const {bucketed, nature, stats, mixed} =
        bucketSpreadAndCalcStats(spread, base, gen);

    if (mixed.atk) totalMixed.atk += weight;
    if (mixed.def) totalMixed.def += weight;

    natureWeights[nature] = (natureWeights[nature] || 0) + weight;
    grouped[bucketed] = (grouped[bucketed] || 0) + weight;

    let stat: pkmn.Stat;
    for (stat in STATS) {
      const val = stats[stat].toString();
      statWeights[stat] = statWeights[stat] || {};
      if (typeof statWeights[stat]![val] === 'undefined') {
        statWeights[stat]![val] = 0;
      }
      statWeights[stat]![val] += weight;
    }
  }

  const spreads = [];
  for (const [key, value] of Object.entries(grouped)) {
    const weight = (value / totalWeight) * 100;
    spreads.push({key, weight});
  }
  spreads.sort((a, b) => b.weight - a.weight);

  const natures = [];
  for (const [key, value] of Object.entries(natureWeights)) {
    const weight = (value / totalWeight) * 100;
    natures.push({key, weight});
  }
  natures.sort((a, b) => b.weight - a.weight);

  const mixed = {
    atk: (totalMixed.atk / totalWeight) * 100,
    def: (totalMixed.def / totalWeight) * 100,
  };

  const orderedStatWeights: StatsTable<Array<WeightedPair<string>>> =
      {hp: [], atk: [], def: [], spa: [], spd: [], spe: []};
  let stat: pkmn.Stat;
  for (stat in STATS) {
    for (const [val, weight] of Object.entries(statWeights[stat]!)) {
      orderedStatWeights[stat].push(
          {key: val, weight: weight / totalWeight * 100});
    }
    orderedStatWeights[stat].sort((a, b) => Number(a.key) - Number(b.key));
  }

  const percents: StatsTable<Array<WeightedPair<string>>> =
      {hp: [], atk: [], def: [], spa: [], spd: [], spe: []};
  const percentiles: StatsTable<number[]> =
      {hp: [], atk: [], def: [], spa: [], spd: [], spe: []};
  for (stat in STATS) {
    const prev = {val: 0, weight: 0};
    let last = 100;
    for (const pair of orderedStatWeights[stat]!) {
      const weight = 100 - prev.weight;
      percents[stat].push({key: pair.key, weight});
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

  return {spreads, natures, mixed, percents, percentiles};
}

function bucketSpreadAndCalcStats(
    spread: string, base: pkmn.StatsTable, gen?: pkmn.Generation) {
  const [n, revs] = spread.split(':');
  const nature = pkmn.Natures.get(n)!;
  const rawEVs = revs.split('/');

  const evs = [];
  for (const rawEV of rawEVs) {
    const bucket = Math.floor(Number(rawEV) / 16) * 16;
    evs.push((bucket === 240 ? 252 : bucket).toString());
  }

  if (nature.plus && nature.minus) {
    const plus = STATS[nature.plus];
    const minus = STATS[nature.minus];
    evs[plus] = `${evs[plus]}+`;
    evs[minus] = `${evs[minus]}-`;
  }

  const invested =
      {hp: false, atk: false, def: false, spa: false, spd: false, spe: false};
  const stats = {hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0};
  let stat: pkmn.Stat;
  for (stat in stats) {
    const ev = Number(rawEVs[STATS[stat]]) || 0;
    invested[stat] = nature.plus === stat || ev > 0;
    stats[stat] = pkmn.Stats.calc(stat, base[stat], 31, ev, 100, nature, gen);
  }

  const mixed = {
    atk: invested.atk && invested.spa,
    def: invested.def && invested.spd,
  };

  const bucketed = nature + ' ' + evs.join('/');
  return {bucketed, nature: n, stats, mixed};
}

function displayWeightedPairs(
    pairs: Array<WeightedPair<string>>, cutoff = 3.41) {
  let s = '';
  for (const {key, weight} of pairs) {
    if (weight < cutoff) break;
    s += `${key}: ${percent(weight)}\n`;
  }
  return s;
}

function percent(n: number, d = 100): string {
  return `${(n * 100 / d).toFixed(2)}%`;
}
