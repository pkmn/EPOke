import {StatsTable, StatName, GenerationNum} from '@pkmn/types';

import {displayStats, getNatureFromPlusMinus} from './common';
import {NATURES, STATS, GEN, Generation, Nature} from './data';
import {Spread} from './spread';
import {StatsRange} from './stats-range';

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

  toString() {
    return Stats.display(this);
  }

  toRange() {
    return Stats.toRange(this);
  }

  toSpread(base: StatsTable, gen?: Generation, level = 100) {
    return Stats.toSpread(this, base, gen, level);
  }

  static equal(a: Partial<StatsTable>, b: Partial<StatsTable>) {
    if (a === b) return true;
    if (Object.keys(a).length !== Object.keys(b).length) return false;
    for (const stat of STATS) {
      if (a[stat] !== b[stat]) return false;
    }
    return true;
  }

  static display(stats: StatsTable, compact?: boolean, gen?: Generation) {
    return displayStats(s => `${stats[s]}`, compact, gen);
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
    const evs: StatsTable = {hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0};

    // We start by assuming a neutral Nature and perfect IVs and determine how many EVs are required
    // for each stat. If more than 252 EVs are required for HP we can return as HP cannot be boosted
    // by a beneficial Nature and thus can never be greater than perfect IVs and 252 EVs. On the
    // flip side, if we require less than 0 HP EVs we can immediately attempt to figure out how
    // many IVs are actually required, as there are no other variables that can effect HP. After
    // this loop, we know the exact HP IVs and EVs.
    //
    // If more than 252 EVs are required for a non-HP stat, we know that stat must have a boosting
    // Nature, which we track with plus. However, if Nature does not exist (before ADV) or if
    // another stat requires more than 252 EVs already we can return immediately. If less than 0 EVs
    // are required the story is a little different because it could be either than the stat
    // requires a negative Nature *or* less than perfect IVs *or* both - we can't figure this out
    // yet, instead we simply track the *most* negative stat as that is what will require the
    // negative Nature if thats an option.
    //
    // We also need to track the total positive EVs - if this is greater than 510 EVs in ADV+ we
    // know that a Nature is required, which we can assign to the max non-HP stat. The min non-HP
    // stat is also tracked - this might not be the same as minus as if no stats require negative
    // EVs, minus will still be 'hp' but min will be the stat with the least EVs.
    let positive = 0;
    let max: StatName | undefined;
    let min: StatName | undefined;
    for (const stat of STATS) {
      if (g === 1 && stat === 'spd') continue;
      const ev = statToEV(g, stat, stats[stat], base[stat], ivs[stat], level);
      if (ev > 0) positive += ev;

      if (stat === 'hp') {
        if (ev > 252) return undefined;
        if (ev < 0) {
          const iv = findIV(g, stat, stats[stat], base[stat], level);
          if (iv === undefined) return undefined;
          if (STATS.calc(g, stat, base[stat], iv, 0, level) !== stats[stat]) return undefined;
          evs.hp = 0;
          ivs.hp = iv;
        } else {
          evs.hp = ev;
        }
      } else {
        if (ev > 252) {
          if (plus !== 'hp' || g < 3) return undefined;
          plus = stat;
        } else if (ev < 0) {
          if (minus === 'hp' || evs[minus] > ev) minus = stat;
        }
        evs[stat] = ev;
        if (max === undefined || evs[max] < ev) max = stat;
        if (min === undefined || evs[min] > ev) min = stat;
      }
    }

    // If no stat required more than 252 EVs but we still required more than 510 EVs in ADV+,
    // *something* needs to be a boosting Nature to allow for this.
    if (g >= 3 && positive > 510) {
      if (plus !== 'hp' && plus !== max) return undefined;
      plus = max!;
    }

    const finish = (nature?: Nature) => finishSpread(g, stats, base, level, nature, ivs, evs);
    if (plus === 'hp') {
      if (minus === 'hp') {
        return finish(g < 3 ? undefined : NATURES.get('Serious'));
      } else {
        // Even though minus is set we can't be sure that we need a negative Nature, its possible
        // we can still finish the spread simply by reducing the IVs. We first try to make a
        // neutral spread work, if not we fall back and just assume the stat which requires the most
        // EVS is the buffed one.
        const neutral = finish(g < 3 ? undefined : NATURES.get('Serious'));
        return (neutral || g < 3) ? neutral : finish(getNatureFromPlusMinus(max!, minus));
      }
    } else {
      // We know gen >= 3 here because we would have aborted before this if we had required a Nature
      if (minus === 'hp') {
        // We need a positive Nature for plus but don't require a negative one for minus, so we
        // simply need to go with a Nature that is determinental to the stat with the least EVs.
        return finish(getNatureFromPlusMinus(plus, min!));
      } else {
        return finish(getNatureFromPlusMinus(plus, minus));
      }
    }
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
  let total = 0;
  for (const stat of STATS) {
    if (stat === 'hp' || (gen === 1 && stat === 'spd')) continue;

    const ev = statToEV(gen, stat, stats[stat], base[stat], ivs[stat], level, nature);
    if (ev > 252) return undefined;
    if (ev < 0) {
      const iv = findIV(gen, stat, stats[stat], base[stat], level, nature);
      if (iv === undefined) return undefined;
      if (STATS.calc(gen, stat, base[stat], iv, 0, level, nature) !== stats[stat]) return undefined;
      evs[stat] = 0;
      ivs[stat] = iv;
    } else {
      total += ev;
    }
  }

  if (gen < 3) {
    if (gen === 1) {
      evs.spd = evs.spa;
      ivs.spd = ivs.spa;
    }
    // The HP DV in RBY/GSC is computed based on the DVs of the other stats - at this point the
    // algorithm will have instead subtracted from EVs before touching the IVs. If the actual
    // HP DV does not match the computed expected DV we will attempt to correct by redoing the
    // HP EVs to compensate.
    const actual = STATS.toDV(ivs.hp);
    const expected = STATS.getHPDV(ivs);
    // If the HP DV has already been reduced it means we already have 0 EVs and can't subtract
    if (actual < expected) return undefined;
    if (actual > expected) {
      ivs.hp = STATS.toIV(expected);
      const ev = statToEV(gen, 'hp', stats.hp, base.hp, ivs.hp, level);
      if (ev < 0 || ev > 252) return undefined;
      total = total - evs.hp + ev;
      evs.hp = ev;
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
  //
  // This results in some edge case display issues, but the returned spread should still result
  // in the same *stats*.
  return new Spread(nature, ivs, evs);
}

// Assuming a Pokémon can have a stat of up to 255, fully maxed out at level 100 this can be as
// high as 609 with a neutral Nature and 669 with a boosting Nature. This amount to 60 stat points
// which requires 240 EVs, so 252 ensures we have enough room to attempt to cover this case. In
// practice this could likely be trimmed down dramatically for performance reasons.
const SLOP = 252;

// Return the minimum number of EVs required to hit a particular val. NOTE: This method will return
// illegal EVs (up to SLOP more or less than would normally be allowed) as the magnitude of EVs that
// would theoretically be required is important for the design of the algorithm.
export function statToEV(
  gen: GenerationNum,
  stat: StatName,
  val: number,
  base: number,
  iv: number,
  level: number,
  nature?: Nature
) {
  if (stat === 'hp' && base === 1) return 0;

  // TODO: a closed form equation here would be signficantly easier than binary searching...
  let [l, m, u] = [-SLOP, 252 / 2, 252 + SLOP];
  while (l <= u) {
    m = 4 * Math.floor((l + u) / 8);
    const v = STATS.calc(gen, stat, base, iv, m, level, nature);
    if (v < val) {
      l = m + 1;
    } else if (v === val) {
      // We've found an EV that will work, but we want the lowest EV that still works
      let ev = m;
      for (; ev > -SLOP; ev -= 4) {
        if (STATS.calc(gen, stat, base, iv, ev - 4, level, nature) < val) return ev;
      }
      return ev;
    } else {
      u = m - 1;
    }
  }

  // If we arrive here we effectively gave up searching - the value returned is inaccurate but
  // the rest of the algorithm will end up failing elsewhere so its safe to return garbage.
  return m;
}

// Finds the maximum number of IVs such that with 0 EVs the stat comes out to a particular val.
export function findIV(
  gen: GenerationNum,
  stat: StatName,
  val: number,
  base: number,
  level: number,
  nature?: Nature
) {
  if (stat === 'hp' && base === 1) return 31;

  // TODO: a closed form equation here would be signficantly easier than binary searching...
  let [l, m, u] = [0, 15, 31];
  while (l <= u) {
    m = Math.floor((l + u) / 2);
    const v = STATS.calc(gen, stat, base, m, 0, level, nature);
    if (v < val) {
      l = m + 1;
    } else if (v === val) {
      // We've found an IV that will work, but we want the highest IV that still works
      let iv = m;
      for (; iv < 31; iv++) {
        if (STATS.calc(gen, stat, base, iv + 1, 0, level, nature) > val) return iv;
      }
      return iv;
    } else {
      u = m - 1;
    }
  }

  return undefined;
}
