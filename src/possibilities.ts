import { Dex, ID,Species, StatsTable, Generation, Gender } from 'ps';
import { DisplayUsageStatistics } from '@smogon/stats'; // -> smogon

import { Pool } from './pool';
import { Random } from './random';
import { Stats, StatsRange } from './stats';

type DeepReadonly<T> = T extends primitive ? T : DeepReadonlyObject<T>;
type primitive = string | number | boolean | undefined | null | Function | ID;
type DeepReadonlyObject<T> = {
  readonly [P in keyof T]: DeepReadonly<T[P]>;
};

export class SetPossibilities {
  readonly species: Species;

  readonly spreads: SpreadPossibilities;
  readonly abilities: Pool<string>;
  readonly items: Pool<string>;
  readonly moves: Pool<string>;
  
  gender: Gender | undefined;

  static create(
    dex: Dex,
    stats: DisplayUsageStatistics,
    speciesName: string,
    // TODO heuristics (t: 'ability' | 'item' | 'move', v: string, w: number) => w
    level?: number,
    gender?: Gender
  ) {
    level = level || dex.format.defaultLevel || dex.format.maxLevel || 100;
    const species = dex.getSpecies(speciesName)!;
    const spreads = SpreadPossibilities.create(stats.stats, species.baseStats, dex.gen, level);
    // TODO heuristics
    const abilities = Pool.create<string>(stats.abilities); 
    const items = Pool.create<string>(stats.items); 
    const moves = Pool.create<string>(stats.moves); 
    return new SetPossibilities(species, gender, spreads, abilities, items, moves);
  }

  constructor(
    species: Species,
    spreads: SpreadPossibilities,
    abilities: Pool<string>,
    items: Pool<string>,
    moves: Pool<string>
  ) {
    this.species = species;
    this.spreads = spreads;
    this.abilities = abilities;
    this.items = items;
    this.moves = moves;
    this.gender = gender;
  }

  get level() {
    return this.spreads.level;
  }

  set level(level: number) {
    this.spreads.level = level;
  }

  get ability() {
    return this.abilities.locked.length ? this.abilities.locked[0] : undefined;
  }

  set ability(ability: string) {
    if (this.abilties.locked.length) {
      throw new Error(`${ability} cannot replace locked ability ${this.ability}`);
    }
    this.abilities.lock(ability);
  }

  get item() {
    return this.items.locked.length ? this.items.locked[0] : undefined;
  }

  set item(item: string) {
    if (this.items.locked.length) {
      throw new Error(`${item} cannot replace locked item ${this.item}`);
    }
    this.items.lock(item);
  }

  set move(move: string) {
    if (this.moves.locked.length >= 4) {
      throw new Error(`${move} cannot be be added to locked moves ${this.moves}`);
    }
    this.moves.lock(move);
  }
}

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
    return new SpreadPossibilities(base, gen, level, range, pool, false);
  }

  private constructor(
    base: StatsTable,
    gen: Generation,
    level: number,
    range: DeepReadonly<StatsRange>,
    pool: Pool<StatsTable>,
    dirty: boolean,
  ) {
    this.#base = base;
    this.#gen = gen;
    this.#level = level;
    this.#range = range;
    this.#pool = pool;
    this.#dirty = dirty;
  }

  get level() {
    return this.#level;
  }

  set level(level: number) {
    if (this.#dirty) throw new Error(`Level ${this.level} cannot be changed after use to ${level}`);
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
    const [stats, pool] = this.#pool.select(f, random);

    const updated = new SpreadPossibilities(this.#base, this.#gen, this.#level, this.#range, pool, true);
    if (!stats) {
      // TODO come up with arbitrary set that is within range
      return [null, updated];
    }
    return [Stats.toSpread(stats, this.#base, this.#gen, this.#level), updated];
  }
}
