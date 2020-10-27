import {StatsTable, StatName, GenerationNum} from '@pkmn/types';

import {StatsDisplayOptions, displayStats, getNatureFromPlusMinus} from './common';
import {NATURES, STATS, GEN, Generation, Nature} from './data';
import {Spread} from './spread';
import {StatsRange} from './stats-range';

const IV_EVS = 31 * 4;

export class Stats implements StatsTable {
  hp: number;
  atk: number;
  def: number;
  spa: number;
  spd: number;
  spe: number;

  constructor(stats: StatsTable) {
    this.hp = stats.hp;
    this.atk = stats.atk;
    this.def = stats.def;
    this.spa = stats.spa;
    this.spd = stats.spd;
    this.spe = stats.spe;
  }

  equals(other: Partial<StatsTable>) {
    return Stats.equals(this, other);
  }

  toString() {
    return Stats.display(this);
  }

  toRange() {
    return Stats.toRange(this);
  }

  toSpread(base: StatsTable, gen?: Generation, level = 100) {
    return Stats.toSpread(this, base, gen, level);
  }

  static equals(a: Partial<StatsTable>, b: Partial<StatsTable>) {
    if (a === b) return true;
    if (Object.keys(a).length !== Object.keys(b).length) return false;
    for (const stat of STATS) {
      if (a[stat] !== b[stat]) return false;
    }
    return true;
  }

  static display(stats: StatsTable, options?: StatsDisplayOptions): string;
  static display(stats: StatsTable, gen: Generation, options?: StatsDisplayOptions): string;
  static display(
    stats: StatsTable,
    gen?: Generation | StatsDisplayOptions,
    options?: StatsDisplayOptions
  ) {
    return displayStats(s => `${stats[s]}`, gen, options);
  }

  static fromString(s: string) {
    const range = StatsRange.fromString(s);
    if (!range) return undefined;
    return range.toStats();
  }

  static toRange(stats: StatsTable) {
    return new StatsRange(stats, stats);
  }

