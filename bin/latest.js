const https = require('https');
const fs = require('fs');

const Statistics = require('../build/statistics').Statistics;

let data = '';
https.get(`${Statistics.URL}/`, resp => {
  resp.on('data', chunk => {
    data += chunk
  });
  resp.on('end', () => {
    console.log(Statistics.latest(data));
  });
}).on('error', err => {
  console.error(err);
});
