import {ID, As, GameType, Move, MoveCategory, TypeName, GenderName} from '@pkmn/data';

export namespace State {
  export type Ref<T> = string & As<T>;

  export interface Battle {
    debugMode: boolean;
    strictChoices: boolean;
    formatData: {id: ID};
    gameType: GameType;
    prngSeed: [number, number, number, number];
    rated: boolean | string;
    reportExactHP: boolean;
    reportPercentages: boolean;
    supportCancel: boolean;
    faintQueue: [];
    inputLog: string[];
    messageLog: string[];
    sentLogPos: number;
    sentEnd: boolean;
    requestState: 'teampreview' | 'move' | 'switch' | '';
    turn: number;
    midTurn: boolean;
    started: boolean;
    ended: boolean;
    effect: Ref<'Effect'>;
    effectData: {id: ID};
    event: {id: ID};
    events: null;
    eventDepth: number;
    activeMove: null;
    activePokemon: null;
    activeTarget: null;
    lastMove: ActiveMove | null;
    lastMoveLine: number;
    lastSuccessfulMoveThisTurn: ID | null;
    lastDamage: number;
    abilityOrder: number;
    field: Field;
    sides: [Side, Side] | [Side, Side, Side, Side];
    prng: [number, number, number, number];
    hints: string[];
    log: string[];
    queue: Action[];
    formatid: ID;
    winner?: string;
  }

  export interface Field {
    weather: ID;
    weatherData: ConditionState;
    terrain: ID;
    terrainData: ConditionState;
    pseudoWeather: {
      [id: string]: ConditionState & {
        source: Ref<'Pokemon'> | null;
        multiplier?: number;
      };
    };
  }

  export interface ConditionState {
    id: ID;
    source: Ref<'Pokemon'> | null;
    sourcePosition: number;
    duration?: number;
    target?: Ref<'Pokemon'>;
  }

  export interface ActiveMove extends Partial<Move> {
    hit: number;
    move: Ref<'Move'>;
    baseMove?: string;
    num: number;
    weather?: ID;
    moveHitData?: MoveHitData;
    ability?: Ref<'Ability'>;
    aerilateBoosted?: boolean;
    allies?: Pokemon[];
    auraBooster?: Pokemon;
    causedCrashDamage?: boolean;
    forceStatus?: ID;
    galvanizeBoosted?: boolean;
    hasAuraBreak?: boolean;
    hasBounced?: boolean;
    hasSheerForce?: boolean;
    isExternal?: boolean;
    lastHit?: boolean;
    magnitude?: number;
    negateSecondary?: boolean;
    normalizeBoosted?: boolean;
    pixilateBoosted?: boolean;
    pranksterBoosted?: boolean;
    refrigerateBoosted?: boolean;
    selfDropped?: boolean;
    spreadHit?: boolean;
    stab?: number;
    statusRoll?: string;
    totalDamage?: number | false;
    willChangeForme?: boolean;
    infiltrates?: boolean;
    isZOrMaxPowered?: boolean;
  }

  export interface MoveHitData {
    [targetSlotid: string]: {
      crit: boolean;
      typeMod: number;
      zBrokeProtect: boolean;
    };
  }

  export type Action = MoveAction | SwitchAction | TeamAction;

  export interface MoveAction {
    choice: 'move' | 'beforeTurnMove';
    order: 3 | 5 | 200 | 201 | 199;
    priority: number;
    fractionalPriority: number;
    speed: number;
    pokemon: Ref<'Pokemon'>;
    targetLoc: number;
    originalTarget: Ref<'Pokemon'>;
    moveid: ID;
    move: ActiveMove;
    mega: boolean | 'done';
    zmove?: string;
    maxMove?: string;
    sourceEffect?: Ref<'Effect'> | null;
  }

  export interface SwitchAction {
    choice: 'switch' | 'instaswitch';
    order: 3 | 103;
    priority: number;
    speed: number;
    pokemon: Ref<'Pokemon'>;
    target: Ref<'Pokemon'>;
    sourceEffect: Ref<'Effect'> | null;
  }

  export interface TeamAction {
    choice: 'team';
    priority: number;
    speed: 1;
    pokemon: Ref<'Pokemon'>;
    index: number;
  }

  // interface FieldAction {
  //   choice: 'start' | 'residual' | 'pass' | 'beforeTurn';
  //   priority: number;
  //   speed: 1;
  //   pokemon: null;
  // }

  // interface PokemonAction {
  //   choice:
  //     'megaEvo' | 'shift' | 'runPrimal' | 'runSwitch' | 'event' | 'runUnnerve' | 'runDynamax';
  //   priority: number;
  //   speed: number;
  //   pokemon: Ref<'Pokemon'>;
  //   dragger?: Ref<'Pokemon'>;
  //   event?: string;
  // }

  export interface Side {
    id: ID;
    n: number;
    name: string;
    avatar: string;
    maxTeamSize: number;
    foe: Ref<'Side'>;
    active: Array<Ref<'Pokemon'> | null>;
    pokemonLeft: number;
    faintedLastTurn: Ref<'Pokemon'> | null;
    faintedThisTurn: Ref<'Pokemon'> | null;
    zMoveUsed: boolean;
    sideConditions: {[id: string]: SideConditionState};
    slotConditions: {[id: string]: SlotConditionState}[];
    pokemon: Pokemon[];
    team: string;
    choice: Choice;
    activeRequest: null;
    lastMove: ActiveMove | null;
  }

  export interface SideConditionState extends ConditionState {
    layers?: number;
    positions?: boolean[];
    sources?: Ref<'Pokemon'>[];
  }

  export interface SlotConditionState extends ConditionState {
    move?: ID;
    moveData?: {
      id: ID;
      name: string;
      accuracy: number;
      basePower: number;
      category: MoveCategory;
      priority: number;
      flags: Move['flags'];
      effectType: 'Move';
      isFutureMove: true;
      type: TypeName;
    };
    hp?: number;
  }

  export interface ChosenAction {
    choice: 'move' | 'switch' | 'instaswitch' | 'team' | 'shift' | 'pass';
    pokemon?: Pokemon;
    targetLoc?: number;
    moveid: string;
    move?: ActiveMove;
    target?: Ref<'Pokemon'>;
    index?: number;
    side?: Ref<'Side'>;
    mega?: boolean | null;
    zmove?: string;
    maxMove?: string;
    priority?: number;
  }

  export interface Choice {
    cantUndo: boolean;
    error: string;
    actions: ChosenAction[];
    forcedSwitchesLeft: number;
    forcedPassesLeft: number;
    switchIns: number[];
    zMove: boolean;
    mega: boolean;
    ultra: boolean;
    dynamax: boolean;
  }

  export interface Pokemon {
    gender?: GenderName;
  }
}
