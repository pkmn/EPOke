import * as pkmn from '@pkmn.cc/data';

export interface StatsTable<T> {
  hp: T;
  atk: T;
  def: T;
  spa: T;
  spd: T;
  spe: T;
}

export interface Range<T> {
  min: T;
  max: T;
}

export class Stats implements StatsTable<number> {
  hp: number;
  atk: number;
  def: number;
  spa: number;
  spd: number;
  spe: number;

  constructor(stats: StatsTable<number>) {
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

  toRanges() {
    return Stats.toRanges(this);
  }

  // TODO toSpread
  // TODO static toSpread

  static display(stats: StatsTable<number>, compact?: boolean) {
    return displayStats(stats, v => `${v}`, compact);
  }

  static fromString(s: string) {
    const ranges = StatRanges.fromString(s);
    if (!ranges) return undefined;
    return ranges.toStats();
  }

  static toRanges(stats: StatsTable<number>) {
    return new StatRanges(toStatRanges(stats) as StatsTable<Range<number>>);
  }
}

export class StatRanges implements StatsTable<Range<number>> {
  hp: Range<number>;
  atk: Range<number>;
  def: Range<number>;
  spa: Range<number>;
  spd: Range<number>;
  spe: Range<number>;

  constructor(stats: StatsTable<Range<number>>) {
    this.hp = stats.hp;
    this.atk = stats.atk;
    this.def = stats.def;
    this.spa = stats.spa;
    this.spd = stats.spd;
    this.spe = stats.spe;
  }

  toString() {
    return StatRanges.display(this);
  }

  toStats() {
    return StatRanges.toStats(this);
  }

  // TODO toSpreadRanges
  // TODO static toSpreadRanges

  static display(ranges: StatsTable<Range<number>>, compact?: boolean) {
    return displayStats(ranges, v => displayRange(v), compact);
  }

  static fromString(s: string) {
    const ranges = parseStats(s);
    return ranges ? new StatRanges(ranges) : undefined;
  }

  static toStats(range: StatsTable<Range<number>>) {
    const stats = collapseStatRanges(range);
    if (!stats || Object.keys(stats).length !== 6) return undefined;
    return new Stats(stats as StatsTable<number>);
  }
}

export interface SpreadTable<T> {
  nature: pkmn.Nature;
  ivs: StatsTable<T>;
  evs: StatsTable<T>;
}

export class Spread implements SpreadTable<number> {
  nature: pkmn.Nature;
  ivs: StatsTable<number>;
  evs: StatsTable<number>;

  constructor(spread: SpreadTable<number>);
  constructor(
      nature: pkmn.Nature, ivs: StatsTable<number>, evs: StatsTable<number>);
  constructor(
      spread: pkmn.Nature|SpreadTable<number>, ivs?: StatsTable<number>,
      evs?: StatsTable<number>) {
    if ('id' in spread) {
      this.nature = spread;
      this.ivs = ivs!;
      this.evs = evs!;
    } else {
      this.nature = spread.nature;
      this.ivs = spread.ivs;
      this.evs = spread.evs;
    }
  }

  toString() {
    return Spread.display(this);
  }

  toRanges() {
    return Spread.toRanges(this);
  }

  toStats(base: StatsTable<number>) {
    return Spread.toStats(this, base);
  }

  static display(spread: SpreadTable<number>, compact?: boolean) {
    return displaySpread(spread, (v, t) => {
      if (t === 'iv') {
        return !compact && v === 31 ? '' : `${v}`;
      } else {
        return !compact && v === 0 ? '' : `${v}`;
      }
    }, compact);
  }

  static fromSparse(spread: SparseSpreadTable<number>) {
    return new Spread(fromSparse(spread, t => zero(t)));
  }

  static fromString(s: string) {
    const range = SpreadRanges.fromString(s);
    if (!range) return undefined;
    const ivs = collapseStatRanges(range.ivs);
    if (!ivs || Object.keys(ivs).length !== 6) return undefined;
    const evs = collapseStatRanges(range.evs);
    if (!evs || Object.keys(evs).length !== 6) return undefined;
    return new Spread({
      nature: range.nature,
      evs: evs as StatsTable<number>,
      ivs: ivs as StatsTable<number>,
    });
  }

