#!/usr/bin/env

const stats = require('./gen4ou-2019-02.json');
const data = stats.data['Jirachi'];

const size = JSON.stringify(data).length;

delete data['Raw count'];
delete data['Viability Ceiling'];
delete data['Happiness'];

function cutoff(chance, matches) {
    return 1 - Math.pow(1 - chance, 1 / matches);
}

const DIGITS = 4
const CUTOFF = cutoff(0.5, 100);
console.log(CUTOFF)

function trim(obj, c = CUTOFF) {
    let tw = 0;
    for (const [k, v] of Object.entries(obj)) {
        tw += v;
    }
    for (const [k, v] of Object.entries(obj)) {
        if (Math.abs(v/tw) < c) {
            delete obj[k];
        } else {
            obj[k] = Math.round((v / tw) * Math.pow(10, DIGITS));
        }
    }
}

// TODO should be dependent on cutoff somehow
function trimTeammates(obj, c = CUTOFF) {
    let tw = 0;
    for (const [k, v] of Object.entries(obj)) {
        tw += v;
    }

    let num = 0;
    for (const [k, v] of Object.entries(obj)) {
        if (num++ >= 10) {
            delete obj[k];
        } else {
                obj[k] = Math.round((v/tw) * Math.pow(10, DIGITS));
            }
    }
}

// TODO should be dependent on cutoff somehow
function trimCC(obj, c = CUTOFF) {
    let num = 0;
    for (const [k, v] of Object.entries(obj)) {
        if (num++ >= 10) {
            delete obj[k];
        } else {
            //obj[k] = Math.round(v * Math.pow(10, DIGITS));
        }
    }
}

trim(data['Abilities']);
trim(data['Items']);
trim(data['Moves']);
trim(data['Spreads']);// TODO
trimTeammates(data['Teammates']);
trimCC(data['Checks and Counters']);

data.usage = Math.round(data.usage * Math.pow(10, DIGITS));


console.log(size, JSON.stringify(data).length);

console.log(JSON.stringify(data,  null, 2));