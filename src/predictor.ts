import { Dex, TeamValidator } from 'ps';
import { DisplayStatistics, DisplayUsageStatistics } from '@smogon/stats'; // -> smogon

import { Pool } from './pool';
import { Random } from './random';

interface Heuristics {
  // NOT Species | Species
  update(set: PokemonSet) ;
  // Species | Species
  species(...species: string[]) => (k: string, v: number) => number; 
  spread(set: Partial<PokemonSet>): (s: StatsTable, v: number) => number; 
  ability(set: Partial<PokemonSet>): (k: string, v: number) => number 
  item(set: Partial<PokemonSet>) => (k: string, v: number) => number; 
  // NOT Move | Move
  moves(set: Partial<PokemonSet>) => (k: string, v: number) => number; 
  // Move | Move
  move(...move: string[]) => (k: string, v: number) => number; 
}

const AFN = (k: any, v: number) => v; 
const AHEURISTIC: Heuristics = {
  update: () => {},
  species: species => (k, v) => (species.includes(k) ? -1 : v),
  spread: () => AFN,
  ability: () => AFN,
  item: () => AFN,
  moves: () => AFN,
  move: moves => (k, v) => (moves.includes(k) ? -1 : v),
};

export class Predictor {
  private readonly dex: Dex;
  private readonly statistics: DisplayStatistics;

  private readonly species: Pool<string>;
  private readonly validator: TeamValidator;

  constructor(dex: Dex, statistics: DisplayStatistics) {
    this.dex = dex;
    this.statistics = statistics;

    this.validator = new TeamValidator(dex.format);
    this.species = Pool.create<string>(
      statistics.pokemon,
      (k, v) => isAllowed(k, dex.format) ? [k, v.usage.weighted] : [k, -1]
    );
  }

  // PRECONDITION: possibilities has no gaps
  // POSTCONDITION: possibilities and its elements are unmodified
  predictTeam(possibilities: SetPossibilities[], random?: Random, validate = 0) {
    const H = AHEURISTIC; // TODO: real heuristics

    let species = this.species;

    let last: PokemonSet | null = null;
    const team: PokemonSet[] = [];
    while (this.team.length < 6) {
      let set: PokemonSet;
      if (possibilities[this.team.length]) {
        set = this.predictSet(possibilities[i], random, H);
      } else {
        const fn = H.species(last ? last : ...team.map(s => s.species));
        const s = species.select(fn, random);
        species = s[1];
        const p = SetPossibilities.create(this.dex, s[0])
        const set = this.predictSet(p, random, H);
        last = set;
      }
      if (validate-- > 0 && !this.validate(team, set)) {
        last = null;
        continue;
      }
      team.push(set);
      if (this.team.length < size) H.update(set);
    }

    return team;
  }

  // POSTCONDITION: possibilities is unmodified
  predictSet(p: SetPossibilities, random?: Random, H: Heuristics) {
    const set: Partial<PokemonSet> = {
      species: p.species,
      level: p.level,
      gender: possibilties.gender || '' ,
      ability: p.ability || '',
      item: p.item || '',
      moves: p.moves.locked.slice(),
    };
    const spread = p.spread.select(H.spread(set), random)[0];
    set.nature: spread.nature?.id!;
    set.ivs: spread.ivs!;
    set.evs: spread.evs!;

    if (!set.ability) set.ability = p.abilities.select(H.ability(set), random)[0] || '';
    if (!set.item) set.item = p.items.select(H.item(set), random)[0] || '';

    while (set.moves.length < 4) {
      const fn = last ?  H.species(last) : combine(H.moves(set), H.move(...set.moves));
      const m = p.moves.select(fn, random);
      moves = m[1];
      const move = m[0]
      last = move;
      set.moves.push(move);
    }

    const unhappy = set.moves.includes('Frustration') && !set.moves.includes('Return');
    set.happiness = unhappy ? 0 : 255;

    optimizeSpread(set);

    return set as PokemonSet;
  }


  // TODO: Ideally we want to only validate the team as a whole + only the newest set
  private validate(team: PokemonSet[], set: PokemonSet) {
    // TODO: ignore min length validation!
    const invalid = this.validator.validateTeam(team);
    if (!invalid) return true;
	  // Correct invalidations where set is required to be shiny due to an event
	  if (invalid.length === 1 && invalid[0].includes('must be shiny')) {
      const name = invalid[0].match(/(.*) must be shiny/)![1];
      for (const set in team) {
        if (set.name === name) {
          set.shiny = true;
          break;
        }
      }
      // TODO: can we get away with not revalidating the set here?
      return !this.validator.validateSet(set, {});
    }
    return false;
  }
}
