<p align="center"><img alt="EPOké" width="364" height="148" src="https://pkmn.cc/EPOke.png" /></p>

# EPOké

![Test Status](https://github.com/pkmn/EPOke/workflows/Tests/badge.svg)

This is the top level directory housing packages that make up [`@pkmn`](https://pkmn.cc/@pkmn/)'s
EPOké project.

> [EPOké](https://pkmn.cc/epoke) (named after a portmanteau of
[EPO](https://en.wikipedia.org/wiki/Erythropoietin) and ‘Poké’) leverages a reverse damage
calculator ([gmd](gmd)) and additional logic to construct the *perceived* battle state based on the
perspective of the client. EPOké is designed to be useful in many domains, exposing additional
information from replays, extending the Pokémon Showdown client tooltips/UI, or inside the engine
of a Pokemon AI.

- [`@pkmn/epoke`](epoke): a wrapper around
  [`@pkmn/client`](https://github.com/pkmn/ps/tree/master/client) which ties together `@pkmn/gmd`,
  `@pkmn/predictor` and `@pkmn/spreads` to produce an enhanced client representation of a battle
- [`@pkmn/gmd`](gmd): a reverse damage calculator built on top of
  [`@pkmn/dmg`](https://github.com/pkmn/dmg) to deduce information about a Pokémon's moveset based
  on the damage it deals or receives in battle
- [`@pkmn/predictor`](predictor): logic which combines usage stats information from
  [`@pkmn/stats`](https://github.com/pkmn/stats) with minimal heuristics to predict likely instances
  of an opponent's team
- [`@pkmn/spreads`](spreads): a lightweight, standalone package for manipulating and displaying
  stats, spreads, and ranges

Everything in this repository is distributed under the terms of the [MIT License](LICENSE).
