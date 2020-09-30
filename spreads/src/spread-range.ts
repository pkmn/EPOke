import {StatsTable} from '@pkmn/types';

import {isRange, Range} from './common';
import {Generation} from './data';
import {Stats} from './stats';
import {Spread, SpreadTable} from './spread';
import {StatsRange} from './stats-range';

export class SpreadRange implements Range<SpreadTable> {
  min: Spread;
  max: Spread;

  // PRECONDITION: min <= max
  constructor(range: Range<SpreadTable>);
  constructor(min: SpreadTable, max: SpreadTable);
  constructor(range: Range<SpreadTable> | SpreadTable, max?: SpreadTable) {
    if (isRange(range)) {
      this.min = new Spread(range.min);
      this.max = new Spread(range.max);
    } else {
      this.min = new Spread(range);
      this.max = new Spread(max!);
    }
  }

  toString(): string {
    return SpreadRange.display(this);
  }

  toSpread(): Spread | undefined {
    return SpreadRange.toSpread(this);
  }

  toStatsRange(base: StatsTable, gen?: Generation, level = 100): StatsRange {
    return SpreadRange.toStatsRange(this, base, gen, level);
  }

  static display(range: Range<SpreadTable>, compact?: boolean, gen?: Generation): string {
    return null!; // TODO
  }

  static fromString(s: string): SpreadRange {
    return null!; // TODO
  }

  static toSpread(range: Range<SpreadTable>): Spread | undefined {
    if (range.min.nature !== range.max.nature) return undefined;
    if (!Stats.equal(range.min.ivs || {}, range.max.ivs || {})) return undefined;
    if (!Stats.equal(range.min.evs || {}, range.max.evs || {})) return undefined;
    return new Spread(range.min);
  }

  static toStatsRange(spread: Range<SpreadTable>, base: StatsTable, gen?: Generation, level = 100) {
    return null! as StatsRange; // TODO
  }
}
