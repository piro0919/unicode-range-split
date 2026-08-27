"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

type TierProbeProps = {
  commonBytes: number;
  commonCodepoints: number[];
  family: string;
  restBytes: number;
  restFile: string;
};

/* Written as codepoints on purpose. The common tier is cut from the words in
   this directory, so a rare kanji spelled out in the source would be swept into
   the common tier and stop being rare. */
const RARE = [0x9b31, 0x9f57, 0x947e, 0x8e87, 0x9dfa]
  .map((code) => String.fromCodePoint(code))
  .join("");

const SAMPLES = [
  { label: "ordinary Japanese", text: "この文字はすでに手元にあります。" },
  { label: "rare kanji", text: RARE },
];

function size(bytes: number): string {
  return bytes >= 1024 * 1024
    ? `${(bytes / 1024 / 1024).toFixed(1)} MiB`
    : `${(bytes / 1024).toFixed(0)} KiB`;
}

/**
 * The demo is the page itself. What you type is rendered in the split font, so
 * a character from the rare tier makes the browser go and get that file — and
 * the readout below is the browser's own resource timing, not a simulation.
 */
export default function TierProbe({
  commonBytes,
  commonCodepoints,
  family,
  restBytes,
  restFile,
}: TierProbeProps) {
  const [text, setText] = useState(SAMPLES[0]?.text ?? "");
  const [fetched, setFetched] = useState<null | number>(null);
  const common = useMemo(() => new Set(commonCodepoints), [commonCodepoints]);

  const characters = useMemo(
    () =>
      [...text].map((character, index) => ({
        character,
        inCommon: common.has(character.codePointAt(0) ?? -1),
        key: `${index}-${character}`,
      })),
    [common, text],
  );

  useEffect(() => {
    const record = (entries: PerformanceEntryList): void => {
      for (const entry of entries) {
        if (!entry.name.includes(restFile)) continue;

        const timing = entry as PerformanceResourceTiming;

        /* transferSize is 0 when the file came out of the cache. The file is
           the size it is either way; say so rather than printing "0 KiB". */
        setFetched(timing.transferSize > 0 ? timing.transferSize : restBytes);
      }
    };
    const observer = new PerformanceObserver((list) =>
      record(list.getEntries()),
    );

    observer.observe({ buffered: true, type: "resource" });

    return () => observer.disconnect();
  }, [restBytes, restFile]);

  const insert = useCallback((sample: string) => setText(sample), []);
  const waiting = characters.every(({ inCommon }) => inCommon);

  return (
    <div className="rounded-2xl border border-emerald-900/40 bg-[#0d1413]">
      <div className="flex flex-wrap items-center gap-2 border-b border-emerald-900/40 px-4 py-3">
        <span className="font-mono text-[11px] tracking-wide text-emerald-500/80 uppercase">
          Type something
        </span>
        {SAMPLES.map((sample) => (
          <button
            className="rounded-full border border-emerald-900/60 px-3 py-1 text-xs text-emerald-300 transition-colors hover:bg-emerald-950"
            key={sample.label}
            onClick={() => insert(sample.text)}
            type="button"
          >
            {sample.label}
          </button>
        ))}
      </div>

      <textarea
        aria-label="Text to render in the split font"
        className="w-full resize-none bg-transparent px-5 py-6 text-3xl text-zinc-100 outline-none"
        onChange={(event) => setText(event.target.value)}
        rows={2}
        spellCheck={false}
        style={{ fontFamily: `"${family}", serif` }}
        value={text}
      />

      <div className="flex flex-wrap gap-1.5 border-t border-emerald-900/40 px-5 py-4">
        {characters.map(({ character, inCommon, key }) => (
          <span
            className={`rounded-md px-2 py-1 text-lg ${
              inCommon
                ? "bg-emerald-950/60 text-emerald-200"
                : "bg-amber-500/15 text-amber-300"
            }`}
            key={key}
            style={{ fontFamily: `"${family}", serif` }}
            title={inCommon ? "common tier" : "rare tier"}
          >
            {character}
          </span>
        ))}
      </div>

      <div className="border-t border-emerald-900/40 px-5 py-4 font-mono text-xs">
        <p className="text-zinc-400">
          <span className="text-emerald-300">
            common tier {size(commonBytes)}
          </span>{" "}
          — fetched when this page loaded.
        </p>
        <p className="mt-2 text-zinc-400">
          {fetched === null ? (
            <>
              <span className="text-zinc-500">
                rare tier {size(restBytes)} — not fetched.
              </span>{" "}
              {waiting
                ? "Every character above is in the file you already have."
                : "Waiting for the browser to ask for it."}
            </>
          ) : (
            <>
              <span className="text-amber-300">
                rare tier {size(fetched)} — fetched just now.
              </span>{" "}
              A character on this page was not in the common tier, so the
              browser went and got the other file.
            </>
          )}
        </p>
      </div>
    </div>
  );
}
