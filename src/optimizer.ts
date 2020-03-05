import {Dex, PokemonSet, StatsTable, Stat, Species, MoveCategory, calcStat, getNature} from 'ps';


// TODO

// - Remove any offensive EVs in a stat that the Pokemon doesn't use. This has the slight problem of giving Attack EVs to Rapid Spin Pokemon and other similar issues. Technical Machine doesn't realize that even though the move does damage, it's not used for attacking.
// - Move around HP, Defense, and Special Defense EVs to reduce waste. As an example, a Pokemon with 600 HP and 100 in each defense is better off having 400 HP and 200 in each defense. It will take all hits better. Technical Machine finds the solution that uses the fewest defensive EVs to keep the ability to take physical and special hits the same. This doesn't take into account passing Substitute or Wish, nor does it consider moves like Leech Seed and Pain Split.
// - Find multiple ways to keep the Speed the same.

// From Guangcong Luo's MIT Licensed src/battle-tooltips.ts in smogon/pokemon-showdown-client
export const Optimizer = new (class {
  // PRECONDITION: SUM(set.evs) <= 510
  // POSTCONDITION: SUM(set.evs) <= 510, set unmodified
  optimizeEVs(dex: Dex, set: PokemonSet) {
    const evs = Object.assign({hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0}, set.evs);
    let { species, stats, getStat, categories, moves, total, srWeak } = setup(dex, set);

    // Update the HP EV to account for optimal HP divisibility of the set in question
    evs.hp = optimizeHPDivisibility(set, getStat, total, moves, srWeak);

    // Make sure some important Pokemon hit magic speed numbers
    // TODO: should these be updated/extended to more Pokemon? What about other stats?
    // https://www.smogon.com/rs/articles/magic_stat_numbers (outdated)
    if (species.name === 'Tentacruel') {
      total = this.ensureMinEVs(evs, 'spe', 16, total);
    } else if (species.name === 'Skarmory') {
      total = this.ensureMinEVs(evs, 'spe', 24, total);
    } else if (species.name === 'Jirachi') {
      total = this.ensureMinEVs(evs, 'spe', 32, total);
    } else if (species.name === 'Celebi') {
      total = this.ensureMinEVs(evs, 'spe', 36, total);
    } else if (species.name === 'Volcarona') {
      total = this.ensureMinEVs(evs, 'spe', 52, total);
    } else if (species.name === 'Gliscor') {
      total = this.ensureMinEVs(evs, 'spe', 72, total);
    } else if (species.name === 'Dragonite' && evs.hp) {
      total = this.ensureMaxEVs(evs, 'spe', 220, total);
    }

    // If there is less maximum number of applicable EVs, greedily fill in the rest. One
    // option is to evenly distribute the EVs amongst the remaining stats, but in general
    // more biased spreads are preferable. We favor stats the set has already invested in
    // and brealk ties based on the Pokemon's base stats is already good at, though include
    // some heuristics to favor attacking stats where possible
    if (total < 508) {
      let remaining = 508 - total;
      // NB: set.evs here instead of evs, as we want the original investments and not after
      // HP and speed were tweaked above (i.e. what were the *intended* areas to focus on?)
      for (const stat of prioritizeStats(set.evs, stats, categories)) {
        let ev = Math.min(remaining, 252);
        let val = getStat(stat, ev);
        // If hp was modified it could potentially undo the work above with respect to
        // ensuring optimal divisibility so we need to do it again
        if (stat === 'hp' && val !== evs.hp) {
          val = optimizeHPDivisibility(set, getStat, total, moves, srWeak);
        }
        // Remove any excess EVs that don't actually contribute to a new stat point
        while (ev > 0 && val === getStat(stat, ev - 4)) ev -= 4;
        if (ev) evs[stat] = ev;
        remaining -= ev;

        if (remaining <= 0) break;
      }
    }

    return evs;
  }

  optimizeHPDivisibility(dex: Dex, set: PokemonSet) {
    const { getStat, moves, total, srWeak } = setup(dex, set);
    return optimizeHPDivisibility(set, getStat, total, moves, srWeak);
  }

  ensureMinEVs(evs: StatsTable, stat: Stat, min: number, total: number) {
    if (!evs[stat]) evs[stat] = 0;
    let diff = min - evs[stat];
    if (diff <= 0) return total;

    if (total <= 504) {
      const change = Math.min(508 - total, diff);
      total += change;
      evs[stat] += change;
      diff -= change;
    }
    if (diff <= 0) return total;

    // Look for a stat to subtract the difference from provided that it is sufficiently large
    const evPriority = {def: 1, spd: 1, hp: 1, atk: 1, spa: 1, spe: 1};
    let prioStat: Stat;
    for (prioStat in evPriority) {
      if (prioStat === stat) continue;
      if (evs[prioStat] && evs[prioStat] > 128) {
        evs[prioStat] -= diff;
        evs[stat] += diff;
        return total;
      }
    }

    return total; // can't do it :(
  }

  ensureMaxEVs(evs: StatsTable, stat: Stat, min: number, total: number) {
    if (!evs[stat]) evs[stat] = 0;
    const diff = evs[stat] - min;
    if (diff <= 0) return total;

    evs[stat] -= diff;
    total -= diff;
    return total;
  }
})();

