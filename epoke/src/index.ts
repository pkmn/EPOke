import {BoostsTable, ID, StatsTable, StatusName, TypeName} from '@pkmn/data';

export type Slot = 1 | 2 | 3 | 4 | 5 | 6;
export interface Battle extends Gen1.Battle {}
export interface Side extends Gen1.Side {}
export interface Pokemon extends Gen1.Pokemon {}
export interface MoveSlot extends Gen1.MoveSlot {}

export namespace Gen1 {
  export interface Battle {
    sides: Iterable<Side>;
    turn: number;
    lastDamage: number;
    prng: readonly number[];
  }

  export interface Side {
    active: Pokemon | undefined;
    pokemon: Iterable<Pokemon>;
    lastUsedMove: ID | undefined;
    lastSelectedMove: ID | undefined;
    lastSelectedIndex: 1 | 2 | 3 | 4 | undefined;
  }

  export interface Pokemon {
    species: ID;
    types: readonly [TypeName, TypeName];
    level: number;
    hp: number;
    status: StatusName | undefined;
    statusData: {sleep: number; self: boolean; toxic: number};
    stats: StatsTable;
    boosts: BoostsTable;
    moves: Iterable<MoveSlot>;
    volatiles: Volatiles;
    stored: {
      species: ID;
      types: readonly [TypeName, TypeName];
      stats: StatsTable;
      moves: Iterable<Omit<MoveSlot, 'disabled'>>;
    };
    position: Slot;
  }

  export interface MoveSlot {
    id: ID;
    pp: number;
    disabled?: number;
  }

  export interface Volatiles {
    bide?: {duration: number; damage: number};
    thrashing?: {duration: number; accuracy: number};
    multihit?: unknown;
    flinch?: unknown;
    charging?: unknown;
    trapping?: {duration: number};
    invulnerable?: unknown;
    confusion?: {duration: number};
    mist?: unknown;
    focusenergy?: unknown;
    substitute?: {hp: number};
    recharging?: unknown;
    rage?: {accuracy: number};
    leechseed?: unknown;
    lightscreen?: unknown;
    reflect?: unknown;
    transform?: {player: 'p1' | 'p2'; slot: number};
  }
}
