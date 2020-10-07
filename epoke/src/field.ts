import * as client from '@pkmn/client';
import {ID} from '@pkmn/data';

import {Battle} from './battle';
import {State} from './state';

const WEATHERS: {[id: string]: ID} = {
  sand: 'sandstorm' as ID,
  sun: 'sunnyday' as ID,
  rain: 'raindance' as ID,
  hail: 'hail' as ID,
  harshsunshine: 'desolateland' as ID,
  heavyrain: 'primordialsea' as ID,
  strongwinds: 'deltastream' as ID,
};

const TERRAINS: {[id: string]: ID} = {
  eletric: 'electricterrain' as ID,
  grassy: 'grassyterrain' as ID,
  misty: 'mistyterrain' as ID,
  psychic: 'psychicterrain' as ID,
};

export class Field extends client.Field {
  readonly battle!: Battle;

  constructor(battle: Battle) {
    super(battle);
  }

  toRef() {
    return '[Field]' as State.Ref<'Field'>;
  }

  toJSON(): State.Field {
    return this.instantiate();
  }

  instantiate(): State.Field {
    const weather = WEATHERS[this.weather!] || '' as const;
    const terrain = TERRAINS[this.terrain!] || '' as const;
    return {
      weather,
      weatherData: {id: weather} as State.ConditionState, // TODO
      terrain,
      terrainData: {id: terrain} as State.ConditionState, // TODO
      pseudoWeather: {} as {[id: string]: State.ConditionState}, // TODO
    };
  }
}

