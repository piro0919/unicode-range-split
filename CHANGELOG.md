# Changelog

## 0.1.0

Initial release.

### Added

- `splitFont` and `splitFonts` — split a font into a common tier and a rare
  tier, write both, and return the `@font-face` rules that tie them together.
- `unicode-range-split` — the same thing from the command line, with a config
  file or flags.
- `collectText`, `toUnicodeRange` and `DEFAULT_ALWAYS_INCLUDE`, for callers that
  want the pieces rather than the whole.
