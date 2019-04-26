import * as pkmn from '@pkmn.cc/data';

import {PokemonStatistics, stats, url} from '../statistics';

import * as raw from './fixture.json';

describe('Statistics', () => {
  test('url', () => {
    expect(url('2018-12', 'gen7ou', false))
        .toBe('https://www.smogon.com/stats/2018-12/chaos/gen7ou-0.json');
    expect(url('2018-11', 'gen7ou'))
        .toBe('https://www.smogon.com/stats/2018-11/chaos/gen7ou-1825.json');
    expect(url('2018-12', 'gen7ru', true))
        .toBe('https://www.smogon.com/stats/2018-12/chaos/gen7ru-1760.json');
    expect(url('2018-12', 'gen1ou'))
        .toBe('https://www.smogon.com/stats/2018-12/chaos/gen1ou-1760.json');
  });

  test('stats', () => {
    const ps: PokemonStatistics = stats(raw, ['Tyranitar'])['Tyranitar'];
    expect(ps.moves[0].name).toBe('Rock Slide');
  });
});
