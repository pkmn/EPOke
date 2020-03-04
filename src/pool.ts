import { Random } from './random';

export class Pool<T> {
  // the M elements locked
  readonly locked: readonly T[];

  // elements eligble for selection
  #data: Array<[T, number]>;
  // the top element
  #top: [T | null, number];
  // elements which were weighted down to 0
  #zero: T[];
  // updater functions to apply on select
  #fns: Array<(k: T, v: number) => number>;

  static create<T = string, V = number>(
    obj: Record<string, V>,
    fn?: (k: string, v: V) => [T, number]
  ) {
    const data = [];
    const zero = [];

    let top: [T | null, number] = [null, 0];

    for (const k in obj) {
      const [t, v] = fn ? fn(k, obj[k]) : [k, obj[k]];
      if (v < 0) continue;
      if (v === 0) {
        zero.push(t);
        continue;
      }

      const p: [T, number] = [t, v];
      data.push(p);
      if (v > top[1]) top = p;
    }

    return new Pool<T>([], data, top, zero);
  }

  private constructor(locked: T[], data: Array<[T, number]>, top: [T | null, number], zero: T[]) {
    this.locked = locked;

    this.#data = data;
    this.#top = top;
    this.#zero = zero;
    this.#fns = [];
  }

  update(fn: (k: T, v: number) => number) {
    this.#fns.push(fn);
  }

  lock(key: T) {
    (this.locked as T[]).push(key);
    this.update((k: T, v: number) => (k === key ? -1 : v));
  }

  select(fn = (k: T, v: number) => v, random?: Random) {
    const data = [];
    const fnzero = [];
    let top: [T | null, number] = [null, 0];

    let total = 0;
    const self = this.dupe((k, v) => {
      v = fn(k, v);
      if (v < 0) continue;
      if (v === 0) {
        fnzero.push(k);
        continue;
      }

      total += v;
      p = [k, v];
      data.push(p);
      if (v > top[1]) top = p;
    });

    this.#data = self[0];
    this.#top = self[1];
    this.#zero = self[2];
    this.#fns = [];

    const zero = [];
    for (const v of self[2]) zero.push(v);
    for (const v of fnzero) zero.push(v);

    let val: T | undefined = undefined;
    if (data.length) {
      if (random) {
        const weights = data.map(d => d[1] / total);
        val = data[sample(weights, random)][0]!;
      } else {
        val = top[0]!;
      }
    } else if (zero.length) {
      val = random ? random.sample(zero) : zero[zero.length - 1];
    }

    const pool = new Pool<T>(this.locked.slice(0), data, top, zero);

    return [ val, pool ] as [T, Pool<T>];
  }

  clone() {
    const [data, top, zero] = this.dupe();
    return new Pool<T>(this.locked.slice(0), data, top, zero);
  }

  private dupe(fn: (k: T, v: number) => void) {

    const data = [];
    const zero = this.#zero.slice(0);

    let top: [T | null, number] = [null, 0];

    for (let [k, v] of this.#data) {
      v = this.apply(k, v);
      if (v < 0) continue;
      if (v === 0) {
        zero.push(k);
        continue;
      }

      let p: [T, number] = [k, v];
      data.push(p);
      if (v > top[1]) top = p;

      if (fn) fn(k, v);
    }

    return [data, top, zero];
  }

  private apply(k: T, v: number) {
    for (const fn of this.#fns) {
      v = fn(k, v);
      if (v <= 0) return v;
    }
    return v;
  }
}

// Vose's alias method: http://www.keithschwarz.com/darts-dice-coins/
// PRECONDITION: probabilities.length > 0 AND sum(probabilities) == 1
function sample(probabilities: number[], random: Random) {
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
  const column = random.next(probability.length);
  const coinToss = random.next() < probability[column];
  return coinToss ? column : alias[column];
}
