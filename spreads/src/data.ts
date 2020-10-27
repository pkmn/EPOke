// This code is cribbed from @pkmn/data and @pkmn/dex: https://github.com/pkmn/ps
import {StatsTable, NatureName, StatName, GenerationNum, ID} from '@pkmn/types';

export function toID(text: any): ID {
  if (text?.id) text = text.id;
  if (typeof text !== 'string' && typeof text !== 'number') return '';
  return ('' + text).toLowerCase().replace(/[^a-z0-9]+/g, '') as ID;
}

export interface Nature {
  name: NatureName;
  plus?: Exclude<StatName, 'hp'>;
  minus?: Exclude<StatName, 'hp'>;
}

// NOTE: We are depending on ES2015 ordering guarantees
const DATA: { [k: string]: Nature } = {
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
    return DATA[toID(name)];
  }

  *[Symbol.iterator]() {
    for (const nature in DATA) {
      yield this.get(nature)!;
    }
  }
};

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
    ev?: number,
    level = 100,
    nature?: Nature
  ) {
    const g = GEN(gen);
    if (ev === undefined) ev = g < 3 ? 252 : 0;
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
