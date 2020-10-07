import * as client from '@pkmn/client';
import {NatureName, StatsTable, PokemonSet} from '@pkmn/data';
import {DetailedPokemon} from '@pkmn/protocol';

import {Side} from './side';
import {State} from './state';

export class Pokemon extends client.Pokemon {
  readonly side!: Side;

  constructor(side: Side, details: DetailedPokemon, set?: PokemonSet) {
    super(side, details, set);
  }

  get nature(): NatureName | undefined {
    return undefined; // TODO
  }

  get evs() {
    return null! as StatsTable; // TODO
  }

  get ivs() {
    return null! as StatsTable; // TODO
  }

  toRef() {
    return `[Pokemon:${this.ident}]` as State.Ref<'Pokemon'>;
  }

  toJSON(): State.Pokemon {
    return this.instantiate();
  }

  instantiate(): State.Pokemon {
    return null! as State.Pokemon; // TODO
  }
}
