import * as pkmn from '@pkmn.cc/data';

import { SparseSpread, Spread, STATS, StatsTable } from './stats';

interface RawStatistics {
  data: { [name: string]: MovesetStatistics };
}

interface MovesetStatistics {
    'Raw count': number;
    usage: number;
    // num GXE, max GXE, 1% GXE, 20% GXE
    'Viability Ceiling': [number, number, number, number];
    Abilities: { [ability: string]: number };
    Items: { [item: string]: number };
    Spreads: { [spread: string]: number };
    Happiness: { [happiness: string]: number };
    Moves: { [move: string]: number };
    Teammates: { [pokemon: string]: number };
    // n = sum(POKE1_KOED...DOUBLE_SWITCH)
    // p = POKE1_KOED + POKE1_SWITCHED_OUT / n
    // d = sqrt((p * (1 - p)) / n)
    'Checks and Counters': { [pokemon: string]: [number, number, number] };
  }

// interface Statistics {
//   pokemon: {[species: string]: PokemonStatistics};
//   metagame: MetagameStatistics;
// }

interface PokemonStatistics {
  usage: number;

//   stats: StatStatistics;

  abilities: {[name: string]: number};
  items: {[name: string]: number};
  moves: {[name: string]: number}; 
  teammates: {[name: string]: number};
  spreads: {[name: string]: number};
  counters: {[name: string]: number};
}

interface MetagameStatistics {
  pokemon: {[name: string]: number};
  abilities: {[name: string]: number};
  items: {[name: string]: number};
  moves: {[name: string]: number}; 
}


function cutoff(chance: number, matches: number) {
  return 1 - Math.pow(1 - chance, 1 / matches);
}

const DIGITS = 5;
const CUTOFF = 1/Math.pow(10, DIGITS); // cutoff(0.5, 100);


export function process(raw: RawStatistics) {
  const result: { [name: string]: PokemonStatistics } = {};
  for (const name of Object.keys(raw.data)) {
    const pokemon: MovesetStatistics = raw.data[name];
    if (pokemon.usage < CUTOFF) continue;

    const [spreads, total] = processObj(pokemon.Spreads, id => id);
    const [abilities] = processObj(pokemon.Abilities, id => pkmn.Abilities.get(id) ? pkmn.Abilities.get(id)!.name : id, total);
    const [items] = processObj(pokemon.Items, id => pkmn.Items.get(id) ? pkmn.Items.get(id)!.name : id, total);
    const [moves] = processObj(pokemon.Moves, id => pkmn.Moves.get(id) ? pkmn.Moves.get(id)!.name : id, total * 4, 4);
    const [teammates] = processObj(pokemon.Teammates, id => id, total, 1, 1/Math.pow(10, 2));

    result[name] = {
        usage: round(pokemon.usage, 2),
        abilities,
        items,
        moves,
        teammates, 
        spreads,
        counters: processCC(pokemon["Checks and Counters"]),
    }
  }
  return result;
}

function processObj(obj: {[name: string]: number}, fn: (id: string) => string, total?: number, factor = 1, c = CUTOFF): [{[name: string]: number}, number] {
    total = total || Object.values(obj).reduce((a, b) => a + b, 0);
    const sorted: Array<[string, number]> = [];
    for (const [k, v] of Object.entries(obj)) {
        if (k === "" || k === "nothing" || k === 'empty') continue;
        const w = v / total * factor;
        if (Math.abs(w) >= c) {
            sorted.push([k, round(w, 2)]);
        }
    }
    sorted.sort((a, b) => b[1] - a[1]);
    const processed: {[name: string]: number} = {};
    for (const [k, v] of sorted) {
        processed[fn(k)] = v;
    }
    return [processed, total];
}

function processCC(obj: {[name: string]: [number, number, number]}): {[name: string]: number} {
    const sorted: Array<[string, number]> = [];
    for (const [k, v] of Object.entries(obj)) {
        if (k === "" || k === "nothing" || k === 'empty') continue;
        sorted.push([k, round(v[1] - 4 * v[2], 2)]);
    }
    sorted.sort((a, b) => b[1] - a[1]);
    const processed: {[name: string]: number} = {};
    for (const [k, v] of sorted) {
        processed[k] = v;
    }
    return processed;
}

function round(n: number, f = 0) {
    return Math.round(n * Math.pow(10, DIGITS)) / Math.pow(10, DIGITS - f);
}

