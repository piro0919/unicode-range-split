# Changelog

## Unreleased

### Changed

- **Potentially breaking:** the command line rejects a flag it does not know,
  and a `--format` outside `woff2`, `woff`, `truetype` and `sfnt`. Both used to
  be ignored, so a typo such as `--sacn` ran without the option it meant. A
  script that passes an unknown flag now fails.
- `engines.node` is `>=22`. Nothing was declared before.
- The package no longer ships `dist/bin.cjs`, `dist/bin.d.ts` or
  `dist/bin.d.cts`. The `unicode-range-split` command is unchanged.

### Added

- The command line warns on stderr when a `scan` path does not exist, and when
  scanning finds no character the font covers. The split still runs.
- `splitFont` returns `scan: { characters, missing }`, and `collect` returns the
  scanned text with the paths that were missing. `collectText` is unchanged.
- `splitFonts` and the command line throw when two fonts would write the same
  `id` to the same `outDir`, instead of the second deleting the first's files.
- `splitFont` throws on an unknown `format`.
- `defineConfig` and the `Config` type, for typed config files.
- `TARGET_FORMATS`, the formats `format` accepts.

## 0.1.1

### Fixed

- The fallback face's descriptors are written in alphabetical order. A
  stylelint config that orders descriptors rejected the generated CSS, and a
  file the caller does not write by hand is a poor place to take that failure.

## 0.1.0

Initial release.

### Added

- `splitFont` and `splitFonts` — split a font into a common tier and a rare
  tier, write both, and return the `@font-face` rules that tie them together.
- `unicode-range-split` — the same thing from the command line, with a config
  file or flags.
- `collectText`, `toUnicodeRange` and `DEFAULT_ALWAYS_INCLUDE`, for callers that
  want the pieces rather than the whole.
