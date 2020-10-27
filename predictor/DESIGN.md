## Design

### `Predictor`

### `Optimizer`

### `Pool`

### `Heuristics`

### `SetPossibilities` / `SpreadPossibilities`

## Prior Art

### [Technical Machine][0]

- lead + usage (and then alter usage based on lead)

### [pokemon-team-generator][1]

The pokemon-team-generator generates teams based on Smogon's sets and viability rankings -
subjective data curated by the community of competitive Pokémon players as opposed to usage
statistics. The generator requires that the team contains a Pokémon with Stealth Rock, and further
restricts the "[roles](https://github.com/Honko/pokemon-team-generator/blob/master/js/roles.js)" of
the team to ensure no more than one Pokémon of any given role is included.  "Mega", "Stealth Rock", "Spikes", "Toxic Spikes", "Sticky Web", "Hazard Remover", "Choice Scarf", "Dedicated Lead", "Sun Supporter", "Rain Supporter", and "Dedicated Lead" are all supported rolls, with the weather
supporter roles being discouraged due to the difficult of building a team randomly around weather.

The generator also allows for "locking" species or sets to keep them constant while the rest of the
team is generated, effectively allowing for partial generation. Species selection is determined by
the Pokémon's subjective viability rank, with set options chosen randomly. Much of the search space
is simplified by only relying on preconfigured sets.

### [BuilderBot][2]

- gen8nationaldexag & gen7anythinggoes
- "mode" support (balance/offense/stall) + "cutoff", as well as "core", "breaker", "recurse"
- allows for seeding with a single Pokemon

### [Automatic Team Generator][3]

- usage stats + teammate stats (no IVs, no premega abilities, BH limitations)
- species clause, zlimit, mega limit
- does not use lead stats
- only handles most common, not probabilitic

### [Pyrotoz's Pokémon Teambuilder][4]

- multiple tiers
- random and viable
- https://pyrotoz.com/main.js = lots of heuristics for "viable", not usage stats based
- "Hazards", "Spinner", "Recovery", "Cleric", "Statuser", "P/hazer", "Booser", "Volt-turn", "Priority"

### [Training Pokemon with genetic algorithms][5]

- not full team generation, but alternative idea to EV optimization

### [sweepercalc][6]

### [My Pokemon Team][7]

My Pokemon Team is a teambuilder for Generation 7 that emphasizes a team's defensive and offensive
typing synergy as well as a checklist of desirable team traits as part of a "Team Checklist". These
include "Entry Hazard", "Spinner/Defogger", "Reliable Recovery", "Cleric", "Status Move", "Phazer",
"Boosting Move", "Volt-turn", "Choice Item". These categories only differ from Pyrotoz's teambulder
with the last item on the checklist - "Choice Item" as opposed to "Priority". As mentioned above,
the emphasis on team synergy and specific traits are useful when it comes to determining what team
heuristics should exist when building a team generator.

### [Pokémon Showdown](https://github.com/smogon/pokemon-showdown)

Pokémon Showdown has limited team generation support in the form of its [Random Battle][9]
generators and convenience features in its [teambuilder][8] like 'Suggested EVs", both which eschew
usage statistics and rely heavily on handcrafted heuristics.

"Suggested EVs" works by estimating a Pokémon's "role" (eg. "Physical" vs. "Setup", etc) based on
its moves and item. Based on the role a specific stat to boost and to nerf will be chosen, and the
nature and EVs will be chosen to maximize the chosen stats. Some generic optimizations are applied
to EVs, several of which are useful independent of the "role" heuristics:

- determining the correct HP divisibility for optimal residual damage/hazards/recovery
- ensuring certain Pokémon hit specific speed numbers
- ensuring Trick Room Pokémon's speed stats are minimized

Team generation for Random Battle formats varies depending on the format in question:

- "Challenge Cup" formats are completely random and make no attempt to build a cohesive set or team
- "Factory" teams rely on fixed sets, but contain heuristics for teams, tracking: type synergy
  information (weaknesses, resistances, combo counts), mega/Z-moves (limit to at most 1 per team),
  attempting to ensure there is a Pokemon to set up Stealth Rock and to clear hazards (while
  ensuring there is no redundancy with either hazards setting or clearing), avoiding too many
  Pokémon with the same choice item and tracking weather-based teams
- "Random" teams, which for Gen 1 may contain mandatory, semi mandatory, or combo moves in addition
  to regular moves, Gen 2 which depends on mostly predefined sets and Gens 3+ which develop
  completely random sets from a pool of "viable" moves. Much of the logic involved in set selection
  entails determining which combinations of moves (or moves and items etc) are incompatible.

In the formats that generate sets from scratch, moves are selected first, then ability based (based
on hardcoded "viability" information and potentially rejected based on the moves chosen), then item,
followed by spreads - Pokémon in Random Battles formats have 85 EVs in each stat, but there is also
some thought given to basic things like HP divisibility, confusion damage and Trick Room.

### [Smogon-Usage-Stats][10]

Smogon's usage statistics processing scripts contain a 'team analyzer' which includes heuristics for
classifying a Pokémon's "stalliness" and offensive/defensive "bias", as well as support for
"tagging" teams based on specific attributes. These have little to no applicability for generation
purposes - while they involve many handwritten rules of thumb for categorizing aspects of existing
sets and teams, it is difficult to invert these as all of the logic is descriptive and not
prescriptive.

## Future Work

TODO

- set clustering
- team (how important are specific checklist traits?)

## References

- [Technical Machine][0] - David Stone
- [pokemon-team-generator][1] - Honko
- [BuilderBot][2] - Geysers
- [Automatic Team Generator][3] - MacChaegar
- [Pyrotoz's Pokémon Teambuilder][4] - Pyrotoz
- [Training Pokemon with genetic algorithms][5] - Griffin Ledingham (Pikalytics)
- [sweepercalc][6] - migetno1 and veeveearnh
- [My Pokemon Team][7] - Jeffery Tang
- [Pokémon Showdown Teambuilder][8] - Guangcong Luo (Zarel) and contributors
- [Pokémon Showdown Random Battles][9] - The Immortal and contributors
- [Smogon-Usage-Stats][10] - Gilad Barlev (Antar)

[0]: http://doublewise.net/pokemon/team_building/
[1]: https://github.com/Honko/pokemon-team-generator
[2]: https://github.com/Geyserexe/BuilderBot
[3]: https://www.smogon.com/forums/threads/an-automatic-team-generator-using-usage-stats.3646312/
[4]: https://pyrotoz.com
[5]: https://griffinledingham.me/post/001-genetics
[6]: https://github.com/migetno1/migetno1.github.io
[7]: https://github.com/projeffboy/my-pokemon-team
[8]: https://github.com/smogon/pokemon-showdown-client/blob/master/src/battle-tooltips.ts
[9]: https://github.com/smogon/pokemon-showdown/blob/master/data/random-teams.ts
[10]: https://github.com/Antar1011/Smogon-Usage-Stats/blob/master/TA.py
