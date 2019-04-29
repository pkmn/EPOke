import * as pkmn from '@pkmn.cc/data';

export interface Analysis {

}

const GENS = ['rb', 'gs', 'rs', 'dp', 'bw', 'xy', 'sm'];

export const Analyses = new class {
  readonly URL = 'https://www.smogon.com/dex/';

  url(species: string|pkmn.Species, gen: pkmn.Generation) {
    const pokemon = typeof species === 'string' ?
        pkmn.Species.get(species, gen) :
        species;
    if (!pokemon) return undefined;
    return `${Analyses.URL}${GENS[gen]}/pokemon/${pokemon.id}/`;
  }

  parse(raw: string) {
    const match = raw.match(/dexSettings = ({.*})/);
    if (!match) return undefined;
    return match[1];
  }

  forTier(analysis: any, tier: pkmn.Tier) {
    return analysis;
  }
};