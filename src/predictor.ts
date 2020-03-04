import { Dex, TeamValidator, PokemonSet, StatsTable } from 'ps';
import { DisplayStatistics, DisplayUsageStatistics } from '@smogon/stats'; // -> smogon

import { Pools, Pool } from './pool';
import { SetPossibilities } from './possibilities';
import { Random } from './random';
import { format } from 'url';

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

const AFN = (_: any, v: number) => v;
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
    this.species = Pools.create<string, DisplayUsageStatistics>(
      statistics.pokemon,
      (k, v) => isAllowed(k, dex) ? [k, v.usage.weighted] : [k, -1]
    );
  }

  // PRECONDITION: possibilities has no gaps
  // POSTCONDITION: possibilities and its elements are unmodified
  predictTeam(possibilities: SetPossibilities[], random?: Random, validate = 0) {
    const H = AHEURISTIC; // TODO: real heuristics

    let species = this.species;

    let last: PokemonSet | null = null;
    const team: PokemonSet[] = [];
    while (team.length < 6) {
      let set: PokemonSet;
      if (possibilities[team.length]) {
        set = this.predictSet(possibilities[team.length], random, H);
      } else {
        const fn = last ? H.species(last.species) : H.species(...team.map(s => s.species));
        const s = species.select(fn, random);
        species = s[1];
        const stats = this.statistics.pokemon[s[0]!];
        const p = SetPossibilities.create(this.dex, stats, s[0]!, undefined, undefined, true);
        set = this.predictSet(p, random, H);
        last = set;
      }
      if (validate-- > 0 && !this.validate(team)) {
        last = null;
        continue;
      }
      team.push(set);
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
      const fn = last ?  H.species(last) : combine(H.moves(set), H.move(...set.moves));
      const m = moves.select(fn, random);
      moves = m[1];
      const move = m[0]
      if (!move) break;
      last = move;
      set.moves.push(move);
    }

    const unhappy = set.moves.includes('Frustration') && !set.moves.includes('Return');
    set.happiness = unhappy ? 0 : 255;
    return optimizeSpread(set as PokemonSet);
  }

  private validate(team: PokemonSet[]) {
    const set = team[team.length - 1];
    // We optimize by only looking at the high level details and validating the latest set below
    let invalid = this.validator.validateTeam(team, false, true);
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

const HIERARCHY = ['LC', 'LC Uber', 'NFE', 'PU', 'NU', 'NUBL', 'RU', 'RUBL', 'UU', 'UUBL', 'OU', '(Uber)', 'Uber'];
function isAllowed(name: string, dex: Dex) {
  const species = dex.getSpecies(name);
  if (!species ||
    species.isNonstandard ||
    !dex.hasFormatsDataTier(species.id) ||
    !species.tier ||
    species.tier === 'Illegal' ||
    species.tier === 'Unreleased'
  ) {
    return false;
  }

  if (dex.format.endsWith('littlecup')) {
    return species.tier === 'LC';
  }

  const tier = dex.format as typeof HIERARCHY[number]; // TODO FIXME
  return HIERARCHY.indexOf(species.tier) <= HIERARCHY.indexOf(tier);
}

function optimizeSpread(set: PokemonSet) {
  return set; // TODO
}