import { ID, PokemonSet } from 'ps';
import { Random } from './random';
import { PokemonStatistics } from './statistics';

// TODO: should be per format
//
// Symmetric matrix of (move1, move2) => P(move1 | move2). Because move1 and move2
// are interchangeable we only store the upper half of the matrix, requiring
// N(N+1)/2 space instead of N*N.
//
//     0 1 2 3
//       4 5 6
//         7 8
//           9
//
const BIGRAMS: number[];

function lookup(matrix: number[], row: number, col: number, N: number) {
  if (row <= col) return row*N - (row-1)*((row-1) + 1)/2 + col - row;
  return col*N - (col-1)*((col-1) + 1)/2 + row - col;
}

interface SetPossibilties {
  species: Map<ID, number>;
  item: Map<ID, number>;
  ability: Map<ID, number>;
  moves?: Map<ID, number>;
  nature?: Map<ID, number>;
  gender?: Map<ID, number>;
  happiness?: Map<number, number>;

  evs?: StatsRange<number>; // TODO
  ivs?: StatsRange<number>;


  // These should alr
  level?: Map<number, number>
  shiny?: Map<ID, 
  pokeball?: Map<ID, number>,

  // Evenly distributed 
  hpType?: Map<ID, number>;
};

function mostLikely<T>(m: Map<T, number>) {
  if (!m.size) throw new RangeError('No possibilities to select from');
  return m.keys.next();
}

export class Predictor {
  readonly format: ID;
  readonly random: Random;

  constructor(format: ID, random: Random) {
    this.format = format;
    this.random = random;
  }

  predictTeam(, sample = false) {
  }

  predictSet(set: Partial<PokemonSet>, restrictions: SetRestrictions, stats: PokemonStatistics, sample = false) {
    let species = set.species;
    if (!set.species) {
      
    }
    const name = set.name || species;
    const level = set.level || (restrictions.level ? restrictions.level.max : 100);

    // TODO cover moves

    const shiny = set.shiny || restrictions.shiny;
    const range = (restrictions.happiness ? restrictions.happiness : {min: 0, max: 255});
    const happiness = set.happiness || (moves.includes('frustration') ? range.min : range.max);
    const pokeball = set.pokeball || 
    const hpType = set.hpType;

    return {
      name, species, item, ability, moves, nature, gender,
      evs, ivs, level, shiny, happiness, pokeball, hpType
    };

  }

  // Vose's alias method: http://www.keithschwarz.com/darts-dice-coins/
  // PRECONDITION: probabilities.length > 0 AND sum(probabilities) == 1
  sample(probabilities: number[]) {
    const alias: number[] = new Array(probabilities.length);
    const probability: number[] = new Array(probabilities.length);
    const average = 1.0 / probabilities.length;

    const small: number[] = [];
    const large: number[] = [];
    for (const [i, p] of probabilities.entries()) {
      (p >= average ? large : small).push(i);
    }

    // In the mathematical specification of the algorithm, we will always exhaust
    // the small worklist before the large worklist. However, due to floating point
    // inaccuracies, this is not necessarily true. Consequently, this inner loop
    // (which tries to pair small and large elements) will have to check that both 
    // worklists aren't empty.
    while (small.length && large.length) {
      const less = small.pop()!;
      const more = large.pop()!;

      // Scale the probabilities up such that 1/n is given weight 1.0
      probability[less] *= probabilities.length;
      alias[less] = more;
      probabilities[more] += probabilities[less] - average;

      (probabilities[more] >= 1.0 / probabilities.length ? large : small).push(more);
    }

    // At this point, everything is in one worklist, which means the remaining
    // probabilities should all be 1/n. Due to numerical issues, we can't be sure
    // which stack will hold the entries, so we empty both.
    while (small.length) probability[small.pop()!] = 1;
    while (large.length) probability[large.pop()!] = 1;

    // At this point, our data structure has been built and we can actually
    // select the an index.
    const column = this.random.next(probability.length);
    const coinToss = this.random.next() < probability[column];
    return coinToss ? column : alias[column];
  }
}
