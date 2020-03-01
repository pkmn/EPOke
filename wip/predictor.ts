// Backfilling:
// - Spread = should use PS teambuilder algorithm or similar to optimize for something which fits in Range
// - Ability =
// possible to run out abilities if stats only has one common and alternative never selected, but could be somehow erroneously
// ruled out thanks to Bias heuristic! Just give up
// - items = can run out if limited items in stats, can go off global item stats or just not carry item
// - moves = can iterate through entire move pool or return less than 4 moves

interface SetPossibilities {
  species: ID;

  spread: SpreadPossibilties;
  ability: Pool<ID>;
  item: Pool<ID>;
  moves?: Pool<ID>;

  level?: number;
  gender?: Gender;
}

class SpreadPossibilities {
  private readonly base: StatsTable;
  private readonly gen: Generation;
  private readonly random: Random;
  private readonly level: number;

  private _statsRange: StatsRange;
  private spreads: Pool<Spread>;
  private dirty: boolean;

  constructor(
    spreads: {[spread: string]: number},
    base: StatsTable,
    level: number,
    gen: Generation,
    random: Random
  ) {
    this.base = base;
    this.level = level;

    this.gen = gen;
    this.random = random;

    this._statsRange = StatsRange.fromBase(base, gen, level);

    this.spreads = new Pool();
    for (const s in spreads) {
      const spread = Spreads.fromString(s);
      const stats = Spreads.toStats(base, gen, level);
      if (this._statsRange.includes(stats)) {
        this.spreads.push({val: spread, weight: spreads[s]});
      }
    }

    this.dirty = false;
  }

  get statsRange() {
    return this.statsRange;
  }

  set statsRange(statsRange: StatsRange) {
    // PRECONDITION: this._statsRange.includes(statsRange);
    this._statsRange = statsRange;
    this.dirty = true;
  }

  select(stochastic = false) {
    if (this.dirty) {
      this.spreads.prune((spread: spread) => {
        const stats = Spreads.toStats(this.base, this.gen, this.level);
        return !this._statsRange.includes(stats);
      });

      this.dirty = false;
    }

    return select(this.spreads, this.random, stochastic);
  }
}

interface SetPossibilities {
  species: ID;

  spread: SpreadPossibilties;
  ability: Pool<ID>;
  item: Pool<ID>;
  moves?: Pool<ID>;

  level?: number; // must be in sync with spread.level!
  gender?: Gender;
}

interface Restrictions {
  mega?: boolean;
  zitem?: boolean;
  moves?: Set<ID>;
}

const RESTRICTED_MOVES = [ 'stealthrock', 'toxicspikes', 'spikes' ];

// NOTE: lifetime = multiple battles!
export class Predictor {
  private readonly format: ID;
  private readonly random: Random;
  private readonly size: number;

  private readonly data: Data;
  private readonly statistics: any;
  private readonly species: Pool<ID>;
  private readonly validator: TeamValidator;

  // Cache of all the Megas and Z-Move items allowable in the format
  private readonly megas: ID[];
  private readonly zitems: Set<ID>;

  constructor(format: ID, random: Random, size = 6) {
    this.format = format;
    this.random = random;
    this.size = size;
    this.validator = new TeamValidator(this.format, {failFast: true, lenient: true});

    this.statistics = Statistics.get(format);
    this.species = new Pool();
    this.megas = new Set();
    for (const [mon, weight] of this.statistics) {
      if (!isValid(mon, format)) continue;
      if (isMega(mon)) megas.add(mon);
      this.species.push({val: mon, weight});
    }
    this.zitems = new Set();
    for (const [item] in this.data.items) {
      if (isZ(item)) this.zitems.add(item);
    }
  }

  // TODO consider type weaknesses/resistance?

  // PRECONDITION: possibilities has no gaps, though may not be completely filled
  // POSTCONDITION: possibilities is unmodified!
  predictTeam(possibilities: SetPossibilities[], restrictions: Restrictions = {}, validate = true, stochastic = false) {
    const seed = this.random.seed;
    let pool: Pool<ID> | null = null:

    const restrict = Object.extend({}, restrictions);
    const update = (set: PokemonSet) => {
      if (isMega(set)) restrict.mega = true;
      if (isZ(set)) restrict.zitems = true;
      for (const move of set.moves) {
        if (RESTRICTED_MOVES.includes(move) && restricted.moves && !restricted.moves.includes(move)) {
          restrict.moves = restrictions.moves || [];
          restrict.moves.push(move);
        }
      }
      return set;
    };

    let removedMega = false;
    const maybeRemoveMegas = (n: number) => {
      if (removedMega || !restrict.mega) return;
      for (const mega of this.megas) {
        if (pool.size <= n) break;
        pool!.remove(mega);
      }
      removedMega = true;
    };

    const team: PokemonSet = [];
    for (let i = 0; i < this.size; i++) {
      if (possibilities[i]) {
        const mon = possibilities[i];
        const {set} = predictSet(mon, stochastic);
        if (!set) continue;
        team.push(update(set));
      } else {
        if (!pool) {
          pool = this.species.clone();
          for (const mon of team) {
            pool.remove(mon.species);
            // TODO get teammate heuristic for mon.species AND apply to species poool
          }
          maybeRemoveMegas(this.size - i);
        }
        const species = select(pool, this.random, stochastic);
        if (!species) break;

        const mon = createSetPossibilities(species, restrictions);
        const {set} = predictSet(mon, stochastic);
        if (i !== this.size - 1) {
          pool.remove(species);
          update(set);
          maybeRemoveMegas(this.size - i);
          // TODO get teammate heuristic for species AND apply to species pool for next iteration
        }

        team.push(set);
        // Throw away entire Pokemon for on aspect, terminate loop with a team of < 6 if run out of species
        // TODO: want just team validation part, assume each indivdual mon is already fine on its own!
        if (validate && !this.validator.validateTeam(team)) {
          team.pop();
          i--;
        }
      }
    }

    return {team, restrictions, seed};
  }

