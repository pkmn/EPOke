import {NatureName, StatsTable} from '@pkmn/types';

import {GEN, Generation, NATURES, STATS} from './data';
import {SpreadRange} from './spread-range';
import {Stats} from './stats';

export interface SpreadTable<T = number> {
  nature?: NatureName;
  ivs?: Partial<StatsTable<T>>;
  evs?: Partial<StatsTable<T>>;
}

export interface SpreadDisplayOptions {
  style?: 'pretty' | 'compact' | 'import';
  separator?: string | {line?: string; internal?: string};
}

export class Spread implements SpreadTable {
  nature?: NatureName;
  ivs: Partial<StatsTable>;
  evs: Partial<StatsTable>;

  constructor(spread: SpreadTable);
  constructor(nature: NatureName | undefined, ivs: Partial<StatsTable>, evs: Partial<StatsTable>);
  constructor(
    spread: SpreadTable | NatureName | undefined,
    ivs?: Partial<StatsTable>,
    evs?: Partial<StatsTable>
  ) {
    if (spread && typeof spread !== 'string') {
      this.nature = spread.nature;
      this.ivs = {...spread.ivs};
      this.evs = {...spread.evs};
    } else {
      this.nature = spread;
      this.ivs = {...ivs};
      this.evs = {...evs};
    }
  }

  equals(other: SpreadTable) {
    return Spread.equals(this, other);
  }

  toString() {
    return Spread.display(this);
  }

  toRange() {
    return Spread.toRange(this);
  }

  toStats(base: StatsTable, gen?: Generation, level = 100) {
    return Spread.toStats(this, base, gen, level);
  }

  static equals(a: SpreadTable, b: SpreadTable) {
    if (a === b) return true;
    if (a.nature !== b.nature) return false;
    for (const stat of STATS) {
      if ((a.ivs?.[stat] || 31) !== (b.ivs?.[stat] || 31)) return false;
      if ((a.evs?.[stat] || 0) !== (b.evs?.[stat] || 0)) return false;
    }
    return true;
  }

  static display(spread: SpreadTable, options?: SpreadDisplayOptions): string;
  static display(spread: SpreadTable, gen: Generation, options?: SpreadDisplayOptions): string;
  static display(
    spread: SpreadTable,
    gen?: Generation | SpreadDisplayOptions,
    options?: SpreadDisplayOptions
  ) {
    // NOTE: we are deliberately not calling toRange to avoid unnecessary copying
    return SpreadRange.display({min: spread, max: spread}, gen as Generation, options);
  }

  static fromString(s: string) {
    const range = SpreadRange.fromString(s);
    if (!range) return undefined;
    return range.toSpread();
  }

  static toRange(spread: SpreadTable) {
    return new SpreadRange(spread, spread);
  }

  static toStats(spread: SpreadTable, base: StatsTable, gen?: Generation, level = 100) {
    const stats: Partial<StatsTable> = {};

    const g = GEN(gen);
    const nature = spread.nature && NATURES.get(spread.nature);
    for (const stat of STATS) {
      stats[stat] = STATS.calc(
        g, stat, base[stat], spread.ivs?.[stat], spread.evs?.[stat], level, nature
      );
    }

    return new Stats(stats as StatsTable);
  }
}
