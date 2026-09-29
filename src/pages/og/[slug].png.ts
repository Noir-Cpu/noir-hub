import type { APIRoute } from "astro";
import { loadHub } from "../../lib/hub";
import { renderCard, type Card } from "../../lib/og";

async function cards(): Promise<Record<string, Card>> {
  const hub = await loadHub();
  const out: Record<string, Card> = {
    home: { badge: "[ 000 ]  FILE / NOIR", title: "John Balogun", subtitle: "Four software case files. Evidence, not claims." },
    status: { badge: "[ 000 ]  BUILD REPORT", title: "Status", subtitle: "What the last build could read from each case repository." },
  };
  for (const c of hub.cases) {
    out[c.slug] = { badge: `[ ${c.number} ]  CASE`, title: c.codename, subtitle: c.title, status: c.status };
  }
  return out;
}

export async function getStaticPaths() {
  return Object.keys(await cards()).map((slug) => ({ params: { slug } }));
}

export const GET: APIRoute = async ({ params }) => {
  const card = (await cards())[params.slug!]!;
  const png = await renderCard(card);
  return new Response(png as BodyInit, { headers: { "content-type": "image/png" } });
};
