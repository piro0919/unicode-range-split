export type FallbackFace = {
  /** `ascent-override`, e.g. "117%". */
  ascent?: string;
  /** `descent-override`. */
  descent?: string;
  /** The family name the site lists after the real one. */
  family: string;
  /** `line-gap-override`. */
  lineGap?: string;
  /** The installed face to borrow outlines from, e.g. "Arial". */
  local: string;
  /** `size-adjust`. */
  sizeAdjust?: string;
};

export type FaceInput = {
  display: string;
  fallback?: FallbackFace;
  family: string;
  style: string;
  weight: number | string;
};

export type FaceUrls = {
  /** The rare tier's `unicode-range` value. */
  unicodeRange: string;
  urls: { common: string; rest: string };
};

function face(
  { display, family, style, weight }: FaceInput,
  url: string,
  format: string,
  unicodeRange?: string,
): string {
  return `@font-face {
  font-display: ${display};
  font-family: "${family}";
  font-style: ${style};
  font-weight: ${weight};
  src: url("${url}") format("${format}");${
    unicodeRange === undefined ? "" : `\n  unicode-range: ${unicodeRange};`
  }
}`;
}

/**
 * The two `@font-face` rules, in the order that makes the split work.
 *
 * The common tier is declared first with no `unicode-range`, so it claims every
 * codepoint. The rare tier follows with an explicit range, and a later rule wins
 * for the codepoints it names. Swap the order and the rare tier never loads;
 * give the common tier a range of its own and every page pays to parse it.
 */
export function buildCss(
  input: FaceInput,
  { unicodeRange, urls }: FaceUrls,
  format: string,
): string {
  const rules = [
    face(input, urls.common, format),
    face(input, urls.rest, format, unicodeRange),
  ];

  if (input.fallback) {
    rules.push(buildFallbackFace(input.fallback));
  }

  return `${rules.join("\n\n")}\n`;
}

/**
 * A metric-matched face built from a font the reader already has. Without it the
 * line boxes change width the moment the real face arrives, and the text reflows
 * in front of them.
 */
export function buildFallbackFace(fallback: FallbackFace): string {
  const descriptors = [
    ["ascent-override", fallback.ascent],
    ["descent-override", fallback.descent],
    ["line-gap-override", fallback.lineGap],
    ["size-adjust", fallback.sizeAdjust],
  ].filter((entry): entry is [string, string] => entry[1] !== undefined);

  return `@font-face {
  font-family: "${fallback.family}";
${descriptors.map(([name, value]) => `  ${name}: ${value};`).join("\n")}
  src: local(${fallback.local});
}`;
}
