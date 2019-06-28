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

  toRange() {
    return Stats.toRange(this);
  }

  toSpread(base: StatsTable<number>, gen?: pkmn.Generation, level = 100) {
    return Stats.toSpread(this, base, gen, level);
  }

  static equal(a: Partial<StatsTable<number>>, b: Partial<StatsTable<number>>) {
    if (Object.keys(a).length !== Object.keys(b).length) return false;
    let stat: pkmn.Stat;
    for (stat in STATS) {
      if (a[stat] !== b[stat]) return false;
    }
    return true;
  }

  static display(stats: StatsTable<number>, compact?: boolean) {
    return displayStats(s => `${stats[s]}`, compact);
  }

  static fromString(s: string) {
    const ranges = StatsRange.fromString(s);
    if (!ranges) return undefined;
    return ranges.toStats();
  }

  static toRange(stats: StatsTable<number>) {
    return new StatsRange(stats, stats);
  }

  static toSpread(
    stats: StatsTable<number>,
    base: StatsTable<number>,
    gen?: pkmn.Generation,
    level = 100
  ) {
    return undefined; // TODO new Spread() => SpreadTable<number>|undefined
  }
}

export class StatsRange implements Range<StatsTable<number>> {
  min: Stats;
  max: Stats;

  constructor(range: Range<StatsTable<number>>);
  constructor(min: StatsTable<number>, max: StatsTable<number>);
  constructor(
    range: Range<StatsTable<number>> | StatsTable<number>,
    max?: StatsTable<number>
  ) {
    if ('min' in range) {
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

  toSpreadRange(base: StatsTable<number>, gen?: pkmn.Generation, level = 100) {
    return StatsRange.toSpreadRange(this, base, gen, level);
  }

  static display(range: Range<StatsTable<number>>, compact?: boolean) {
    return displayStats(
      s => displayRange({ min: range.min[s], max: range.max[s] }),
      compact
    );
  }

  static fromBase(
    base: StatsTable<number>,
    gen?: pkmn.Generation,
    level = 100
  ) {
    const min = Object.assign({}, base);
    const max = Object.assign({}, base);

    let stat: pkmn.Stat;
    for (stat in STATS) {
      const other = stat === 'spe' ? 'atk' : 'spe';
      const minus = getNature(other, stat);
      const plus = getNature(stat, other);
      min[stat] = pkmn.Stats.calc(stat, base[stat], 0, 0, level, minus, gen);
      max[stat] = pkmn.Stats.calc(stat, base[stat], 31, 252, level, plus, gen);
    }

    return new StatsRange(min, max);
  }

  static fromString(s: string) {
    const min: Partial<StatsTable<number>> = {};
    const max: Partial<StatsTable<number>> = {};
    const stats = Object.keys(STATS) as pkmn.Stat[];
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
    return new StatsRange(min as StatsTable<number>, max as StatsTable<number>);
  }

  static toStats(range: Range<StatsTable<number>>) {
    if (!Stats.equal(range.min, range.max)) return undefined;
    return new Stats(range.min);
  }

  static toSpreadRange(
    range: Range<StatsTable<number>>,
    base: StatsTable<number>,
    gen?: pkmn.Generation,
    level = 100
  ) {
    const min = Stats.toSpread(
      range.min as StatsTable<number>,
      base,
      gen,
      level
    );
    const max = Stats.toSpread(
      range.max as StatsTable<number>,
      base,
      gen,
      level
    );
    return !min || !max ? undefined : new SpreadRange(min, max);
  }
}

export interface SpreadTable<T> {
  nature: pkmn.Nature;
  ivs: StatsTable<T>;
  evs: StatsTable<T>;
}

export class Spread implements SpreadTable<number> {
  nature: pkmn.Nature;
  ivs: Stats;
  evs: Stats;

  constructor(spread: SpreadTable<number>);
  constructor(
    nature: pkmn.Nature,
    ivs: StatsTable<number>,
    evs: StatsTable<number>
  );
  constructor(
    spread: SpreadTable<number> | pkmn.Nature,
    ivs?: StatsTable<number>,
    evs?: StatsTable<number>
  ) {
    if ('nature' in spread) {
      this.nature = spread.nature;
      this.ivs = new Stats(spread.ivs);
      this.evs = new Stats(spread.evs);
    } else {
      this.nature = spread;
      this.ivs = new Stats(ivs!);
      this.evs = new Stats(evs!);
    }
  }

  toString() {
    return Spread.display(this);
  }

  toRange() {
    return Spread.toRange(this);
  }

  toStats(base: StatsTable<number>) {
    return Spread.toStats(this, base);
  }

  static display(spread: SpreadTable<number>, compact?: boolean) {
    return SparseSpread.display(spread, compact);
  }

  static fromSparse(sparse: SparseSpreadTable<number>) {
    const spread = {
      nature: sparse.nature,
      ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
      evs: { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 },
    };

    let stat: pkmn.Stat;
    for (stat in STATS) {
      const iv = sparse.ivs[stat];
      if (iv !== undefined) spread.ivs[stat] = iv;
      const ev = sparse.evs[stat];
      if (ev !== undefined) spread.evs[stat] = ev;
    }

    return new Spread(spread);
  }

  static fromString(s: string) {
    const range = SpreadRange.fromString(s);
    if (!range) return undefined;
    if (range.min.nature !== range.max.nature) return undefined;
    if (!Stats.equal(range.min.ivs, range.max.ivs)) return undefined;
    if (!Stats.equal(range.max.evs, range.max.evs)) return undefined;
    return new Spread(range.min);
  }

  static toRange(spread: SpreadTable<number>) {
    return new SpreadRange(spread, spread);
  }

  static toStats(
    spread: SpreadTable<number>,
    base: StatsTable<number>,
    gen?: pkmn.Generation,
    level = 100
  ) {
    const stats: Partial<StatsTable<number>> = {};
    let stat: pkmn.Stat;
    for (stat in STATS) {
      stats[stat] = pkmn.Stats.calc(
        stat,
        base[stat],
        spread.ivs[stat],
        spread.evs[stat],
        level,
        spread.nature,
        gen
      );
    }
    return new Stats(stats as StatsTable<number>);
  }
}

export class SpreadRange implements Range<SpreadTable<number>> {
  min: Spread;
  max: Spread;

  constructor(range: Range<SpreadTable<number>>);
  constructor(min: SpreadTable<number>, max: SpreadTable<number>);
  constructor(
    range: Range<SpreadTable<number>> | SpreadTable<number>,
    max?: SpreadTable<number>
  ) {
    if ('min' in range) {
      this.min = new Spread(range.min);
      this.max = new Spread(range.max);
    } else {
      this.min = new Spread(range);
      this.max = new Spread(max!);
    }
  }

  toString() {
    return SpreadRange.display(this);
  }

  toSpread() {
    return SpreadRange.toSpread(this);
  }

  toStatsRange(base: StatsTable<number>, gen?: pkmn.Generation, level = 100) {
    return SpreadRange.toStatsRange(this, base, gen, level);
  }

  static display(range: Range<SpreadTable<number>>, compact?: boolean) {
    return SparseSpreadRange.display(range, compact);
  }

  static fromSparse(sparse: Range<SparseSpreadTable<number>>) {
    return new SpreadRange(
      Spread.fromSparse(sparse.min),
      Spread.fromSparse(sparse.max)
    );
  }

  static fromString(s: string) {
    const sparse = SparseSpreadRange.fromString(s);
    if (!sparse) return undefined;
    return SpreadRange.fromSparse(sparse);
  }

  static toSpread(range: Range<SpreadTable<number>>) {
    if (range.min.nature !== range.max.nature) return undefined;
    if (!Stats.equal(range.min.ivs, range.max.ivs)) return undefined;
    if (!Stats.equal(range.min.evs, range.max.evs)) return undefined;
    return new Spread(range.min);
  }

  static toStatsRange(
    spread: Range<SpreadTable<number>>,
    base: StatsTable<number>,
    gen?: pkmn.Generation,
    level = 100
  ) {
    const mins: Partial<StatsTable<number>> = {};
    const maxes: Partial<StatsTable<number>> = {};
    let stat: pkmn.Stat;
    for (stat in STATS) {
      mins[stat] = pkmn.Stats.calc(
        stat,
        base[stat],
        spread.min.ivs[stat],
        spread.min.evs[stat],
        level,
        spread.min.nature,
        gen
      );
      maxes[stat] = pkmn.Stats.calc(
        stat,
        base[stat],
        spread.max.ivs[stat],
        spread.max.evs[stat],
        level,
        spread.max.nature,
        gen
      );
    }
    return new StatsRange(
      mins as StatsTable<number>,
      maxes as StatsTable<number>
    );
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
    nature: pkmn.Nature,
    ivs: Partial<StatsTable<number>>,
    evs: Partial<StatsTable<number>>
  );
  constructor(
    spread: SparseSpreadTable<number> | pkmn.Nature,
    ivs?: Partial<StatsTable<number>>,
    evs?: Partial<StatsTable<number>>
  ) {
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

  toString() {
    return SparseSpread.display(this);
  }

  static display(spread: SparseSpreadTable<number>, compact?: boolean) {
    const { evs, ivs } = displayIVsEVs((s, t) => {
      if (t === 'iv') {
        const iv = spread.ivs[s];
        const v = iv === undefined ? 31 : iv;
        return !compact && v === 31 ? '' : `${v}`;
      } else {
        const ev = spread.evs[s];
        const v = ev === undefined ? 0 : ev;
        return !compact && v === 0 ? '' : `${v}`;
      }
    }, compact);

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

  static fromString(s: string) {
    const range = SparseSpreadRange.fromString(s);
    if (!range || range.min.nature !== range.max.nature) return undefined;
    if (!Stats.equal(range.min.ivs, range.max.ivs)) return undefined;
    if (!Stats.equal(range.min.evs, range.max.evs)) return undefined;
    return new SparseSpread(range.min);
  }
}

export class SparseSpreadRange implements Range<SparseSpreadTable<number>> {
  min: SparseSpread;
  max: SparseSpread;

  constructor(range: Range<SparseSpreadTable<number>>);
  constructor(min: SparseSpreadTable<number>, max: SparseSpreadTable<number>);
  constructor(
    range: Range<SparseSpreadTable<number>> | SparseSpreadTable<number>,
    max?: SparseSpreadTable<number>
  ) {
    if ('min' in range) {
      this.min = new SparseSpread(range.min);
      this.max = new SparseSpread(range.max);
    } else {
      this.min = new SparseSpread(range);
      this.max = new SparseSpread(max!);
    }
  }

  toString() {
    return SparseSpreadRange.display(this);
  }

  static display(range: Range<SparseSpreadTable<number>>, compact?: boolean) {
    const nature = displayNature({
      min: range.min.nature,
      max: range.max.nature,
    });
    const { evs, ivs } = displayIVsEVs((s, t) => {
      if (t === 'iv') {
        let min = range.min.ivs[s];
        let max = range.max.ivs[s];
        if (min === undefined) min = 31;
        if (max === undefined) max = 31;
        const v = displayRange({ min, max }, 31);
        return !compact && v === '31' ? '' : v;
      } else {
        let min = range.min.evs[s];
        let max = range.max.evs[s];
        if (min === undefined) min = 0;
        if (max === undefined) max = 0;
        const v = displayRange({ min, max }, 252);
        return !compact && v === '0' ? '' : v;
      }
    }, compact);

    if (compact) {
      const s = `${nature} ${evs.join('/')}`;
      const i = ivs.join('/');
      return i === '31/31/31/31/31/31' ? s : `${s}\nIVs: ${i}`;
    }

    let s = '';
    if (evs.length) s += 'EVs: ' + evs.join(' / ') + '\n';
    s += `${nature} Nature`;
    if (ivs.length) s += '\nIVs: ' + ivs.join(' / ');
    return s;
  }

  static fromString(s: string) {
    let nature, evs, ivs;
    if (s.startsWith('E')) {
      const [e, n, i] = s.split('\n');

      nature = parseNature(n.slice(0, n.indexOf(' ')));
      evs = parseSpreadValues(e.substr(5), 'ev');
      ivs = i ? parseSpreadValues(i.substr(5), 'iv') : { min: {}, max: {} };
    } else {
      const [ne, i] = s.split('\n');
      const [n, e] = ne.split(' ');

      nature = parseNature(n);
      evs = parseSpreadValues(e, 'ev', true);
      ivs = i
        ? parseSpreadValues(i.substr(5), 'iv', true)
        : { min: {}, max: {} };
    }
    if (!nature || !evs || !ivs) return undefined;
    const min = {
      nature: nature.min,
      ivs: ivs.min as StatsTable<number>,
      evs: evs.min as StatsTable<number>,
    };
    const max = {
      nature: nature.max,
      ivs: ivs.max as StatsTable<number>,
      evs: evs.max as StatsTable<number>,
    };
    return new SparseSpreadRange(min, max);
  }
}

export const STATS = {
  hp: 0,
  atk: 1,
  def: 2,
  spa: 3,
  spd: 4,
  spe: 5,
};

function displayStats(display: (stat: pkmn.Stat) => string, compact?: boolean) {
  const s = [];
  let stat: pkmn.Stat;
  for (stat in STATS) {
    const d = display(stat);
    s.push(compact ? d : `${d} ${pkmn.Stats.display(stat)}`);
  }
  return s.join(compact ? '/' : ' / ');
}

function displayIVsEVs(
  display: (stat: pkmn.Stat, type: 'iv' | 'ev') => string,
  compact?: boolean
) {
  let stat: pkmn.Stat;
  const ivs = [];
  const evs = [];
  for (stat in STATS) {
    const s = pkmn.Stats.display(stat);
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
  return { evs, ivs };
}

function parseSpreadValues(s: string, type: 'iv' | 'ev', compact?: boolean) {
  const spread: Range<Partial<StatsTable<number>>> = { min: {}, max: {} };
  const max = type === 'iv' ? 31 : 252;

  if (compact) {
    const stats = Object.keys(STATS) as pkmn.Stat[];
    for (let [i, range] of s.split('/').entries()) {
      if (range.endsWith('+') || range.endsWith('-')) {
        range = range.slice(0, -1);
      }
      const val = parseRange(range, max);
      if (!val) return undefined;
      const stat = stats[i];
      spread.min[stat] = val.min;
      spread.max[stat] = val.max;
    }
  } else {
    for (const pair of s.split(' / ')) {
      const [range, name] = pair.split(' ');
      const stat = pkmn.Stats.get(name);
      const val = parseRange(range, max);
      if (!stat || !val) return undefined;
      spread.min[stat] = val.min;
      spread.max[stat] = val.max;
    }
  }

  return spread;
}

function displayRange(range: Range<number>, max = Infinity) {
  if (range.min === range.max || range.min === max) return `${range.min}`;
  if (range.min === 0 && range.max >= max) return '???';
  if (range.max >= max) return `>${range.min}`;
  if (range.min === 0) return `<${range.max}`;
  return `${range.min}-${range.max}`;
}

function parseRange(s: string, max = Infinity) {
  if (s === '???') return { min: 0, max };

  if (s.startsWith('>')) {
    const min = Number(s.slice(1));
    if (isNaN(min)) return undefined;
    return { min, max };
  }

  if (s.startsWith('<')) {
    max = Number(s.slice(1));
    if (isNaN(max)) return undefined;
    return { min: 0, max };
  }

  const [lo, hi] = s.split('-');
  const min = Number(lo);
  if (isNaN(min)) return undefined;
  if (hi === undefined) return { min, max: min };

  max = Number(hi);
  return isNaN(max) ? undefined : { min, max };
}

function displayNature(range: Range<pkmn.Nature>) {
  if (range.min === range.max) return `${range.min}`;
  return `${range.min}-${range.max}`;
}

function parseNature(s: string) {
  const [lo, hi] = s.split('-');
  const min = pkmn.Natures.get(lo);
  if (min === undefined) return undefined;
  if (hi === undefined) return { min, max: min };

  const max = pkmn.Natures.get(hi);
  return max === undefined ? undefined : { min, max };
}

const nat = (s: string) => pkmn.Natures.get(s)!;
const NATURES = [
  nat('Hardy'),
  nat('Lonely'),
  nat('Adamant'),
  nat('Naughty'),
  nat('Brave'),
  nat('Bold'),
  nat('Docile'),
  nat('Impish'),
  nat('Lax'),
  nat('Relaxed'),
  nat('Modest'),
  nat('Mild'),
  nat('Bashful'),
  nat('Rash'),
  nat('Quiet'),
  nat('Calm'),
  nat('Gentle'),
  nat('Careful'),
  nat('Quirky'),
  nat('Sassy'),
  nat('Timid'),
  nat('Hasty'),
  nat('Jolly'),
  nat('Naive'),
  nat('Serious'),
];

function getNature(plus: pkmn.Stat, minus: pkmn.Stat) {
  if (plus === 'hp' || minus === 'hp') return undefined;
  return NATURES[(STATS[plus] - 1) * 5 + (STATS[minus] - 1)];
}
