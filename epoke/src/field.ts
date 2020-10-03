import * as client from '@pkmn/client';

import {Battle} from './battle';

export class Field extends client.Field {
  constructor(battle: Battle) {
    super(battle);
  }
}