  static toRanges(spread: SpreadTable<number>) {
    const ivs = toStatRanges(spread.ivs) as StatsTable<Range<number>>;
    const evs = toStatRanges(spread.evs) as StatsTable<Range<number>>;
    return new SpreadRanges(spread.nature, ivs, evs);
  }

  static toStats(
      spread: SpreadTable<number>, base: StatsTable<number>,
      gen?: pkmn.Generation, level = 100) {
    const stats: Partial<StatsTable<number>> = {};
    let stat: pkmn.Stat;
    for (stat in STATS) {
      stats[stat as keyof StatsTable<number>] = pkmn.Stats.calc(
          stat, base[stat], spread.ivs[stat], spread.evs[stat], level,
          spread.nature, gen);
    }
    return new Stats(stats as StatsTable<number>);
  }
}

export class SpreadRanges implements SpreadTable<Range<number>> {
  nature: pkmn.Nature;
  ivs: StatsTable<Range<number>>;
  evs: StatsTable<Range<number>>;

  constructor(spread: SpreadTable<Range<number>>);
  constructor(
      nature: pkmn.Nature, ivs: StatsTable<Range<number>>,
      evs: StatsTable<Range<number>>);
  constructor(
      spread: pkmn.Nature|SpreadTable<Range<number>>,
      ivs?: StatsTable<Range<number>>, evs?: StatsTable<Range<number>>) {
    if ('id' in spread) {
      this.nature = spread;
      this.ivs = ivs!;
      this.evs = evs!;
    } else {
      this.nature = spread.nature;
      this.ivs = spread.ivs;
      this.evs = spread.evs;
    }
  }

  toString() {
    return SpreadRanges.display(this);
  }

  toSpread() {
    return SpreadRanges.toSpread(this);
  }

  // TODO toStatRanges
  // TODO static toStatRanges

  static display(spread: SpreadTable<Range<number>>, compact?: boolean) {
    return displaySpread(spread, (v, t) => {
      if (t === 'iv') {
        const s = displayRange(v, 31);
        return !compact && s === '31' ? '' : s;
      } else {
        const s = displayRange(v, 252);
        return !compact && s === '0' ? '' : s;
      }
    }, compact);
  }

  static fromSparse(spread: SparseSpreadTable<Range<number>>) {
    return new SpreadRanges(
        fromSparse(spread, t => ({min: zero(t), max: zero(t)})));
  }

  static fromString(s: string) {
    const sparse = SparseSpreadRanges.fromString(s);
    if (!sparse) return undefined;
    return SpreadRanges.fromSparse(sparse);
  }

  static toSpread(ranges: SpreadTable<Range<number>>) {
    const ivs = collapseStatRanges(ranges.ivs) as StatsTable<number>;
    if (!ivs || Object.keys(ivs).length !== 6) return undefined;
    const evs = collapseStatRanges(ranges.ivs) as StatsTable<number>;
    if (!evs || Object.keys(evs).length !== 6) return undefined;
    return new Spread(ranges.nature, ivs, evs);
  }

  static toStatRanges(
      spread: SpreadTable<Range<number>>, base: StatsTable<number>,
      gen?: pkmn.Generation, level = 100) {
    const stats: Partial<StatsTable<Range<number>>> = {};
    let stat: pkmn.Stat;
    for (stat in STATS) {
      const min = pkmn.Stats.calc(
          stat, base[stat], spread.ivs[stat].min, spread.evs[stat].min, level,
          spread.nature, gen);
      const max = pkmn.Stats.calc(
          stat, base[stat], spread.ivs[stat].max, spread.evs[stat].max, level,
          spread.nature, gen);
      stats[stat as keyof StatsTable<Range<number>>] = {min, max};
    }
    return new StatRanges(stats as StatsTable<Range<number>>);
  }
}

export interface SparseSpreadTable<T> {
  nature: pkmn.Nature;
  ivs: Partial<StatsTable<T>>;
  evs: Partial<StatsTable<T>>;
}

export class SparseSpread implements SparseSpreadTable<number> {
  nature: pkmn.Nature;
  ivs: Partial<StatsTable<number>>;
  evs: Partial<StatsTable<number>>;

