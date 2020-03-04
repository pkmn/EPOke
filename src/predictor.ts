import { Dex, TeamValidator } from 'ps';
import { DisplayStatistics, DisplayUsageStatistics } from '@smogon/stats'; // -> smogon

import { Pool } from './pool';
import { Random } from './random';

interface Heuristics {
  update(set: PokemonSet);
  species() => 

  spread(set: Partial<PokemonSet>): (s: StatsTable, v: number) => number; 
  ability(set: Partial<PokemonSet>): (k: string, v: number) => number 
  item(set: Partial<PokemonSet>) => (k: string, v: number) => number; 
  moves(set: Partial<PokemonSet>) => (k: string, v: number) => number; 
  move(...move: string[]) => (k: string, v: number) => number; 
}

const AFN = (k: any, v: number) => v; 
const AHEURISTIC: Heuristics = {
  species: species => (k, v) => (species.includes(k) ? -1 : v);
  spread: () => AFN,
  ability: () => AFN,
  item: () => AFN,
  moves: () => AFN,
  move: moves => (k, v) => (moves.includes(k) ? -1 : v);
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
  // POSTCONDITION: possibilities is unmodified
  predictTeam(possibilities: SetPossibilities[], random?: Random, validate = 0, size = 6) {
    let species = this.species;
    let i = 0;

    const team: PokemonSet[] = [];
    while (this.team.length < size) {
      if (possibilities[i]) {
        const p = possiblities[i];
        const set = this.predictSet(p, random);
        if (validate-- > 0 && !this.validate(team, set)) continue;
        team.push(set);
        heuristics.update(set);
        i++;
      } else {
        const s = species.select(first ? AHEURISTIC.species(...team.map(s => s.species)) : AFN, random);
        species = s[1];
        first = false;
        const p = SetPossibilites.create(this.dex, s[0])
        const set = this.predictSet(p, random, true);
        if (validate-- > 0 && !this.validate(team, set)) continue;
        team.push(set);
        if (this.team.length < size) heuristics.update(set);
      }
    }

    return team;
  }

  // POSTCONDITION: possibilities is unmodified iff clobber = false
  predictSet(p: SetPossibilities, random?: Random, heuristics: Heuristics, clobber = false;) {
    const set: Partial<PokemonSet> = {
      species: p.species,
      level: p.level,
      gender: possibilties.gender || '' ,
      ability: p.ability || '',
      item: p.item || '',
      moves: p.moves.locked.slice(),
    };
    const spread = p.spread.select(AHEURISTIC.spread(set), random)[0];
    set.nature: spread.nature?.id!;
    set.ivs: spread.ivs!;
    set.evs: spread.evs!;

    if (!set.ability) set.ability = p.abilities.select(AHEURISTIC.ability(set), random)[0] || '';
    if (!set.item) set.item = p.items.select(AHEURISTIC.item(set), random)[0] || '';
    if (set.moves.length < 4) {
      // TODO clibber fix
      let moves = trample ? p.moves : p.moves.clone();
      moves.update(AHEURISTIC.moves(set));
      while (set.moves.length < 4) {
        const m = p.moves.select(AHEURISTIC, random);
        const move = m[1]
        moves = m[2];
        set.moves.push(move);
        p.moves.update(AHEURISTIC.move(move));
      }
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