  createSetPossibilities(speciesid: ID, restrictions: Set<Restriction>, level?: number, gender?: Gender) {
    const stats = this.stats.get(speciesid);
    const species = Data.getSpecies(speciesid);

    const level = level || this.format.defaultLevel || this.format.maxLevel || 100;
    const spread = new SpreadPossibilities(stats.spreads, species.baseStats, level, this.format.gen, this.random);
    const ability = new Pool<ID>();
    for (const [ability, weight] of stats.abilities) {
      ability.push({val: ability, weight});
    }
    const item = new Pool<ID>();
    for (const [item, weight] of stats.items) {
      if (restrictions.has('zmove') && this.zitems.has(item)) continue;
      item.push({val: item, weight});
    }
    const moves= new Pool<ID>();
    for (const [move, weight] of stats.moves) {
      if (restrictions.has(move)) continue;
      moves.push({val: move, weight});
    }

    return { species: speciesid, spread, ability, item, moves, level, gender };
  }

  // POSTCONDITION: SetPossibilities is unmodified!
  predictSet(possibilities: SetPossibilities, validate = true, stochastic = false) {
    const seed = this.random.seed;
    const species = possibilities.species;
    const spread = possibilities.spread.select() || {nature: undefined, ivs: undefined, evs: undefined};

    const set: PokemonSet<ID> = {
      name: species,
      species,
      level: possibilities.level,
      nature: spread.nature?.id!,
      ivs: spread.ivs!,
      evs: spread.evs!,
      gender: '',
      ability: '';
      item: '',
      moves: [],
      // BUG: shiny is required for certain event moves
    };

    // TODO apply Ability | Bias heuristics!

    do {
      set.ability = select(possibilities.ability, this.random, stochastic) || '';
    } while (set.ability && validate && !this.validator.validateSet(set));


    // TODO apply Item | Bias heuristics
    // TODO apply Item | Ability heuristics

    do {
      set.item = select(possibilities.item, this.random, stochastic) || '';
    } while (set.item && validate && !this.validator.validateSet(set));


    // TODO apply Move | Bias heuristics
    // TODO apply Move | Ability heuristics
    // TODO apply Move | Item heuristics

    const moves = possibilities.moves.clone();
    do {
      const last = set.moves[set.moves.length - 1];
      if (last) {
        // TODO apply Move | Move heuristics!
      }
      const move = select(moves, this.random, stochastic) || '';
      if (!move) break;
      set.moves.push(move);
    } while (validate && !this.validator.validateSet(set));

    set.happiness = set.moves.includes('frustration' as ID) && !set.moves.includes('return' as ID) ? 0 : 255;
    return {set, seed};
  }
}

function select<T extends {}>(p: Pool<T>, random: Random, stochastic = false) {
  return p.val(stochastic ? sample(p.weights()) : 0);
}

// Vose's alias method: http://www.keithschwarz.com/darts-dice-coins/
// PRECONDITION: probabilities.length > 0 AND sum(probabilities) == 1
function sample(probabilities: number[], random: Random) {
  if (probabilities.length <= 1) return 0;

  const alias: number[] = new Array(probabilities.length);
  const probability: number[] = new Array(probabilities.length);
  const average = 1.0 / probabilities.length;

  const small: number[] = [];
  const large: number[] = [];
  for (const [i, p] of probabilities.entries()) {
    (p >= average ? large : small).push(i);
  }

  // In the mathematical specification of the algorithm, we will always exhaust
  // the small worklist before the large worklist. However, due to floating point
  // inaccuracies, this is not necessarily true. Consequently, this inner loop
  // (which tries to pair small and large elements) will have to check that both
  // worklists aren't empty.
  while (small.length && large.length) {
    const less = small.pop()!;
    const more = large.pop()!;

    // Scale the probabilities up such that 1/n is given weight 1.0
    probability[less] *= probabilities.length;
    alias[less] = more;
    probabilities[more] += probabilities[less] - average;

    (probabilities[more] >= 1.0 / probabilities.length ? large : small).push(more);
  }

  // At this point, everything is in one worklist, which means the remaining
  // probabilities should all be 1/n. Due to numerical issues, we can't be sure
  // which stack will hold the entries, so we empty both.
  while (small.length) probability[small.pop()!] = 1;
  while (large.length) probability[large.pop()!] = 1;

  // At this point, our data structure has been built and we can actually
  // select the an index.
  const column = random.next(probability.length);
  const coinToss = random.next() < probability[column];
  return coinToss ? column : alias[column];
}

// TODO: should be per format, and both teammate AND move heuristics
//
// Symmetric matrix of (move1, move2) => P(move1 | move2). Because move1 and move2
// are interchangeable we only store the upper half of the matrix, requiring
// N(N+1)/2 space instead of N*N.
//
//     0 1 2 3
//       4 5 6
//         7 8
//           9
//
const BIGRAMS: number[] = [];

function lookup(matrix: number[], row: number, col: number, N: number) {
  if (row <= col) return row * N - ((row - 1) * (row - 1 + 1)) / 2 + col - row;
  return col * N - ((col - 1) * (col - 1 + 1)) / 2 + row - col;
}
