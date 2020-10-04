# `@pkmn/gmd`

![Test Status](https://github.com/pkmn/EPOke/workflows/Tests/badge.svg)
![License](https://img.shields.io/badge/License-MIT-blue.svg)

FIXME

## Installation

```sh
$ npm install @pkmn/gmd
```

Alternatively, as [detailed below](#browser), if you are using `@pkmn/gmd` in the browser and
want a convenient way to get started, simply depend on a transpiled and minified version via
[unpkg](https://unpkg.com/):

```html
<script src="https://unpkg.com/@pkmn/gmd"></script>
```

## Usage

FIXME

```ts
```

### Browser

The recommended way of using `@pkmn/gmd` in a web browser is to **configure your bundler**
([Webpack](https://webpack.js.org/), [Rollup](https://rollupjs.org/),
[Parcel](https://parceljs.org/), etc) to minimize it and package it with the rest of your
application. If you do not use a bundler, a minified `index.umd.js` bundle is included in the
package. You simply need to depend on `./node_modules/@pkmn/gmd/build/index.umd.js` in a
`script` tag (which is what the unpkg shortcut above is doing), after which **`gmd` will be
accessible as a global**:

```html
<script src="./node_modules/@pkmn/gmd/build/index.umd.js"></script>
```

## License

This package is distributed under the terms of the [MIT License](LICENSE).
