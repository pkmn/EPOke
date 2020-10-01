import {StatsTable, GenerationNum} from '@pkmn/types';

import {isRange, Range, displayRange, statOrder} from './common';
import {GEN, STATS, NATURES, Generation} from './data';
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

  toString() {
    return SpreadRange.display(this);
  }

  toSpread(){
    return SpreadRange.toSpread(this);
  }

  toStatsRange(base: StatsTable, gen?: Generation, level = 100) {
    return SpreadRange.toStatsRange(this, base, gen, level);
  }

  static display(range: Range<SpreadTable>, compact?: boolean, gen?: Generation) {
    const g = GEN(gen);

    let nature = '';
    if (g >= 3) {
      if (!range.min.nature || !range.max.nature) {
        nature = '???';
        if (!compact) nature += ' Nature';
      } else if (range.min.nature === range.max.nature) {
        nature = `${range.min.nature}`;
        if (!compact) {
          nature += ' Nature';
          const n = NATURES.get(range.min.nature);
          if (n.plus && n.minus) {
            nature += ` (+${STATS.display(n.plus)}, -${STATS.display(n.minus)})`;
          }
        }
      } else {
        nature = `${range.min.nature}-${range.max.nature}`;
        if (!compact) nature += ' Nature';
      }
    }

    const ivs = [];
    const evs = [];

    const order = statOrder(gen);
    for (const stat of order) {
      const s = STATS.display(stat, gen);

      let min = range.min.ivs?.[stat];
      let max = range.max.ivs?.[stat];

      if (min === undefined) min = 31;
      if (max === undefined) max = 31;

      if (g < 3) {
        min = STATS.toDV(min);
        max = STATS.toDV(max);
      }

      let d = g < 3 ? 15 : 31;
      const iv = displayRange({min, max}, d);
      if (compact) {
        ivs.push(iv);
      } else {
        if (iv !== `${d}`) ivs.push(`${iv} ${s}`);
      }

      min = range.min.evs?.[stat];
      max = range.max.evs?.[stat];

      d = g < 3 ? 252 : 0;
      if (min === undefined) min = d;
      if (max === undefined) max = d;
      const ev = displayRange({ min, max }, 252);
      if (compact) {
        evs.push(ev);
      } else {
        if (ev !== `${d}`) evs.push(`${ev} ${s}`);
      }
    }

    if (compact) {
      const s = collapse(range, true);
      if (s && s.nature) {
        const n = NATURES.get(s.nature);
        if (n.plus && n.minus) {
          const plus = order.indexOf(n.plus);
          const minus = order.indexOf(n.minus);
          evs[plus] = `${evs[plus]}+`;
          evs[minus] = `${evs[minus]}-`;
        }
      }

      let buf = nature;
      const e = evs.join('/');
      if (e && e != defaults(g, 'ev')) {
        buf = (buf ? buf + ' ' : buf) + `${e}`;
      }

      const i = ivs.join('/');
      if (i && i !== defaults(g, 'iv')) {
        buf = (buf ? buf + '\n' : buf) + (g < 3 ? `DVs: ${i}` : `IVs: ${i}`);
      }
      return buf;
    }

    let buf = nature;
    const e = evs.join(' / ') || (g >= 3 ? '???' : '');
    if (e) buf = (buf ? buf + '\n' : buf) + `EVs: ${e}`;
    const i = ivs.join(' / ');
    if (i) buf = (buf ? buf + '\n' : buf) + (g < 3 ? `DVs: ${i}` : `IVs: ${i}`);

    return buf;
  }

  static fromString(s: string) {
    return null! as SpreadRange; // TODO
  }

  static toSpread(range: Range<SpreadTable>) {
    const s = collapse(range);
    return s && new Spread(s);
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

const NONE = Object.create(null);

function collapse(range: Range<SpreadTable>, skipIVs = false) {
  if (range.min === range.max) return range.min;
  if (range.min.nature !== range.max.nature) return undefined;
  if (!Stats.equal(range.min.evs || NONE, range.max.evs || NONE)) return undefined;
  if (skipIVs) return range.min;
  return Stats.equal(range.min.ivs || NONE, range.max.ivs || NONE) ? range.min : undefined;
}

const RBY = {iv: '15/15/15/15/15', ev: '252/252/252/252/252'};
const GSC = {iv: '15/15/15/15/15/15', ev: '252/252/252/252/252/252'};
const ADV = {iv: '31/31/31/31/31/31'};

function defaults(gen: GenerationNum, type: 'iv' | 'ev') {
  if (gen === 1) {
    return RBY[type];
  } else if (gen === 2) {
    return GSC[type];
  } else {
    return type === 'iv' ? ADV.iv : undefined;
  }
}
