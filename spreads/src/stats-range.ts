import {StatsTable} from '@pkmn/types';

import {
  displayRange,
  displayStats,
  getNatureFromPlusMinus,
  isRange,
  parseRange,
  Range,
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

  static display(range: Range<StatsTable>, compact?: boolean, gen?: Generation) {
    return displayStats(s => displayRange({min: range.min[s], max: range.max[s]}), compact, gen);
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
    const stats = [...STATS]; // XXX
    const compact = !s.endsWith('e');

    const split = s.split(compact ? '/' : ' / ');
    if (split.length !== 6) return undefined;
    for (const [i, range] of split.entries()) {
      const val = parseRange(compact ? range : range.split(' ')[0]);
      if (!val) return undefined;
      const stat = stats[i];
      min[stat] = val.min;
      max[stat] = val.max;
    }
    return new StatsRange(min as StatsTable, max as StatsTable);
  }

  static toStats(range: Range<StatsTable>) {
    return Stats.equal(range.min, range.max) ? new Stats(range.min) : undefined;
  }

  static toSpreadRange(range: Range<StatsTable>, base: StatsTable, gen?: Generation, level = 100) {
    const min = Stats.toSpread(range.min, base, gen, level);
    const max = Stats.toSpread(range.max, base, gen, level);
    return (!min || !max) ? undefined : new SpreadRange(min, max);
  }
}
