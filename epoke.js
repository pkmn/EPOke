const dmg = require('dmgcalc');
const data = require('./data');
const json = require('./gen3ou-1760');

const STATS = { 'hp': 0, 'atk': 1, 'def': 2, 'spa': 3, 'spd': 4, 'spe': 5 };
const ORDERED_STATS = [ 'hp', 'atk', 'def', 'spa', 'spd', 'spe' ];
const CUTOFF = 3.40;

function binarySearch(array, pred) {
  let lo = -1, hi = array.length;
  while (1 + lo < hi) {
    const mi = lo + ((hi - lo) >> 1);
    if (pred(array[mi])) {
      hi = mi;
    } else {
      lo = mi;
    }
  }
  return hi;
}

function atLeast(stats, val) {
  let ret = binarySearch(stats, pair => pair[0] >= val);
  // NOTE: we want to make adding 1 to this index safe so we can
  // use it to optimize lookups during speed calculations.
  return ret === -1 ? -2 : ret;
}

function fromIndex(stats, i) {
  if (i <= -1) {
    return 100;
  }
  if (i >= stats.length) {
    return 0;
  }
  return stats[i][1];
}

function moves(mon) {
  let total = 0;
  for (let move in mon['Moves']) {
    total += mon['Moves'][move];
  }

  let result = [];
  for (let move in mon['Moves']) {
    let p = (mon['Moves'][move] / total) * 4 * 100;
    let n = data.MOVES[move] || move;
    result.push([n, p]);
  }

  result.sort((a, b) => b[1] - a[1]);

  return result.slice(0, 10);
}

function abilities(mon) {
  let total = 0;
  for (let ability in mon['Abilities']) {
    total += mon['Abilities'][ability];
  }

  let result = [];
  for (let ability in mon['Abilities']) {
    let p = (mon['Abilities'][ability] / total) * 100;
    let n = data.ABILITIES[ability] || ability;
    result.push([n, p]);
  }

  result.sort((a, b) => b[1] - a[1]);
  return result;
}

function items(mon) {
  let total = 0;
  for (let item in mon['Items']) {
    total += mon['Items'][item];
  }

  let result = [];
  for (let item in mon['Items']) {
    let p = (mon['Items'][item] / total) * 100;
    let n = data.ITEMS[item] || item;
    result.push([n, p]);
  }

  result.sort((a, b) => b[1] - a[1]);
  return result;
}

function spreads(mon, gen) {
  let base = dmg.POKEDEX[gen][mon.name].baseStats;

  let total = 0;
  let mixed = 0;

  let stats = {};
  let grouped = {};
  for (let spread in mon['Spreads']) {
    let w = mon['Spreads'][spread];
    total += w;
    let r = bucketSpreadAndCalcStats(spread, base, gen);
    grouped[r[0]] = (grouped[r[0]] || 0) + w;

    let s = r[1];
    for (let stat in STATS) {
      let val = s[stat];
      stats[stat] = stats[stat] || {};
      if (typeof stats[stat][val] === 'undefined') {
        stats[stat][val] = 0;
      }
      stats[stat][val] += w;
    }

    if (r[2]) {
      mixed += w;
    }
  }

  let ordered = {};
  for (let stat in STATS) {
    ordered[stat] = ordered[stat] || [];
    for (let v in stats[stat]) {
      ordered[stat].push([Number(v), (stats[stat][v] / total * 100)])
    }
    ordered[stat].sort((a, b) => a[0] - b[0]);
  }

  let percents = {};
  for (let stat in STATS) {
    percents[stat] = percents[stat] || [];
    let prev = 0;
    for (let pair of ordered[stat]) {
      percents[stat].push([pair[0], 100 - prev]);
      prev = prev + pair[1]
    }
  }

  let result = [];
  for (let spread in grouped) {
    let p = (grouped[spread] / total) * 100;
    result.push([spread, p]);
  }

  result.sort((a, b) => b[1] - a[1]);
  return [result.slice(0, 5), (mixed / total) * 100, percents];
}

function bucketSpreadAndCalcStats(spread, base, gen) {
  let s = spread.split(':');
  let nature = s[0];
  let n = data.NATURES[nature];
  let revs = s[1].split('/');

  let evs = []
  for (let rev of revs) {
    let bucket = Math.floor(Number(rev) / 16) * 16;
    bucket = bucket == 240 ? 252 : bucket;
    evs.push(bucket.toString());
  }

  let plus = n[0] && STATS[n[0]];
  let minus = n[1] && STATS[n[1]];
  let mixed = false;
  if (plus && minus) {
    evs[plus] = evs[plus] + '+';
    evs[minus] = evs[minus] + '-';

    if (((plus === STATS['atk'] && minus !== STATS['spa']) ||
         (plus === STATS['spa'] && minus !== STATS['atk']))) {
      mixed = true;
    }
  }

  let stats = calcStats(gen, base, nature, revs);
  return [nature + ' ' + evs.join('/'), stats, mixed];
}

