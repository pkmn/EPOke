# `@pkmn/spreads`

![Test Status](https://github.com/pkmn/EPOke/workflows/Tests/badge.svg)
![License](https://img.shields.io/badge/License-MIT-blue.svg)
[![npm version](https://img.shields.io/npm/v/@pkmn/spreads.svg)](https://www.npmjs.com/package/@pkmn/spreads)

Library for parsing, displaying, and converting Pokémon stats, spreads, and ranges.

<p align="center">
  <br />
  <img alt="HP Forumla" width="483" height="46" src="https://pkmn.cc/post-adv-hp-stat-calc.webp" />
  <img alt="Stat Forumla" width="597" height="60" src="https://pkmn.cc/post-adv-stat-calc.webp" />
</p>

## Installation

```sh
$ npm install @pkmn/spreads
```

Alternatively, as [detailed below](#browser), if you are using `@pkmn/spreads` in the browser and
want a convenient way to get started, simply depend on a transpiled and minified version via
[unpkg](https://unpkg.com/):

```html
<script src="https://unpkg.com/@pkmn/spreads"></script>
```

## Usage

This library provides utilities for dealing with a Pokémon's **`Spread`** (Nature/EVs/IVs) and the
computed **`Stats`** that result from combining a spread with a Pokémon's base stats data.
Additionally, `@pkmn/spreads` contains logic for dealing with a **`Range`** of `Stats`
(**`StatsRange`**) or `Spread` (**`SpreadRange`**). Typically, an opponent Pokémon's exact stats are
unknown, but the range of possible values it could be can be tracked and gradually winnowed down. It
is generally recommend that programs work with `Stats` and `StatsRange`, but humans tend to
understand `Spread` and `SpreadRange` better. which makes the latter pair more suitable for display
purposes. `Stats` must also be converted into a `Spread` in order to fill in a `PokemonSet`.

```ts
import {Stats, StatsRange, Spreads} from '@pkmn/spreads';

const gen = 3;
const base = Stats.fromString('60/65/60/130/75/110');

const range = StatsRange.fromBase(base, gen);
const spread = Spread.fromString('EVs: 172/0-/0/148/0/188+');
const stats = spread.toStats(base, gen);

range.min = Spread.fromString('EVs: 100/0/0/60/0/40\nIVs: 10 Def').toStats(base, gen);
range.max = stats;

console.log(range.toSpreadRange(base, gen).toString());
```

The above example code will display the following:

```txt
Serious-Timid Nature
EVs: 100-172 HP / 60-148 SpA / 40-188 Spe
IVs: >9 Def
```

[`@pkmn/gmd`](../gmd) and [`@pkmn/predictor`](../predictor) make extensive use of this package and
can provide helpful examples for how these classes are intended to be used.

### Limitations

The algorithm used to reverse `Stats` into a `Spread` (which is extensively documented via comments
in the source code) attempts to efficiently find the least constrained, optimal spread that still
produces the same stats (minimizing use of EVs and keeping a neutral Nature where possible). Logic
elsewhere within EPOké wants the flexibility to then further optimize the reversed `Spread` if
possible. However, there are limitations with what the algorithm is able to do, and the `Spread`
returned by it is not guaranteed to be legal, just that it computes to the correct `Stats`. IV and
EV limits are observed, but the following is considered out-of-scope:

- The IVs of the `Spread` returned are not guaranteed to produce the same Hidden Power type or base
  power (the algorithm prefers to deduct from EVs as opposed to IVs, meaning its more likely that a
  Hidden Power set will be noticeable from the EVs and not the IVs).
- The algorithm is not aware of a Pokémon's gender, so the Attack DVs of the `Spread` returned in
  Gen 2 are not guaranteed to be accurate.
- The algorithm *does* make a best-effort attempt to ensure the HP DV is correct in RBY and GSC, but
  considers it too computationally expensive to attempt to guarantee the HP DV will always be the
  expected value based on the other DVs.
- The returned `Spread` will often be sub-maximal (< 508 EVs) when in  reality it is more likely
  that EVs were maxed out and IVs were sub-maximal instead. This is mostly a display issue, other
  than the impact on Hidden Power as outlined above.
- The algorithm pretends that the [655 Stat 'Glitch'](https://www.smogon.com/forums/threads/3672135)
  overflow scenario does not exist. This is only relevant in non-standard formats.

### Browser

The recommended way of using `@pkmn/spreads` in a web browser is to **configure your bundler**
([Webpack](https://webpack.js.org/), [Rollup](https://rollupjs.org/),
[Parcel](https://parceljs.org/), etc) to minimize it and package it with the rest of your
application. If you do not use a bundler, a minified `index.umd.js` bundle is included in the
package. You simply need to depend on `./node_modules/@pkmn/spreads/build/index.umd.js` in a
`script` tag (which is what the unpkg shortcut above is doing), after which **`spreads` will be
accessible as a global**:

```html
<script src="./node_modules/@pkmn/spreads/build/index.umd.js"></script>
```

## License

This package is distributed under the terms of the [MIT License](LICENSE).
