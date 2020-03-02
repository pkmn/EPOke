import {Dex, ID, StatsTable, Generation, Gender, TeamValidator, PokemonSet, Species} from 'ps';
import {Pool} from '../src/pool';
import {Random} from '../src/random';
import {Stats, StatsRange} from '../src/stats';
import {DisplayStatistics, DisplayUsageStatistics} from '@smogon/stats'; // TODO smogon, once moved

export class SpreadPossibilities {
  private readonly base: StatsTable;
  private readonly gen: Generation;
  private readonly random: Random;
  private readonly level: number;

  private _statsRange: StatsRange;
  private stats: Pool<StatsTable>;
  private cloned: boolean;
  private dirty: boolean;

  static create(
    stats: {[stats: string]: number},
    base: StatsTable,
    level: number,
    gen: Generation,
    random: Random
  ) {
    const statsRange = StatsRange.fromBase(base, gen, level);
    const pool = Pool.create<StatsTable>();
    for (const s in stats) {
      const stats = Stats.fromString(s);
      if (statsRange.includes(stats)) {
        pool.push({val: stats, weight: stats[s]});
      }
    }
    return new SpreadPossibilities(base, gen, random, level, statsRange, pool, false, false);
  }

  private constructor(
    base: StatsTable,
    gen: Generation,
    random: Random,
    level: number,
    statsRange: StatsRange,
    stats: Pool<StatsTable>,
    dirty: boolean,
    cloned: boolean,
  ) {
    this.base = base;
    this.gen = gen;
    this.random = random;
    this.level = level;
    this._statsRange = statsRange;
    this.stats = stats;
    this.dirty = dirty;
    this.cloned = cloned;
  }

  unsafeClone() {
    return new SpreadPossibilities(
      this.base,
      this.gen,
      this.random,
      this.level,
      new StatsRange(this._statsRange),
      this.stats, // cloned lazily
      this.dirty,
      true
    );
  }

  get statsRange() {
    return this._statsRange;
  }

  set statsRange(statsRange: StatsRange) {
    // PRECONDITION: this._statsRange.includes(statsRange);
    this._statsRange = statsRange;
    this.dirty = true;
  }

  select(stochastic = false) {
    if (this.cloned) {
      this.stats = this.stats.clone();
      this.cloned = false;
    }
    if (this.dirty) {
      this.stats.prune((stat: StatsTable) => !this._statsRange.includes(stats));
      this.dirty = false;
    }
    const stats = select(this.stats, this.random, stochastic);
    if (!stats) {
      // TODO
    }
    return Stats.toSpread(stats, this.base, this.gen, this.level);
  }
}

export class SetPossibilities {
  readonly species: Species;

  gender?: Gender;

  private _level: number;

  private _spreadPool: SpreadPossibilities;
  private _abilityPool: Pool<string>;
  private _itemPool: Pool<string>;
  private _movePool: Pool<string>;

  private readonly _moves: string[];

  private dirty: boolean;
  private cloned: {spread?: boolean, ability?: boolean, item?: boolean, moves?: boolean };

  private readonly stats: DisplayUsageStatistics;
  private readonly dex: Dex;
  private readonly random: Random;

  static create(
    speciesName: string,
    stats: DisplayUsageStatistics,
    dex: Dex,
    random: Random,
    heuristic = (t: 'ability' | 'item' | 'move', v: string, w: number) => w,
    level?: number,
    gender?: Gender
  ) {
    level = level || dex.format.defaultLevel || dex.format.maxLevel || 100;
    const species = dex.getSpecies(speciesName);

    const spreadPool = SpreadPossibilities.create(stats.stats, species.baseStats, level, dex.gen, random);
    const abilityPool = Pool.create<string>();
    for (const ability in stats.abilities) {
      const weight = heuristic('ability', ability, stats.abilities[ability]);
      if (weight) abilityPool.push({val: ability, weight});
    }
    const itemPool = Pool.create<string>();
    for (const item in stats.items) {
      const weight = heuristic('item', item, stats.items[item]);
      if (weight) itemPool.push({val: item, weight});
    }
    const movePool = Pool.create<string>();
    for (const move in stats.moves) {
      const weight = heuristic('move', move, stats.moves[move]);
      if (weight) movePool.push({val: move, weight});
    }

    return new SetPossibilities(stats, dex, random, species, gender, level, spreadPool, abilityPool, itemPool, movePool, [], false, {});
  }

