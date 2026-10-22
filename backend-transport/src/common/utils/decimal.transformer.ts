import { ValueTransformer } from 'typeorm';

/** PostgreSQL devuelve NUMERIC como string; lo convertimos a number. */
export const decimalTransformer: ValueTransformer = {
  to: (value?: number | null) => value,
  from: (value?: string | null) =>
    value === null || value === undefined ? value : parseFloat(value),
};
