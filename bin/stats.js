const https = require('https');
const fs = require('fs');

const Statistics = require('../build/statistics').Statistics;

const pokemon = process.argv[2] || 'Tyranitar';
const format = process.argv[3] || 'gen4ou';

const current = new Date();
current.setMonth(current.getMonth() - 1);
const date = `${current.getFullYear()}-${current.getMonth().toString().padStart(2, '0')}`;

const cached = `data/${format}-${date}.json`;

let data = '';
if (fs.existsSync(cached) && (data = fs.readFileSync(cached))) {
  display(data);
} else {
  https.get(Statistics.url(date, format), resp => {
    resp.on('data', chunk => {
      data += chunk
    });
    resp.on('end', () => {
      display(data);
      fs.writeFileSync(cached, data);
    });
  }).on('error', err => {
    console.error(err);
  });
}

function display(data) {
  const raw = JSON.parse(data);
  const s = Statistics.process(raw, [pokemon])[pokemon];
  console.log(Statistics.display(pokemon, s));
}
