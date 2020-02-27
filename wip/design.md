# Design

## Initialization

- given format, create `Heap<ID>` for `Species`
  - iterate through stats for format, filtering out Species which are no longer the correct tier (stats won't reflect bans for a while): **`TV.valid(Species, format): boolean`**

## Update

- (optional) update after Team Preview (Species, Gender)
- update before turn (switch ins, level, moves used)
- mostly `Heap.remove` on `SetPossibilities`

## Algorithm

1. pick a **`Species`**. either this is *set*, we go by *most likely*, or we *sample*. from the `Species` we can then instantiate a `SetPossibilities` object from Stats - only attributes which have been seen before in stats will be included: `createSetPossibilites(format, Species, {gender?, level?, item?, ability?, moves[]?})`. We may know information like gender/level and can save time by just initializing the heap to the one value instead of looping through stats and then removing.
2. select `Spread` and `Level` (= **`Stats`**) - because these are coming from statistics (and thus have already passed validation) we know they *must* be valid (with some combination of other traits). EVs are trivial (outside of Farceus) as long as they add up to 510, Nature/IVs may cause validation errors based on events (and may restrict moves/ability etc). Similary, level can be greater than the maxLevel allowed for a format sometimes, but almost always using the format max level is going to be the choice (only beneficial to be lower level in niche FEAR or Trick Room cases that can mostly be ignored). We shouldn't need to revalidate here.
3. select **`Ability`** TODO
4. select **`Item`** TODO
5. select **`Moves`** TODO
6. allow the validator to fill in **`Shiny`** & **`Gender`** as necessary - these may be required for legality reasons and are mostly aesthetic anyway outside of niche Attract optimization etc
7. set **`Happiness`** based on moves (whether Frustration is present)

We can come back and run the final spreads through an EV optimizer (would be better if could also change Nature, but this might affect validation. Can mostly just adjust for Leftovers or completely wasted EVs).

## Heurstics

### Team

- **Stealth Rock**: teams should pretty much _always_ have one SR user (and shouldn't really have more than 1)
- **Spikes/Toxic Spikes**: teams should have at _most_ one user
- **Type Balance**: outside of monotype, a team should generally not all be the same type/weak to the same type
- **Team Synergy**: teammates should generally cover each others weakness, be able to pivot into each others counters, follow a theme (ie. not Bliss + sweepers)
- **Win Condition**: offensive presence (choice band/scarf or setup mon, residuals+toxic etc)
- **Trick Room**: if team has Trick Room, teammates should generally be slow, -Spe nature and run 0 IVs in Spe. At least 2 ways of setting up Trick Room
- **Weather**: 2+ weather setters and 2+ abusers

### Set

- **Bad Role**: mismatch of moves/spread/abilities/items. eg:
- **Redundant Moves**:
  - `Move | Spread`: Physical attacker with special EVs
  - `Move | Ability`: avoid Huge Power + Special Move, Physical Attacker w/ Special Move
  - `Move | Item`: setup moves + choice
  - `Move | Move`: in most cases, avoid moves which are too similar (Recover + Softboiled, Fireblast + Flamethrower)

## Approach

## Data

- **Teammate Stats** _local_ = per mon, individual weights of likelihood of each teammate
- **'Bigram Matrices'**: _global_, dependent probabilities, to save on size, only include if  _signficant_ (ie/ not hovering arround independent)
  - turn `Spread` into Physical/Special '`Bias`' spectrum (Mixed in middle). _What about Offensive vs. Defensive? Support?_
  - `Ability | Bias`
  - `Item | Bias`
  - `Item | Ability`
  - `Move | Bias`
  - `Move | Ability`
  - `Move | Item`
  - `Move | Move` Move Bigrams - `P(M1 | M2)` used to adjust weights. `P(Fire Blase | Flamethrower -> 0`, should weed out bad internal moveset combos)

## TODO

- **Stealth Rock** / **Spikes/Toxic Spikes/???**: some sort of hardcode?
- **Trick Room** / **Weather**: ???
