/* eslint-disable jest/no-conditional-expect */
import {GenerationNum, StatsTable} from '@pkmn/types';

import {Stats} from '../stats';
import {NATURES, STATS} from '../data';

const N = 10000;

class Random {
  private seed: number;

  constructor(n = 4 /* https://xkcd.com/221/ */) {
    // Hash: https://burtleburtle.net/bob/hash/integer.html
    n = n ^ 61 ^ (n >>> 16);
    n = n + (n << 3);
    n = n ^ (n >>> 4);
    n = Math.imul(n, 0x27d4eb2d);
    n = n ^ (n >>> 15);
    this.seed = n >>> 0;
  }

  // Mulberry32: https://gist.github.com/tommyettinger/46a874533244883189143505d203312c
  next(min?: number, max?: number) {
    if (min) min = Math.floor(min);
    if (max) max = Math.floor(max);

    let z = (this.seed += 0x6d2b79f5 | 0);
    z = Math.imul(z ^ (z >>> 15), z | 1);
    z = z ^ (z + Math.imul(z ^ (z >>> 7), z | 61));
    z = (z ^ (z >>> 14)) >>> 0;
    const n = z / 2 ** 32;

    if (min === undefined) return n;
    if (!max) return Math.floor(n * min);
    return Math.floor(n * (max - min)) + min;
  }

  sample<T>(arr: T[], remove = false) {
    if (arr.length === 0) throw new RangeError('Cannot sample an empty array');
    const index = this.next(arr.length);
    const val = arr[index];
    if (remove) {
      arr[index] = arr[arr.length - 1];
      arr.pop();
    }
    if (val === undefined && !Object.prototype.hasOwnProperty.call(arr, index)) {
      throw new RangeError('Cannot sample a sparse array');
    }
    return val;
  }
}

describe('Stats', () => {
  test('equal', () => {
    expect(Stats.equal({hp: 5}, {atk: 5})).toBe(false);
    expect(Stats.equal({hp: 5}, {hp: 5})).toBe(true);
    expect(Stats.equal({hp: 5}, {hp: 5, atk: 1})).toBe(false);
    expect(Stats.equal({hp: 5, def: 1}, {hp: 5, atk: 1})).toBe(false);
    expect(Stats.equal({hp: 5, atk: 1}, {hp: 5, atk: 1})).toBe(true);

    const s = new Stats({hp: 373, atk: 367, def: 256, spa: 203, spd: 237, spe: 187});
    expect(Stats.equal(s, s)).toBe(true);
  });

  test('toString', () => {
    const s = new Stats({hp: 373, atk: 367, def: 256, spa: 203, spd: 237, spe: 187});

    expect(Stats.display(s)).toEqual('373 HP / 367 Atk / 256 Def / 203 SpA / 237 SpD / 187 Spe');
    expect(Stats.display(s, true)).toEqual('373/367/256/203/237/187');

    expect(Stats.display(s, false, 1)).toEqual('373 HP / 367 Atk / 256 Def / 203 Spc / 187 Spe');
    expect(Stats.display(s, true, {num: 1})).toEqual('373/367/256/203/187');
  });

  test('fromString', () => {
    expect(Stats.fromString('373 HP / 367 Atk / 256 Def / 203 SpA')).toBeUndefined();

    const s = new Stats({hp: 373, atk: 367, def: 256, spa: 203, spd: 237, spe: 187});
    expect(Stats.fromString(s.toString())).toEqual(s);
    expect(Stats.fromString('367 Atk /373 HP /256 Def/ 187 Spd/203 SAtk / 237 SpDef ')).toEqual(s);
    expect(Stats.fromString('373/367/256/203/237/187')).toEqual(s);

    const rby = {hp: 373, atk: 367, def: 256, spa: 203, spd: 203, spe: 187};
    expect(Stats.fromString('373 HP / 367 Atk / 256 Def / 203 Spc / 187 Spe')).toEqual(rby);
    expect(Stats.fromString('373/367/256/203/187')).toEqual(rby);
  });

  test('toRange', () => {
    const s = new Stats({hp: 373, atk: 367, def: 256, spa: 203, spd: 237, spe: 187});
    const r = s.toRange();
    expect(r.min).toEqual(s);
    expect(r.max).toEqual(s);
  });

  test.skip('toSpread', () => {
    // TODO normal expects - some should be impossible = undefined

    const random = new Random();
    for (let i = 0; i < N; i++) {
      const level = random.next(1, 100);
      const gen = random.next(1, 8) as GenerationNum;

      const base: Partial<StatsTable> = {};
      const ivs: Partial<StatsTable> = {};
      const evs: Partial<StatsTable> = {};
      const stats: Partial<StatsTable> = {};
      const nature = gen >= 3 ? random.sample([...NATURES]) : undefined;

      let total = 510;
      for (const stat of STATS) {
        base[stat] = random.next(5, 255);
        ivs[stat] = random.next(0, 31);
        evs[stat] = random.next(0, Math.min(total, 252));
        total -= evs[stat]!;
        stats[stat] = STATS.calc(gen, stat, base[stat]!, ivs[stat], evs[stat], level, nature);
      }
      expect(total).toBeGreaterThanOrEqual(0);

      const s = Stats.toSpread(stats as StatsTable, base as StatsTable, gen, level)!;
      expect(s).toBeDefined();
      if (gen < 3) expect(s?.nature).toBeUndefined();

      total = 0;
      const calced: Partial<StatsTable> = {};
      for (const stat of STATS) {
        if (s.ivs[stat]) {
          expect(s.ivs[stat]).toBeGreaterThanOrEqual(0);
          expect(s.ivs[stat]).toBeLessThanOrEqual(31);
        }
        if (s.evs[stat]) {
          expect(s.evs[stat]).toBeGreaterThanOrEqual(0);
          expect(s.evs[stat]).toBeLessThanOrEqual(255);
          total += s.evs[stat]!;
        }
        calced[stat] =
          STATS.calc(gen, stat, base[stat]!, s.ivs[stat], s.evs[stat], level, s.nature);
      }
      expect(total).toBeLessThanOrEqual(510);
      expect(calced).toEqual(stats);
    }
  });
});
