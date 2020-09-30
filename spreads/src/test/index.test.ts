/* eslint-disable jest/no-conditional-expect */
import {GenerationNum, StatsTable} from '@pkmn/types';

import {Stats, StatsRange} from '../index';
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

      const s = Stats.toSpread(stats as StatsTable, base as StatsTable, gen, level);
      expect(s).toBeDefined();

      total = 0;
      const calced: Partial<StatsTable> = {};
      for (const stat of STATS) {
        if (s!.ivs[stat]) {
          expect(s!.ivs[stat]).toBeGreaterThanOrEqual(0);
          expect(s!.ivs[stat]).toBeLessThanOrEqual(31);
        }
        if (s!.evs[stat]) {
          expect(s!.evs[stat]).toBeGreaterThanOrEqual(0);
          expect(s!.evs[stat]).toBeLessThanOrEqual(255);
          total += s!.evs[stat]!;
        }
        calced[stat] =
          STATS.calc(gen, stat, base[stat]!, s!.ivs[stat], s!.evs[stat], level, s!.nature);
      }
      expect(total).toBeLessThanOrEqual(510);
      expect(calced).toEqual(stats);
    }
  });
});

describe('StatsRange', () => {
  test('includes', () => {
    const s = new StatsRange({
      min: {hp: 360, atk: 367, def: 250, spa: 203, spd: 235, spe: 180},
      max: {hp: 375, atk: 367, def: 260, spa: 205, spd: 239, spe: 187},
    });
    expect(s).toContain(s.min);
    expect(s).toContain(s.max);
    expect(s).toContain({hp: 365, atk: 367, def: 255, spa: 204, spd: 237, spe: 185});
    expect(s).not.toContain({hp: 365, atk: 368, def: 255, spa: 204, spd: 237, spe: 185});
  });

  test('toString', () => {
    const s = new StatsRange({
      min: {hp: 360, atk: 367, def: 250, spa: 203, spd: 235, spe: 180},
      max: {hp: 375, atk: 367, def: 260, spa: 205, spd: 239, spe: 187},
    });

    expect(StatsRange.display(s)).toEqual(
      '360-375 HP / 367 Atk / 250-260 Def / 203-205 SpA / 235-239 SpD / 180-187 Spe'
    );
    expect(StatsRange.display(s, true)).toEqual('360-375/367/250-260/203-205/235-239/180-187');

    expect(StatsRange.display(s, false, {num: 1})).toEqual(
      '360-375 HP / 367 Atk / 250-260 Def / 203-205 Spc / 180-187 Spe'
    );
    expect(StatsRange.display(s, true, 1)).toEqual(
      '360-375/367/250-260/203-205/180-187'
    );
  });

  test('fromString', () => {
    expect(Stats.fromString(
      '360-375 HP / 367 Atk / 203-205 SpA / 235-239 SpD / 180-187 Spe'
    )).toBeUndefined();

    const s = new StatsRange({
      min: {hp: 360, atk: 367, def: 250, spa: 203, spd: 235, spe: 180},
      max: {hp: 375, atk: 367, def: 260, spa: 205, spd: 239, spe: 187},
    });
    expect(StatsRange.fromString(s.toString())).toEqual(s);
    expect(StatsRange.fromString(
      '367 Atk / 360-375 HP / 250-260 Def / 203-205 SpAtk / 180-187 Speed / 235-239 SpD'
    )).toEqual(s);
    expect(StatsRange.fromString('360-375/367/250-260/203-205/235-239/180-187')).toEqual(s);

    const rby = new StatsRange({
      min: {hp: 360, atk: 367, def: 250, spa: 203, spd: 203, spe: 180},
      max: {hp: 375, atk: 367, def: 260, spa: 205, spd: 205, spe: 187},
    });
    expect(Stats.fromString('360-375 HP / 367 Atk / 250-260 Def / 180-187 Spe / 203-205 Spc'))
      .toEqual(rby);
    expect(Stats.fromString('360-375 /367 / 250-260/203-205 / 180-187')).toEqual(rby);
  });

  test('fromBase', () => {
    expect(StatsRange.fromBase({hp: 60, atk: 65, def: 60, spa: 130, spd: 75, spe: 110})).toEqual({
      min: {hp: 230, atk: 121, def: 112, spa: 238, spd: 139, spe: 202},
      max: {hp: 324, atk: 251, def: 240, spa: 394, spd: 273, spe: 350},
    });

    expect(
      StatsRange.fromBase({hp: 95, atk: 70, def: 73, spa: 95, spd: 90, spe: 60}, 8, 83)
    ).toEqual({
      min: {hp: 250, atk: 108, def: 113, spa: 145, spd: 138, spe: 93},
      max: {hp: 328, atk: 218, def: 224, spa: 264, spd: 255, spe: 200},
    });

    expect(
      StatsRange.fromBase({hp: 35, atk: 55, def: 30, spa: 50, spd: 40, spe: 90}, 2, 50)
    ).toEqual({
      min: {hp: 95, atk: 60, def: 35, spa: 55, spd: 45, spe: 95},
      max: {hp: 141, atk: 106, def: 81, spa: 101, spd: 91, spe: 141},
    });
  });

  test('toStats', () => {
    expect(StatsRange.toStats({
      min: {hp: 360, atk: 367, def: 250, spa: 203, spd: 235, spe: 180},
      max: {hp: 375, atk: 367, def: 260, spa: 205, spd: 239, spe: 187},
    })).toBeUndefined();
    const s = new Stats({hp: 373, atk: 367, def: 256, spa: 203, spd: 237, spe: 187});
    expect(s.toRange().toStats()).toEqual(s);
  });

  test('toSpreadRange', () => {
  });
});


describe('Spread', () => {
  test('toString', () => {
  });


  test('fromString', () => {
  });


  test('toRange', () => {
  });


  test('toStats', () => {
  });
});


describe('SpreadRange', () => {
  test('toString', () => {
  });


  test('fromString', () => {
  });


  test('toSpread', () => {
  });


  test('toStatsRange', () => {
  });
});
