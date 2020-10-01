import {StatName} from '@pkmn/types';
import {STATS, NATURES, GEN, Generation} from './data';

const STAT_ORDER = ['hp', 'atk', 'def', 'spa', 'spd', 'spe'] as const;
const RBY_STAT_ORDER = ['hp', 'atk', 'def', 'spa', 'spe'] as const;

export interface Range<T> {
  min: T;
  max: T;
}

export function isRange<T>(r: unknown | Range<T>): r is Range<T> {
  return 'min' in (r as Range<T>);
}

export function displayStats(
  display: (stat: StatName) => string,
  compact?: boolean,
  gen?: Generation
) {
  const skip = GEN(gen) === 1;

  const s = [];
  for (const stat of STAT_ORDER) {
    if (skip && stat === 'spd') continue;
    const d = display(stat);
    s.push(compact ? d : `${d} ${STATS.display(stat, gen)}`);
  }
  return s.join(compact ? '/' : ' / ');
}

export function statOrder(gen?: Generation): readonly StatName[] {
  return GEN(gen) === 1 ? RBY_STAT_ORDER : STAT_ORDER;
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

const N = [...NATURES];

export function getNatureFromPlusMinus(plus: StatName, minus: StatName) {
  if (plus === 'hp' || minus === 'hp') return undefined;
  return N[(STAT_ORDER.indexOf(plus) - 1) * 5 + (STAT_ORDER.indexOf(minus) - 1)];
}
