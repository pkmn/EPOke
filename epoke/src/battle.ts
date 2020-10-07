import * as client from '@pkmn/client';
import {Generations, PokemonSet, ID} from '@pkmn/data';
import {Protocol} from '@pkmn/protocol';

import {Field} from './field';
import {Side} from './side';
import {State} from './state';

const FIELD = (b: Battle) => new Field(b);
const SIDE = (b: Battle, n: 0 | 1 | 2 | 3, s?: PokemonSet[]) => new Side(b, n, s);

export class Battle extends client.Battle {
  readonly field!: Field;
  readonly p1!: Side;
  readonly p2!: Side;
  readonly sides!: [Side, Side];

  constructor(
    gens: Generations,
    player?: ID,
    sets?: PokemonSet[] | [PokemonSet[] | undefined, PokemonSet[] | undefined],
  ) {
    super(gens, player, sets, FIELD as any, SIDE as any);
  }

  toRef() {
    return '[Battle]' as State.Ref<'Battle'>;
  }

  toJSON(): State.Battle {
    return this.instantiate();
  }

  instantiate(): State.Battle {
    const formatid = '' as const; // TODO
    return {
      debugMode: false,
      strictChoices: false,
      formatData: {id: formatid},
      gameType: this.gameType, // TODO
      prngSeed: [1, 2, 3, 4], // TODO
      rated: this.rated,
      reportExactHP: false,
      reportPercentages: true,
      supportCancel: true,
      faintQueue: [],
      inputLog: [] as string[], // TODO
      messageLog: [] as string[],
      sentLogPos: 0, // TODO
      sentEnd: false, // TODO
      turn: this.turn,
      requestState: toRequestState(this.request?.requestType),
      midTurn: false, // TODO
      started: true, // TODO
      ended: false, // TODO
      effect: '[Effect:TODO]' as State.Ref<'Effect'>, // TODO
      effectData: {id: '' as const}, // TODO
      event: {id: '' as const}, // TODO
      events: null,
      eventDepth: 0, // TODO
      activeMove: null,
      activePokemon: null,
      activeTarget: null,
      lastMove: null, // TODO
      lastMoveLine: 0, // TODO
      lastSuccessfulMoveThisTurn: null, // TODO
      lastDamage: 0, // TODO
      abilityOrder: 0, // TODO
      field: this.field.instantiate(), // TODO
      sides: this.sides.map(s => s.instantiate()) as State.Battle['sides'], // TODO
      prng: [1, 2, 3, 4], // TODO
      hints: [] as string[], // TODO
      log: [] as string[], // TODO
      queue: [] as State.Action[], // TODO
      formatid,
      winner: undefined, // TODO
    }; // TODO
  }
}

function toRequestState(type: Protocol.Request['requestType'] | undefined) {
  switch (type) {
  case 'team': return 'teampreview';
  case 'wait': return '';
  case 'switch': return 'switch';
  case 'move': return 'move';
  default: return 'move'; // TODO
  }
}
