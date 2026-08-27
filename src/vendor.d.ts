/* Neither package ships types, and both are used through a single call each. */
declare module "fontkit" {
  export function create(buffer: Buffer): { characterSet: number[] };
}

declare module "subset-font" {
  export default function subsetFont(
    font: Buffer,
    text: string,
    options?: { targetFormat?: "sfnt" | "truetype" | "woff" | "woff2" },
  ): Promise<Buffer>;
}
