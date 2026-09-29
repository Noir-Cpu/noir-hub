import { chromium } from "@playwright/test";
const b = await chromium.launch();
for (const [name, vp, scheme] of [["phone", { width: 390, height: 844 }, "light"], ["desk", { width: 1280, height: 800 }, "light"], ["dark", { width: 390, height: 844 }, "dark"]]) {
  const p = await b.newPage({ viewport: vp, colorScheme: scheme, reducedMotion: "reduce" });
  for (const path of ["/", "/cases/witness", "/status"]) {
    await p.goto("http://localhost:4321" + path);
    await p.screenshot({ path: `${process.argv[2]}/${name}-${path.replaceAll("/", "_")}.png`, fullPage: true });
  }
}
await b.close();
