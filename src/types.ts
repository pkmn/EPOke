import { ID } from 'ps';

export type DeepReadonly<T> = T extends primitive ? T : DeepReadonlyObject<T>;
type primitive = string | number | boolean | undefined | null | Function | ID;
type DeepReadonlyObject<T> = {
  readonly [P in keyof T]: DeepReadonly<T[P]>;
};
