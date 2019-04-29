const https = require('https');
const fs = require('fs');
const path = require('path');

const pkmn = require('@pkmn.cc/data');
const Analyses = require('../build/analyses').Analyses;

const pokemon = pkmn.Species.get(process.argv[2] || 'Tyranitar');
const format = pkmn.Format.fromString(process.argv[3] || 'gen4ou');

const cached = `data/analyses/${Analyses.gen(format.gen)}/${pokemon.id}.json`;

let data = '';
if (fs.existsSync(cached) && (data = fs.readFileSync(cached))) {
  display(data);
} else {
  https.get(Analyses.url(pokemon, format.gen), resp => {
    resp.on('data', chunk => {
      data += chunk
    });
    resp.on('end', () => {
      const parsed = Analyses.parse(data);
      fs.mkdirSync(path.dirname(cached), {recursive: true});
      fs.writeFileSync(cached, parsed);
      display(parsed);
    });
  }).on('error', err => {
    console.error(err);
  });
}

function display(json) {
  const data = JSON.parse(json, format.tier);
  const analysis = Analyses.forTier(data, format.tier);
  console.log(JSON.stringify(analysis, null, 2));
}