  static toSpread(stats: StatsTable, base: StatsTable, gen?: Generation, level = 100) {
    const g = GEN(gen);

    let plus: StatName = 'hp';
    let minus: StatName = 'hp';

    const ivs: StatsTable = {hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31};
    // NOTE: In this method, for stats other than HP evs actually tracks the differences between the
    // expected theoretical neutral EVs and those required with an optimal Nature.
    const evs: StatsTable = {hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0};

    // We start by assuming a neutral Nature and perfect IVs and determine how many EVs are required
    // for each stat. If more than 252 EVs are required for HP we can return as HP cannot be boosted
    // by a beneficial Nature and thus can never be greater than perfect IVs and 252 EVs. On the
    // flip side, if we require less than 0 HP EVs we can immediately attempt to figure out how
    // many IVs are actually required, as there are no other variables that can effect HP. After
    // this loop, we know the exact HP IVs and EVs (minus rounding up / expected HP DV values).
    //
    // If more than 252 EVs are required for a non-HP stat, we know that stat must have a boosting
    // Nature, which we track with plus. However, if Nature does not exist (before ADV) or if
    // another stat requires more than 252 EVs already we can return immediately. If less than 0 EVs
    // are required the story is a little different because it could be either than the stat
    // requires a negative Nature *or* less than perfect IVs *or* both - we only know that a
    // negative Nature is required if less than -IV_EVS (-124) are required, as this represents
    // 0 IVs and 0 EVs and there no way to go lower.
    //
    // Sadly, other than in cases where a positive or negative Nature is required to hit a
    // particular stat number, the Nature selection can be almost anything as certain stat values
    // will only ever be possible via some obscure combination of Nature + IV + EV. However, we can
    // still try to optimize our search by determining which stats benefit the most from particular
    // Natures (the stat where the difference in EVs required from a boosting/unboosting vs. neutral
    // Nature is greatest - this isn't the same as the stat which requires the most/least EVs for a
    // neutral Nature because differences in base stats can influence which stat will benefit most
    // from a particular Nature) and trying out Natures which will conserve the most EVs first.

    // We track the total number of positive EVs because if we find we need more than 510 in ADV+
    // we don't need to bother checking to see if a neutral Nature can work
    let positive = 0;
    for (const stat of STATS) {
      // SpD doesn't exist in RBY
      if (g === 1 && stat === 'spd') continue;
      const ev = statToEV(g, stat, stats[stat], base[stat], 31, level, undefined, true);
      if (ev > 0) positive += ev;

      // This computation could be moved down into finishSpread but we'd like to fail-fast and
      // terminate as early as possible given that searching through Natures is expensive
      if (stat === 'hp') {
        if (ev > 252) return undefined;
        if (ev < 0) {
          const iv = statToIV(g, stat, stats[stat], base[stat], 0, level);
          const trade = tradeIVsForEVs(g, stat, stats[stat], base[stat], iv, 0, level);
          if (!trade) return undefined;

          evs.hp = trade.ev;
          ivs.hp = trade.iv;
        } else {
          evs.hp = ev;
        }
      } else if (g < 3) {
        // These numbers are impossible to hit without a Nature and thus we can simply give up
        if (ev < -IV_EVS || ev > 252) return undefined;
      } else {
        if (ev > 252) {
          if (plus !== 'hp') return undefined;
          plus = stat;
        } else if (ev < -IV_EVS) {
          if (minus !== 'hp') return undefined;
          minus = stat;
        }
        // Find the Nature that is optimal for conserving EVs
        const other = stat === 'spe' ? 'atk' : 'spe';
        const nature = ev < 0
          ? getNatureFromPlusMinus(other, stat)
          : getNatureFromPlusMinus(stat, other);
        evs[stat] = ev - statToEV(g, stat, stats[stat], base[stat], 31, level, nature, true);
      }
    }

    const finish = (nature?: Nature) => finishSpread(g, stats, base, level, nature, ivs, evs);
    // Pre-ADV can't have Natures and should have already aborted if a plus or minus were required
    if (g < 3) return finish(undefined);

    if (plus === 'hp') {
      if (minus === 'hp') {
        // There's not really much we can do here other than iterate through all of the Natures.
        // We can skip the neutral nature if we require > 510 positive EVs as there's no way to
        // manage that without some sort of boost somewhere, and we can also choose to iterate
        // through the Natures so that the optimal natures and ones most likely to be relevant are
        // handled first, but ultimately we may need to check all of them in order to ensure every
        // edge case is addressed.
        for (const nature of getNatures(evs, positive <= 510)) {
          const spread = finish(nature);
          if (spread) return spread;
        }
      } else {
        // We need a negative Nature for minus but don't require a positive one for plus, so we
        // iterate through the minus nerfing natures in an order which favors Natures that are
        // beneficial to the stats which require the most EVs.
        for (const nature of getNegativeNatures(minus, evs)) {
          const spread = finish(nature);
          if (spread) return spread;
        }
      }
    } else {
      if (minus === 'hp') {
        // We need a positive Nature for plus but don't require a negative one for minus, so we
        // iterate through the plus boosting natures in an order which favors Natures that are
        // detrimental to the stats which require the least EVs.
        for (const nature of getPositiveNatures(plus, evs)) {
          const spread = finish(nature);
          if (spread) return spread;
        }
      } else {
        // The happy case where only a specific nature will work due to the constraints
        return finish(getNatureFromPlusMinus(plus, minus));
      }
    }

    return undefined;
  }
}

