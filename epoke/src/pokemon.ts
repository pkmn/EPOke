import * as client from '@pkmn/client';
import {DetailedPokemon} from '@pkmn/protocol';

import {Side} from './side';

export class Pokemon extends client.Pokemon {
  constructor(side: Side, details: DetailedPokemon) {
    super(side, details);
  }
}
