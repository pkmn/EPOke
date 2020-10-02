# `@pkmn/spreads`

![Test Status](https://github.com/pkmn/EPOke/workflows/Tests/badge.svg)
[![npm version](https://img.shields.io/npm/v/@pkmn/spreads.svg)](https://www.npmjs.com/package/@pkmn/spreads)

Library for parsing, displaying, and converting Pokémon stats, spreads, and ranges.

## Installation

```sh
$ npm install @pkmn/spreads
```

Alternatively, as [detailed below](#browser), if you are using `@pkmn/spreads` in the browser and want a convenient way to get started, simply depend on a transpiled and minified version via
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
import {Stats, StatsRange} from '@pkmn/spreads';

const base = Stats.fromString('60/65/60/130/75/110');
const range = StatsRange.fromBase(base, 3);
const spread = Spread.fromString('EVs: 172/0-/0/148/0/188+');
const stats = spread.toStats(base, 3);

// range.includes(stat) === true

range.max = stats;
console.log(range.toSpreadRange());
```

FIXME

```txt
Docile-Modest Nature
EVs: 20-80 HP / 252 SpA / ??? SpD / >200 Spe
IVs: <10 Atk / >20 SpD / ??? Spe
```

[`@pkmn/gmd`](../gmd) and [`@pkmn/predictor`](../predictor) make extensive use of this package and
can provide helpful examples for how these classes are intended to be used.

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