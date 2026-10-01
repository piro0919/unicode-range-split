import type { SplitFontOptions } from "./split";

/** What a config file exports: one font, an array of fonts, or `{ fonts }`. */
export type Config =
  | SplitFontOptions
  | SplitFontOptions[]
  | { fonts: SplitFontOptions[] };

/**
 * Returns its argument unchanged. It exists so a JavaScript config file gets
 * the option types without a JSDoc annotation.
 */
export function defineConfig<T extends Config>(config: T): T {
  return config;
}
