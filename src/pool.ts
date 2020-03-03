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

  static create<T>(
    obj: Record<string, number>,
    // hardly typesafe, users are required to pass in a decoding function if T != string
    fn: (k: string, v: number) => [T, number] = (k, v) => [k as any, v]
  ) {
    const data = [];
    const zero = [];

    let top: [T | null, number] = [null, 0];

    for (const k in obj) {
      const d = fn(k, obj[k]);
      const t = d[0];
      const v = d[1];
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
    const odata = [];
    const ndata = [];

    const ozero = this.#zero;
    const nzero = this.#zero.slice(0);

    let otop: [T | null, number] = [null, 0];
    let ntop: [T | null, number] = [null, 0];

    let total = 0;
    for (let [k, v] of this.#data) {
      v = this.apply(k, v);
      if (v < 0) continue;
      if (v === 0) {
        ozero.push(k);
        nzero.push(k);
        continue;
      }

      let p: [T, number] = [k, v];
      odata.push(p);
      if (v > otop[1]) otop = p;

      v = fn(k, v);
      if (v < 0) continue;
      if (v === 0) {
        nzero.push(k);
        continue;
      }

      total += v;
      p = [k, v];
      ndata.push(p);
      if (v > ntop[1]) ntop = p;
    }

    this.#data = odata;
    this.#zero = ozero;
    this.#top = otop;
    this.#fns = [];

    let val: T | undefined = undefined;
    if (this.#data.length) {
      if (random) {
        const weights = ndata.map(d => d[1] / total);
        val = ndata[sample(weights, random)][0]!;
      } else {
        val = ntop[0]!;
      }
    } else if (nzero.length) {
      val = random ? random.sample(nzero) : nzero[nzero.length - 1];
    }

    const pool = new Pool<T>(this.locked.slice(0), ndata, ntop, nzero);

    return [ val, pool ] as [T, Pool<T>];
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
