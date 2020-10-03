import * as client from '@pkmn/client';
import {DetailedPokemon} from '@pkmn/protocol';

import {Battle} from './battle';
import {Pokemon} from './pokemon';

export class Side extends client.Side {
  constructor(
    battle: Battle,
    n: 0 | 1 | 2 | 3,
    provider = (s: Side, d: DetailedPokemon) => new Pokemon(s, d)
  ) {
    super(battle, n, provider);
  }
}
