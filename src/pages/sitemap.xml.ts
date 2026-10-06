import type { APIRoute } from "astro";
import { execFileSync } from "node:child_process";
import { loadHub } from "../lib/hub";

export const GET: APIRoute = async ({ site }) => {
  const hub = await loadHub();
  const paths = ["/", "/status", ...hub.cases.map((c) => `/cases/${c.slug}`)];
  // lastmod is the date of the commit being built, so it only moves when the content does (the site also
  // rebuilds daily). Falls back to the build date outside a git checkout.
  let lastmod = hub.builtAt.slice(0, 10);
  try {
    lastmod = execFileSync("git", ["log", "-1", "--format=%cs"], { encoding: "utf8" }).trim() || lastmod;
  } catch {
    // not a git checkout
  }
  const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${paths.map((p) => `  <url><loc>${new URL(p, site).href}</loc><lastmod>${lastmod}</lastmod></url>`).join("\n")}
</urlset>
`;
  return new Response(body, { headers: { "content-type": "application/xml" } });
};
