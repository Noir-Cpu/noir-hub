import { createServer, type IncomingMessage, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { probeSite, USER_AGENT } from "../scripts/lib/probe.mjs";

let server: Server;
let base = "";
const seen: IncomingMessage[] = [];

beforeAll(async () => {
  server = createServer((req, res) => {
    seen.push(req);
    if (req.url === "/ok") res.end("fine");
    else if (req.url === "/boom") res.writeHead(503).end("no");
    else if (req.url === "/moved") res.writeHead(302, { location: "/ok" }).end();
    else if (req.url === "/slow") setTimeout(() => res.end("late"), 2000);
    else res.writeHead(404).end();
  });
  await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});
afterAll(() => {
  server.closeAllConnections();
  server.close();
});

describe("probeSite", () => {
  it("records ok, status and latency, with one request and the identifying User-Agent", async () => {
    seen.length = 0;
    const r = await probeSite({ id: "x", url: `${base}/ok` });
    expect(r).toMatchObject({ site: "x", ok: true, status: 200 });
    expect(r.ms).toBeGreaterThanOrEqual(0);
    expect(seen).toHaveLength(1);
    expect(seen[0]!.headers["user-agent"]).toBe(USER_AGENT);
    expect(USER_AGENT).toMatch(/noir-hub-probe/);
    expect(new Date(r.t).toISOString()).toBe(r.t);
  });
  it("treats a 5xx as data, not an exception", async () => {
    const r = await probeSite({ id: "x", url: `${base}/boom` });
    expect(r).toMatchObject({ ok: false, status: 503, err: "http 503" });
  });
  it("follows a redirect to the final status", async () => {
    expect(await probeSite({ id: "x", url: `${base}/moved` })).toMatchObject({ ok: true, status: 200 });
  });
  it("records a timeout without throwing", async () => {
    const r = await probeSite({ id: "x", url: `${base}/slow` }, { timeoutMs: 150 });
    expect(r).toMatchObject({ ok: false, status: null, ms: null, err: "timeout" });
  });
  it("records a refused connection without throwing", async () => {
    const r = await probeSite({ id: "x", url: "http://127.0.0.1:1/" });
    expect(r.ok).toBe(false);
    expect(r.status).toBeNull();
    expect(r.err).toBeTruthy();
  });
});
