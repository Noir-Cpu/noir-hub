import { readFileSync } from "node:fs";
import { join } from "node:path";
import satori from "satori";
import { Resvg } from "@resvg/resvg-js";

// sRGB values of the NOIR tokens (light theme); satori cannot parse oklch().
const C = { ink: "#110f0d", bone: "#efebe2", graphite: "#615d59", smoke: "#d4d0ca", signal: "#d7352d" };

const font = (pkg: string, file: string) => readFileSync(join(process.cwd(), "node_modules", pkg, "files", file));
const fonts = () => [
  { name: "Display", data: font("@fontsource/archivo-narrow", "archivo-narrow-latin-700-normal.woff"), weight: 700 as const, style: "normal" as const },
  { name: "Mono", data: font("@fontsource/ibm-plex-mono", "ibm-plex-mono-latin-500-normal.woff"), weight: 500 as const, style: "normal" as const },
  { name: "Body", data: font("@fontsource/ibm-plex-sans", "ibm-plex-sans-latin-400-normal.woff"), weight: 400 as const, style: "normal" as const },
];

type Node = { type: string; props: Record<string, unknown> };
const h = (type: string, style: Record<string, unknown>, children?: unknown): Node => ({
  type,
  props: { style: { display: "flex", ...style }, children },
});

export type Card = { badge: string; title: string; subtitle: string; status?: string };

export async function renderCard(card: Card): Promise<Uint8Array> {
  const W = 1200, H = 630, P = 56;
  // Visible grid: 12 columns of hairlines.
  const lines = Array.from({ length: 13 }, (_, i) =>
    h("div", { position: "absolute", left: P + (i * (W - 2 * P)) / 12, top: 0, width: 1, height: H, background: C.smoke }),
  );
  const tree = h("div", { position: "relative", width: W, height: H, background: C.bone, flexDirection: "column", justifyContent: "space-between", padding: P, fontFamily: "Body" }, [
    ...lines,
    h("div", { justifyContent: "space-between", alignItems: "center", borderBottom: `3px solid ${C.ink}`, paddingBottom: 20, fontFamily: "Mono", fontSize: 26, letterSpacing: 2, color: C.ink }, [
      h("div", {}, card.badge),
      h("div", { alignItems: "center" }, [
        h("div", { width: 18, height: 18, marginRight: 12, background: card.status === "live" ? C.signal : "transparent", border: `3px solid ${card.status === "live" ? C.signal : C.ink}` }),
        h("div", {}, (card.status ?? "NOIR").toUpperCase()),
      ]),
    ]),
    h("div", { flexDirection: "column" }, [
      h("div", { fontFamily: "Display", fontWeight: 700, fontSize: card.title.length > 8 ? 210 : 260, lineHeight: 0.85, letterSpacing: -8, textTransform: "uppercase", color: C.ink }, card.title),
      h("div", { width: 90, height: 10, background: C.signal, marginTop: 28 }),
    ]),
    h("div", { justifyContent: "space-between", alignItems: "flex-end", fontSize: 30, color: C.ink }, [
      h("div", { maxWidth: 720 }, card.subtitle),
      h("div", { fontFamily: "Mono", fontSize: 24, letterSpacing: 2, textTransform: "uppercase" }, "John Balogun, NOIR"),
    ]),
  ]);
  const svg = await satori(tree as never, { width: W, height: H, fonts: fonts() });
  return new Resvg(svg).render().asPng();
}
