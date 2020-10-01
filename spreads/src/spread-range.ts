import {StatsTable} from '@pkmn/types';

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
      // FIXME RBY needs DVS
      const iv = displayRange({min, max}, 31);
      if (compact) {
        ivs.push(iv);
      } else {
        if (iv !== '31') ivs.push(`${iv} ${s}`);
      }

      // min = range.min.evs?.[stat];
      // max = range.max.evs?.[stat];
      // if (min === undefined) min = 0; // FIXME RBY needs default 252
      // if (max === undefined) max = 0;
      // const v = displayRange({ min, max }, 252);
      // return !compact && v === '0' ? '' : v;
      // if (compact) {
      //   evs.push(ev);
      // } else {
      //   if (ev) evs.push(`${ev} ${s}`);
      // }
    }

/*
    const nature = displayNature({
      min: range.min.nature,
      max: range.max.nature,
    });
    const {evs, ivs} = displayIVsEVs((s, t) => {
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
    return s; */


    /*

    if (compact) {
      FIXME only do if can collapse(range, true)
      if (spread.nature?.plus && spread.nature?.minus) {
        const order = statOrder(gen) as readonly StatName[];
        const plus = order.indexOf(spread.nature.plus);
        const minus = order.indexOf(spread.nature.minus);
        evs[plus] = `${evs[plus]}+`;
        evs[minus] = `${evs[minus]}-`;
      }
      const s = `${spread.nature} ${evs.join('/')}`;
      const i = ivs.join('/');
      return i === '31/31/31/31/31/31' ? s : `${s}\nIVs: ${i}`; // FIXME DVs and 15/15 etc
    }

    if (evs.length) s += 'EVs: ' + evs.join(' / ') + '\n';

    if (ivs.length) s += '\nIVs: ' + ivs.join(' / '); // FIXME DVs
    return s; */
    return '';
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
