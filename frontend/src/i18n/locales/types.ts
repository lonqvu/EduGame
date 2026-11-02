/** Every string of a translation: the shape of the Vietnamese source, any text. */
export type Strings<T> = { [K in keyof T]: T[K] extends string ? string : Strings<T[K]> }
