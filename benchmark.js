const Pool = require('./dist/pool').Pool;
const Pool2 = require('./dist/pool2').Pool2;
const Random = require('./dist/random').Random;

const N = Number(process.argv[2]);

const Benchmark = require('benchmark');

const suite = new Benchmark.Suite();
suite.add('Pool w/ indices cache', () => {
  let pool = Pool.create();
  const random = new Random();
  // initialization
  for (let i = 0; i < N; i++) {
    pool.push({val: `k${i}`, weight: random.next(0, 100)});
  }

  for (let i = 0; i < 50; i++) {
    pool = pool.clone();
    pool.pop();
    pool.weights();
    for (let j = 0; j < N / 10; j++) {
      pool.modify(`k{random.next(0, N)}`, 0.1);
    }
    pool.top(4);
  }
})
.add('Pool w/o indices', () => {
  let pool = Pool2.create();
  const random = new Random();
  // initialization
  for (let i = 0; i < N; i++) {
    pool.push({val: `k${i}`, weight: random.next(0, 100)});
  }

  for (let i = 0; i < 50; i++) {
    pool = pool.clone();
    pool.pop();
    pool.weights();
    for (let j = 0; j < N / 10; j++) {
      pool.modify(`k{random.next(0, N)}`, 0.1);
    }
    pool.top(4);
  }
})
.on('cycle', function (event) {
  console.log(String(event.target));
})
.on('complete', function () {
  console.log('Fastest is ' + this.filter('fastest').map('name'));
})
.run({ 'async': true });
