<p align="center"><img alt="EPOké" width="364" height="148" src="https://pkmn.cc/EPOke.png" /></p>

# `@pkmn/epoke`

![Test Status](https://github.com/pkmn/EPOke/workflows/Tests/badge.svg)
![License](https://img.shields.io/badge/License-MIT-blue.svg)

`@pkmn/epoke` extends [`@pkmn/client`](https://github.com/pkmn/ps/tree/master/client) with
information from [`@pkmn/gmd`](../gmd), [`@pkmn/predictor`](../predictor), and
[`@pkmn/spreads`](../spreads) to produce an enhanced client representation of a Pokémon battle.
EPOké offers several key features over `@pkmn/client`:

- **spread information**: `@pkmn/client` can determine information about a side's `stats` from the
  `|request|` protocol message and provides support for setting a side's `sets` to known values so
  that its state can be used with [`@pkmn/dmg`](https://github.com/pkmn/dmg) in a limited number of
  circumstances, but with EPOké `@pkmn/dmg` can *always* be used as it can additionally:
  - reverse the `stats` from `|request|` into a spread using `@pkmn/spreads`
  - track the `StatsRange` for a Pokémon, winnow it down with information from `@pkmn/gmd`, and
    finally, return the most likely estimate for the spread with help from `@pkmn/predictor` and
    usage stats
  - allow for a user to override predicted values for stats (while still maintaining accurate tracking)
- **inferred state**: EPOké leverages `@pkmn/gmd` to deduce information about the battle state (eg.
  an opponent Pokémon's item or ability) on top of what is already known from `@pkmn/client`
- **possible state instantiation**: EPOké provides the ability to generate possible instantiations
  of the simulator's [`State`](https://github.com/pkmn/ps/blob/master/sim/sim/state.ts) using the
  information it has collected and with help from `@pkmn/predictor` and usage stats

If information in battle can be determined conclusively and without the help of anything in this
repository it is in scope for `@pkmn/client`, everything else is the domain of `@pkmn/epoke`.

## Installation

```sh
$ npm install @pkmn/epoke
```

Alternatively, as [detailed below](#browser), if you are using `@pkmn/epoke` in the browser and
want a convenient way to get started, simply depend on a transpiled and minified version via
[unpkg](https://unpkg.com/):

```html
<script src="https://unpkg.com/@pkmn/epoke"></script>
```

## Usage

FIXME

```ts
```

### Browser

The recommended way of using `@pkmn/epoke` in a web browser is to **configure your bundler**
([Webpack](https://webpack.js.org/), [Rollup](https://rollupjs.org/),
[Parcel](https://parceljs.org/), etc) to minimize it and package it with the rest of your
application. If you do not use a bundler, a minified `index.umd.js` bundle is included in the
package. You simply need to depend on `./node_modules/@pkmn/epoke/build/index.umd.js` in a
`script` tag (which is what the unpkg shortcut above is doing), after which **`epoke` will be
accessible as a global**:

```html
<script src="./node_modules/@pkmn/epoke/build/index.umd.js"></script>
```

## License

This package is distributed under the terms of the [MIT License](LICENSE).
