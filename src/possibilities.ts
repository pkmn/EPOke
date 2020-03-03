import { StatsTable, Generation } from 'ps';

import { Pool } from './pool';
import { Random } from './random';
import { Stats, StatsRange } from './stats';
import { DeepReadonly } from './types';

export class SpreadPossibilities {
  readonly #base: StatsTable;
  readonly #gen: Generation;
  readonly #level: number;

  #range: DeepReadonly<StatsRange>;
  #pool: Pool<StatsTable>;
  #dirty: boolean;

  static create(
    stats: Record<string, number>,
    base: StatsTable,
    gen: Generation,
    level: number,
  ) {
    const range = StatsRange.fromBase(base, gen, level);
    // No need to filter because we know all of the stats must be within range
    const pool = Pool.create<StatsTable>(stats, (k, v) => [Stats.fromString(k)!, v]);
    return new SpreadPossibilities(base, gen, level, range, pool);
  }

  private constructor(
    base: StatsTable,
    gen: Generation,
    level: number,
    range: DeepReadonly<StatsRange>,
    pool: Pool<StatsTable>,
  ) {
    this.#base = base;
    this.#gen = gen;
    this.#level = level;
    this.#range = range;
    this.#pool = pool;
    this.#dirty = false;
  }

  set level(level: number) {
    if (this.#dirty) throw new Error('Level cannot be changed after use');
    // @ts-ignore readonly
    this.#level = level;
    this.#range = StatsRange.fromBase(this.#base, this.#gen, this.#level);
    this.#dirty = true;
  }

  get range(): DeepReadonly<StatsRange> {
    return this.#range;
  }

  set range(range: DeepReadonly<StatsRange>) {
    // PRECONDITION: this.#range.includes(range);
    this.#range = range;
    this.#dirty = true;
  }

  select(fn = (s: StatsTable, v: number) => v, random?: Random) {
    this.#dirty = true;
    const f = (s: StatsTable, v: number) => (this.#range.includes(s) ? fn(s, v) : -1);
    const {val, pool} = this.#pool.select(f, random);
    if (!val) {
      // TODO come up with arbitrary set that is within range
      return null;
    }
    return Stats.toSpread(val, this.#base, this.#gen, this.#level);
  }
}
