import { Specie, GenderName, StatsTable, AbilityName, ItemName, MoveName } from "@pkmn/data";
import { Range, Spread } from "@pkmn/spreads";

export interface Random {
  next(min?: number, max?: number): number;
  shuffle<T>(arr: T[]): T[];
  sample<T>(arr: T[], remove?: boolean): T;
}

export interface Pool<T> extends Iterable<T> {
  // used by EPOke
  get(): T[]; // returns certain
  set(t: T): void; // lock
  remove(t: T): void; // doesnt call update - removals dont affect sort order, can cache

  // used by gmd
  has(t: T): void; // check certain, build and cache possible set for lookups
  possible: Set<T>; // sorted!

  // used by predictor
  update(fn: (k: T, v: number) => number): void; // invalidates everything (effects sort)
  select(fn?: (k: T, v: number) => number, random?: Random): {value: T | undefined, next: Pool<T>};

  // private
  certain: T[]; // locked
  unlikely: T[]; // zero
}

export interface SetPossibilities {
  readonly species: Specie;

  readonly spreads: SpreadPossibilities;
  readonly abilities: Pool<AbilityName>;
  readonly items: Pool<ItemName>;
  readonly moves: Pool<MoveName>;

  gender?: GenderName;

  level: number;
  ability: AbilityName;
  item: ItemName;
  move: MoveName; // BUG: set only!
}

export interface SpreadPossibilities {
  level: number;
  range: Range<StatsTable>;
  select(fn?: (k: StatsTable, v: number) => number, random?: Random): {
    value: Spread | undefined,
    next: SpreadPossibilities
  };

  // private
  pool: Pool<StatsTable>;
}




// - three cases:
// 	- 0 ERROR - update each turn, generate N random teams
// 	- PocketMon: update each turn, generate 1 most likely team
// 	- *BKC 9000*: no updates, generate 1 random team
// - only 0 ERROR cases about latency, so perhaps worth just implementing single `Pool` with all the