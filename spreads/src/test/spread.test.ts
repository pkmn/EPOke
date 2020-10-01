import {Spread} from '../spread';
import {NATURES} from '../data';

const SPREAD = new Spread({
  nature: NATURES.get('Modest'),
  evs: {spa: 252, hp: 56, spe: 200},
  ivs: {spd: 30, atk: 0},
});

const SPREAD2 = new Spread({nature: NATURES.get('Jolly'), evs: {atk: 252, def: 4, spe: 252}});

const RBY = new Spread({ivs: {spd: 16, spa: 30, atk: 7}});

describe('Spread', () => {
  test('#toString', () => {
    expect(SPREAD.toString()).toEqual(
      'Modest Nature (+SpA, -Atk)\n' +
      'EVs: 56 HP / 252 SpA / 200 Spe\n' +
      'IVs: 0 Atk / 30 SpD'
    );
    expect(Spread.display(SPREAD, true)).toEqual(
      'Modest 56/0-/0/252+/0/200\n' +
      'IVs: 31/0/31/31/30/31'
    );

    expect(SPREAD2.toString()).toEqual(
      'Jolly Nature (+Spe, -SpA)\n' +
      'EVs: 252 Atk / 4 Def / 252 Spe'
    );
    expect(Spread.display(SPREAD2, true)).toEqual('Jolly 0/252/4/0-/0/252+');

    expect(RBY.toString()).toEqual(
      '??? Nature\n' +
      'EVs: ???\n' +
      'IVs: 7 Atk / 30 SpA / 16 SpD'
    );
    expect(Spread.display(RBY, false, 1)).toEqual('DVs: 3/15/15/15/15');
    expect(Spread.display(RBY, true)).toEqual(
      '??? ???/???/???/???/???/???\n' +
      'IVs: 31/7/31/30/16/31'
    );
    expect(Spread.display(RBY, true, 1)).toEqual('DVs: 3/15/15/15/15');
  });

  test('#fromString', () => {
    expect(Spread.fromString(SPREAD.toString())).toEqual(SPREAD);
    expect(Spread.fromString(
      'IVs: 0 Atk / 30 SpDef\n' +
      'Modest Nature\n' +
      'EVs: 56 HP /  200 Speed / 252 SpAtk\n'
    )).toEqual(SPREAD);
    expect(Spread.fromString(
      'IVs: 31/0/31/31/30/31\n' +
      '56/0-/0/252+/0/200'
    )).toEqual(SPREAD);

    expect(Spread.fromString(
      'Jolly (+Atk, -SpA)\n' +
      'EVs: 252 Atk / 4 Def / 252 Spe'
    )).toEqual(SPREAD2);
    expect(Spread.fromString('Jolly 0/252/4/0/0/252')).toEqual(SPREAD2);

    expect(Spread.fromString(
      '??? Nature\n' +
      'EVs: ???\n' +
      'IVs: 7 Atk / 30 SpA / 16 SpD'
    )).toEqual(RBY);
    expect(Spread.fromString(
      '??? ???/???/???/???/???/???\n' +
      'IVs: 31/7/31/30/16/31'
    )).toEqual(RBY);
    expect(Spread.fromString('DVs: 3/15/15/15/15')).toEqual(RBY);
  });

  test('#toRange', () => {
    const r = SPREAD.toRange();
    expect(r.min).toEqual(SPREAD);
    expect(r.max).toEqual(SPREAD);
  });

  test('#toStats', () => {
    expect(SPREAD.toStats({hp: 60, atk: 65, def: 60, spa: 130, spd: 75, spe: 110}, 3))
      .toEqual({hp: 275, atk: 178, def: 156, spa: 394, spd: 185, spe: 306});

    expect(Spread.toStats({}, {hp: 60, atk: 65, def: 60, spa: 130, spd: 75, spe: 110}, 1))
      .toEqual({hp: 323, atk: 198, def: 218, spa: 358, spd: 358, spe: 318});
  });
});
