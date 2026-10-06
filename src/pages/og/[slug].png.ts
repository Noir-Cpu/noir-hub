import type { APIRoute } from "astro";
import { loadHub } from "../../lib/hub";
import { renderCard, type Card } from "../../lib/og";

async function cards(): Promise<Record<string, Card>> {
  const hub = await loadHub();
  const out: Record<string, Card> = {
    home: { badge: "STELLENBOSCH, SOUTH AFRICA", title: "John Balogun", subtitle: "Computer Science Honours student, Stellenbosch University." },
    status: { badge: "[ 000 ]  UPTIME AND BUILD REPORT", title: "Status", subtitle: "A probe checks five NOIR sites every 10 minutes." },
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
