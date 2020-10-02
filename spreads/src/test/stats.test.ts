/* eslint-disable jest/no-conditional-expect */
import {GenerationNum, StatsTable} from '@pkmn/types';

import {Stats, statToEV, findIV} from '../stats';
import {Spread} from '../spread';
import * as data from '../data';

const N = 10000;

class Random {
  seed: number;

  constructor(seed = 0x27d4eb2d) {
    this.seed = seed;
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

const STATS = new Stats({hp: 373, atk: 367, def: 256, spa: 203, spd: 237, spe: 187});
const RBY = {hp: 373, atk: 367, def: 256, spa: 203, spd: 203, spe: 187};

describe('Stats', () => {
  test('#equals', () => {
    expect(Stats.equals({hp: 5}, {atk: 5})).toBe(false);
    expect(Stats.equals({hp: 5}, {hp: 5})).toBe(true);
    expect(Stats.equals({hp: 5}, {hp: 5, atk: 1})).toBe(false);
    expect(Stats.equals({hp: 5, def: 1}, {hp: 5, atk: 1})).toBe(false);
    expect(Stats.equals({hp: 5, atk: 1}, {hp: 5, atk: 1})).toBe(true);

    expect(STATS.equals(STATS)).toBe(true);
  });

  test('#toString', () => {
    expect(Stats.display(STATS))
      .toEqual('373 HP / 367 Atk / 256 Def / 203 SpA / 237 SpD / 187 Spe');
    expect(Stats.display(STATS, true)).toEqual('373/367/256/203/237/187');

    expect(Stats.display(STATS, false, 1))
      .toEqual('373 HP / 367 Atk / 256 Def / 203 Spc / 187 Spe');
    expect(Stats.display(STATS, true, {num: 1})).toEqual('373/367/256/203/187');
  });

  test('#fromString', () => {
    expect(Stats.fromString('373 HP / 367 Atk / 256 Def / 203 SpA')).toBeUndefined();

    expect(Stats.fromString(STATS.toString())).toEqual(STATS);
    expect(Stats.fromString('367 Atk /373 HP /256 Def/ 187 Spd/203 SAtk / 237 SpDef '))
      .toEqual(STATS);
    expect(Stats.fromString('373/367/256/203/237/187')).toEqual(STATS);


    expect(Stats.fromString('373 HP / 367 Atk / 256 Def / 203 Spc / 187 Spe')).toEqual(RBY);
    expect(Stats.fromString('373/367/256/203/187')).toEqual(RBY);
  });

  test('#toRange', () => {
    const r = STATS.toRange();
    expect(r.min).toEqual(STATS);
    expect(r.max).toEqual(STATS);
  });

  test('#toSpread', () => {
    // TODO normal expects - some should be impossible = undefined

    const random = new Random();
    for (let i = 0; i < N; i++) {
      const seed = random.seed;
      const level = random.next(1, 100);
      const gen = random.next(1, 8) as GenerationNum;

      const base: Partial<StatsTable> = {};
      const ivs: Partial<StatsTable> = {};
      const evs: Partial<StatsTable> = {};
      const stats: Partial<StatsTable> = {};
      const nature = gen >= 3 ? random.sample([...data.NATURES]) : undefined;

      let spread: Spread | undefined;
      let calced: Partial<StatsTable> | undefined;

      try {
        let total = 510;
        // NOTE: we iterate to ensure HP gets handled last after all of the other IVs have been
        // rolled so that if we need to compute the expected HP DV in RBY/GSC we are able to
        const order = [...data.STATS].reverse();
        for (const stat of order) {
          base[stat] = random.next(5, 255);
          ivs[stat] = stat === 'hp' && gen < 3
            ? data.STATS.toIV(data.STATS.getHPDV(ivs))
            : random.next(0, 31);
          evs[stat] = random.next(0, Math.min(total, 252));
          total -= evs[stat]!;
          stats[stat] =
            data.STATS.calc(gen, stat, base[stat]!, ivs[stat], evs[stat], level, nature);
        }
        expect(total).toBeGreaterThanOrEqual(0);

        spread = Stats.toSpread(stats as StatsTable, base as StatsTable, gen, level)!;
        expect(spread).toBeDefined();
        const s = spread;
        let n: data.Nature | undefined;
        if (gen < 3) {
          expect(s.nature).toBeUndefined();
        } else {
          expect(s.nature).toBeDefined();
          n = data.NATURES.get(s.nature!)!;
          if (!nature!.plus && !nature!.minus) {
            // Ensure we also use a neutral Nature if the generated stats came from a spread
            // with a neutral Nature - EPOké want to have the flexibility to optimize later
            expect(n.plus).toBeUndefined();
            expect(n.minus).toBeUndefined();
          }
        }

        total = 0;
        calced = {};
        for (const stat of data.STATS) {
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
            data.STATS.calc(gen, stat, base[stat]!, s.ivs[stat], s.evs[stat], level, n);
        }
        expect(total).toBeLessThanOrEqual(510);

        expect(calced).toEqual(stats);
      } catch (err) {
        const t = {nature: nature?.name, ivs, evs};
        console.log(
          `Seed: ${seed} (${i + 1}/${N})\n` +
          `Generation: ${gen}\n` +
          `Level: ${level}\n` +
          `Base Stats: ${Stats.display(base as StatsTable, true, gen)}\n` +
          '------------------------------\n' +
          `Original: ${Spread.display(t, true, gen).replace('\n', ' ')}\n` +
          `Computed: ${spread ? Spread.display(spread, true, gen).replace('\n', ' ') : 'N/A'}\n` +
          '------------------------------\n' +
          `Original: ${Stats.display(stats as StatsTable, true, gen)}\n` +
          `Computed: ${calced ? Stats.display(calced as StatsTable, true, gen) : 'N/A'}\n`
        );
        throw err;
      }
    }
  });

  test('statToEV', () => {
    expect(statToEV(1, 'hp', 108, 100, 31, 25)).toEqual(248);
    expect(statToEV(1, 'hp', 107, 100, 31, 25)).toEqual(232);
    expect(statToEV(1, 'hp', 106, 100, 31, 25)).toEqual(216);

    expect(statToEV(3, 'def', 113, 100, 31, 37)).toEqual(244);
    expect(statToEV(3, 'def', 112, 100, 31, 37)).toEqual(236);
    expect(statToEV(3, 'def', 111, 100, 31, 37)).toEqual(224);

    const plus = data.NATURES.get('Modest');
    expect(statToEV(8, 'spa', 232, 100, 20, 73, plus)).toEqual(252);
    expect(statToEV(8, 'spa', 231, 100, 20, 73, plus)).toEqual(244);
    expect(statToEV(8, 'spa', 229, 100, 20, 73, plus)).toEqual(240);

    const minus = data.NATURES.get('Adamant');
    expect(statToEV(8, 'spa', 16, 100, 13, 5, minus)).toEqual(188);
    expect(statToEV(8, 'spa', 15, 100, 13, 5, minus)).toEqual(108);
    expect(statToEV(8, 'spa', 14, 100, 13, 5, minus)).toEqual(28);
  });

  test('findIV', () => {
    expect(findIV(1, 'hp', 76, 100, 0, 20)).toEqual(31);
    expect(findIV(1, 'hp', 75, 100, 0, 20)).toEqual(29);
    expect(findIV(1, 'hp', 73, 100, 0, 20)).toEqual(19);

    expect(findIV(8, 'atk', 51, 100, 0, 20)).toEqual(31);
    expect(findIV(8, 'atk', 50, 100, 0, 20)).toEqual(29);
    expect(findIV(8, 'atk', 49, 100, 0, 20)).toEqual(24);

    const plus = data.NATURES.get('Modest');
    expect(findIV(8, 'spa', 132, 100, 0, 50, plus)).toEqual(31);
    expect(findIV(8, 'spa', 130, 100, 0, 50, plus)).toEqual(29);
    expect(findIV(8, 'spa', 129, 100, 0, 50, plus)).toEqual(27);

    const minus = data.NATURES.get('Adamant');
    expect(findIV(8, 'spa', 108, 100, 0, 50, minus)).toEqual(31);
    expect(findIV(8, 'spa', 107, 100, 0, 50, minus)).toEqual(29);
    expect(findIV(8, 'spa', 106, 100, 0, 50, minus)).toEqual(27);
  });
});
