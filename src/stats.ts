import * as pkmn from '@pkmn.cc/data';

import {STATS, StatsTable} from './statistics';

export interface Range<T> {
  min: T;
  max: T;
}

export type Stats = StatsTable<number>;
export type StatsRange = StatsTable<Range<number>>;

export interface SpreadTable<T> {
  nature: pkmn.Nature;
  ivs: StatsTable<T>;
  evs: StatsTable<T>;
}

export type Spread = SpreadTable<number>;
export type SpreadRange = SpreadTable<Range<number>>;

export interface SparseSpreadTable<T> {
  nature: pkmn.Nature;
  ivs: Partial<StatsTable<T>>;
  evs: Partial<StatsTable<T>>;
}

export type SparseSpread = SparseSpreadTable<number>;
export type SparseSpreadRange = SparseSpreadTable<Range<number>>;

function statsDisplay<T>(
    stats: StatsTable<T>, display: (val: T) => string, compact?: boolean) {
  const s = [];
  let stat: pkmn.Stat;
  for (stat in STATS) {
    const d = display(stats[stat]);
    s.push(compact ? d : `${d} ${pkmn.Stats.display(stat)}`);
  }
  return s.join(compact ? '/' : ' / ');
}

export const displayStats = (s: Stats, c?: boolean) =>
    statsDisplay(s, v => `${v}`, c);
export const displayStatsRange = (s: StatsRange, c?: boolean) =>
    statsDisplay(s, v => rangeDisplay(v, Infinity), c);

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
const zero = (t: 'iv'|'ev') => t === 'iv' ? 31 : 0;
export const fromSparseSpread = (s: SparseSpread) =>
    fromSparse(s, t => zero(t));
export const fromSparseSpreadRange = (s: SparseSpreadRange) =>
    fromSparse(s, t => ({min: zero(t), max: zero(t)}));

function spreadDisplay<T>(
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

function rangeDisplay(range: Range<number>, max: number) {
  if (range.min === range.max || range.min === max) return `${range.min}`;
  if (range.max >= max) return `>${range.min}`;
  if (range.min === 0) return `<${range.max}`;
  return `${range.min}-${range.max}`;
}

export const displaySpread = (s: Spread, c?: boolean) =>
    spreadDisplay(s, (v, t) => {
      if (t === 'iv') {
        return !c && v === 31 ? '' : `${v}`;
      } else {
        return !c && v === 0 ? '' : `${v}`;
      }
    }, c);
export const displaySpreadRange = (s: SpreadRange, c?: boolean) =>
    spreadDisplay(s, (v, t) => {
      if (t === 'iv') {
        const s = rangeDisplay(v, 31);
        return !c && s === '31' ? '' : s;
      } else {
        const s = rangeDisplay(v, 252);
        return !c && s === '0' ? '' : s;
      }
    }, c);
export const displaySparseSpread = (s: SparseSpread, c?: boolean) =>
    displaySpread(fromSparseSpread(s), c);
export const displaySparseSpreadRange = (s: SparseSpreadRange, c?: boolean) =>
    displaySpreadRange(fromSparseSpreadRange(s), c);


// TODO (Sparse)Spread -> Stats
// TODO (Sparse)SpreadRange -> StatsRange
