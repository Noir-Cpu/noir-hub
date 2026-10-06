import { parseSummary, SUMMARY_URL, type Summary } from "./uptime-view";

export type UptimeLoad = { summary: Summary | null; reason: string };

let memo: Promise<UptimeLoad> | undefined;

/** Reads summary.json from the status branch once per build. Failure is a normal state, never a build error. */
export function loadUptime(): Promise<UptimeLoad> {
  memo ??= (async (): Promise<UptimeLoad> => {
    try {
      const res = await fetch(process.env.UPTIME_SUMMARY_URL ?? SUMMARY_URL, { signal: AbortSignal.timeout(8000), headers: { "user-agent": "noir-hub-build" } });
      if (res.status === 404) return { summary: null, reason: "the status branch does not exist yet" };
      if (!res.ok) return { summary: null, reason: `the status branch answered HTTP ${res.status} at build time` };
      const summary = parseSummary(await res.json());
      return summary ? { summary, reason: "" } : { summary: null, reason: "summary.json did not have the expected shape" };
    } catch (e) {
      return { summary: null, reason: `summary.json could not be fetched at build time (${(e as Error).name})` };
    }
  })();
  return memo;
}
