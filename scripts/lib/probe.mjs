// One request per site per run. A failed request is data: probeSite never throws.
export const USER_AGENT = "noir-hub-probe/1.0 (+https://github.com/Noir-Cpu/noir-hub; uptime check every 10 minutes)";
export const TIMEOUT_MS = 10_000;

/** Probe one URL once. ok means a final HTTP status 200 to 299 within the timeout. */
export async function probeSite(site, { now = () => new Date(), timeoutMs = TIMEOUT_MS, fetchImpl = fetch } = {}) {
  const t = now().toISOString();
  const started = performance.now();
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetchImpl(site.url, {
      method: "GET",
      redirect: "follow",
      signal: ctrl.signal,
      headers: { "user-agent": USER_AGENT, accept: "*/*" },
    });
    const ms = Math.round(performance.now() - started); // time to response headers
    await res.body?.cancel().catch(() => {});
    const ok = res.status >= 200 && res.status < 300;
    return { t, site: site.id, ok, status: res.status, ms, ...(ok ? {} : { err: `http ${res.status}` }) };
  } catch (e) {
    const timedOut = ctrl.signal.aborted;
    const code = e?.cause?.code ?? e?.code ?? e?.name ?? "error";
    return { t, site: site.id, ok: false, status: null, ms: null, err: timedOut ? "timeout" : String(code).slice(0, 60) };
  } finally {
    clearTimeout(timer);
  }
}
