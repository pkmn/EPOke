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
