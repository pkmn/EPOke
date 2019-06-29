import { ID, PokemonSet, Gender } from 'ps';
import { Random } from './random';
import { Spread } from './stats';
import { Heap } from './heap';

interface SetPossibilities {
  item: Heap<ID>;
  ability: Heap<ID>;
  moves?: Heap<ID>;
  gender?: Heap<Gender>;
  spread: Heap<Spread>;
  level: Heap<number>;
}

export class Predictor {
  readonly format: ID;
  readonly random: Random;

  constructor(format: ID, random: Random) {
    this.format = format;
    this.random = random;
  }

  // TODO: species needs to be handled differently than set possibilities!
  //predictTeam(team: SetPossibilities[], sample = false) { }

  predictSet(species: ID, possibilities: SetPossibilities, sample = false) {
    const select = <T extends {}>(h: Heap<T>) => h.val(sample ? this.sample(h.weights()) : 0);

    const spread = select(possibilities.spread);
    const set: PokemonSet<ID> = {
      name: species,
      species,
      level: select(possibilities.level),
      ability: this.predictAbility(possibilities.ability, spread, sample),
      nature: spread.nature.id,
      ivs: spread.ivs,
      evs: spread.evs,
      // These will be set later
      item: '',
      moves: [],
      // We want the team validator to infer this
      gender: '',
      // BUG: shiny is required for certain event moves
    };

    // TODO: cover moves = need to make a COPY of move heap to update with MOVE BIGRAM each iteration

    set.item = this.predictItem(possibilities.item, set, sample);
    set.happiness = set.moves.includes('frustration' as ID) ? 0 : 255;
    return set;
  }

  private predictAbility(abilities: Heap<ID>, spread: Spread, sample: boolean) {
    // TODO: actually update weights based on set bias
    return abilities.val(sample ? this.sample(abilities.weights()) : 0);
  }

  private predictItem(items: Heap<ID>, set: PokemonSet<ID>, sample: boolean) {
    // TODO: actually update weights based on set
    return items.val(sample ? this.sample(items.weights()) : 0);
  }

  // Vose's alias method: http://www.keithschwarz.com/darts-dice-coins/
  // PRECONDITION: probabilities.length > 0 AND sum(probabilities) == 1
  private sample(probabilities: number[]) {
    if (probabilities.length <= 1) return 0;

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

// TODO: should be per format, and both teammate AND move bigrams
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
const BIGRAMS: number[] = [];

function lookup(matrix: number[], row: number, col: number, N: number) {
  if (row <= col) return row * N - ((row - 1) * (row - 1 + 1)) / 2 + col - row;
  return col * N - ((col - 1) * (col - 1 + 1)) / 2 + row - col;
}