function finishSpread(
  gen: GenerationNum,
  stats: StatsTable,
  base: StatsTable,
  level: number,
  nature: Nature | undefined,
  ivs: StatsTable,
  evs: StatsTable
) {
  let total = evs.hp;
  for (const stat of STATS) {
    // HP is already computed and SpD doesn't exist in RBY
    if (stat === 'hp' || (gen === 1 && stat === 'spd')) continue;

    const ev = Math.max(0, statToEV(gen, stat, stats[stat], base[stat], 31, level, nature));
    if (ev > 252) return undefined;
    const iv = statToIV(gen, stat, stats[stat], base[stat], ev, level, nature);
    const trade = tradeIVsForEVs(gen, stat, stats[stat], base[stat], iv, ev, level, nature);
    if (!trade) return undefined;

    ivs[stat] = trade.iv;
    total += (evs[stat] = trade.ev);
  }

  if (gen < 3) {
    // SpA is used to store Spc in RBY, make SpD match as well
    if (gen === 1) {
      ivs.spd = ivs.spa;
      evs.spd = evs.spa;
    }

    // The HP DV in RBY/GSC is computed based on the DVs of the other stats - at this point the
    // algorithm will have instead subtracted from EVs before touching the IVs. If the actual
    // HP DV does not match the computed expected DV we will attempt to correct by redoing the
    // HP EVs to compensate.
    const fix = maybeFixHPDV(gen, stats, base, ivs, evs, level);
    // BUG: we should return undefined if we were not able to fix the DV as the spread is invalid
    if (fix) {
      ivs.hp = fix.iv;
      evs.hp = fix.ev;
    }
  } else {
    if (total > 510) return undefined;
  }

  // Because of favoring subtracting from EVs instead of IVs and due to lack of complete set
  // information the spread returned may still not necessarily be 'correct', as information that
  // should be reflected in the IVs will instead show up in the EVs:
  //
  //   - The IVs will are unlikely to reflect the Pokémon's Hidden Power
  //   - The Atk IVs in Gen 2 do not account for gender
  //   - Spreads will often be sub-maximal (< 508 EVs) when in reality it is more likely that EVs
  //     were maxed out and IVs were sub-maximal instead
  //   - The expected HP DV (Gen 1 & 2) may be invalid
  //
  // This results in some edge case display issues, but the returned spread should still result
  // in the same *stats*.
  return new Spread(nature?.name, ivs, evs);
}

const LIMIT = 252;

// Return the minimum number of EVs required to get as close as possible to a particular val.
// NOTE: This method is neither guaranteed to hit a specific val (some values may be impossible
// purely through EVs with the parameters provided) nor is it guaranteed to only return a legal
// amount of EVs (the magnitude of EVs that would theoretically be required is important for the
// design of the higher-level algorithm).
// TODO: can a close form equation (or multiple) be used here instead of binary searches?
export function statToEV(
  gen: GenerationNum,
  stat: StatName,
  val: number,
  base: number,
  iv: number,
  level: number,
  nature?: Nature,
  minimize = false,
) {
  if (stat === 'hp' && base === 1) return 0;

  let m = (252 + LIMIT) / 4;

  // The range is from (-LIMIT, 252 + LIMIT), but we need to shift everything by LIMIT to make
  // it (0, 252 + LIMIT + LIMIT) and add 4 because we want h to start out of bounds. We then
  // divide by 4 to compress the range - we expand it back when we're returning
  const max = (252 + 4 + 2 * LIMIT) / 4;

  let l = 0;
  let h = max;

  // minimum required
  while (l < h) {
    const v = STATS.calc(gen, stat, base, iv, m * 4 - LIMIT, level, nature);
    if (v < val) {
      l = m + 1;
    } else {
      h = m;
    }
    m = Math.trunc((l + h) / 2);
  }

  const a = l * 4 - LIMIT;
  if (!minimize) return a;

  // maximum required
  m = l;
  l = 0;
  h = max;
  while (l < h) {
    const v = STATS.calc(gen, stat, base, iv, m * 4 - LIMIT, level, nature);
    if (v > val) {
      h = m;
    } else {
      l = m + 1;
    }
    m = Math.trunc((l + h) / 2);
  }

  const b = (h - 1) * 4 - LIMIT;

  if (a <= 0 && b >= 0) return 0;
  return a >= 0 ? a : b;
}

// Return the maximum number of IVs required to get as close as possible to a particular val.
// NOTE: This method is neither guaranteed to hit a specific val (some values may be impossible
// purely through IVs with the parameters provided) nor is it guaranteed to only return a legal
// amount of IVs.
// TODO: can a close form equation be used here instead of binary search?
export function statToIV(
  gen: Generation,
  stat: StatName,
  val: number,
  base: number,
  ev: number,
  level: number,
  nature?: Nature
) {
  if (stat === 'hp' && base === 1) return 31;

  let l = 0;
  let m = 30;
  let h = 31 + 1;
  while (l < h) {
    const v = STATS.calc(gen, stat, base, m, ev, level, nature);
    if (v > val) {
      h = m;
    } else {
      l = m + 1;
    }
    m = Math.trunc((l + h) / 2);
  }

  return h - 1;
}

