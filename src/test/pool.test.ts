import { Pool, Comparators } from '../pool';
import { Random } from '../random';

describe('Pool', () => {
  describe('#limit', () => {
    it('should limit the pool length', () => {
      const pool: Pool<string> = createPool(toNodes(4), 5);
      expect(pool.length).toEqual(4);
      pool.push({ val: 'foo', weight: 1000 });
      expect(pool.length).toEqual(5);
      pool.push({ val: 'bar', weight: 10001 });
      expect(pool.length).toEqual(5);
      expect(check(pool)).not.toBeDefined();
    });
  });

  describe('#length', () => {
    it('should return the pool length', () => {
      expect(Pool.create().length).toEqual(0);
      expect(createPool().length).toEqual(100);
    });
  });

  describe('#get(index)', () => {
    it('should return the node', () => {
      const pool = createPool();
      expect(pool.get(0)).toEqual(pool.peek());
      expect(pool.get(5)).toEqual(pool.toArray()[5]);
    });
  });

  describe('#val(index)', () => {
    it('should return the val', () => {
      const pool = createPool();
      expect(pool.val(-1)).toBeUndefined();
      expect(pool.val(0)).toEqual(pool.peek().val);
      expect(pool.val(5)).toEqual(pool.toArray()[5].val);
    });
  });

  describe('#weights()', () => {
    it('should sum to 1', () => {
      const sum = (vs: number[]) => vs.reduce((acc, v) => acc + v, 0);
      expect(sum(createPool(toNodes(100)).weights())).toBeCloseTo(1, 5);
      expect(sum(createPool(toNodes([1, 1, 1, 1])).weights())).toBeCloseTo(1, 5);
    });
    it('should return the weight relative to the others', () => {
      expect(createPool(toNodes(100)).weights()[0]).toBeCloseTo(99 / ((99 * 100) / 2), 5);
      expect(createPool(toNodes([1, 1, 1, 1])).weights()[0]).toBeCloseTo(0.25, 5);
    });
    it('should be updated for removals/additions etc', () => {
      const pool = createPool();
      const popped = pool.pop()!;
      pool.push({ val: 'k100', weight: 100 });
      pool.push({ val: 'k101', weight: 101 });
      pool.replace(popped);
      pool.remove('k50');
      pool.remove('k25');
      expect(pool.clone().weights()[0]).toBeCloseTo(100 / ((100 * 101) / 2 - 75), 5);
    });
  });

  describe('#find(val)', () => {
    it('should find the index of a val in the pool', () => {
      expect(createPool().find('k99')).toBe(0);
    });
    it('should return -1 for the index of a val not in the pool', () => {
      expect(createPool().find('k5000')).toBe(-1);
    });
    it('should know the index for every node', () => {
      const pool = createPool();
      const popped = pool.pop()!;
      pool.push({ val: 'k100', weight: 100 });
      pool.push({ val: 'k101', weight: 101 });
      pool.replace(popped);
      pool.remove('k50');
      pool.remove('k25');
      const nodes = pool.toArray();
      for (let i = 0; i < nodes.length; i++) {
        expect(pool.find(nodes[i].val)).toBe(i);
      }
    });
  });

  describe('#contains(val)', () => {
    it('should find a val in the pool', () => {
      const pool = createPool();
      expect(pool.contains(pool.get(5).val)).toBe(true);
    });
    it('should not find a val not in the pool', () => {
      expect(createPool().contains('k5000')).toBe(false);
    });
  });

  describe('#clone()', () => {
    it('should clone the pool to a new one', () => {
      const pool = createPool();
      const cloned = pool.clone();
      expect(cloned.length).toEqual(pool.length);
      expect(cloned.toArray()).toEqual(pool.toArray());
      pool.push({ val: 'foo', weight: 1000 });
      expect(pool.length).not.toEqual(cloned.length);
    });
  });

  describe('#toArray()', () => {
    it('should return an array', () => {
      const nodes = toNodes(100);
      const pool = createPool(nodes);
      const arr = pool.toArray();
      expect(Array.isArray(arr)).toBe(true);
      expect(arr.length).toEqual(nodes.length);
      const cloned = nodes.slice(0);
      cloned.sort(Comparators.Max);
      arr.sort(Comparators.Max);
      expect(arr).toEqual(cloned);
    });
  });

  describe('#toString()', () => {
    it('should return an string', () => {
      const pool = createPool();
      const arr = pool.toArray();
      expect(pool.toString().length).toEqual(arr.toString().length);
    });
  });

  describe('#peek()', () => {
    it('should return the top node of the pool', () => {
      const pool = createPool();
      expect(pool.peek().weight).toEqual(99);
    });
  });

  describe('#pop()', () => {
    it('should return undefined if pool is empty', () => {
      expect(Pool.create().pop()).toBeUndefined();
    });
    it('should extract the peek if length is 1', () => {
      const pool: Pool<string> = Pool.create();
      pool.push({ val: 'k999', weight: 999 });
      expect(pool.pop()!.weight).toBe(999);
      expect(pool.length).toBe(0);
    });
    it('should extract the node at the top, and keep the pool sorted', () => {
      const pool = createPool();
      const peek = pool.peek();
      const len = pool.length;
      expect(pool.pop()).toEqual(peek);
      expect(pool.length).toEqual(len - 1);
      expect(check(pool)).not.toBeDefined();
    });
  });

  describe('#modify(val, mod)', () => {
    it('should return false when not found', () => {
      expect(Pool.create().modify('foo', 5)).toBe(false);
    });
    it('should modify the weight by mod', () => {
      const pool = createPool();
      expect(pool.modify('k50', 3)).toBe(true);
      expect(pool.val(0)).toBe('k50');
      expect(pool.modify('k70', -1)).toBe(true);
      expect(pool.top(1000)[pool.length - 1].val).toBe('k70');
      expect(check(pool)).not.toBeDefined();
    });
  });

  describe('#push()', () => {
    it('should add one node to the pool, sorted', () => {
      const pool: Pool<string> = Pool.create();
      const len = pool.length;
      const arr = toNodes([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
      arr.forEach(n => pool.push(n));
      expect(pool.length).toEqual(len + arr.length);
      expect(check(pool)).not.toBeDefined();
    });
    it('should add many nodes to the pool, sorted', () => {
      const pool = createPool();
      const len = pool.length;
      pool.push(...toNodes([200, 201, 202, 203, 204]));
      expect(pool.length).toEqual(len + 5);
      expect(check(pool)).not.toBeDefined();
    });
    it('should ignore empty calls', () => {
      const pool = createPool();
      const len = pool.length;
      expect(pool.push()).toBe(false);
      expect(pool.length).toEqual(len);
    });
  });

  describe('#replace(node)', () => {
    it('should put the node at the top, and then sort it', () => {
      const pool = createPool();
      const len = pool.length;
      const peek = pool.peek();
      expect(pool.replace({ val: 'k3000', weight: 3000 })).toEqual(peek);
      expect(pool.length).toEqual(len);
      expect(pool.contains('k3000')).toBe(true);
      expect(check(pool)).not.toBeDefined();
    });
  });

  describe('#remove()', () => {
    it('should skip an empty pool', () => {
      const pool: Pool<string> = Pool.create();
      expect(pool.remove()).toBe(false);
    });
    it('should skip if no node matches', () => {
      const pool = createPool();
      const len = pool.length;
      expect(pool.remove('k50000')).toBe(false);
      expect(pool.length).toBe(len);
    });
    it('should remove the peek if it matches and length is 1', () => {
      const pool: Pool<string> = Pool.create();
      pool.push({ val: 'k999', weight: 999 });
      expect(pool.remove('k999')).toBe(true);
      expect(pool.length).toBe(0);
    });
    it('should remove the leaf if it matches the end', () => {
      const pool = createPool();
      const len = pool.length;
      const bottom = pool.toArray()[pool.length - 1];
      expect(pool.remove(bottom.val)).toBe(true);
      expect(pool.toArray()[pool.length - 1]).not.toBe(bottom);
      expect(pool.length).toBe(len - 1);
      expect(check(pool)).not.toBeDefined();
    });
    it('should remove the node from the pool, and keep the pool sorted', () => {
      const nodes = toNodes(100);
      const pool = createPool(nodes);
      const arr = pool.toArray();
      const len = pool.length;
      expect(pool.remove(nodes[3].val)).toBe(true);
      expect(pool.remove(nodes[4].val)).toBe(true);
      expect(pool.length).toBe(len - 2);
      expect(check(pool)).not.toBeDefined();
    });
    it('whithout node, should remove the peek', () => {
      const pool = createPool();
      const peek = pool.peek();
      const len = pool.length;
      expect(pool.remove()).toBe(true);
      expect(pool.peek()).not.toBe(peek);
      expect(pool.length).toBe(len - 1);
      expect(check(pool)).not.toBeDefined();
    });
  });

  describe('#top(N)', () => {
    it('should return an empty array for an empty pool', () => {
      const pool: Pool<string> = Pool.create();
      expect(pool.top()).toEqual([]);
      expect(pool.top(10)).toEqual([]);
    });
    it('should return an empty array for invalid N', () => {
      const pool = createPool();
      expect(pool.top(0)).toEqual([]);
      expect(pool.top(-10)).toEqual([]);
    });
    it('should return the top N (<= length) nodes of the pool', () => {
      const pool = createPool();
      const top = pool.toArray().slice(0);
      top.sort(Comparators.Max);
      expect(pool.top(1)).toEqual(top.slice(0, 1));
      expect(pool.top(6)).toEqual(top.slice(0, 6));
      expect(pool.top(101)).toEqual(top);
    });
    it('should return the top node of the pool if no N', () => {
      const pool = createPool();
      expect(pool.top()).toEqual(pool.top(1));
    });
  });

  describe('#indicesOfChildren()', () => {
    it('should return children for every index', () => {
      for (let i = 100; i >= 0; --i) {
        const c = [i * 2 + 1, i * 2 + 2];
        expect(Pool.indicesOfChildren(i)).toEqual(c);
      }
    });
  });

  describe('#indexOfParent()', () => {
    it('should return the parent for every child', () => {
      for (let i = 100; i > 0; --i) {
        const p = (i - 2 + (i % 2)) / 2;
        expect(Pool.indexOfParent(i)).toEqual(p);
      }
    });
    it('should return -1 for index <= 0', () => {
      expect(Pool.indexOfParent(0)).toEqual(-1);
      expect(Pool.indexOfParent(-100)).toEqual(-1);
    });
  });
});

function toNodes(w: number | number[]) {
  let weights: number[];
  if (typeof w === 'number') {
    weights = [];
    for (let i = 0; i < w; i++) {
      weights.push(i);
    }
  } else {
    weights = w;
  }
  const random = Random.create();
  const nodes = weights.map(weight => ({ val: `k${weight}`, weight }));
  random.shuffle(nodes);
  return nodes;
}

function createPool(nodes?: Array<{ val: string; weight: number }>, limit = 0) {
  const pool: Pool<string> = Pool.create(Comparators.Max, limit);
  pool.push(...(nodes ?? toNodes(100)));
  return pool;
}

function check<T>(pool: Pool<T>) {
  const data = pool.toArray();
  const cmp = Comparators.Max;

  const getChildrenOf = (idx: number) =>
    Pool.indicesOfChildren(idx)
      .map(i => data[i])
      .filter(e => e !== undefined);

  return data.find(
    (n: { val: T; weight: number }, j: number) => !!getChildrenOf(j).find(c => cmp(n, c) > 0)
  );
}
