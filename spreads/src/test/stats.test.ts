/* eslint-disable jest/no-conditional-expect */
import {Stats, statToEV, statToIV} from '../stats';
import * as data from '../data';

import {run} from './runner';

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
    run(1E4);
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

  test('statToIV', () => {
    expect(statToIV(1, 'hp', 76, 100, 0, 20)).toEqual(31);
    expect(statToIV(1, 'hp', 75, 100, 0, 20)).toEqual(29);
    expect(statToIV(1, 'hp', 73, 100, 0, 20)).toEqual(19);

    expect(statToIV(8, 'atk', 51, 100, 0, 20)).toEqual(31);
    expect(statToIV(8, 'atk', 50, 100, 0, 20)).toEqual(29);
    expect(statToIV(8, 'atk', 49, 100, 0, 20)).toEqual(24);

    const plus = data.NATURES.get('Modest');
    expect(statToIV(8, 'spa', 132, 100, 0, 50, plus)).toEqual(31);
    expect(statToIV(8, 'spa', 130, 100, 0, 50, plus)).toEqual(29);
    expect(statToIV(8, 'spa', 129, 100, 0, 50, plus)).toEqual(27);

    const minus = data.NATURES.get('Adamant');
    expect(statToIV(8, 'spa', 108, 100, 0, 50, minus)).toEqual(31);
    expect(statToIV(8, 'spa', 107, 100, 0, 50, minus)).toEqual(29);
    expect(statToIV(8, 'spa', 106, 100, 0, 50, minus)).toEqual(27);
  });
});
