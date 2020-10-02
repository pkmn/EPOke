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
    // yet, instead we simply track the stat which benefits most from being a negative Nature as
    // that is what will get assigned the negative Nature if that's an option.
    //
    // We also need to track the total positive EVs - if this is greater than 510 EVs in ADV+ we
    // know that a Nature is required, which we can assign to the non-HP stat which would benefit
    // most from the postive nature (the stat where the difference in EVs required from a boosting
    // vs. neutral Nature is greatest - this isn't the same as the stat which requires the most EVs
    // for a neutral Nature because differences in base stats can influence which stat will benefit
    // most from a particular Nature). The non-HP stat which benefits the most from a negative
    // Nature is also tracked - this might not be the same as minus as if no stats require negative
    // EVs, minus will still be 'hp' but min will be the stat which if sees the largest benefit in
    // terms of EVs required from having a negative Nature.
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
        const other = stat === 'spe' ? 'atk' : 'spe';
        const nature = ev < 0
          ? getNatureFromPlusMinus(other, stat)
          : getNatureFromPlusMinus(stat, other);
        const diff = ev - statToEV(g, stat, stats[stat], base[stat], ivs[stat], level, nature);
        if (ev > 252) {
          if (plus !== 'hp' || g < 3) return undefined;
          plus = stat;
        } else if (ev < 0) {
          if (minus === 'hp' || evs[minus] > diff) minus = stat;
        }
        evs[stat] = diff;
        if (max === undefined || evs[max] < diff) max = stat;
        if (min === undefined || evs[min] > diff) min = stat;
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
      const ev = statToEV(gen, 'hp', stats.hp, base.hp, ivs.hp, level, nature);
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
  return new Spread(nature?.name, ivs, evs);
}

// Return the minimum number of EVs required to hit a particular val. NOTE: This method will return
// illegal EVs (up to slop more or less than would normally be allowed) as the magnitude of EVs that
// would theoretically be required is important for the design of the algorithm.
export function statToEV(
  gen: GenerationNum,
  stat: StatName,
  val: number,
  base: number,
  iv: number,
  level: number,
  nature?: Nature,
) {
  if (gen < 3) iv = STATS.toDV(iv) * 2;
  if (stat === 'hp') {
    // val = ⌊((2 * base + iv + ⌊ev/4⌋) * level) / 100⌋ + level + 10
    // val - level - 10 = ⌊((2 * base + iv + ⌊ev/4⌋) * level) / 100⌋
    // ⌈((val - level - 10) * 100) / level⌉ = 2 * base + iv + ⌊ev/4⌋
    // ⌈((val - level - 10) * 100) / level⌉ - 2 * base - iv = ⌊ev/4⌋
    // (⌈((val - level - 10) * 100) / level⌉ - 2 * base - iv) * 4 = ev
    return base === 1 ? 0 : (Math.ceil(((val - level - 10) * 100) / level) - 2 * base - iv) * 4;
  } else {
    // val = ⌊(⌊((2 * base + iv + ⌊ev/4⌋) * level) / 100⌋ + 5) * nature⌋
    // ⌈(val / nature)⌉ - 5 = ⌊((2 * base + iv + ⌊ev/4⌋) * level) / 100⌋
    // ⌈(⌈(val / nature)⌉ - 5) * 100) / level⌉ = (2 * base + iv + ⌊ev/4⌋
    // ⌈(⌈(val / nature)⌉ - 5) * 100) / level⌉ - 2 * base - iv = ⌊ev/4⌋
    // (⌈(⌈(val / nature)⌉ - 5) * 100) / level⌉ - 2 * base - iv) * 4 = ev
    const n = !nature ? 1 : nature.plus === stat ? 1.1 : nature.minus === stat ? 0.9 : 1;
    return (Math.ceil(((Math.ceil(val / n) - 5) * 100) / level) - 2 * base - iv) * 4;
  }
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
  let iv = 0;
  if (stat === 'hp') {
    if (base === 1) return 31;
    // val = ⌊((2 * base + iv + ⌊ev/4⌋) * level) / 100⌋ + level + 10
    // val - level - 10 = ⌊((2 * base + iv + ⌊ev/4⌋) * level) / 100⌋
    // ⌈((val - level - 10) * 100) / level⌉ = 2 * base + iv + ⌊ev/4⌋
    // ⌈((val - level - 10) * 100) / level⌉ - 2 * base - ⌊ev/4⌋ = iv
    iv = Math.ceil(((val - level - 10) * 100) / level) - 2 * base;
  } else {
    // val = ⌊(⌊((2 * base + iv + ⌊ev/4⌋) * level) / 100⌋ + 5) * nature⌋
    // ⌈(val / nature)⌉ - 5 = ⌊((2 * base + iv + ⌊ev/4⌋) * level) / 100⌋
    // ⌈(⌈(val / nature)⌉ - 5) * 100) / level⌉ = 2 * base + iv + ⌊ev/4⌋
    // ⌈(⌈(val / nature)⌉ - 5) * 100) / level⌉ - 2 * base - ⌊ev/4⌋ = iv
    const n = !nature ? 1 : nature.plus === stat ? 1.1 : nature.minus === stat ? 0.9 : 1;
    iv = Math.ceil(((Math.ceil(val / n) - 5) * 100) / level) - 2 * base;
  }
  if (iv < 0 || iv > 31) return undefined;
  // We've found an IV that will work, but we want the highest IV that still works. Technically we
  // could use binary search here but the equation should have gotten us pretty close already and
  // its probably not worth it.
  // TODO: can we find a closed form for max-IV instead of min-IV to remove the need to search?
  for (; iv < 31; iv++) {
    if (STATS.calc(gen, stat, base, iv + 1, 0, level, nature) > val) return iv;
  }

  return iv;
}
