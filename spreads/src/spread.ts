import {StatsTable} from '@pkmn/types';

import {STATS, Generation, GEN, Nature} from './data';
import {Stats} from './stats';
import {SpreadRange} from './spread-range';

export interface SpreadTable<T = number> {
  nature?: Nature;
  ivs?: Partial<StatsTable<T>>;
  evs?: Partial<StatsTable<T>>;
}

export class Spread implements SpreadTable {
  nature?: Nature;
  ivs: Partial<StatsTable>;
  evs: Partial<StatsTable>;

  constructor(spread: SpreadTable);
  constructor(nature: Nature | undefined, ivs: Partial<StatsTable>, evs: Partial<StatsTable>);
  constructor(
    spread: SpreadTable | Nature | undefined,
    ivs?: Partial<StatsTable>,
    evs?: Partial<StatsTable>
  ) {
    if (spread && !('name' in spread)) {
      this.nature = spread.nature;
      this.ivs = spread.ivs || {};
      this.evs = spread.evs || {};
    } else {
      this.nature = spread;
      this.ivs = ivs!;
      this.evs = evs!;
    }
  }

  toString(): string {
    return Spread.display(this);
  }

  toRange(): SpreadRange {
    return Spread.toRange(this);
  }

  toStats(base: StatsTable, gen?: Generation, level = 100): Stats {
    return Spread.toStats(this, base, gen, level);
  }

  static display(spread: SpreadTable, compact?: boolean, gen?: Generation): string {
    return null!; // TODO
  }

  static fromString(s: string): Spread | undefined {
    const range = SpreadRange.fromString(s);
    if (!range) return undefined;
    return range.toSpread();
  }

  static toRange(spread: SpreadTable): SpreadRange {
    return new SpreadRange(spread, spread);
  }

  static toStats(spread: SpreadTable, base: StatsTable, gen?: Generation, level = 100): Stats {
    const stats: Partial<StatsTable> = {};

    const g = GEN(gen);
    for (const stat of STATS) {
      stats[stat] = STATS.calc(
        g, stat, base[stat], spread.ivs?.[stat], spread.evs?.[stat], level, spread.nature
      );
    }

    return new Stats(stats as StatsTable);
  }
}
