import { CASES, OWNER, type CaseDef } from "../data/cases";
import { createClient, loadRepoFacts, type RepoFacts } from "./github";

export type CaseView = CaseDef & {
  facts: RepoFacts;
  status: string;
  stack: string[];
  liveUrl: string | null;
  links: Record<string, string>;
};

export type Hub = { builtAt: string; cases: CaseView[]; authenticated: boolean };

let memo: Promise<Hub> | undefined;

/** One fetch per build, shared by every page and image endpoint. */
export function loadHub(): Promise<Hub> {
  memo ??= (async () => {
    const client = createClient();
    const facts = await Promise.all(CASES.map((c) => loadRepoFacts(client, OWNER, c.repo)));
    const cases = CASES.map((c, i): CaseView => {
      const f = facts[i]!;
      const m = f.manifest;
      return {
        ...c,
        facts: f,
        status: m?.status ?? c.fallbackStatus,
        stack: m?.stack.length ? m.stack : c.fallbackStack,
        liveUrl: m?.liveUrl ?? null,
        links: m?.links ?? {},
      };
    });
    return { builtAt: new Date().toISOString(), cases, authenticated: Boolean(process.env.GITHUB_TOKEN) };
  })();
  return memo;
}

export const fmtDate = (iso: string) => iso.slice(0, 10);
