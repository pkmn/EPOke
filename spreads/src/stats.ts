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
    const ranges = StatsRange.fromString(s);
    if (!ranges) return undefined;
    return ranges.toStats();
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

    let nature: Nature | undefined;
    if (plus === 'hp') {
      if (minus === 'hp') {
        nature = g < 3 ? undefined : NATURES.get('Serious');
      } else {
        // possible to just subtract ivs instead of switching to non-neutral?
        // FIXME be careful about gen 1 / 2

        // TODO we need a negative nature, we do plus = max! for the positive nature.
      }
    } else {
      // We know gen >= 3 here because we would have aborted before this if we had required a Nature
      if (minus === 'hp') {
        // We need a positive Nature for plus but don't require a negative one for minus, so we
        // simply need to go with a Nature that is determinental to the stat with the least EVs.
        nature = getNatureFromPlusMinus(plus, min!);
      } else {
        nature = getNatureFromPlusMinus(plus, minus);
      }
    }

    let total = 0;
    for (const stat of STATS) {
      if (stat === 'hp' || (g === 1 && stat === 'spd')) continue;

      const ev = statToEV(g, stat, stats[stat], base[stat], ivs[stat], level, nature);
      if (ev > 252) return undefined;
      if (ev < 0) {
        const iv = findIV(g, stat, stats[stat], base[stat], level, nature);
        if (iv === undefined) return undefined;
        evs[stat] = 0;
        ivs[stat] = iv;
      } else {
        total += ev;
      }
    }

    if (g < 3) {
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
        const ev = statToEV(g, 'hp', stats.hp, base.hp, ivs.hp, level);
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
}

const rud = (a: number, b: number) => Math.trunc(a / b) + (a % b === 0 ? 0 : 1);

function statToEV(
  gen: GenerationNum,
  stat: StatName,
  val: number,
  base: number,
  iv: number,
  level: number,
  nature?: Nature
) {
  let ev;
  if (stat === 'hp') {
    ev = base === 1 ? 0 : Math.max(0, (rud((val - level - 10) * 100, level) - 2 * base - iv) * 4);
  } else {
    const n = !nature ? 1 : nature.plus === stat ? 1.1 : nature.minus === stat ? 0.9 : 1;
    ev = Math.max(0, (rud((rud(val, n) - 5) * 100, level) - 2 * base - iv) * 4);
  }
  // TODO: can we actually compute the EV without needing to search?
  for (; ev > 0; ev -= 4) {
    if (STATS.calc(gen, stat, base, iv, ev - 4, level, nature) !== val) break;
  }
  return ev;
}

function findIV(
  gen: GenerationNum,
  stat: StatName,
  val: number,
  base: number,
  level: number,
  nature?: Nature
) {
  // TODO: use an equation instead of a loop?
  let iv = 30;
  let found = false;
  const step = +(gen === 1) + 1;
  for (; iv >= 0; iv -= step) {
    if (STATS.calc(gen, stat, base, iv, 0, level, nature) === val) {
      found = true;
      break;
    }
  }
  return found ? iv : undefined;
}
