import { Dex, TeamValidator, PokemonSet, StatsTable, Generation, toID } from 'ps';
import { DisplayStatistics, DisplayUsageStatistics } from '@smogon/stats'; // -> smogon

import { Pools, Pool } from './pool';
import { SetPossibilities } from './possibilities';
import { Random } from './random';

interface Heuristics {
  // NOT Species | Species
  update(set: PokemonSet): void;
  // Species | Species
  species(...species: string[]): (k: string, v: number) => number;
  spread(set: Partial<PokemonSet>): (s: StatsTable, v: number) => number;
  ability(set: Partial<PokemonSet>): (k: string, v: number) => number
  item(set: Partial<PokemonSet>): (k: string, v: number) => number;
  // NOT Move | Move
  moves(set: Partial<PokemonSet>): (k: string, v: number) => number;
  // Move | Move
  move(...move: string[]): (k: string, v: number) => number;
}

const FN = (_: any, v: number) => v;
const AHEURISTIC: Heuristics = {
  update: () => {},
  species: species => (k, v) => (species.includes(k) ? -1 : v),
  spread: () => FN,
  ability: () => FN,
  item: () => FN,
  moves: () => FN,
  move: moves => (k, v) => (moves.includes(k) ? -1 : v),
};

export class Predictor {
  private readonly dex: Dex;
  private readonly statistics: DisplayStatistics;

  private readonly species: Pool<string>;
  private readonly speciesHas: Record<string, Record<string, boolean>>;
  private readonly validator: TeamValidator;

  constructor(dex: Dex, statistics: DisplayStatistics) {
    this.dex = dex;
    this.statistics = statistics;

    this.validator = new TeamValidator(dex);
    this.speciesHas = {};
    this.species = Pools.create<string, DisplayUsageStatistics>(
      statistics.pokemon,
      // We wants to ensure the species hasn't been banned since
      // the last time that usage statistics were published
      (k, v) => {
        const [invalid, speciesHas] = this.validator.checkSpecies(k);
        if (invalid) return [k, -1];
        this.speciesHas[k] = speciesHas;
        return [k, v.usage.weighted];
      });
  }

  // PRECONDITION: possibilities has no gaps
  // POSTCONDITION: possibilities and its elements are unmodified
  predictTeam(possibilities: SetPossibilities[], random?: Random, validate = 0) {
    const H = AHEURISTIC; // TODO: real heuristics

    let species = this.species;

    let last: PokemonSet | boolean = true;
    const team: PokemonSet[] = [];
    while (team.length < 6) {
      let set: PokemonSet;
      if (possibilities[team.length]) {
        set = this.predictSet(possibilities[team.length], random, H);
      } else {
        // We apply heuristics for all of the the fixed teammates at the
        // same time (and only if we need to fill in any non-fixed members),
        // otherwise we apply heuristics if we added a teammate the last
        // time around
        const fn = last === true ?
          H.species(...team.map(s => s.species)) :
          last ? H.species(last.species) : FN;
        const s = species.select(fn, random);
        species = s[1];
        const stats = this.statistics.pokemon[s[0]!];
        // We pass in ephemeral = true as an optimization because this object will
        // never receive updates and we don't care about it getting trampled
        const p = SetPossibilities.create(this.dex, stats, s[0]!, undefined, undefined, true);
        set = this.predictSet(p, random, H);
        last = set;
      }
      // Validate if requested - we clear last if invalid to ensure we don't
      // apply additional heuristics given we didn't add a new teammate
      if (validate-- > 0 && !this.validate(team)) {
        last = false;
        continue;
      }
      team.push(set);
      // Update heuristics unless we're already done building
      if (team.length < 6) H.update(set);
    }

    return team;
  }

  // POSTCONDITION: possibilities is unmodified
  predictSet(p: SetPossibilities, random?: Random, H: Heuristics = AHEURISTIC) {
    const set: Partial<PokemonSet> & {moves: string[]} = {
      species: p.species.name,
      name: p.species.name,
      level: p.level,
      gender: p.gender || '' ,
      ability: p.ability || '',
      item: p.item || '',
      moves: p.moves.locked.slice(),
    };
    const spread = p.spreads.select(H.spread(set), random)[0];
    set.nature = spread.nature.id;
    set.ivs = spread.ivs;
    set.evs = spread.evs;

    if (!set.ability) set.ability = p.abilities.select(H.ability(set), random)[0] || '';
    if (!set.item) set.item = p.items.select(H.item(set), random)[0] || '';

    let moves = p.moves;
    let last: string | null = null;
    while (set.moves.length < 4) {
      // The first time through we want to apply both the heuristics to moves based on
      // the set as well as the individual Move | Move contributions for any locked moves
      const fn = last ? H.species(last) : combine(H.moves(set), H.move(...set.moves));
      const m = moves.select(fn, random);
      moves = m[1];
      const move = m[0];
      // Something like Ditto isn't going to have a full move pool, so this is possible
      if (!move) break;
      last = move;
      set.moves.push(move);
    }

    const unhappy = set.moves.includes('Frustration') && !set.moves.includes('Return');
    set.happiness = unhappy ? 0 : 255;
    return optimizeSpread(set as PokemonSet);
  }

  // TODO: take a PokemonSet<ID> to remove toID calls?
  private validate(team: PokemonSet[]) {
    const set = team[team.length - 1];

    const skipSets: Record<string, Record<string, boolean>> = {};
    for (const s of team) {
      const setHas = Object.assign({}, this.speciesHas[s.species]);
      setHas[`ability:${toID(s.item)}`] = true;
      setHas[`item:${toID(s.item)}`] = true;
      for (const move of s.moves) {
        setHas[`move:${toID(move)}`] = true;
      }
      skipSets[s.name] = setHas;
    }

    // We optimize by only looking at the high level details and validating the latest set below
    let invalid = this.validator.validateTeam(team, skipSets);
    if (!invalid) return true;

    // Ignore min length validations - we'll eventually have 6
    invalid = invalid.filter(s => !s.startsWith('You must bring at least'));
    if (!invalid) return true;

    // BUG: validateSet should really be checking to see if the format has an override with
    // `(format.validateSet || validator.validateSet).call(validator, set)` but its
    // pretty much only niche Other Metagames that use format.validateSet so we don't care
    invalid = this.validator.validateSet(set);
    if (!invalid) return true;

    // Correct invalidations where set is required to be shiny due to an event.
	  if (invalid.length === 1 && invalid[0].includes('must be shiny')) {
      set.shiny = true;
      // TODO: can we get away with not revalidating the set here?
      return !this.validator.validateSet(set);
    }
    return false;
  }
}

function combine<T>(a: (k: T, v: number) => number, b: (k: T, v: number) => number) {
  return (k: T, v: number) => {
    v = a(k, v);
    return v <= 0 ? v : b(k, v);
  }
}

function optimizeSpread(set: PokemonSet, gen: Generation = 8) {
   // TODO in Gen 8 we can Mint to change the nature, before
   // then we can check if there are any events for the mon?
  return set;
}