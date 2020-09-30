import {StatName} from '@pkmn/types';
import {STATS, NATURES, GEN, Generation} from './data';

const S = ['hp', 'atk', 'def', 'spa', 'spd', 'spe'] as const;
const N = [...NATURES];

export interface Range<T> {
  min: T;
  max: T;
}

export function isRange<T>(r: unknown | Range<T>): r is Range<T> {
  return 'min' in (r as Range<T>);
}

export function displayStats(display: (stat: StatName) => string, compact?: boolean, gen?: Generation) {
  const skip = GEN(gen) === 1;

  const s = [];
  for (const stat of S) {
    if (skip && stat === 'spd') continue;
    const d = display(stat);
    s.push(compact ? d : `${d} ${STATS.display(stat, gen)}`);
  }
  return s.join(compact ? '/' : ' / ');
}

export function displayIVsEVs(
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

export function displayRange(range: Range<number>, max = Infinity) {
  if (range.min === range.max || range.min === max) return `${range.min}`;
  if (range.min === 0 && range.max >= max) return '???';
  if (range.max >= max) return `>${range.min}`;
  if (range.min === 0) return `<${range.max}`;
  return `${range.min}-${range.max}`;
}

export function parseRange(s: string, max = Infinity) {
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

export function getNatureFromPlusMinus(plus: StatName, minus: StatName) {
  if (plus === 'hp' || minus === 'hp') return undefined;
  return N[(S.indexOf(plus) - 1) * 5 + (S.indexOf(minus) - 1)];
}
