import {GenerationNum, NatureName, StatID, StatsTable} from '@pkmn/types';

import {
  Range,
  displayRange,
  getNatureFromPlusMinus,
  isRange,
  parseRange,
  statOrder,
} from './common';
import {GEN, Generation, NATURES, STATS} from './data';
import {Spread, SpreadDisplayOptions, SpreadTable} from './spread';
import {StatsRange} from './stats-range';

// eslint-disable-next-line max-len
const NATURE = /^([?\w]+(?:\s*-\s*[?\w]+)?)\s+(?:(?:(?:Nature)?\s*(?:\(\s*\+\s*[?\w]+\s*,\s*-\s*[?\w]+\s*\))?)|(.*))$/i;
const COMPACT = /^[-+?><\d\s/]+$/;

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

  equals(other: Range<SpreadTable>) {
    return SpreadRange.equals(this, other);
  }

  toString() {
    return SpreadRange.display(this);
  }

  toSpread() {
    return SpreadRange.toSpread(this);
  }

  toStatsRange(base: StatsTable, gen?: Generation, level = 100) {
    return SpreadRange.toStatsRange(this, base, gen, level);
  }

  static equals(a: Range<SpreadTable>, b: Range<SpreadTable>) {
    return a === b || Spread.equals(a.min, b.min) && Spread.equals(a.max, b.max);
  }

  static display(range: Range<SpreadTable>, options?: SpreadDisplayOptions): string;
  static display(
    range: Range<SpreadTable>,
    gen: Generation,
    options?: SpreadDisplayOptions): string;
  static display(
    range: Range<SpreadTable>,
    gen?: Generation | SpreadDisplayOptions,
    options?: SpreadDisplayOptions
  ) {
    let g: GenerationNum;
    if (typeof gen === 'number') {
      g = gen;
    } else if (gen && 'num' in gen) {
      g = gen.num;
    } else {
      g = 9;
      options = gen;
    }
    options = options || {};
    const compact = options.style === 'compact';
    const pretty = !compact && options.style !== 'import';

    let nature = '';
    if (g >= 3) {
      if ((!range.min.nature || !range.max.nature)) {
        if (compact || pretty) {
          nature = '???';
          if (!compact) nature += ' Nature';
        }
      } else if (range.min.nature === range.max.nature) {
        nature = `${range.min.nature}`;
        if (!compact) {
          nature += ' Nature';
          if (pretty) {
            const n = NATURES.get(range.min.nature);
            if (n.plus && n.minus) {
              nature += ` (+${STATS.display(n.plus)}, -${STATS.display(n.minus)})`;
            }
          }
        }
      } else {
        nature = `${range.min.nature}-${range.max.nature}`;
        if (!compact) nature += ' Nature';
      }
    }

    const ivs = [];
    const evs = [];

    const dIV = g < 3 ? 15 : 31;
    const dEV = g < 3 ? 252 : 0;

    const order = statOrder(g);
    for (const stat of order) {
      const s = STATS.display(stat, g);

      let min = range.min.ivs?.[stat];
      let max = range.max.ivs?.[stat];

      if (min === undefined) min = 31;
      if (max === undefined) max = 31;

      if (g < 3) {
        min = STATS.toDV(min);
        max = STATS.toDV(max);
      }

      const iv = displayRange({min, max}, dIV);
      if (compact) {
        ivs.push(iv);
      } else {
        if (iv !== `${dIV}`) ivs.push(`${iv} ${s}`);
      }

      min = range.min.evs?.[stat];
      max = range.max.evs?.[stat];

      if (min === undefined) min = 0;
      if (max === undefined) max = 0;
      const ev = displayRange({min, max}, 252);
      if (compact) {
        evs.push(ev);
      } else {
        if (ev !== `${dEV}`) evs.push(`${ev} ${s}`);
      }
    }

    let isep = compact ? '/' : ' / ';
    let lsep = '\n';
    if (typeof options.separator === 'string') {
      lsep = options.separator;
    } else if (options.separator) {
      isep = options.separator.internal || isep;
      lsep = options.separator.line || lsep;
    }

    if (compact) {
      const s = collapse(range);
      if (s?.nature) {
        const n = NATURES.get(s.nature);
        if (n.plus && n.minus) {
          const plus = order.indexOf(n.plus);
          const minus = order.indexOf(n.minus);
          evs[plus] = `${evs[plus]}+`;
          evs[minus] = `${evs[minus]}-`;
        }
      }

      let buf = nature;
      const e = evs.join(isep);
      if (e && e !== defaults(g, 'ev', isep)) {
        buf += `${buf ? ' ' : 'EVs: '}${e}`;
      }

      const i = ivs.join(isep);
      if (i && i !== defaults(g, 'iv', isep)) {
        buf += (buf ? lsep : '') + (g < 3 ? `DVs: ${i}` : `IVs: ${i}`);
      }
      return buf;
    }

    const e = evs.join(isep) || (g >= 3 ? '???' : '');
    let buf;
    if (pretty) {
      buf = nature;
      if (e) buf += (buf ? lsep : '') + `EVs: ${e}`;
    } else {
      buf = e ? `EVs: ${e}` : '';
      buf += (buf ? lsep : '') + nature;
    }
    const i = ivs.join(isep);
    if (i) buf += (buf ? lsep : '') + (g < 3 ? `DVs: ${i}` : `IVs: ${i}`);

    return buf;
  }

  static fromString(s: string) {
    let nature: Range<NatureName> | undefined;
    let evs: Range<Partial<StatsTable>> | undefined;
    let ivs: Range<Partial<StatsTable>> | undefined;

    const parseEVs = (t: string) => {
      const r = parseSpreadValues(t, 'ev');
      if (!r) return false;
      evs = r.spread;
      if (r.nature) {
        if (!nature) {
          nature = {min: r.nature, max: r.nature};
        } else if (nature.min !== nature.max || nature.min !== r.nature) {
          return false;
        }
      }
      return true;
    };

    for (let line of s.trim().split('\n')) {
      line = line.trim();
      if (line.startsWith('IVs:')) {
        const r = parseSpreadValues(line.slice(4), 'iv');
        if (!r) return undefined;
        ivs = r.spread;
      } else if (line.startsWith('DVs:')) {
        const r = parseSpreadValues(line.slice(4), 'dv');
        if (!r) return undefined;
        ivs = r.spread;
      } else if (line.startsWith('EVs:')) {
        if (!parseEVs(line.slice(4))) return undefined;
      } else {
        const m = NATURE.exec(line);
        if (!m) return undefined;
        const n = parseNature(m[1]);
        if (n) {
          if (!nature) {
            nature = n;
          } else if (nature.min !== n.min || nature.max !== n.max) {
            return undefined;
          }
        }
        if (m[2] && !parseEVs(m[2])) return undefined;
      }
    }

    return new SpreadRange({
      nature: nature?.min,
      evs: evs?.min,
      ivs: ivs?.min,
    }, {
      nature: nature?.max,
      evs: evs?.max,
      ivs: ivs?.max,
    });
  }

  static toSpread(range: Range<SpreadTable>) {
    return Spread.equals(range.min, range.max) ? new Spread(range.min) : undefined;
  }

  static toStatsRange(spread: Range<SpreadTable>, base: StatsTable, gen?: Generation, level = 100) {
    const mins: Partial<StatsTable> = {};
    const maxes: Partial<StatsTable> = {};

    const g = GEN(gen);
    const minNature = spread.min.nature && NATURES.get(spread.min.nature);
    const maxNature = spread.max.nature && NATURES.get(spread.max.nature);
    for (const stat of STATS) {
      mins[stat] = STATS.calc(
        g,
        stat,
        base[stat],
        spread.min?.ivs?.[stat],
        spread.min?.evs?.[stat],
        level,
        minNature,
      );
      maxes[stat] = STATS.calc(
        g,
        stat,
        base[stat],
        spread.max?.ivs?.[stat],
        spread.max?.evs?.[stat],
        level,
        maxNature,
      );
    }

    return new StatsRange(mins as StatsTable, maxes as StatsTable);
  }
}

