import * as client from '@pkmn/client';
import {Dex, ID} from '@pkmn/dex-types';

import {Field} from './field';
import {Side} from './side';

export class Battle extends client.Battle {
  constructor(
    dex: Dex,
    player: ID | null = null,
    field = (b: Battle) => new Field(b),
    side = (b: Battle, n: 0 | 1 | 2 | 3) => new Side(b, n)
  ) {
    super(dex, player, field, side);
  }
}