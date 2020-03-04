import { Random } from './random';

export interface Pool<T> {
  locked: readonly T[];
  update(fn: (k: T, v: number) => number): void;
  lock(key: T): void;
  select(fn?: (k: T, v: number) => number, random?: Random): [T | undefined, Pool<T>];
}

export const Pools = new (class {
  create<T = string, V = number>(
    obj: Record<string, V>,
    fn?: ((k: string, v: V) => [T, number]) | boolean,
    ephemeral = false
  ) {
    if (fn === true || ephemeral) {
      return new EphemeralPool<T, V>(obj, !fn || fn === true ? undefined : fn);
    }

    const data = [];
    const zero = [];

    for (const k in obj) {
      const [t, v] = fn ? fn(k, obj[k]) : [k, obj[k]] as unknown as [T, number];
      if (v < 0) continue;
      if (v === 0) {
        zero.push(t);
        continue;
      }

      const p: [T, number] = [t, v];
      data.push(p);
    }

    return new PoolImpl<T>([], data, zero);
  }
})();

class PoolImpl<T> implements Pool<T> {
  // the M elements locked
  readonly locked: readonly T[];

  // elements eligble for selection
  #data: Array<[T, number]>;
  // elements which were weighted down to 0
  #zero: T[];
  // updater functions to apply on select
  #fns: Array<(k: T, v: number) => number>;

  constructor(locked: T[], data: Array<[T, number]>, zero: T[]) {
    this.locked = locked;

    this.#data = data;
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

  select(fn = (k: T, v: number) => v, random?: Random): [T | undefined, Pool<T>] {
    const self = { data: [] as Array<[T, number]>, zero: this.#zero };
    const them = { data: [] as Array<[T, number]>, zero: this.#zero.slice(0) };

    let top: [T | null, number] = [null, 0];
    let total = 0;
    for (let [k, v] of this.#data) {
      v = this.apply(k, v);
      if (v < 0) continue;
      if (v === 0) {
        self.zero.push(k);
        them.zero.push(k);
        continue;
      }

      let p: [T, number] = [k, v];
      self.data.push(p);

      v = fn(k, v);
      if (v < 0) continue;
      if (v === 0) {
        them.zero.push(k);
        continue;
      }

      total += v;
      p = [k, v];
      them.data.push(p);
      if (v > top[1]) top = p;
    }

    this.#data = self.data;
    this.#zero = self.zero;
    this.#fns = [];

    let val: T | undefined = undefined;
    if (them.data.length) {
      if (random) {
        const weights = them.data.map(d => d[1] / total);
        val = them.data[sample(weights, random)][0]!;
      } else {
        val = top[0]!;
      }
    } else if (them.zero.length) {
      val = random ? random.sample(them.zero) : them.zero[them.zero.length - 1];
    }

    const pool = new PoolImpl<T>(this.locked.slice(0), them.data, them.zero);

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

class EphemeralPool<T, V> implements Pool<T> {
  #obj: Record<string, V> | null;
  #fn?: (k: string, v: V) => [T, number];

  #data: Array<[T, number]>;
  #zero: T[];

  constructor(obj: Record<string, V>, fn?: (k: string, v: V) => [T, number]) {
    this.#obj = obj;
    this.#fn = fn;

    this.#data = [];
    this.#zero = [];
  }

  get locked() {
    return [];
  }

  update() {
    throw new Error('Illegal call to update on EphemeralPool');
  }

  lock() {
    throw new Error('Illegal call to lock on EphemeralPool');
  }

  select(fn = (k: T, v: number) => v, random?: Random): [T | undefined, Pool<T>] {
    const data = [];
    const zero = this.#zero.slice(0);

    let total = 0;
    let top: [T | null, number] = [null, 0];
    if (this.#obj) {
      for (const k in this.#obj) {
        let [t, v] = this.#fn ? this.#fn(k, this.#obj[k]) : [k, this.#obj[k]] as unknown as [T, number];
        if (v < 0) continue;
        if (v === 0) {
          zero.push(t);
          continue;
        }

        v = fn(t, v);
        if (v < 0) continue;
        if (v === 0) {
          zero.push(t);
          continue;
        }

        total += v;
        const p: [T, number] = [t, v];
        data.push(p);
        if (v > top[1]) top = p;
      }
    } else {
      for (let [k, v] of this.#data) {
        v = fn(k, v);
        if (v < 0) continue;
        if (v === 0) {
          zero.push(k);
          continue;
        }

        total += v;
        const p: [T, number] = [k, v];
        data.push(p);
        if (v >top[1]) top = p;
      }
    }

    this.#data = data;
    this.#zero = zero;

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

    return [ val, this ] as [T, Pool<T>];
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
