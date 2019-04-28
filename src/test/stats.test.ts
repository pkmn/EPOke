import * as pkmn from '@pkmn.cc/data';

import * as stats from '../stats';

const range = (min: number, max: number) => ({min, max});

describe('Stat', () => {
  test('display', () => {
    const s = new stats.Stats(
        {hp: 373, atk: 367, def: 256, spa: 203, spd: 237, spe: 187});
    const sd = stats.Stats.fromString(s.toString())!;
    expect(stats.Stats.display(sd))
        .toEqual('373 HP / 367 Atk / 256 Def / 203 SpA / 237 SpD / 187 Spe');
    expect(stats.Stats.display(sd, true)).toEqual('373/367/256/203/237/187');
  });
});

describe('StatsRange', () => {
  test('display', () => {
    const s = new stats.StatsRange({
      hp: range(360, 375),
      atk: range(367, 367),
      def: range(250, 260),
      spa: range(203, 205),
      spd: range(235, 239),
      spe: range(180, 187)
    });
    const sd = stats.StatsRange.fromString(s.toString())!;
    expect(stats.StatsRange.display(sd))
        .toEqual(
            '360-375 HP / 367 Atk / 250-260 Def / ' +
            '203-205 SpA / 235-239 SpD / 180-187 Spe');
    expect(stats.StatsRange.display(sd, true))
        .toEqual('360-375/367/250-260/203-205/235-239/180-187');
  });
});

describe('Spread', () => {
  test('display', () => {
    const s = new stats.SparseSpread({
      nature: pkmn.Natures.get('Modest')!,
      evs: {spa: 252, hp: 56, spe: 200},
      ivs: {spd: 30, atk: 0},
    });
    const sd = stats.SparseSpread.fromString(s.toString())!;
    expect(stats.SparseSpread.display(sd))
        .toEqual(
            `EVs: 56 HP / 252 SpA / 200 Spe\n` +
            `Modest Nature\n` +
            `IVs: 0 Atk / 30 SpD`);
    expect(stats.SparseSpread.display(sd, true))
        .toEqual(
            `Modest 56/0-/0/252+/0/200\n` +
            `IVs: 31/0/31/31/30/31`);
  });
});

describe('SpreadRange', () => {
  test('display', () => {
    const s = new stats.SparseSpreadRange({
      nature: pkmn.Natures.get('Modest')!,
      evs: {spa: range(252, 255), hp: range(20, 80), spe: range(200, 255)},
      ivs: {spd: range(20, 31), spa: range(31, 31), atk: range(0, 10)},
    });
    const sd =
        stats.SparseSpreadRange.fromString(stats.SparseSpreadRange.display(s))!;
    expect(stats.SparseSpreadRange.display(sd))
        .toEqual(
            `EVs: 20-80 HP / 252 SpA / >200 Spe\n` +
            `Modest Nature\n` +
            `IVs: <10 Atk / >20 SpD`);
    expect(stats.SparseSpreadRange.display(sd, true))
        .toEqual(
            `Modest 20-80/0-/0/252+/0/>200\n` +
            `IVs: 31/<10/31/31/>20/31`);
  });
});