  constructor(spread: SparseSpreadTable<number>);
  constructor(
      nature: pkmn.Nature, ivs: Partial<StatsTable<number>>,
      evs: Partial<StatsTable<number>>);
  constructor(
      spread: pkmn.Nature|SparseSpreadTable<number>,
      ivs?: Partial<StatsTable<number>>, evs?: Partial<StatsTable<number>>) {
    if ('id' in spread) {
      this.nature = spread;
      this.ivs = ivs!;
      this.evs = evs!;
    } else {
      this.nature = spread.nature;
      this.ivs = spread.ivs;
      this.evs = spread.evs;
    }
  }

  toString() {
    return SparseSpread.display(this);
  }

  static display(spread: SparseSpreadTable<number>, compact?: boolean) {
    return Spread.display(Spread.fromSparse(spread), compact);
  }

  static fromString(s: string) {
    const ranges = SparseSpreadRanges.fromString(s);
    if (!ranges) return undefined;
    const ivs = collapseStatRanges(ranges.ivs);
    const evs = collapseStatRanges(ranges.evs);
    if (!ivs || !evs) return undefined;
    return new SparseSpread({nature: ranges.nature, ivs, evs});
  }
}

export class SparseSpreadRanges implements SparseSpreadTable<Range<number>> {
  nature: pkmn.Nature;
  ivs: Partial<StatsTable<Range<number>>>;
  evs: Partial<StatsTable<Range<number>>>;

  constructor(spread: SparseSpreadTable<Range<number>>);
  constructor(
      nature: pkmn.Nature, ivs: Partial<StatsTable<Range<number>>>,
      evs: Partial<StatsTable<Range<number>>>);
  constructor(
      spread: pkmn.Nature|SparseSpreadTable<Range<number>>,
      ivs?: Partial<StatsTable<Range<number>>>,
      evs?: Partial<StatsTable<Range<number>>>) {
    if ('id' in spread) {
      this.nature = spread;
      this.ivs = ivs!;
      this.evs = evs!;
    } else {
      this.nature = spread.nature;
      this.ivs = spread.ivs;
      this.evs = spread.evs;
    }
  }

  toString() {
    return SparseSpreadRanges.display(this);
  }
  static display(spread: SparseSpreadTable<Range<number>>, compact?: boolean) {
    return SpreadRanges.display(SpreadRanges.fromSparse(spread), compact);
  }