function collapse(range: Range<SpreadTable>) {
  if (range.min === range.max) return range.min;
  if (range.min.nature !== range.max.nature) return undefined;
  for (const stat of STATS) {
    if ((range.min.evs?.[stat] || 0) !== (range.max.evs?.[stat] || 0)) return undefined;
  }
  return range.min;
}

const RBY = {iv: '15/15/15/15/15', ev: '252/252/252/252/252'};
const GSC = {iv: '15/15/15/15/15/15', ev: '252/252/252/252/252/252'};
const ADV = {iv: '31/31/31/31/31/31'};

function defaults(gen: GenerationNum, type: 'iv' | 'ev', sep: string) {
  let s;
  if (gen === 1) {
    s = RBY[type];
  } else if (gen === 2) {
    s = GSC[type];
  } else {
    s = type === 'iv' ? ADV.iv : undefined;
  }
  return (s && sep !== '/') ? s.replace(/\//g, sep) : s;
}

function parseNature(s: string) {
  const [lo, hi] = s.split('-');
  const min = NATURES.get(lo)?.name;
  if (min === undefined) return undefined;
  if (hi === undefined) return {min, max: min};

  const max = NATURES.get(hi)?.name;
  return max === undefined ? undefined : {min, max};
}

function parseSpreadValues(s: string, type: 'iv' | 'ev' | 'dv') {
  const min: Partial<StatsTable> = {};
  const max: Partial<StatsTable> = {};

  if (s.trim() === '???') return {min, max};

  let plus: StatID | undefined;
  let minus: StatID | undefined;

  const compact = COMPACT.test(s);
  const split = s.split('/');
  if (compact && (split.length < 5 || split.length > 6)) return undefined;
  const order = statOrder(split.length === 5 ? 1 : 9);
  for (const [i, v] of split.entries()) {
    let [range, name] = v.trim().split(/\s+/);
    const stat = (name && STATS.get(name)) || (compact ? order[i] : undefined);
    if (!stat) return undefined;
    if (type === 'ev') {
      if (range.endsWith('+')) {
        range = range.slice(0, -1);
        plus = stat;
      } else if (range.endsWith('-')) {
        range = range.slice(0, -1);
        minus = stat;
      }
    }
    const val = parseRange(range, type === 'dv' ? 15 : type === 'iv' ? 31 : 252);
    if (!val) return undefined;

    if (type === 'dv') {
      min[stat] = STATS.toIV(val.min);
      max[stat] = STATS.toIV(val.max);
    } else {
      min[stat] = val.min;
      max[stat] = val.max;
    }
  }

  if (split.length === 5) {
    min.spd = min.spa;
    max.spd = max.spa;
  }

  for (const stat of STATS) {
    if (stat in min && min[stat] === undefined ||
        stat in max && max[stat] === undefined ||
        max[stat] === Infinity) {
      return undefined;
    }
  }

  const spread = {min, max};
  if (plus && minus) {
    return {spread, nature: getNatureFromPlusMinus(plus, minus)?.name};
  } else if ((plus && !minus) || (!plus && minus)) {
    return undefined;
  } else {
    return {spread};
  }
}
