const stats = require('../data/gen7ou-1825.json');

const process = require('../build/statistics2').process;

const processed = process(stats);

function humanBytes(size) {
    const o = Math.floor(Math.log(size) / Math.log(1024));
    return `${(size / Math.pow(1024, o)).toFixed(2)} ${['B', 'KiB', 'MiB', 'GiB', 'TiB'][o]}`;
}

function size(obj) {
    return humanBytes(JSON.stringify(obj).length);
}

console.log(size(stats), size(processed));

const avg = {stats: 0, processed: 0};
for (const k in stats.data) {
    avg.stats += JSON.stringify(stats.data[k]).length;
}
avg.stats /= Object.keys(stats.data).length;

for (const k in processed) {
    avg.processed += JSON.stringify(processed[k]).length;
}
avg.processed /= Object.keys(processed).length;


// console.log(humanBytes(avg.stats), humanBytes(avg.processed));
// console.error(JSON.stringify([stats.data['Magnezone'], processed['Magnezone']], null, 2));

console.log(JSON.stringify(processed));
