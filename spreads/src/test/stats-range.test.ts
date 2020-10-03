/* eslint-disable jest/prefer-to-contain */
import {Stats} from '../stats';
import {StatsRange} from '../stats-range';
import {Spread} from '../spread';

const RANGE = new StatsRange({
  min: {hp: 360, atk: 367, def: 250, spa: 203, spd: 235, spe: 180},
  max: {hp: 375, atk: 367, def: 260, spa: 205, spd: 239, spe: 187},
});

const RBY = new StatsRange({
  min: {hp: 360, atk: 367, def: 250, spa: 203, spd: 203, spe: 180},
  max: {hp: 375, atk: 367, def: 260, spa: 205, spd: 205, spe: 187},
});

describe('StatsRange', () => {
  test('#equals', () => {
    expect(RANGE.equals(RANGE)).toBe(true);
    expect(RANGE.equals(RBY)).toBe(false);
  });

  test('#includes', () => {
    expect(RANGE.includes(RANGE.min)).toBe(true);
    expect(RANGE.includes(RANGE.max)).toBe(true);
    expect(RANGE.includes({hp: 365, atk: 367, def: 255, spa: 204, spd: 237, spe: 185})).toBe(true);
    expect(RANGE.includes({hp: 365, atk: 10, def: 255, spa: 204, spd: 237, spe: 185})).toBe(false);
  });

  test('#toString', () => {
    expect(StatsRange.display(RANGE)).toEqual(
      '360-375 HP / 367 Atk / 250-260 Def / 203-205 SpA / 235-239 SpD / 180-187 Spe'
    );
    expect(StatsRange.display(RANGE, {style: 'compact'}))
      .toEqual('360-375/367/250-260/203-205/235-239/180-187');

    expect(StatsRange.display(RANGE, {num: 1}, {style: 'pretty'})).toEqual(
      '360-375 HP / 367 Atk / 250-260 Def / 203-205 Spc / 180-187 Spe'
    );
    expect(StatsRange.display(RANGE, 1, {style: 'compact', separator: ' | '})).toEqual(
      '360-375 | 367 | 250-260 | 203-205 | 180-187'
    );
  });

  test('#fromString', () => {
    expect(StatsRange.fromString(
      '360-375 HP / 367 Atk / 203-205 SpA / 235-239 SpD / 180-187 Spe'
    )).toBeUndefined();

    expect(StatsRange.fromString(RANGE.toString())).toEqual(RANGE);
    expect(StatsRange.fromString(
      '367 Atk / 360-375 HP / 250-260 Def / 203-205 SpAtk / 180-187 Speed / 235-239 SpD'
    )).toEqual(RANGE);
    expect(StatsRange.fromString('360-375/367/250-260/203-205/235-239/180-187')).toEqual(RANGE);

    expect(StatsRange.fromString('360-375 HP / 367 Atk / 250-260 Def / 180-187 Spe / 203-205 Spc'))
      .toEqual(RBY);
    expect(StatsRange.fromString('360-375 /367 / 250-260/203-205 / 180-187')).toEqual(RBY);

    expect(StatsRange.fromString('360-375/367/???/203-205/235-239/180-187')).toBeUndefined();
    expect(StatsRange.fromString('360-375/367/250-260/203-205/235-239/<187')).toBeUndefined();
    expect(StatsRange.fromString('360-375/367/250-260/>203/235-239/180-187')).toBeUndefined();
  });

  test('#fromBase', () => {
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

  test('#toStats', () => {
    expect(StatsRange.toStats(RANGE)).toBeUndefined();
    const s = new Stats({hp: 373, atk: 367, def: 256, spa: 203, spd: 237, spe: 187});
    expect(s.toRange().toStats()).toEqual(s);
  });

  test('#toSpreadRange', () => {
    const base = Stats.fromString('60/65/60/130/75/110')!;
    const range = new StatsRange(
      Spread.fromString('EVs: 100/0/0/60/0/40\nIVs: 10 Def')!.toStats(base),
      Spread.fromString('EVs: 172/0-/0/148/0/188+')!.toStats(base)
    );
    expect(range.toSpreadRange(base)?.toString()).toEqual(
      'Serious-Timid Nature\n' +
      'EVs: 100-172 HP / 60-148 SpA / 40-188 Spe\n' +
      'IVs: >10 Def'
    );
  });
});
