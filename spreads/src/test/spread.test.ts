import {Spread} from '../spread';

const SPREAD = new Spread({
  nature: 'Modest',
  evs: {spa: 252, hp: 56, spe: 200},
  ivs: {spd: 30, atk: 0},
});

const SPREAD2 = new Spread({nature: 'Jolly', evs: {atk: 252, def: 4, spe: 252}});

const RBY = new Spread({ivs: {spd: 16, spa: 30, atk: 7}});

const RBY2 = new Spread({evs: {atk: 0}, ivs: {spd: 16, spa: 30, atk: 7}});

describe('Spread', () => {
  test('#equals', () => {
    expect(SPREAD.equals(SPREAD)).toBe(true);
    expect(SPREAD.equals(SPREAD2)).toBe(false);

    expect(Spread.equals({}, {})).toBe(true);
    expect(Spread.equals({}, {nature: 'Serious'})).toBe(false);

    expect(Spread.equals({nature: undefined}, {ivs: {}, evs: undefined})).toBe(true);
    expect(Spread.equals({nature: undefined}, {ivs: {}, evs: {atk: 4}})).toBe(false);

    expect(Spread.equals({evs: {atk: 0, def: 0}}, {ivs: {atk: 31}})).toBe(true);
    expect(Spread.equals({evs: {atk: 0, def: 0}}, {ivs: {atk: 30}})).toBe(false);

    expect(Spread.equals({evs: {atk: 252}}, {evs: {atk: 252}})).toBe(true);
    expect(Spread.equals({evs: {atk: 252}}, {evs: {atk: 255}})).toBe(false);
  });

  test('#toString', () => {
    expect(SPREAD.toString()).toEqual(
      'Modest Nature (+SpA, -Atk)\n' +
      'EVs: 56 HP / 252 SpA / 200 Spe\n' +
      'IVs: 0 Atk / 30 SpD'
    );
    expect(Spread.display(SPREAD, {style: 'compact'})).toEqual(
      'Modest 56/0-/0/252+/0/200\n' +
      'IVs: 31/0/31/31/30/31'
    );

    expect(SPREAD2.toString()).toEqual(
      'Jolly Nature (+Spe, -SpA)\n' +
      'EVs: 252 Atk / 4 Def / 252 Spe'
    );
    expect(Spread.display(SPREAD2, {style: 'compact', separator: {internal: '|'}}))
      .toBe('Jolly 0|252|4|0-|0|252+');

    expect(RBY.toString()).toEqual(
      '??? Nature\n' +
      'EVs: ???\n' +
      'IVs: 7 Atk / 30 SpA / 16 SpD'
    );
    expect(Spread.display(RBY, 1)).toEqual(
      'EVs: 0 HP / 0 Atk / 0 Def / 0 Spc / 0 Spe\n' +
      'DVs: 3 Atk'
    );
    expect(Spread.display(RBY, {style: 'compact'})).toEqual(
      '??? 0/0/0/0/0/0\n' +
      'IVs: 31/7/31/30/16/31'
    );
    expect(Spread.display(RBY, 1, {style: 'compact', separator: ' '})).toBe(
      'EVs: 0/0/0/0/0 DVs: 15/3/15/15/15'
    );

    expect(RBY2.toString()).toEqual(
      '??? Nature\n' +
      'EVs: ???\n' +
      'IVs: 7 Atk / 30 SpA / 16 SpD'
    );
    expect(Spread.display(RBY2, 1, {style: 'pretty', separator: {line: '; '}})).toBe(
      'EVs: 0 HP / 0 Atk / 0 Def / 0 Spc / 0 Spe; DVs: 3 Atk'
    );
    expect(Spread.display(RBY2, {style: 'compact'})).toEqual(
      '??? 0/0/0/0/0/0\n' +
      'IVs: 31/7/31/30/16/31'
    );
    expect(Spread.display(RBY2, 1, {style: 'compact'})).toEqual(
      'EVs: 0/0/0/0/0\n' +
      'DVs: 15/3/15/15/15'
    );
  });

  test('#fromString', () => {
    expect(Spread.fromString(SPREAD.toString())!.equals(SPREAD)).toBe(true);
    expect(Spread.fromString(
      'IVs: 0 Atk / 30 SpDef\n' +
      'Modest Nature\n' +
      'EVs: 56 HP /  200 Speed / 252 SpAtk\n'
    )!.equals(SPREAD)).toBe(true);
    expect(Spread.fromString(
      'IVs: 31/0/31/31/30/31\n' +
      'EVs: 56/0-/0/252+/0/200'
    )!.equals(SPREAD)).toBe(true);

    expect(Spread.fromString(
      'Jolly (+Atk, -SpA)\n' +
      'EVs: 252 Atk / 4 Def / 252 Spe'
    )!.equals(SPREAD2)).toBe(true);
    expect(Spread.fromString('Jolly 0/252/4/0/0/252')!.equals(SPREAD2)).toBe(true);

    expect(Spread.fromString(
      '??? Nature\n' +
      'EVs: ???\n' +
      'IVs: 7 Atk / 30 SpA / 16 SpD'
    )!.equals(RBY)).toBe(true);
    expect(Spread.fromString('IVs: 31/7/31/30/16/31')!.equals(RBY)).toBe(true);

    const copy = new Spread(RBY);
    copy.ivs.spa = 31;
    copy.ivs.spd = 31;
    expect(Spread.fromString('DVs: 15/3/15/15/15')!.equals(copy)).toBe(true);
  });

  test('#toRange', () => {
    const r = SPREAD.toRange();
    expect(r.min).toEqual(SPREAD);
    expect(r.max).toEqual(SPREAD);
  });

  test('#toStats', () => {
    expect(SPREAD.toStats({hp: 60, atk: 65, def: 60, spa: 130, spd: 75, spe: 110}, 3))
      .toEqual({hp: 275, atk: 121, def: 156, spa: 394, spd: 185, spe: 306});

    expect(Spread.toStats({}, {hp: 60, atk: 65, def: 60, spa: 130, spd: 75, spe: 110}, 1))
      .toEqual({hp: 323, atk: 228, def: 218, spa: 358, spd: 248, spe: 318});
  });
});
