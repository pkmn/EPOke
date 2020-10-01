import {GenerationNum, StatsTable} from '@pkmn/types';

import {NATURES, STATS} from '../data';

describe('NATURES', () => {
  it('#get', () => {
    const adamant = NATURES.get('adamant')!;
    expect(adamant.name).toBe('Adamant');
    expect(adamant.plus).toBe('atk');
    expect(adamant.minus).toBe('spa');

    const serious = NATURES.get('serious')!;
    expect(serious.name).toBe('Serious');
    expect(serious.plus).not.toBeDefined();
    expect(serious.minus).not.toBeDefined();

    expect(NATURES.get('foo')).toBeUndefined();
  });

  it('count', () => {
    expect(Array.from(NATURES)).toHaveLength(25);
  });
});

describe('STATS', () => {
  it('#calc', () => {
    const rby: StatsTable = {hp: 403, atk: 298, def: 298, spa: 298, spd: 298, spe: 298};
    const adv: StatsTable = {hp: 404, atk: 328, def: 299, spa: 269, spd: 299, spe: 299};

    for (let gen = 1; gen <= 8; gen++) {
      for (const stat of STATS) {
        const s =
          STATS.calc(gen as GenerationNum, stat, 100, 31, 252, 100, NATURES.get('adamant'));
        expect(s).toBe(gen < 3 ? rby[stat] : adv[stat]);
      }
    }

    // Shedinja
    expect(STATS.calc(5, 'hp', 1, 31, 252, 100, NATURES.get('jolly')))
      .toBe(1);
    // no nature
    expect(STATS.calc(8, 'atk', 100, 31, 252, 100)).toBe(299);
  });

  it('#get', () => {
    expect(STATS.get('foo')).not.toBeDefined();
    expect(STATS.get('Atk')).toBe('atk');
    expect(STATS.get('Spc')).toBe('spa');
    expect(STATS.get('SpDef')).toBe('spd');
    expect(STATS.get('SAtk')).toBe('spa');
  });

  it('#display', () => {
    expect(STATS.display('foo')).toBe('foo');
    expect(STATS.display('Atk')).toBe('Atk');
    expect(STATS.display('Spc')).toBe('SpA');
    expect(STATS.display('SpDef')).toBe('SpD');
    expect(STATS.display('SAtk', 8, true)).toBe('Special Attack');
    expect(STATS.display('SAtk', 1, true)).toBe('Special');
  });

  it('#getHPDV', () => {
    expect(STATS.getHPDV({spa: STATS.toIV(15), spe: STATS.toIV(15)})).toBe(15);
    expect(
      STATS.getHPDV({
        atk: STATS.toIV(5),
        def: STATS.toIV(15),
        spa: STATS.toIV(13),
        spe: STATS.toIV(13),
      })
    ).toBe(15);
    expect(STATS.getHPDV({def: STATS.toIV(3), spa: STATS.toIV(11), spe: STATS.toIV(10)}))
      .toBe(13);
  });

  it('iterate', () => {
    expect(Array.from(STATS)).toStrictEqual(['hp', 'atk', 'def', 'spe', 'spa', 'spd']);
  });
});

