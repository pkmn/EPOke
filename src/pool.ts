interface Node<T> {
  val: T;
  weight: number;
}

export const Comparators = {
  Min: <T extends {}>(a: Node<T>, b: Node<T>) => {
   if (a?.weight > b?.weight) {
      return 1;
    } else if (a?.weight < b?.weight) {
      return -1;
    } else {
      return 0;
    }
  },
  Max: <T extends {}>(a: Node<T>, b: Node<T>) => {
    if (b?.weight > a?.weight) {
      return 1;
    } else if (b?.weight < a?.weight) {
      return -1;
    } else {
      return 0;
    }
  },
};

export class Pool<T> {
  readonly cmp: (a: Node<T>, b: Node<T>) => number;
  readonly limit: number = 0;
  /* readonly */ data: Array<Node<T>> = [];
  private total: number;

  static create<T>(cmp: (a: Node<T>, b: Node<T>) => number = Comparators.Max, limit = 0) {
    return new Pool(cmp, limit, [], 0);
  }

  private constructor(
    cmp: (a: Node<T>, b: Node<T>) => number,
    limit: number,
    data: Array<Node<T>>,
    total: number
  ) {
    this.cmp = cmp;
    this.limit = limit;
    this.data = data;
    this.total = total;
  }

  get length(): number {
    return this.data.length;
  }
 
  get(i: number) {
    return this.data[i];
  }

  contains(o: T): boolean {
    return this.data.findIndex(n => n.val === o) >= 0;
  }

  clone() {
    return new Pool(this.cmp, this.limit, this.toArray(), this.total);
  }

  toArray() {
    return this.data.slice(0);
  }

  weights() {
    return this.data.map(n => n.weight / this.total);
  }

  toString() {
    return this.data.toString();
  }
 
  peek() {
    return this.data[0];
  }
  
  pop() {
    const pop = this.data.pop();
    if (pop !== undefined) this.total -= pop.weight;
    if (this.length > 0 && pop !== undefined) {
      return this.replace(pop);
    }
    return pop;
  }

  push(...data: Array<Node<T>>): boolean {
    if (data.length < 1) return false;
    if (data.length === 1) {
      this.bubbleUp(this.data.push(data[0]) - 1);
      this.total += data[0].weight;
    } else {
      let i = this.length;
      for (const d of data) {
        this.data.push(d);
        this.total += d.weight;
      }
      for (const length = this.length; i < length; ++i) {
        this.bubbleUp(i);
      }
    }
    this.trim();
    return true;
  }

  replace(node: Node<T>) {
    const peek = this.peek();
    this.data[0] = node;
    this.total += node.weight - (peek.weight || 0);
    this.bubbleDown(0);
    return peek;
  }

  remove(t?: T) {
    if (!this.length) return false;
    if (t === undefined) {
      this.pop();
      return true;
    }
    const i = this.data.findIndex(n => n.val === t);
    if (i < 0) return false;
    if (i === 0) {
      this.pop();
    } else if (i === this.length - 1) {
      this.total -= this.data.pop()!.weight;
    } else {
      const spliced = this.data.splice(i, 1, this.data.pop()!);
      for (const {weight} of spliced) this.total -= weight;
      this.bubbleUp(i);
      this.bubbleDown(i);
    }
    return true;
  }

  top(n = 1) {
    if (this.length === 0 || n <= 0) return [];
    if (this.length === 1 && n === 1) return [this.peek()];
    if (n >= this.length) {
      const cloned = this.data.slice(0);
      cloned.sort(this.cmp);
      return cloned;
    }
    const heap = Pool.create((a: Node<T>, b: Node<T>) => -1 * this.cmp(a, b), n);
    const indices = [0];
    while (indices.length) {
      const i = indices.shift()!;
      if (i < this.length) {
        if (heap.length < n) {
          heap.push(this.data[i]);
          indices.push(...Pool.indicesOfChildren(i));
        } else if (this.cmp(this.data[i], heap.peek()!) <= 0) {
          heap.replace(this.data[i]);
          indices.push(...Pool.indicesOfChildren(i));
        }
      }
    }
    const arr = heap.toArray();
    arr.sort(this.cmp);
    return arr;
  }

  /* private */ check() {
    const getChildrenOf = (idx: number) => 
      Pool.indicesOfChildren(idx)
        .map(i => this.data[i])
        .filter(e => e !== undefined);
    return this.data.find((n: Node<T>, j: number) => !!getChildrenOf(j).find(c => this.cmp(n, c) > 0));
  }

  /* private */ bubbleDown(i: number) {
    if (i >= this.data.length - 1) return false;
    const self = this.data[i];

    while (true) {
      const children = Pool.indicesOfChildren(i);
      let ci = children[0];
      for (let i = 1; i < children.length; i++) {
        ci = this.cmp(this.data[children[i]], this.data[ci]) < 0 ? children[i] : ci;
      }
      if (this.data[ci] === undefined || this.cmp(self, this.data[ci]) <= 0) break;
      [this.data[i], this.data[ci]] = [this.data[ci], this.data[i]];
      i = ci;
    }
    return true;
  }

  /* private */ bubbleUp(i: number) {
    if (!i) return false;
    while (true) {
      const pi = Pool.indexOfParent(i);
      if (pi < 0 || this.cmp(this.data[pi], this.data[i]) <= 0) break;
      [this.data[i], this.data[pi]] = [this.data[pi], this.data[i]];
      i = pi;
    }
    return true;
  }

  private trim() {
    if (this.limit && this.limit < this.length) {
      let rm = this.length - this.limit;
      while (rm--) this.total -= (this.data.pop()!.weight);
    }
  }

  static indicesOfChildren(index: number) {
    return [index * 2 + 1, index * 2 + 2];
  }

  static indexOfParent(index: number) {
    if (index <= 0) return -1;
    const child = index % 2 ? 1 : 2;
    return Math.floor((index - child) / 2);
  }
}
