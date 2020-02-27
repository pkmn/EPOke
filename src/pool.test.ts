import {Pool} from './pool';
import {Random} from './random';

describe('Pool', () => {
  test('length', () => {
    expect(Pool.create().length).toEqual(0);
    expect(createPool(100).length).toEqual(100);
    expect(createPool(1000).length).toEqual(1000);
  });
  test('get', () => {
    const pool = createPool();
    console.log(pool.top(10));
    expect(pool.get(0).weight).toEqual(100);
    expect(pool.get(101)).toBeUndefined();
  });
  test('find', () => {
    const pool = createPool();
    expect(pool.find('foo')).toEqual(-1);
    expect(pool.find('k100')).toEqual(0);

    const data = pool.toArray();
    for (let i = 0; i < data.length; i++) {
      expect(pool.find(data[i].val)).toEqual(i);
    }
  });
  test('val', () => {
    const pool = createPool();
    expect(pool.val(0)).toEqual('k100');
    expect(pool.val(101)).toBeUndefined();
  });
  test('peek', () => {
    const pool = createPool();
    expect(pool.peek().weight).toEqual(100);
    expect(Pool.create().peek()).toBeUndefined();
  });
  test('top', () => {
    const pool = createPool();
    expect(pool.top(0)).toEqual([]);
    expect(pool.top(1).map(n => n.weight)).toEqual([100]);
    expect(pool.top(5).map(n => n.weight)).toEqual([100, 99, 98, 97, 96]);
  });
});



function createPool(size = 100) {
  const random = new Random();
  const nodes = [];
  for (let i = 0; i < size; i++) {
    nodes.push({val: `k${i}`, weight: i});
  }
  random.shuffle(nodes);
  const pool: Pool<string> = Pool.create();
  pool.push(...nodes);
  return pool;
}
