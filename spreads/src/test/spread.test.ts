import {Spread} from '../spread';
import {NATURES} from '../data';

describe('Spread', () => {
  test('toString', () => {
    const s = new Spread({
      nature: NATURES.get('Modest'),
      evs: {spa: 252, hp: 56, spe: 200},
      ivs: {spd: 30, atk: 0},
    });
    expect(s.toString()).toEqual(
      'Modest Nature (+SpA, -Atk)\n' +
      'EVs: 56 HP / 252 SpA / 200 Spe\n' +
      'IVs: 0 Atk / 30 SpD'
    );
    expect(Spread.display(s, true)).toEqual(
      'Modest 56/0-/0/252+/0/200\n' +
      'IVs: 31/0/31/31/30/31'
    );

    const t = new Spread({nature: NATURES.get('Jolly'), evs: {atk: 252, def: 4, spe: 252}});
    expect(t.toString()).toEqual(
      'Jolly Nature (+Spe, -SpA)\n' +
      'EVs: 252 Atk / 4 Def / 252 Spe'
    );
    expect(Spread.display(s, true)).toEqual('Jolly 0/252/4/0-/0/252+');

    const rby = new Spread({ivs: {spd: 16, spa: 30, atk: 7}});
    expect(rby.toString()).toEqual(
      '??? Nature\n' +
      'EVs: ???\n' +
      'IVs: 7 Atk / 30 SpA / 16 SpD'
    );
    expect(Spread.display(rby, false, 1)).toEqual('DVs: 3/15/15/15/15');
    expect(Spread.display(rby, true)).toEqual(
      '??? ???/???/???/???/???/???\n' +
      'IVs: 31/7/31/30/16/31'
    );
    expect(Spread.display(rby, true, 1)).toEqual('DVs: 3/15/15/15/15');
  });

  test('fromString', () => {
    const s = new Spread({
      nature: NATURES.get('Modest'),
      evs: {spa: 252, hp: 56, spe: 200},
      ivs: {spd: 30, atk: 0},
    });
    expect(Spread.fromString(s.toString())).toEqual(s);
    expect(Spread.fromString(
      'IVs: 0 Atk / 30 SpDef\n' +
      'Modest Nature\n' +
      'EVs: 56 HP /  200 Speed / 252 SpAtk\n'
    )).toEqual(s);
    expect(Spread.fromString(
      'IVs: 31/0/31/31/30/31\n' +
      '56/0-/0/252+/0/200'
    )).toEqual(s);

    const t = new Spread({nature: NATURES.get('Jolly'), evs: {atk: 252, def: 4, spe: 252}});
    expect(Spread.fromString(
      'Jolly (+Atk, -SpA)\n' +
      'EVs: 252 Atk / 4 Def / 252 Spe'
    )).toEqual(t);
    expect(Spread.fromString('Jolly 0/252/4/0/0/252')).toEqual(t);

    const rby = new Spread({ivs: {spd: 16, spa: 30, atk: 7}});
    expect(Spread.fromString(
      '??? Nature\n' +
      'EVs: ???\n' +
      'IVs: 7 Atk / 30 SpA / 16 SpD'
    )).toEqual(rby);
    expect(Spread.fromString(
      '??? ???/???/???/???/???/???\n' +
      'IVs: 31/7/31/30/16/31'
    )).toEqual(rby);
    expect(Spread.fromString('DVs: 3/15/15/15/15')).toEqual(rby);
  });

  test('toRange', () => {
    const s = new Spread({
      nature: NATURES.get('Modest'),
      evs: {spa: 252, hp: 56, spe: 200},
      ivs: {spd: 30, atk: 0},
    });
    const r = s.toRange();
    expect(r.min).toEqual(s);
    expect(r.max).toEqual(s);
  });

  test('toStats', () => {
    const s = new Spread({
      nature: NATURES.get('Modest'),
      evs: {spa: 252, hp: 56, spe: 200},
      ivs: {spd: 30, atk: 0},
    });
    expect(s.toStats({hp: 60, atk: 65, def: 60, spa: 130, spd: 75, spe: 110}, 3))
      .toEqual({hp: 275, atk: 178, def: 156, spa: 394, spd: 185, spe: 306});

    expect(Spread.toStats({}, {hp: 60, atk: 65, def: 60, spa: 130, spd: 75, spe: 110}, 1))
      .toEqual({hp: 323, atk: 198, def: 218, spa: 358, spd: 358, spe: 318});
  });
});