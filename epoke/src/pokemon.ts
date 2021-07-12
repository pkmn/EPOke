import * as client from '@pkmn/client';
import {NatureName, StatsTable, PokemonSet, ID, HPTypeName, Move, MoveName} from '@pkmn/data';
import {DetailedPokemon, EffectName} from '@pkmn/protocol';
import {Spread, Stats} from '@pkmn/spreads';

import {Side} from './side';
import {State} from './state';

export class Pokemon extends client.Pokemon {
  readonly side!: Side;

  readonly override: {
    item?: ID;
    ability?: ID;
    moves?: ID[];
    nature?: NatureName;
    evs?: StatsTable;
    ivs?: StatsTable;
    hpType?: HPTypeName;
  };

  spread?: Spread;

  constructor(side: Side, details: DetailedPokemon, set?: PokemonSet) {
    super(side, details, set);
    this.override = {};
    this.spread = undefined;
  }

  get ability() {
    if (this.override.ability) return this.override.ability;
    if (this.computed.ability) return this.computed.ability;
    return '' as const; // TODO
  }

  get item() {
    if (this.override.item) return this.override.item;
    if (this.computed.item) return this.computed.item;
    return '' as const; // TODO
  }

  set stats(stats: StatsTable | undefined) {
    this.computed.stats = stats;
    if (!stats) return;
    this.spread = Stats.toSpread(stats, this.species.baseStats, this.side.battle.gen, this.level);
  }

  get nature(): NatureName | undefined {
    if (this.override.nature) return this.override.nature;
    if (this.set) return this.computed.nature;
    if (this.spread) return this.spread.nature;
    return undefined; // TODO
  }

  get evs(): StatsTable {
    if (this.override.evs) return this.override.evs;
    if (this.set) return this.set.evs;
    if (this.spread) return this.spread.evs as StatsTable;
    return null! as StatsTable; // TODO
  }

  get ivs() {
    if (this.override.evs) return this.override.ivs;
    if (this.set) return this.set.ivs;
    if (this.spread) return this.spread.ivs as StatsTable;
    return null! as StatsTable; // TODO
  }

  get hpType() {
    if (this.override.hpType) return this.override.hpType;
    if (this.set) return this.computed.hpType;
    return undefined; // TODO
  }

  get moves() {
    // TODO
    return super.moves;
  }

  useMove(
    move: Partial<Move> & client.NA,
    target: Pokemon | null,
    from?: EffectName | MoveName
  ) {
    super.useMove(move, target, from);
    if (this.movesUsedWhileActive.length > 1) {
      // TODO Choice / Gorilla Tactics negative constraint
    }
    const m = this.side.battle.gen.moves.get(move.id);
    if (!m) return;
    if (m.category === 'Status') {
      // TODO Assault Vest negative constraint
    }
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
