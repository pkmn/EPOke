import * as pkmn from '@pkmn.cc/data';
import {StatsTable} from './stats';

// tslint:disable:no-any
export interface DexSettings {
  injectRpcs: [
    any, // 'dump-gens'
    any, // 'dump-basics'
    [ // 'dump-pokemon'
      string, // key
      {
        strategies: Strategy[],
        [key: string]: any;
      }
    ]];
}
// tslint:enable:no-any

export interface Strategy {
  format: string;
  overview: string;
  comments: string;
  movesets: MoveSet[];
}

export interface MoveSet {
  name: string;
  suffix: string;
  description: string;
  abilities: string[];
  items: string[];
  moveslots: string[][];
  evconfigs: Array<StatsTable<number>>;
  ivconfigs: Array<StatsTable<number>>;
  natures: string[];
}

export interface Analysis {}

const GENS = ['rb', 'gs', 'rs', 'dp', 'bw', 'xy', 'sm'];

export const Analyses = new class {
  readonly URL = 'https://www.smogon.com/dex';

  gen(gen: pkmn.Generation) {
    return GENS[gen - 1];
  }

  url(species: string|pkmn.Species, gen: pkmn.Generation) {
    const pokemon =
        typeof species === 'string' ? pkmn.Species.get(species, gen) : species;
    if (!pokemon) return undefined;
    return `${Analyses.URL}/${Analyses.gen(gen)}/pokemon/${pokemon.id}/`;
  }

  parse(raw: string) {
    const match = raw.match(/dexSettings = ({.*})/);
    if (!match) return undefined;
    return JSON.parse(match[1]) as DexSettings;
  }

  process(ds: DexSettings) {
    const analyses: Map<pkmn.Tier, Strategy[]> = new Map();  // TODO Analysis[]
    for (const strategy of ds['injectRpcs'][2][1]['strategies']) {
      const tier = pkmn.Tiers.fromString(strategy.format);
      if (!tier) continue;
      let strategies = analyses.get(tier);
      if (!strategies) {
        strategies = [];
        analyses.set(tier, strategies);
      }
      strategies.push(strategy);
    }
    return analyses;
  }
};
