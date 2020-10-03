import {StatsTable} from '@pkmn/types';

import {
  StatsDisplayOptions,
  displayRange,
  displayStats,
  getNatureFromPlusMinus,
  isRange,
  parseRange,
  Range,
  statOrder,
} from './common';
import {STATS, Generation, GEN} from './data';
import {Stats} from './stats';
import {SpreadRange} from './spread-range';

export class StatsRange implements Range<StatsTable> {
  min: Stats;
  max: Stats;

  // PRECONDITION: min <= max
  constructor(range: Range<StatsTable>);
  constructor(min: StatsTable, max: StatsTable);
  constructor(range: Range<StatsTable> | StatsTable, max?: StatsTable) {
    if (isRange(range)) {
      this.min = new Stats(range.min);
      this.max = new Stats(range.max);
    } else {
      this.min = new Stats(range);
      this.max = new Stats(max!);
    }
  }

  equals(other: Range<StatsTable>) {
    return StatsRange.equals(this, other);
  }

  toString() {
    return StatsRange.display(this);
  }

  toStats() {
    return StatsRange.toStats(this);
  }

  toSpreadRange(base: StatsTable, gen?: Generation, level = 100) {
    return StatsRange.toSpreadRange(this, base, gen, level);
  }

  includes(stats: StatsTable | StatsRange) {
    return StatsRange.includes(this, stats);
  }

  static equals(a: Range<StatsTable>, b: Range<StatsTable>) {
    return a === b || Stats.equals(a.min, b.min) && Stats.equals(a.max, b.max);
  }

  static display(range: Range<StatsTable>, options?: StatsDisplayOptions): string;
  static display(range: Range<StatsTable>, gen: Generation, options?: StatsDisplayOptions): string;
  static display(
    range: Range<StatsTable>,
    gen?: Generation | StatsDisplayOptions,
    options?: StatsDisplayOptions
  ) {
    return displayStats(s => displayRange({min: range.min[s], max: range.max[s]}), gen, options);
  }

  static includes(a: StatsRange, b: StatsTable | StatsRange) {
    for (const stat of STATS) {
      if (isRange(b)) {
        if (a.min[stat] > b.min[stat] || a.max[stat] < b.max[stat]) return false;
      } else {
        if (a.min[stat] > b[stat] || a.max[stat] < b[stat]) return false;
      }
    }
    return true;
  }

  static fromBase(base: StatsTable, gen?: Generation, level = 100) {
    const min = new Stats(base);
    const max = new Stats(base);

    const g = GEN(gen);
    for (const stat of STATS) {
      const other = stat === 'spe' ? 'atk' : 'spe';
      const minus = getNatureFromPlusMinus(other, stat);
      const plus = getNatureFromPlusMinus(stat, other);
      min[stat] = STATS.calc(g, stat, base[stat], 0, 0, level, minus);
      max[stat] = STATS.calc(g, stat, base[stat], 31, 252, level, plus);
    }

    return new StatsRange(min, max);
  }

  static fromString(s: string) {
    const min: Partial<StatsTable> = {};
    const max: Partial<StatsTable> = {};

    const split = s.split('/');
    if (split.length < 5 || split.length > 6) return undefined;

    const order = statOrder(split.length === 5 ? 1 : 8);
    for (const [i, v] of split.entries()) {
      const [range, name] = v.trim().split(/\s+/);
      const val = parseRange(range);
      if (!val) return undefined;

      const stat = (name && STATS.get(name)) || order[i];
      min[stat] = val.min;
      max[stat] = val.max;
    }

    if (split.length === 5) {
      min.spd = min.spa;
      max.spd = max.spa;
    }

    for (const stat of STATS) {
      // Stats cannot be 0, so its not necessary to check for === undefined
      if (!min[stat] || !max[stat] || max[stat] === Infinity) return undefined;
    }

    return new StatsRange(min as StatsTable, max as StatsTable);
  }

  static toStats(range: Range<StatsTable>) {
    return Stats.equals(range.min, range.max) ? new Stats(range.min) : undefined;
  }

  static toSpreadRange(range: Range<StatsTable>, base: StatsTable, gen?: Generation, level = 100) {
    const min = Stats.toSpread(range.min, base, gen, level);
    const max = Stats.toSpread(range.max, base, gen, level);
    return (!min && !max) ? undefined : new SpreadRange(min || {}, max || {});
  }
}
