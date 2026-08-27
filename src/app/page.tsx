import TierProbe from "./_components/tier-probe";
import demoFont from "./demo-font.json";

/* The specimen line, and the copy around it, are the corpus: scripts/demo-font.mjs
   cuts the common tier from the words in this directory. Change the copy, run
   `pnpm demo:font`, and the two files below change with it. */
const SPECIMEN = "この見出しは、分割した書体で描かれています。";

function kib(bytes: number): string {
  return `${(bytes / 1024).toFixed(0)} KiB`;
}

function mib(bytes: number): string {
  return `${(bytes / 1024 / 1024).toFixed(1)} MiB`;
}

const CONFIG = `// unicode-range-split.config.js
export default {
  fonts: [
    {
      source: "src/fonts/NotoSansJP-400.ttf",
      family: "Noto Sans JP",
      outDir: "public/fonts",
      cssPath: "src/app/noto.css",
      // every file whose characters must be in the small tier
      scan: ["src", "content", "messages"],
    },
  ],
};`;

const USAGE = `import { splitFont } from "unicode-range-split";

const { css, tiers } = await splitFont({
  source: "src/fonts/NotoSansJP-400.ttf",
  family: "Noto Sans JP",
  outDir: "public/fonts",
  scan: ["src", "content"],
});

tiers.common.url; // "/fonts/NotoSansJP-400-common.1f4a9c2b.woff2"
tiers.rest.url;   // fetched only when a page needs one of its glyphs`;

const GENERATED = `@font-face {
  font-family: "Noto Sans JP";
  src: url("/fonts/noto-common.woff2") format("woff2");
}

@font-face {
  font-family: "Noto Sans JP";
  src: url("/fonts/noto-rest.woff2") format("woff2");
  unicode-range: U+4E18-4E19,U+4E32,U+4E39, /* …and the rest */;
}`;

function Bar({
  bytes,
  label,
  of,
  tone,
}: {
  bytes: number;
  label: string;
  of: number;
  tone: string;
}) {
  return (
    <div>
      <div className="flex items-baseline justify-between gap-4 text-sm">
        <span className="text-zinc-300">{label}</span>
        <span className="font-mono text-zinc-500">
          {bytes > 1024 * 1024 ? mib(bytes) : kib(bytes)}
        </span>
      </div>
      <div className="mt-1.5 h-3 rounded-full bg-white/5">
        <div
          className={`h-3 rounded-full ${tone}`}
          style={{ width: `${Math.max((bytes / of) * 100, 1.5)}%` }}
        />
      </div>
    </div>
  );
}

function Code({ children }: { children: string }) {
  return (
    <pre className="overflow-x-auto rounded-xl border border-white/10 bg-[#0d1413] p-5 font-mono text-[13px] leading-relaxed text-zinc-300">
      <code>{children}</code>
    </pre>
  );
}

export default function Home() {
  const { common, family, rest, source } = demoFont;

  return (
    <div className="min-h-screen bg-[#0b100f] text-zinc-200">
      <div className="mx-auto max-w-3xl px-6 py-16 sm:py-24">
        <header>
          <p className="font-mono text-xs tracking-[0.2em] text-emerald-500/80 uppercase">
            npm i -D unicode-range-split
          </p>
          <h1 className="font-display mt-4 text-4xl leading-tight font-bold text-white sm:text-5xl">
            Ship the font twice. Fetch it once.
          </h1>
          <p className="mt-5 text-lg leading-relaxed text-zinc-400">
            A CJK face is megabytes because it covers everything. Cut it down to
            the characters your site uses and the day someone writes a rare
            kanji, it falls out of your typeface. This splits the font in two
            instead, and drops nothing.
          </p>
        </header>

        <section className="mt-14">
          <p
            className="text-2xl leading-relaxed text-white sm:text-3xl"
            style={{ fontFamily: `"${family}", serif` }}
          >
            {SPECIMEN}
          </p>
          <div className="mt-8 space-y-5">
            <Bar
              bytes={source.bytes}
              label={`the whole font — ${source.characters.toLocaleString()} characters`}
              of={source.bytes}
              tone="bg-zinc-700"
            />
            <Bar
              bytes={common.bytes}
              label={`common tier — ${common.characters.toLocaleString()} characters, every page`}
              of={source.bytes}
              tone="bg-emerald-400"
            />
            <Bar
              bytes={rest.bytes}
              label={`rare tier — ${rest.characters.toLocaleString()} characters, on demand`}
              of={source.bytes}
              tone="bg-amber-400/70"
            />
          </div>
          <p className="mt-5 text-sm text-zinc-500">
            This page is set in the two files above, produced by this package
            from Noto Sans JP. Nothing here is a mock-up: the figures come from
            the build.
          </p>
        </section>

        <section className="mt-16">
          <h2 className="font-display text-xl font-bold text-white">
            Watch the second file arrive
          </h2>
          <p className="mt-3 mb-6 text-zinc-400">
            The text below is rendered in the split font. Green characters are
            in the file your browser already has. Type one that is not, and the
            browser fetches the other file — the readout is its own timing.
          </p>
          <TierProbe
            commonBytes={common.bytes}
            commonCodepoints={demoFont.commonCodepoints}
            family={family}
            restBytes={rest.bytes}
            restFile={rest.file}
          />
        </section>

        <section className="mt-16">
          <h2 className="font-display text-xl font-bold text-white">
            Point it at your font and your text
          </h2>
          <p className="mt-3 mb-6 text-zinc-400">
            It reads the files you name, keeps every character they use in the
            common tier, and puts everything else behind a{" "}
            <code className="font-mono text-emerald-300">unicode-range</code>.
            Run it whenever your writing changes; the site is not broken if you
            forget, it only fetches the second file more often.
          </p>
          <Code>{CONFIG}</Code>
          <p className="mt-4 font-mono text-sm text-zinc-500">
            npx unicode-range-split
          </p>
          <div className="mt-8">
            <Code>{USAGE}</Code>
          </div>
        </section>

        <section className="mt-16">
          <h2 className="font-display text-xl font-bold text-white">
            Why the order of the two rules matters
          </h2>
          <p className="mt-3 mb-6 text-zinc-400">
            The common tier is declared first with no range, so it claims every
            character. The rare tier follows with an explicit range, and the
            later rule wins for the characters it names. Swap them and the
            second file is never fetched.
          </p>
          <Code>{GENERATED}</Code>
        </section>

        <footer className="mt-20 flex flex-wrap gap-x-6 gap-y-2 border-t border-white/10 pt-8 font-mono text-sm text-zinc-500">
          <a
            className="hover:text-emerald-300"
            href="https://www.npmjs.com/package/unicode-range-split"
          >
            npm
          </a>
          <a
            className="hover:text-emerald-300"
            href="https://github.com/piro0919/unicode-range-split"
          >
            GitHub
          </a>
          <a className="hover:text-emerald-300" href="https://kkweb.io/">
            kkweb.io
          </a>
          <span className="ml-auto">MIT</span>
        </footer>
      </div>
    </div>
  );
}
