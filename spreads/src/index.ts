import {StatsTable, StatName} from '@pkmn/types';
import {STATS, NATURES, GEN, Generation, Nature} from './data';

const S = ['hp', 'atk', 'def', 'spa', 'spd', 'spe'] as const;
const N = [...NATURES];

export interface Range<T> {
  min: T;
  max: T;
}

function isRange<T>(r: unknown | Range<T>): r is Range<T> {
  return 'min' in (r as Range<T>);
}

export class Stats implements StatsTable {
  hp: number;
  atk: number;
  def: number;
  spa: number;
  spd: number;
  spe: number;

  constructor(stats: StatsTable) {
    this.hp = stats.hp;
    this.atk = stats.atk;
    this.def = stats.def;
    this.spa = stats.spa;
    this.spd = stats.spd;
    this.spe = stats.spe;
  }

  toString() {
    return Stats.display(this);
  }

  toRange() {
    return Stats.toRange(this);
  }

  toSpread(base: StatsTable, gen?: Generation, level = 100) {
    return Stats.toSpread(this, base, gen, level);
  }

  static equal(a: Partial<StatsTable>, b: Partial<StatsTable>) {
    if (a === b) return true;
    if (Object.keys(a).length !== Object.keys(b).length) return false;
    for (const stat of STATS) {
      if (a[stat] !== b[stat]) return false;
    }
    return true;
  }

  static display(stats: StatsTable, compact?: boolean, gen?: Generation) {
    return displayStats(s => `${stats[s]}`, compact, gen);
  }

  static fromString(s: string) {
    const ranges = StatsRange.fromString(s);
    if (!ranges) return undefined;
    return ranges.toStats();
  }

  static toRange(stats: StatsTable) {
    return new StatsRange(stats, stats);
  }

  static toSpread(stats: StatsTable, base: StatsTable, gen?: Generation, level = 100) {
    return null! as Spread | undefined; // TODO
  }
}

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
    const stats = S;
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

export interface SpreadTable<T = number> {
  nature: Nature;
  ivs: Partial<StatsTable<T>>;
  evs: Partial<StatsTable<T>>;
}

export class Spread implements SpreadTable {
  nature: Nature;
  ivs: Partial<StatsTable>;
  evs: Partial<StatsTable>;

  constructor(spread: SpreadTable);
  constructor(nature: Nature, ivs: Partial<StatsTable>, evs: Partial<StatsTable>);
  constructor(spread: SpreadTable | Nature, ivs?: Partial<StatsTable>, evs?: Partial<StatsTable>) {
    if ('nature' in spread) {
      this.nature = spread.nature;
      this.ivs = spread.ivs;
      this.evs = spread.evs;
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

  static display(spread: SpreadTable, compact?: boolean): string {
    return null!; // TODO
  }

  static fromString(s: string): Spread {
    return null!; // TODO
  }

  static toRange(spread: SpreadTable): SpreadRange {
    return new SpreadRange(spread, spread);
  }

  static toStats(spread: SpreadTable, base: StatsTable, gen?: Generation, level = 100): Stats {
    return null!; // TODO
  }
}

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

  static display(range: Range<SpreadTable>, compact?: boolean): string {
    return null!; // TODO
  }

  static fromString(s: string): SpreadRange {
    return null!; // TODO
  }

  static toSpread(range: Range<SpreadTable>): Spread | undefined {
    if (range.min.nature !== range.max.nature) return undefined;
    if (!Stats.equal(range.min.ivs, range.max.ivs)) return undefined;
    if (!Stats.equal(range.min.evs, range.max.evs)) return undefined;
    return new Spread(range.min);
  }

  static toStatsRange(spread: Range<SpreadTable>, base: StatsTable, gen?: Generation, level = 100) {
    return null! as StatsRange; // TODO
  }
}

function displayStats(display: (stat: StatName) => string, compact?: boolean, gen?: Generation) {
  const skip = GEN(gen) === 1;

  const s = [];
  for (const stat of S) {
    if (skip && stat === 'spd') continue;
    const d = display(stat);
    s.push(compact ? d : `${d} ${STATS.display(stat, gen)}`);
  }
  return s.join(compact ? '/' : ' / ');
}

function displayIVsEVs(
  display: (stat: StatName, type: 'iv' | 'ev') => string,
  compact?: boolean,
  gen?: Generation
) {
  const skip = GEN(gen) === 1;

  const ivs = [];
  const evs = [];
  for (const stat of S) {
    if (skip && stat === 'spd') continue;

    const s = STATS.display(stat, gen);
    const iv = display(stat, 'iv');
    if (compact) {
      ivs.push(iv);
    } else {
      if (iv) ivs.push(`${iv} ${s}`);
    }
    const ev = display(stat, 'ev');
    if (compact) {
      evs.push(ev);
    } else {
      if (ev) evs.push(`${ev} ${s}`);
    }
  }
  return {evs, ivs};
}

function displayRange(range: Range<number>, max = Infinity) {
  if (range.min === range.max || range.min === max) return `${range.min}`;
  if (range.min === 0 && range.max >= max) return '???';
  if (range.max >= max) return `>${range.min}`;
  if (range.min === 0) return `<${range.max}`;
  return `${range.min}-${range.max}`;
}

function parseRange(s: string, max = Infinity) {
  if (s === '???') return {min: 0, max};

  if (s.startsWith('>')) {
    const min = Number(s.slice(1));
    if (isNaN(min)) return undefined;
    return {min, max};
  }

  if (s.startsWith('<')) {
    max = Number(s.slice(1));
    if (isNaN(max)) return undefined;
    return {min: 0, max};
  }

  const [lo, hi] = s.split('-');
  const min = Number(lo);
  if (isNaN(min)) return undefined;
  if (hi === undefined) return {min, max: min};

  max = Number(hi);
  return isNaN(max) ? undefined : {min, max};
}

function getNatureFromPlusMinus(plus: StatName, minus: StatName) {
  if (plus === 'hp' || minus === 'hp') return undefined;
  return N[(S.indexOf(plus) - 1) * 5 + (S.indexOf(minus) - 1)];
}
