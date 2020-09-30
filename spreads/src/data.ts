
import {StatsTable, NatureName, StatName, GenerationNum, ID} from '@pkmn/types';

export function toID(text: any): ID {
  if (text?.id) text = text.id;
  if (typeof text !== 'string' && typeof text !== 'number') return '';
  return ('' + text).toLowerCase().replace(/[^a-z0-9]+/g, '') as ID;
}

export interface NatureData {
  name: NatureName;
  plus?: Exclude<StatName, 'hp'>;
  minus?: Exclude<StatName, 'hp'>;
}

export interface Nature extends NatureData {
  readonly effectType: 'Nature';
  readonly kind: 'Nature';
  readonly id: ID;
  readonly name: NatureName;
  readonly gen: GenerationNum;
  readonly exists?: boolean;

  cached?: boolean;
}

// NOTE: We are depending on ES2015 ordering guarantees
const DATA: { [k: string]: NatureData } = {
  hardy: {name: 'Hardy'},
  lonely: {name: 'Lonely', plus: 'atk', minus: 'def'},
  adamant: {name: 'Adamant', plus: 'atk', minus: 'spa'},
  naughty: {name: 'Naughty', plus: 'atk', minus: 'spd'},
  brave: {name: 'Brave', plus: 'atk', minus: 'spe'},

  bold: {name: 'Bold', plus: 'def', minus: 'atk'},
  docile: {name: 'Docile'},
  impish: {name: 'Impish', plus: 'def', minus: 'spa'},
  lax: {name: 'Lax', plus: 'def', minus: 'spd'},
  relaxed: {name: 'Relaxed', plus: 'def', minus: 'spe'},

  modest: {name: 'Modest', plus: 'spa', minus: 'atk'},
  mild: {name: 'Mild', plus: 'spa', minus: 'def'},
  bashful: {name: 'Bashful'},
  rash: {name: 'Rash', plus: 'spa', minus: 'spd'},
  quiet: {name: 'Quiet', plus: 'spa', minus: 'spe'},

  calm: {name: 'Calm', plus: 'spd', minus: 'atk'},
  gentle: {name: 'Gentle', plus: 'spd', minus: 'def'},
  careful: {name: 'Careful', plus: 'spd', minus: 'spa'},
  quirky: {name: 'Quirky'},
  sassy: {name: 'Sassy', plus: 'spd', minus: 'spe'},

  timid: {name: 'Timid', plus: 'spe', minus: 'atk'},
  hasty: {name: 'Hasty', plus: 'spe', minus: 'def'},
  jolly: {name: 'Jolly', plus: 'spe', minus: 'spa'},
  naive: {name: 'Naive', plus: 'spe', minus: 'spd'},
  serious: {name: 'Serious'},
};

export type Generation = {num: GenerationNum} | GenerationNum;

export const NATURES = new class {
  get(name: string) {
    const nature = getNature(name);
    return nature.exists ? nature : undefined;
  }

  *[Symbol.iterator]() {
    for (const nature in DATA) {
      const n = this.get(nature);
      if (n) yield n;
    }
  }
};

type Writable<T> = { -readonly [P in keyof T]: T[P] };

function getNature(name?: string | Nature): Nature {
  if (name && typeof name !== 'string') return name;

  name = (name || '').trim();
  const id = toID(name);
  let nature = {} as Writable<Partial<Nature>>;
  if (id && id !== 'constructor' && DATA[id]) {
    nature = DATA[id];
    if (nature.cached) return nature as Nature;
    nature.cached = true;
    nature.exists = true;
  }
  if (!nature.id) nature.id = id;
  if (!nature.name) nature.name = name as NatureName;
  if (!nature.effectType) nature.effectType = 'Nature';
  if (!nature.kind) nature.kind = 'Nature';
  if (!nature.gen) nature.gen = 3;

  return nature as Nature;
}

const STAT_NAMES = ['hp', 'atk', 'def', 'spe', 'spa', 'spd'] as const;

const NAMES: Readonly<{ [name: string]: StatName }> = {
  HP: 'hp', hp: 'hp',
  Attack: 'atk', Atk: 'atk', atk: 'atk',
  Defense: 'def', Def: 'def', def: 'def',
  'Special Attack': 'spa', SpA: 'spa', SAtk: 'spa', SpAtk: 'spa', spa: 'spa',
  Special: 'spa', spc: 'spa', Spc: 'spa',
  'Special Defense': 'spd', SpD: 'spd', SDef: 'spd', SpDef: 'spd', spd: 'spd',
  Speed: 'spe', Spe: 'spe', Spd: 'spe', spe: 'spe',
};

const DISPLAY: Readonly<{ [stat: string]: Readonly<[string, string]> }> = {
  hp: ['HP', 'HP'],
  atk: ['Atk', 'Attack'],
  def: ['Def', 'Defense'],
  spa: ['SpA', 'Special Attack'],
  spd: ['SpD', 'Special Defense'],
  spe: ['Spe', 'Speed'],
  spc: ['Spc', 'Special'],
};

export const GEN = (gen?: Generation) =>
  typeof gen === 'number' ? gen : (gen && 'num' in gen) ? gen.num : 8;

export const STATS = new class {
  calc(
    gen: Generation,
    stat: StatName,
    base: number,
    iv = 31,
    ev = 252,
    level = 100,
    nature?: Nature
  ) {
    if (GEN(gen) < 3) {
      iv = this.toDV(iv) * 2;
      nature = undefined;
    }
    if (stat === 'hp') {
      return base === 1
        ? base
        : Math.floor(((base * 2 + iv + Math.floor(ev / 4)) * level) / 100) + level + 10;
    } else {
      let mod = 1;
      if (nature !== undefined) {
        if (nature.plus === stat) {
          mod = 1.1;
        } else if (nature.minus === stat) {
          mod = 0.9;
        }
      }
      return Math.floor(
        (Math.floor(((base * 2 + iv + Math.floor(ev / 4)) * level) / 100) + 5) * mod
      );
    }
  }

  get(s: string): StatName | undefined {
    return NAMES[s];
  }

  display(str: string, gen?: Generation, full = false): string {
    let s: StatName | 'spc' | undefined = NAMES[str];
    if (s === undefined) return str;
    if (GEN(gen) === 1 && s === 'spa') s = 'spc';
    return DISPLAY[s][+full];
  }

  fill<T>(stats: Partial<StatsTable<T>>, val: T): StatsTable<T> {
    for (const stat of STAT_NAMES) {
      if (!(stat in stats)) stats[stat] = val;
    }
    return stats as StatsTable<T>;
  }

  getHPDV(ivs: Partial<StatsTable>): number {
    return (
      (this.toDV(ivs.atk === undefined ? 31 : ivs.atk) % 2) * 8 +
      (this.toDV(ivs.def === undefined ? 31 : ivs.def) % 2) * 4 +
      (this.toDV(ivs.spe === undefined ? 31 : ivs.spe) % 2) * 2 +
      (this.toDV(ivs.spa === undefined ? 31 : ivs.spa) % 2)
    );
  }

  *[Symbol.iterator](): IterableIterator<StatName> {
    for (const s of STAT_NAMES) {
      yield s;
    }
  }

  toDV(iv: number): number {
    return Math.floor(iv / 2);
  }

  toIV(dv: number): number {
    return dv * 2 + 1;
  }
};