function calcStats(gen, base, nature, evs) {
  let stats = {};
  for (let stat in STATS) {
    stats[stat] = dmg.CALC_STAT[gen](
        stat, base[stat], 31, evs[STATS[stat]] || 0, 100, nature);
  }
  return stats;
}

function display(result, cutoff = 0) {
  for (let pair of result) {
    if (pair[1] < cutoff) break;
    console.log(pair[0] + ': ' + percent(pair[1]));
  }
}

function percent(p) {
  //return p.toFixed(3) + '%';
  return (Math.round(p * 10) / 10).toString() + '%';
}

function firstSet(gen, name) {
  let sets = dmg.SETS[gen][name];
  let set = sets[Object.keys(sets)[0]];
  let base = dmg.POKEDEX[gen][name].baseStats;
  set.name = name;
  return set;
}

function displaySet(poke, def, field, gen) {
  let evs = [];
  let stats = [];
  for (let stat of ORDERED_STATS) {
    let ev = poke.evs[stat];
    if (poke.evs[stat]) {
      evs.push(ev.toString() + ' ' + data.displayStat(stat));
    }
    stats.push(poke.stats[stat]);
  }

  let set = stats.join(' / ') + '  \n\n';

  set += poke.name + ' @ ' + poke.item + '  \n';
  set += 'Ability: ' + poke.ability + '  \n';
  set += 'EVs: ' + evs.join(' / ') + '  \n';
  set += 'Nature: ' + poke.nature + '  \n';
  for (let move of poke.moves) {
    set += '- ' + displayMove(move);
    move = dmg.MOVES[gen][move];
    let result = calcMove(gen, poke, def, move, field);
    if (result) {
      set += ' (' + result.moveDesc() + ')';
    }

    set += '  \n';
  }

  return set;
}

function displayMove(move) {
  if (move.substr(0, 13) === 'Hidden Power ') {
		move = move.substr(0, 13) + '[' + move.substr(13) + ']';
	}
  return move;
}

let mon = json['data'][process.argv[2]];
mon.name = process.argv[2];

let gen = parseInt(process.argv[3], 10) || 3; // TODO
let p1 = firstSet(gen, 'Zapdos'); // TODO
let p2 = firstSet(gen, mon.name);
let p2_moves = p2.moves;
let field = new dmg.Field(); // TODO

p1 = new dmg.Pokemon(
  gen, p1.name, p1.level, undefined /* gender */, p1.ability, p1.item,
  p1.nature, undefined /* ivs */, p1.evs);

p2 = new dmg.Pokemon(
  gen, p2.name, p2.level, undefined /* gender */, p2.ability, p2.item,
  p2.nature, undefined /* ivs */, p2.evs);
p2.moves = p2_moves;

console.log('Set\n=====');
console.log(displaySet(p2, p1, field, gen));

console.log('Abilities\n=====');
display(abilities(mon));

console.log('\nItems\n=====');
display(items(mon), CUTOFF);

let s = spreads(mon, gen);
console.log('\nSpreads\n=====');
display(s[0]);

console.log('---')
if (s[1] > CUTOFF) {
  console.log('Mixed: ' + percent(s[1]));
}
let spe = s[2]['spe'];
let hi = atLeast(spe, p1.stats.spe);
let beat = fromIndex(spe, hi + 1);
let tie = fromIndex(spe, hi) - beat;
console.log('Speed: ' + percent(beat) + ' (' + percent(tie) + ')');

console.log('\nMoves\n=====');
for (let pair of moves(mon)) {
  if (pair[1] < CUTOFF) break;

  let desc = displayMove(pair[0]) + ': ' + percent(pair[1]);
  let move = dmg.MOVES[gen][pair[0]];
  let result = calcMove(gen, p2, p1, move, field);
  if (result) {
    desc += ' (' + result.moveDesc() + ')';
  }

  console.log(desc);
}

function calcMove(gen, attacker, defender, move, field) {
  if (move) {
    move = new dmg.Move(gen, move, attacker.ability, attacker.item);
    let result = dmg.calc(gen, attacker, defender, move, field);
    if (!(result.damage.length === 1 && result.damage[0] === 0)) {
      return result;
    }
  }
}