  static fromString(s: string) {
    const spread = parseSpread(s);
    return spread ? new SparseSpreadRanges(spread) : undefined;
  }
}

export const STATS = {
  hp: 0,
  atk: 1,
  def: 2,
  spa: 3,
  spd: 4,
  spe: 5
};

function zero(type: 'iv'|'ev') {
  return type === 'iv' ? 31 : 0;
}

function fromSparse<T>(
    sparse: SparseSpreadTable<T>, z: (t: 'iv'|'ev') => T): SpreadTable<T> {
  const iv = () => z('iv');
  const ev = () => z('ev');
  const spread = {
    nature: sparse.nature,
    ivs: {hp: iv(), atk: iv(), def: iv(), spa: iv(), spd: iv(), spe: iv()},
    evs: {hp: ev(), atk: ev(), def: ev(), spa: ev(), spd: ev(), spe: ev()}
  };

  let stat: pkmn.Stat;
  for (stat in STATS) {
    const iv = sparse.ivs[stat];
    if (iv !== undefined) spread.ivs[stat] = iv;
    const ev = sparse.evs[stat];
    if (ev !== undefined) spread.evs[stat] = ev;
  }

  return spread;
}

function displayStats<T>(
    stats: StatsTable<T>, display: (val: T) => string, compact?: boolean) {
  const s = [];
  let stat: pkmn.Stat;
  for (stat in STATS) {
    const d = display(stats[stat]);
    s.push(compact ? d : `${d} ${pkmn.Stats.display(stat)}`);
  }
  return s.join(compact ? '/' : ' / ');
}

function parseStats(s: string) {
  const parsed: Partial<StatRanges> = {};
  const stats = Object.keys(STATS) as pkmn.Stat[];
  const compact = !s.endsWith('e');

  const split = s.split(compact ? '/' : ' / ');
  if (split.length !== 6) return undefined;
  for (const [i, range] of split.entries()) {
    const val = parseRange(compact ? range : range.split(' ')[0]);
    if (!val) return undefined;
    parsed[stats[i]] = val;
  }
  return parsed as StatsTable<Range<number>>;
}

function displaySpread<T>(
    spread: SpreadTable<T>, display: (val: T, type: 'iv'|'ev') => string,
    compact?: boolean) {
  let stat: pkmn.Stat;
  const ivs = [];
  const evs = [];
  for (stat in STATS) {
    const s = pkmn.Stats.display(stat);
    const iv = display(spread.ivs[stat], 'iv');
    if (compact) {
      ivs.push(iv);
    } else {
      if (iv) ivs.push(`${iv} ${s}`);
    }
    const ev = display(spread.evs[stat], 'ev');
    if (compact) {
      evs.push(ev);
    } else {
      if (ev) evs.push(`${ev} ${s}`);
    }
  }

  if (compact) {
    if (spread.nature.plus && spread.nature.minus) {
      const plus = STATS[spread.nature.plus];
      const minus = STATS[spread.nature.minus];
      evs[plus] = `${evs[plus]}+`;
      evs[minus] = `${evs[minus]}-`;
    }
    const s = `${spread.nature} ${evs.join('/')}`;
    const i = ivs.join('/');
    return i === '31/31/31/31/31/31' ? s : `${s}\nIVs: ${i}`;
  }

  let s = '';
  if (evs.length) s += 'EVs: ' + evs.join(' / ') + '\n';
  s += `${spread.nature} Nature`;
  if (ivs.length) s += '\nIVs: ' + ivs.join(' / ');
  return s;
}

function parseSpread(s: string) {
  if (s.startsWith('E')) {
    const [e, n, i] = s.split('\n');

    const nature = pkmn.Natures.get(n.slice(0, n.indexOf(' ')));
    const evs = parseSpreadValues(e.substr(5), 'ev');
    const ivs = i ? parseSpreadValues(i.substr(5), 'iv') : {};
    if (!nature || !evs || !ivs) return undefined;

    return {nature, ivs, evs};
  } else {
    const [ne, i] = s.split('\n');
    const [n, e] = ne.split(' ');

    const nature = pkmn.Natures.get(n);
    const evs = parseSpreadValues(e, 'ev', true);
    const ivs = i ? parseSpreadValues(i.substr(5), 'iv', true) : {};
    if (!nature || !evs || !ivs) return undefined;

    return {nature, ivs, evs};
  }
}

function parseSpreadValues(s: string, type: 'iv'|'ev', compact?: boolean) {
  const spread: Partial<StatsTable<Range<number>>> = {};
  const max = type === 'iv' ? 31 : 252;

  if (compact) {
    const stats = Object.keys(STATS) as pkmn.Stat[];
    for (let [i, range] of s.split('/').entries()) {
      if (range.endsWith('+') || range.endsWith('-')) {
        range = range.slice(0, -1);
      }
      const val = parseRange(range, max);
      if (!val) return undefined;
      spread[stats[i]] = val;
    }
  } else {
    for (const pair of s.split(' / ')) {
      const [range, name] = pair.split(' ');
      const stat = pkmn.Stats.get(name);
      const val = parseRange(range, max);
      if (!stat || !val) return undefined;
      spread[stat] = val;
    }
  }

  return spread;
}

function displayRange(range: Range<number>, max = Infinity) {
  if (range.min === range.max || range.min === max) return `${range.min}`;
  if (range.max >= max) return `>${range.min}`;
  if (range.min === 0) return `<${range.max}`;
  return `${range.min}-${range.max}`;
}

function parseRange(s: string, max = Infinity) {
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

function toStatRanges<T>(stats: Partial<StatsTable<T>>) {
  const ranges: Partial<StatsTable<Range<T>>> = {};
  for (const [stat, val] of Object.entries(stats)) {
    ranges[stat as keyof StatsTable<T>] = {min: val!, max: val!};
  }
  return ranges;
}

function collapseStatRanges<T>(ranges: Partial<StatsTable<Range<T>>>) {
  const stats: Partial<StatsTable<T>> = {};
  for (const [stat, range] of Object.entries(ranges)) {
    if (!range || range.min !== range.max) return undefined;
    stats[stat as keyof StatsTable<T>] = range.min;
  }
  return stats;
}