import {Dex, ID, Species, Generation, StatsTable} from 'ps';
import {SetPossibilities} from './possibilities';
import * as calc from '@smogon/calc';

interface Pokemon<T> {
  species: string;
  level: number;

  ability: string;
  item: string;
  stats: StatsRange;
  moves: string[],

  // TODO need possibility Sets as well

  gender?: Gender,
  shiny?: boolean,
  hpType?: string,
}

// 1. Pokemon wraps PokemonSet (everything known, convert spread to Stats.toRange) or SetPossibilites
// -> add special logic for if StatsRange is fully collapsed!
// 2. take lowest attack for attacker and determine new range for defender
// 3. take take highest attack for attacker and determine new range for defender
// 4. remove points outside of the range for either and thats new range
// 5. HOWEVER, CANT FEED THIS BACK IN AS GUARANTEED BECAUSE ITEM AND ABILITIES MIGHT BE IN PLAY
//    this range is only valid for the ability and item in question, could be lower stats and 1.2x boosting item or similar
//
//
// want to run several calcs in parallel for each ability and item possibility (deduped)?
// = look at possible abilities and items with weight > certain threshold (dont need to be sorted/heap)
//
//
// Item class = instantiate the correct item for move (Thunderbolt + 1.2x boost class =  


function createPokemon(
  set: PokemonSet,
  gen: Generation,
  options: {
      abilityOn?: boolean,
      isMax?: boolean,
      boosts?: Partial<StatsTable<number>>,
      curHP?: number,
      status?: Status,
      toxicCounter?: number,
  } = {}
) {
  return new calc.Pokemon(
    gen,
    set.species, 
    Object.assign(options, {
      level: set.level,
      ability: set.ability,
      item: set.item,
      gender: set.gender,
      nature: set.nature,
      ivs: set.ivs,
      evs: set.evs,
      moves: set.moves,
    }));
}

function createMove(
  move: string,
  set: PokemonSet,
  gen: Generation,
  options: {
    useZ?: boolean,
    useMax?: boolean,
    isCrit?: boolean,
    hits?: number,
    usedTimes?: number,
    metronomeCount?: number,
    overrides?: Partial<MoveData>,
  } = {}
) {
  return new calc.Move(
    gen,
    move,
    Object.assign(options, {
      ability: set.ability,
      item: set.item,
      species: set.species,
    });
}