const SR_WEAKNESSES = ['Fire', 'Flying', 'Bug', 'Ice'];
const SR_RESISTANCES = ['Ground', 'Steel', 'Fighting'];

function stealthRockWeak(species: Species, ability: string) {
  let weak = 0;
  if (ability !== 'Magic Guard') {
    if (SR_WEAKNESSES.indexOf(species.types[0]) >= 0) {
      weak++;
    } else if (SR_RESISTANCES.indexOf(species.types[0]) >= 0) {
      weak--;
    }
    if (SR_WEAKNESSES.indexOf(species.types[1]) >= 0) {
      weak++;
    } else if (SR_RESISTANCES.indexOf(species.types[1]) >= 0) {
      weak--;
    }
  }
  return weak;
}

function optimizeHPDivisibility(
  set: PokemonSet,
  getStat: (s: Stat, v: number) => number,
  total: number,
  moves: Set<string>,
  srWeak: number
) {
  let hpDivisibility = 0;
  let hpShouldBeDivisible = false;
  let hp = set.evs.hp || 0;
  let stat = getStat('hp', hp);

  const berry = (set.item || '').slice(-5) === 'Berry';
  if ((set.item === 'Leftovers' || set.item === 'Black Sludge') && moves.has('Substitute') && stat !== 404) {
    hpDivisibility = 4;
  } else if (set.item === 'Leftovers' || set.item === 'Black Sludge') {
    hpDivisibility = 0;
  } else if (moves.has('Belly Drum') && berry) {
    hpDivisibility = 2;
    hpShouldBeDivisible = true;
  } else if (moves.has('Substitute') && berry) {
    hpDivisibility = 4;
    hpShouldBeDivisible = true;
  } else if (srWeak >= 2 || moves.has('Belly Drum')) {
    hpDivisibility = 2;
  } else if (srWeak >= 1 || moves.has('Substitute') || moves.has('Transform')) {
    hpDivisibility = 4;
  } else if (set.ability !== 'Magic Guard') {
    hpDivisibility = 8;
  }

  if (!hpDivisibility) return hp;

  while (hp < 252 && total < 508 && !(stat % hpDivisibility) !== hpShouldBeDivisible) {
    hp += 4;
    stat = getStat('hp', hp);
    total += 4;
  }
  while (hp > 0 && !(stat % hpDivisibility) !== hpShouldBeDivisible) {
    hp -= 4;
    stat = getStat('hp', hp);
    total -= 4;
  }
  while (hp > 0 && stat === getStat('hp', hp - 4)) {
    hp -= 4;
    total -= 4;
  }

  return hp;
}

function setup(dex: Dex, set: PokemonSet) {
  const species = dex.getSpecies(set.species || set.name!)!;
  const stats = species.baseStats;
  const getStat = (s: Stat, ev: number) =>
    calcStat(s, stats[s], set.ivs[s], ev, set.level, getNature(set.nature), dex.gen);

  const categories = {Physical: 0, Special: 0, Status: 0};
  const moves = new Set(set.moves);
  for (const m of moves) {
    const move = dex.getMove(m);
    if (!move) continue;
    // These two are not really used for their damage output
    const category = (m === 'Rapid Spid' || m === 'Thief') ? 'Status' : move.category;
    categories[category]++;
  }

  const total = Object.values(set.evs).reduce((a, v) => a + v, 0);
  const srWeak = dex.gen > 3 ? stealthRockWeak(species, set.ability) : 0;

  return { species, stats, getStat, categories, moves, total, srWeak };
}

// TODO

// Technical Machine currently randomly divides all remaining EVs among each stat. However, my plans for the future are to weight this random padding by how often that particular EV is used by that Pokemon. In other words, a Pokemon that generally invests a lot in Speed is more likely to have its Speed EVs padded than a Pokemon that rarely puts a single EV into Speed.



// 1. prefer evs, if 0 then check base stats
// 2. if less than 2 stats have evs, favor an attacking stat provided has offensive attacks
function prioritizeStats(evs: StatsTable, base: StatsTable, has: Record<MoveCategory, number>) {
  // Sort the largest original EV investments / base stats first
  const ev = Object.entries(evs).sort((a, b) => b[1] - a[1]);
  const bs = Object.entries(base).sort((a, b) => b[1] - a[1]);

  // Compare their relative positions in each and combine the ranking
  const ordered: Array<[string, number]> = [];
  for (const [i, [k, _]] of bs.entries()) {
    const j = ev.findIndex(([v]) => v[0] === k);
    ordered.push([k, i + j]);
  }
  // Sort by lowest combined position and throw away the ranks
  const stats = ordered.sort((a, b) => a[1] - b[1]).map(e => e[0]) as Stat[];

  // Hardcode some special case heuristics to prevent obvious edge cases for offensive stats
  const off = (s: Stat) => s === 'atk' || s === 'spa';
  if (!has.Physical && !has.Special) {
    const front: Stat[] = [];
    const back: Stat[] = [];
    for (const s of stats) (off(s) ? back : front).push(s);
    for (const s of back) front.push(s);
    return front;
  } else if (has.Physical && !has.Special) {
    return ['atk'].concat(stats.filter(s => !off(s))).concat('spa') as Stat[];
  } else if (!has.Physical && has.Special) {
    return ['spa'].concat(stats.filter(s => !off(s))).concat('spd') as Stat[];
  }
  return stats;
}