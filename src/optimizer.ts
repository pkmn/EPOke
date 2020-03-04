import {Dex, PokemonSet, StatsTable, Stat, Species, calcStat, getNature} from 'ps';

// From Guangcong Luo's MIT Licensed src/battle-tooltips.ts in smogon/pokemon-showdown-client
export const Optimizer = new (class {
  optimizeEVs(dex: Dex, set: PokemonSet) {
    let { species, stats, getStat, categories, moves, total, srWeak } = setup(dex, set);

    optimizeHPDivisibility(set, getStat, total, moves, srWeak);

    if (species.name === 'Tentacruel') {
      total = this.ensureMinEVs(set.evs, 'spe', 16, total);
    } else if (species.name === 'Skarmory') {
      total = this.ensureMinEVs(set.evs, 'spe', 24, total);
    } else if (species.name === 'Jirachi') {
      total = this.ensureMinEVs(set.evs, 'spe', 32, total);
    } else if (species.name === 'Celebi') {
      total = this.ensureMinEVs(set.evs, 'spe', 36, total);
    } else if (species.name === 'Volcarona') {
      total = this.ensureMinEVs(set.evs, 'spe', 52, total);
    } else if (species.name === 'Gliscor') {
      total = this.ensureMinEVs(set.evs, 'spe', 72, total);
    } else if (species.name === 'Dragonite' && set.evs.hp) {
      total = this.ensureMaxEVs(set.evs, 'spe', 220, total);
    }

    if (total < 508) {
      let remaining = 508 - total;
      for (const stat of orderStats(set.evs, stats, categories)) {

      }



      // TODO problem may need to redo hp divisibility if not optimal....


      // algorithm: determine which stat to priority based on:
      // - where EVs are already allocated? NEED TO ACCOUNT EVS MAY HAVE BEEN CHANGED BY ABOVE!!!
      // - base stats
      // - heuristics below about moves
      //
      // if HP is changed, redo HP divisibility (which may provide more to fill in..., AVOID CONTINUING ADDING AND SUBTRACTING FROM HP)





      let stat: number;
      let secondaryStat: Stat | null = null;



      if (secondaryStat) {
        let ev = remaining;
        stat = getStat(secondaryStat, ev);
        while (ev > 0 && stat === getStat(secondaryStat, ev - 4)) ev -= 4;
        if (ev) set.evs[secondaryStat] = ev;
        remaining -= ev;
      }

    }

    return set.evs;
  }

  optimizeHPDivisibility(dex: Dex, set: PokemonSet) {
    const { getStat, moves, total, srWeak } = setup(dex, set);
    optimizeHPDivisibility(set, getStat, total, moves, srWeak);
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
    return total; // can't do it :(
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


function optimizeHPDivisibility(set: PokemonSet, getStat: (s: Stat, v: number) => number, total: number, moves: Set<string>, srWeak: number) {
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

  if (hpDivisibility) {
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
    if (hp || set.evs.hp) set.evs.hp = hp;
  }
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
    if (move && move.category && move.basePower) categories[move.category]++;
  }

  const total = Object.values(set.evs).reduce((a, v) => a + v, 0);
  const srWeak = stealthRockWeak(species, set.ability);

  return { species, stats, getStat, categories, moves, total, srWeak };
}


function orderStats(
  evs: StatsTable,
  base: StatsTable,
  categories: {Physical: number, Special: number}
) {
  // Sort the largest EV investments / base stats first
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

  // Hardcode some special cases heuristics to prevent obvious edge cases for offensive stats
  const off = (s: Stat) => s === 'atk' || s === 'spa';
  if (!categories.Physical && !categories.Special) {
    const front: Stat[] = [];
    const back: Stat[] = [];
    for (const s of stats) (off(s) ? back : front).push(s);
    for (const s of back) front.push(s);
    return front;
  } else if (categories.Physical && !categories.Special) {
    return ['atk'].concat(stats.filter(s => !off(s))).concat('spa') as Stat[];
  } else if (!categories.Physical && categories.Special) {
    return ['spa'].concat(stats.filter(s => !off(s))).concat('spd') as Stat[];
  }
  return stats;
}