const ASCENDING = (a: [string, number], b: [string, number]) => a[1] - b[1];
const DESCENDING = (a: [string, number], b: [string, number]) => b[1] - a[1];

// The (four) Natures which boost plus, in order of the weights
function getPositiveNatures(plus: StatName, weights: StatsTable | Array<[StatName, number]>) {
  const natures: Nature[] = [];

  const order = Array.isArray(weights)
    ? weights : Object.entries(weights).sort(ASCENDING) as Array<[StatName, number]>;
  for (const [minus] of order) {
    if (minus === 'hp' || minus === plus) continue;
    natures.push(getNatureFromPlusMinus(plus, minus)!);
  }

  return natures;
}

// The (four) Natures which nerf minus, in order of the weights
function getNegativeNatures(minus: StatName, weights: StatsTable | Array<[StatName, number]>) {
  const natures: Nature[] = [];

  const order = Array.isArray(weights)
    ? weights : Object.entries(weights).sort(DESCENDING) as Array<[StatName, number]>;
  for (const [plus] of order) {
    if (plus === 'hp' || plus === minus) continue;
    natures.push(getNatureFromPlusMinus(plus, minus)!);
  }

  return natures;
}

// All Natures in sorted in order of weights, optionally including a neutral Nature to begin with
function getNatures(weights: StatsTable, neutral = true) {
  const natures: Nature[] = neutral ? [NATURES.get('Serious')!] : [];

  const positive = Object.entries(weights).sort(DESCENDING) as Array<[StatName, number]>;
  const negative = Object.entries(weights).sort(ASCENDING) as Array<[StatName, number]>;
  for (const [plus] of positive) {
    if (plus === 'hp') continue;
    for (const nature of getPositiveNatures(plus, negative)) {
      natures.push(nature);
    }
  }

  return natures;
}

// The iv and ev parameters have been computed by statToIV and statToEV respectively to get as
// close as possible to the desired val, but may still not add up exactly. This method verifies the
// result, trading IVs in exchange for EVs to attempt hit the value exactly in the event that they
// don't already.
function tradeIVsForEVs(
  gen: GenerationNum,
  stat: StatName,
  val: number,
  base: number,
  iv: number,
  ev: number,
  level: number,
  nature?: Nature
) {
  for (; iv >= 0 && ev <= 252; iv--, ev += 4) {
    if (STATS.calc(gen, stat, base, iv, ev, level, nature) === val) return {iv, ev};
  }
  return undefined;
}

// The HP DV in RBY/GSC is computed based on the DVs of the other stats - this method attempts to
// correct the HP DV to match its expected value. However, this may not be possible - the other ivs
// that feed into the expected HP DV value may be incorrect, and determining that exact combination
// to end up with the precise HP is intractable (similar to finding the exact combination of
// Hidden Power IVs).
function maybeFixHPDV(
  gen: GenerationNum,
  stats: StatsTable,
  base: StatsTable,
  ivs: StatsTable,
  evs: StatsTable,
  level: number,
) {
  const actual = STATS.toDV(ivs.hp);
  const expected = STATS.getHPDV(ivs);
  if (actual === expected) return {iv: ivs.hp, ev: evs.hp};
  // If the HP DV has already been reduced it means we already have 0 EVs and can't subtract
  if (actual < expected) return undefined;

  const iv = STATS.toIV(expected);
  const ev = statToEV(gen, 'hp', stats.hp, base.hp, iv, level);
  if (ev < 0 || ev > 252) return undefined;
  // We can't trade off anything at this point, the HP IV is fixed to the expected value. Really
  // we would need to try all other sorts of combinations of IVs for the other stats to change our
  // expected HP DV, but that is pretty much intractable.
  if (STATS.calc(gen, 'hp', base.hp, iv, ev, level) !== stats.hp) return undefined;

  return {iv, ev};
}
