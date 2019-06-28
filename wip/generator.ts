import { Random } from './random';

export class Generator {
  readonly format: ID;
  readonly random: Random;

  constructor(format: ID, random: Random) {
  }


  // Vose's alias method: http://www.keithschwarz.com/darts-dice-coins/
  // PRE: probabilities.length > 0
  sample(probabilities: number[]) {
    const alias: number[] = new Array(probabilities.length);
    const probability: number[] = new Array(probabilities.length);
    const average = 1.0 / probabilities.length;

    const small = [];
    const large = [];
    for (const [i, p] of probabilities.entries()) {
      (p >= average ? large : small).push(i);
    }

    // In the mathematical specification of the algorithm, we will always exhaust
    // the small worklist before the large worklist. However, due to floating point
    // inaccuracies, this is not necessarily true. Consequently, this inner loop
    // (which tries to pair small and large elements) will have to check that both 
    // worklists aren't empty.
    while (small.length && large.length) {
      const less = small.pop();
      const more = large.pop();

      // Scale the probabilities up such that 1/n is given weight 1.0
      probability[less] *= probabolities.length;
      alias[less] = more;
      probabilities[more] += probabilities[less] - average;

      if (probabilities[more] >= 1.0 / probabilities.length) {
        large.add(more);
      } else {
        small.add(more);
      }
    }

    // At this point, everything is in one worklist, which means the remaining
    // probabilities should all be 1/n. Due to numerical issues, we can't be sure
    // which stack will hold the entries, so we empty both.
    while (small.length) probability[small.pop()] = 1;
    while (large.length) probability[large.pop()] = 1;

    // At this point, our data structure has been built and we can actually
    // select the an index.
    const column = random.next(probability.length);
    const coinToss = random.next() < probability[column];
    return coinToss ? column : alias[column];
  }
}