  private constructor(
    stats: DisplayUsageStatistics,
    dex: Dex,
    random: Random,
    species: Species,
    gender: Gender | undefined,
    level: number,
    spreadPool: SpreadPossibilities,
    abilityPool: Pool<string>,
    itemPool: Pool<string>,
    movePool: Pool<string>,
    moves: string[],
    dirty: boolean,
    cloned: {spread?: boolean, ability?: boolean, item?: boolean, moves?: boolean },
  ) {
    this.stats = stats;
    this.dex = dex;
    this.random = random;
    this.species = species;
    this.gender = gender;
    this._level = level;
    this._spreadPool = spreadPool;
    this._abilityPool = abilityPool;
    this._itemPool = itemPool;
    this._movePool = movePool;
    this._moves = moves;
    this.dirty = dirty;
    this.cloned = cloned;
  }

  // NOTE: lazy cloning is only safe if cloning from an immutable!
  unsafeClone() {
    return new SetPossibilities(
      this.stats,
      this.dex,
      this.random,
      this.species,
      this.gender,
      this.level,
      this._spreadPool.clone(), // cloned lazily
      this._abilityPool, // cloned lazily
      this._itemPool, // cloned lazily
      this._movePool, // cloned lazily
      this._moves.slice(),
      this.dirty,
      {spread: true, ability: true, item: true, moves: true}
    );
  }

  get level() {
    return this._level;
  }

  set level(level: number) {
    this._level = level;
    this.dirty = true;
  }

  get spread() {
    if (this.cloned.spread) {
      this._spreadPool = this._spreadPool.clone();
      this.cloned.spread = false;
    }
    if (this.dirty) {
      this._spreadPool = SpreadPossibilities.create(
        this.stats.stats, this.species.baseStats, this.level, this.dex.gen, this.random);
    }
    return this._spreadPool;
  }

  get abilityPool() {
    if (this.cloned.ability) {
      this._abilityPool = this._abilityPool.clone();
      this.cloned.ability = false;
    }
    return this._abilityPool;
  }

  get itemPool() {
    if (this.cloned.item) {
      this._itemPool = this._itemPool.clone();
      this.cloned.item = false;
    }
    return this._itemPool;
  }

  get movePool() {
    if (this.cloned.moves) {
      this._movePool = this._movePool.clone();
      this.cloned.moves = false;
    }
    return this._movePool;
  }

  get ability() {
    return this._abilityPool.length === 1 ? this._abilityPool.val(0) : undefined;
  }

  set ability(ability: string) {
    this._abilityPool = Pool.create();
    this._abilityPool.push({val: ability, weight: 1});
  }

  get item() {
    return this._itemPool.length === 1 ? this._itemPool.val(0) : undefined;
  }

  set item(item: string) {
    this._itemPool = Pool.create();
    this._itemPool.push({val: item, weight: 1});
  }

  get moves(): readonly string[] {
    return this._moves;
  }

  addMove(move: string) {
    this._moves.push(move);
    this._movePool.remove(move);
  }
}

export class Predictor {
  private readonly dex: Dex;
  private readonly statistics: DisplayStatistics;
  private readonly random: Random;
  private readonly size: number;

  private readonly species: Pool<string>;
  private readonly validator: TeamValidator;

  constructor(dex: Dex, statistics: DisplayStatistics, random: Random, size = 6) {
    this.dex = dex;
    this.statistics = statistics;
    this.random = random;
    this.size = size;

    this.validator = new TeamValidator(dex.format);
    this.species = Pool.create();
  }

  // TODO: problem - don't want to modify possibilites but need to apply heuristics to them = expensive clone of SetPossibilities which clones all fields = lazy clone
  // problem: need some way to LOCK in movein pool

