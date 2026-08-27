import { describe, expect, it } from "vitest";
import {
  DEFAULT_ALWAYS_INCLUDE,
  toPredicate,
  toUnicodeRange,
} from "../src/ranges";

describe("toUnicodeRange", () => {
  it("collapses a run into one range", () => {
    expect(toUnicodeRange([0x41, 0x42, 0x43])).toBe("U+41-43");
  });

  it("writes a lone codepoint without a dash", () => {
    expect(toUnicodeRange([0x41])).toBe("U+41");
  });

  it("splits at a gap and sorts first", () => {
    expect(toUnicodeRange([0x50, 0x41, 0x42])).toBe("U+41-42,U+50");
  });

  it("is empty for no codepoints", () => {
    expect(toUnicodeRange([])).toBe("");
  });
});

describe("toPredicate", () => {
  it("covers Latin, kana and the fullwidth forms by default", () => {
    const isIncluded = toPredicate();

    for (const code of [0x41, 0x3042, 0x30a2, 0x3001, 0xff01]) {
      expect(isIncluded(code)).toBe(true);
    }
  });

  it("leaves the CJK block out, which is what makes the split worth doing", () => {
    expect(toPredicate()(0x6f22)).toBe(false);
  });

  it("takes ranges", () => {
    const isIncluded = toPredicate([[0x41, 0x5a]]);

    expect(isIncluded(0x41)).toBe(true);
    expect(isIncluded(0x61)).toBe(false);
  });

  it("takes a function", () => {
    expect(toPredicate((code) => code === 1)(1)).toBe(true);
  });

  it("exports the default ranges it uses", () => {
    expect(DEFAULT_ALWAYS_INCLUDE.length).toBeGreaterThan(0);
  });
});
