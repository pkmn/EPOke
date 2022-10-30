import {BoostsTable, ID, StatsTable, StatusName, TypeName} from '@pkmn/data';
import {Range} from '@pkmn/spreads';
import {Slot} from './index';

interface Unknown<T> {
  known?: T;
  override?: T;
  range?: Range<T>;
});

export interface Battle {
  sides: [Side, Side];
  turn: number;
  lastDamage: Unknown<number>;
  prng: readonly Unknown<number>[];
}

export interface Side {
  active: Pokemon | undefined;
  pokemon: Unknown<Pokemon>[];
  lastUsedMove: Unknown<ID | undefined>;
  lastSelectedMove: Unknown<ID | undefined>;
  lastSelectedIndex: Unknown<1 | 2 | 3 | 4 | undefined>;
}

export interface Pokemon {
  species: ID;
  types: readonly [TypeName, TypeName];
  level: number;
  hp: Unknown<number>;
  status: StatusName | undefined;
  statusData: {sleep: Unknown<number>; self: boolean; toxic: number};
  stats: Unknown<StatsTable>;
  boosts: BoostsTable;
  moves: MoveSlot[];
  volatiles: Volatiles;
  stored: {
    species: ID;
    types: readonly [TypeName, TypeName];
    stats: Unknown<StatsTable>;
    moves: Iterable<Omit<MoveSlot, 'disabled'>>;
  };
  position: Slot;
}

export interface MoveSlot {
  id: Unknown<ID>;
  pp: Unknown<number>;
  disabled?: Unknown<number>;
}

export interface Volatiles {
  bide?: {duration: Unknown<number>; damage: Unknown<number>};
  thrashing?: {duration: Unknown<number>; accuracy: Unknown<number>};
  multihit?: boolean;
  flinch?: boolean;
  charging?: boolean;
  trapping?: {duration: Unknown<number>};
  invulnerable?: boolean;
  confusion?: {duration: Unknown<number>};
  mist?: boolean;
  focusenergy?: boolean;
  substitute?: {hp: Unknown<number>};
  recharging?: boolean;
  rage?: {accuracy: Unknown<number>};
  leechseed?: boolean;
  lightscreen?: boolean;
  reflect?: boolean;
  transform?: {player: 'p1' | 'p2'; slot: number};
}

// Doesnt extend or delegate to regular client (which )
// Can't be used zero-copy with dmg

