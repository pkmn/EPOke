
import {Dex, Generation, PokemonSet, StatsTable, Stat, Species, calcStat, getNature} from 'ps';
import { moveCursor } from 'readline';

function guessRole(set: PokemonSet) {
  // TODO: account for Megas
  const species = Dex.get().getSpecies(set.species || set.name!);
  const stats = species.baseStats;

  let isFast = (stats.spe >= 80);
  const physicalBulk = (stats.hp + 75) * (stats.def + 87);
  const specialBulk = (stats.hp + 75) * (stats.spd + 87);

  const bulk = physicalBulk + specialBulk;
  // TODO: 46000 is after modifiers, will need to reduce
  if (bulk < 46000 && stats.spe >= 70) isFast = true;
}
function ensureMinEVs(evs: StatsTable, stat: Stat, min: number, evTotal: number) {
  if (!evs[stat]) evs[stat] = 0;
  let diff = min - evs[stat];
  if (diff <= 0) return evTotal;
  if (evTotal <= 504) {
    const change = Math.min(508 - evTotal, diff);
    evTotal += change;
    evs[stat] += change;
    diff -= change;
  }
  if (diff <= 0) return evTotal;
  const evPriority = {def: 1, spd: 1, hp: 1, atk: 1, spa: 1, spe: 1};
  let prioStat: Stat;
  for (prioStat in evPriority) {
    if (prioStat === stat) continue;
    if (evs[prioStat] && evs[prioStat] > 128) {
      evs[prioStat] -= diff;
      evs[stat] += diff;
      return evTotal;
    }
  }
  return evTotal; // can't do it :(
}
function ensureMaxEVs(evs: StatsTable, stat: Stat, min: number, evTotal: number) {
  if (!evs[stat]) evs[stat] = 0;
  const diff = evs[stat] - min;
  if (diff <= 0) return evTotal;
  evs[stat] -= diff;
  evTotal -= diff;
  return evTotal; // can't do it :(
}

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

function guessEVs(dex: Dex, set: PokemonSet): Partial<StatsTable> {
  const species = dex.getSpecies(set.species || set.name!);
  const stats = species.baseStats;
  const getStat = (stat: Stat, ev?: number) =>
    calcStat(stat, stats[stat], set.ivs[stat], ev, set.level, getNature(set.nature), dex.gen);

  const srWeak = stealthRockWeak(species, set.ability);
  const categories = {Physical: 0, Special: 0, Status: 0};
  const moves = new Set(set.moves);
  for (const m of moves) {
    const move = dex.getMove(m);
    if (move.category && move.basePower) categories[move.category]++;
  }

  let hpDivisibility = 0;
  let hpShouldBeDivisible = false;
  let hp = set.evs['hp'] || 0;
  let stat = getStat('hp', hp);

  let evTotal = Object.values(set.evs).reduce((a, v) => a + v, 0);

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
    while (hp < 252 && evTotal < 508 && !(stat % hpDivisibility) !== hpShouldBeDivisible) {
      hp += 4;
      stat = getStat('hp', hp);
      evTotal += 4;
    }
    while (hp > 0 && !(stat % hpDivisibility) !== hpShouldBeDivisible) {
      hp -= 4;
      stat = getStat('hp', hp);
      evTotal -= 4;
    }
    while (hp > 0 && stat === getStat('hp', hp - 4)) {
      hp -= 4;
      evTotal -= 4;
    }
    if (hp || set.evs['hp']) set.evs['hp'] = hp;
  }

  if (species.id === 'tentacruel') {
    evTotal = this.ensureMinEVs(set.evs, 'spe', 16, evTotal);
  } else if (species.id === 'skarmory') {
    evTotal = this.ensureMinEVs(set.evs, 'spe', 24, evTotal);
  } else if (species.id === 'jirachi') {
    evTotal = this.ensureMinEVs(set.evs, 'spe', 32, evTotal);
  } else if (species.id === 'celebi') {
    evTotal = this.ensureMinEVs(set.evs, 'spe', 36, evTotal);
  } else if (species.id === 'volcarona') {
    evTotal = this.ensureMinEVs(set.evs, 'spe', 52, evTotal);
  } else if (species.id === 'gliscor') {
    evTotal = this.ensureMinEVs(set.evs, 'spe', 72, evTotal);
  } else if (species.id === 'dragonite' && set.evs.hp) {
    evTotal = this.ensureMaxEVs(set.evs, 'spe', 220, evTotal);
  }

  let secondaryStat: Stat | null = null;
  if (evTotal < 508) {
    let remaining = 508 - evTotal;
    if (remaining > 252) remaining = 252;
    if (!set.evs.atk && categories.Physical >= 1) {
      secondaryStat = 'atk';
    } else if (!set.evs.spa && categories.Special >= 1) {
      secondaryStat = 'spa';
    } else if (stats.hp === 1 && !set.evs.def) {
      secondaryStat = 'def';
    } else if (stats.def === stats.spd && !set.evs.spd) {
      secondaryStat = 'spd';
    } else if (!set.evs.spd) {
      secondaryStat = 'spd';
    } else if (!set.evs.def) {
      secondaryStat = 'def';
    }
    if (secondaryStat) {
      let ev = remaining;
      stat = getStat(secondaryStat, ev);
      while (ev > 0 && stat === getStat(secondaryStat, ev - 4)) ev -= 4;
      if (ev) set.evs[secondaryStat] = ev;
      remaining -= ev;
    }
    if (remaining && !set.evs.spe) {
      let ev = remaining;
      stat = getStat('spe', ev);
      while (ev > 0 && stat === getStat('spe', ev - 4)) ev -= 4;
      if (ev) set.evs.spe = ev;
    }
  }

  return set.evs;
}