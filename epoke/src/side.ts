import * as client from '@pkmn/client';
import {PokemonSet} from '@pkmn/data';
import {DetailedPokemon} from '@pkmn/protocol';

import {Battle} from './battle';
import {Pokemon} from './pokemon';
import {State} from './state';

const POKEMON = (s: Side, d: DetailedPokemon, p?: PokemonSet) => new Pokemon(s, d, p);

export class Side extends client.Side {
  readonly battle!: Battle;
  foe!: Side;

  active!: Array<Pokemon | null>;
  lastPokemon!: Pokemon | null;
  team!: Pokemon[];

  wisher!: Pokemon | null;

  constructor(battle: Battle, n: 0 | 1 | 2 | 3, sets?: PokemonSet[]) {
    super(battle, n, sets, POKEMON as any);
  }

  toRef() {
    return `[Side:${this.id}]` as State.Ref<'Side'>;
  }

  toJSON(): State.Side {
    return this.instantiate();
  }

  instantiate(): State.Side {
    return {
      id: this.id,
      n: this.n,
      name: this.name,
      avatar: this.avatar,
      maxTeamSize: 0, // TODO
      foe: this.foe.toRef(),
      active: this.active.map(a => a ? a.toRef() : a),
      pokemonLeft: 0, // TODO
      faintedLastTurn: null, // TODO
      faintedThisTurn: null, // TODO
      zMoveUsed: false, // TODO,
      sideConditions: {} as {[id: string]: State.SideConditionState},
      slotConditions: {} as {[id: string]: State.SideConditionState}[],
      pokemon: this.team.map(p => p.instantiate()),
      team: 'abcdef', // TODO
      choice: {} as unknown as State.Choice, // TODO
      activeRequest: null,
      lastMove: null, // TODO
    };
  }
}
