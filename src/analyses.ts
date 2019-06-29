import * as pkmn from '@pkmn.cc/data';
import { StatsTable } from './stats';

// tslint:disable:no-any
export interface DexSettings {
  injectRpcs: [
    any, // 'dump-gens'
    any, // 'dump-basics'
    [
      // 'dump-pokemon'
      string, // key
      {
        strategies: DexStrategy[];
        [key: string]: any;
      }
    ]
  ];
}
// tslint:enable:no-any

export interface DexStrategy {
  format: string;
  overview: string;
  comments: string;
  movesets: DexMoveSet[];
}

export interface DexMoveSet {
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

export interface Analysis {
  overview: string;
  comments: string;
  sets: MoveSet[];
}

export interface MoveSet {
  name: string;
  description: string;
  abilities: pkmn.Ability[];
  items: pkmn.Item[];
  natures: pkmn.Nature[];
  ivs: Array<StatsTable<number>>;
  evs: Array<StatsTable<number>>;
  moves: pkmn.Move[][];
}

const GENS = ['rb', 'gs', 'rs', 'dp', 'bw', 'xy', 'sm'];

export const Analyses = new (class {
  readonly URL = 'https://www.smogon.com/dex';

  gen(gen: pkmn.Generation) {
    return GENS[gen - 1];
  }

  url(species: string | pkmn.Species, gen: pkmn.Generation) {
    const pokemon = typeof species === 'string' ? pkmn.Species.get(species, gen) : species;
    if (!pokemon) return undefined;
    return `${Analyses.URL}/${Analyses.gen(gen)}/pokemon/${pokemon.id}/`;
  }

  parse(raw: string) {
    const match = raw.match(/dexSettings = ({.*})/);
    if (!match) return undefined;
    return JSON.parse(match[1]) as DexSettings;
  }

  process(ds: DexSettings) {
    const analyses: Map<pkmn.Tier, Analysis[]> = new Map();
    for (const strategy of ds['injectRpcs'][2][1]['strategies']) {
      const tier = pkmn.Tiers.fromString(strategy.format);
      if (!tier) continue;
      let a = analyses.get(tier);
      if (!a) {
        a = [];
        analyses.set(tier, a);
      }
      a.push(toAnalysis(strategy));
    }
    return analyses;
  }
})();

function toAnalysis(strategy: DexStrategy) {
  const sets = [];
  for (const set of strategy.movesets) {
    const abilities = set.abilities.map(a => pkmn.Abilities.get(a)!);
    const items = set.items.map(i => pkmn.Items.get(i)!);
    const natures = set.natures.map(n => pkmn.Natures.get(n)!);
    const moves = set.moveslots.map(ms => ms.map(m => pkmn.Moves.get(m)!));

    sets.push({
      name: set.name,
      description: set.description,
      abilities,
      items,
      natures,
      ivs: set.evconfigs,
      evs: set.ivconfigs,
      moves,
    });
  }
  return {
    overview: strategy.overview,
    comments: strategy.comments,
    sets,
  };
}
