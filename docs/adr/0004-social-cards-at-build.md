# ADR 0004: Social cards rendered at build with Satori

Status: accepted

One 1200x630 PNG per page (home, status, each case) is generated during `astro build` by Satori and resvg from the same fonts the site uses, so cards cannot drift from the page and need no design tool. Satori cannot read variable fonts or `oklch()`, so cards use the static Archivo Narrow 700 face and the sRGB equivalents of the tokens (noted in `src/lib/og.ts`).
