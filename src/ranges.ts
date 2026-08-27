/**
 * Codepoints that stay in the common tier whether or not the scanned text uses
 * them: Latin, punctuation, box drawing, kana, and the fullwidth forms.
 *
 * Without this, adding one article that happens to use a bracket you had not
 * used before moves that bracket into the rare tier and makes ordinary pages
 * fetch it. The common tier should only change when the writing changes a lot.
 */
export const DEFAULT_ALWAYS_INCLUDE: [number, number][] = [
  [0x0000, 0x20ff],
  [0x2500, 0x25ff],
  [0x3000, 0x30ff],
  [0xff00, 0xffef],
];

export type AlwaysInclude = ((code: number) => boolean) | [number, number][];

export function toPredicate(
  alwaysInclude: AlwaysInclude = DEFAULT_ALWAYS_INCLUDE,
): (code: number) => boolean {
  if (typeof alwaysInclude === "function") return alwaysInclude;

  return (code) =>
    alwaysInclude.some(([from, to]) => code >= from && code <= to);
}

/**
 * Fold a set of codepoints into a `unicode-range` value, collapsing runs.
 * A CJK face leaves tens of thousands of codepoints in the rare tier; listing
 * them one by one produces a value browsers accept but no one can read.
 */
export function toUnicodeRange(codes: Iterable<number>): string {
  const sorted = [...codes].sort((a, b) => a - b);
  const runs: [number, number][] = [];

  for (const code of sorted) {
    const last = runs.at(-1);

    if (last && code === last[1] + 1) {
      last[1] = code;
    } else {
      runs.push([code, code]);
    }
  }

  return runs
    .map(([from, to]) => {
      const a = from.toString(16).toUpperCase();
      const b = to.toString(16).toUpperCase();

      return from === to ? `U+${a}` : `U+${a}-${b}`;
    })
    .join(",");
}