  // PRECONDITION: possibilities has no gaps, though may not be completely filled
  // POSTCONDITION: possibilities is unmodified!
  predictTeam(possibilities: SetPossibilities[], validate = 0, stochastic = false) {
    const seed = this.random.seed;
    let pool: Pool<string> | null = null;

    const team: PokemonSet[] = [];
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
        if (validate-- && !this.validator.validateTeam(team)) {
          team.pop();
          i--;
        }
      }
    }

    return {team, restrictions, seed};
  }

  // POSTCONDITION: SetPossibilities is unmodified!
  predictSet(possibilities: SetPossibilities, stochastic = false) {
    const seed = this.random.seed;
    const species = possibilities.species;
    const spread = possibilities.spread.select();

    // BUG: shiny is required for certain event moves
    const set: PokemonSet = {
      name: species.name,
      species: species.name,
      level: possibilities.level,
      nature: spread.nature?.id!,
      ivs: spread.ivs!,
      evs: spread.evs!,
      gender: '' ,
      ability: possibilities.ability || '',
      item: possibilities.item || '',
      moves: possibilities.moves.slice(),
    };

    if (!set.ability) {
      const abilityPool = this.applyAbilityHeuristics(set, possibilities.abilityPool.clone());
      set.ability = select(abilityPool, this.random, stochastic) || '';
    }

    const itemPool = this.applyItemHeuristics(set, possibilities.itemPool.clone());
    set.item = select(itemPool, this.random, stochastic) || '';

    if (set.moves.length < 4) {
      const movePool = this.applyMoveHeuristics(set, possibilities.movePool.clone());
      let last = '';
      while (set.moves.length < 4) {
        if (last) this.applyMoveMoveHeuristics(last, movePool);
        const move = select(movePool, this.random, stochastic) || '';
        if (!move) break;
        set.moves.push(move);
        last = move;
      }
    }

    const unhappy = set.moves.includes('frustration' as ID) && !set.moves.includes('return' as ID);
    set.happiness = unhappy ? 0 : 255;

    this.optimizeSpread(set);

    return {set, seed};
  }

  // FIXME: may actually have knowns - moves and spreadPool/abilityPool/itemPool if size === 1!!!!

  applyAbilityHeuristics(set: PokemonSet, pool: Pool<string>) {
    // TODO apply Ability | Bias heuristics!
    return pool;
  }

  applyItemHeuristics(set: PokemonSet, pool: Pool<string>) {
    // TODO apply Item | Bias heuristics
    // TODO apply Item | Ability heuristics
    return pool;
  }

  applyMoveHeuristics(set: PokemonSet, pool: Pool<string>) {
    // TODO apply Move | Bias heuristics
    // TODO apply Move | Ability heuristics
    // TODO apply Move | Item heuristics
    return pool;
  }

  applyMoveMoveHeuristics(move: string, pool: Pool<string>) {
    // TODO apply Move | Move heuristics!
  }

  optimizeSpread(set: PokemonSet) {
    // TODO: optimize EVs and fill in any missing
  }
}

function select<T extends {}>(p: Pool<T>, random: Random, stochastic = false) {
  return p.val(stochastic ? sample(p.weights(), random) : 0);
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

  // TODO consider type weaknesses/resistance?


  // interface Restrictions {
  //   mega?: boolean;
  //   zitem?: boolean;
  //   moves?: Set<ID>;
  // }

  // const RESTRICTED_MOVES = [ 'stealthrock', 'toxicspikes', 'spikes' ];


 // const restrict = Object.extend({}, restrictions);
    // const update = (set: PokemonSet) => {
    //   if (isMega(set)) restrict.mega = true;
    //   if (isZ(set)) restrict.zitems = true;
    //   for (const move of set.moves) {
    //     if (RESTRICTED_MOVES.includes(move) && restricted.moves && !restricted.moves.includes(move)) {
    //       restrict.moves = restrictions.moves || [];
    //       restrict.moves.push(move);
    //     }
    //   }
    //   return set;
    // };

    // let removedMega = false;
    // const maybeRemoveMegas = (n: number) => {
    //   if (removedMega || !restrict.mega) return;
    //   for (const mega of this.megas) {
    //     if (pool.size <= n) break;
    //     pool!.remove(mega);
    //   }
    //   removedMega = true;
    // };
