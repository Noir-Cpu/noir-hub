/**
 * Editorial copy for each case. Facts that change (status, links, CI, commits, releases)
 * come from the repo's noir.json and the GitHub API at build time, never from here.
 * `fallbackStatus` is only shown when no manifest could be read.
 */
export type CaseDef = {
  slug: string;
  number: string;
  codename: string;
  repo: string;
  title: string;
  verdict: string;
  brief: string[];
  fallbackStatus: string;
  fallbackStack: string[];
  lens: string;
};

export const OWNER = "Noir-Cpu";

export const CASES: CaseDef[] = [
  {
    slug: "witness",
    number: "001",
    codename: "WITNESS",
    repo: "noir-witness",
    title: "Verifiable polls for organisations",
    verdict: "Invite-only polls where every voter can check their own ballot and anyone can recompute the tally.",
    brief: [
      "Student societies and clubs vote through Google Forms or WhatsApp polls. There is no eligibility control, double voting is easy, and results are taken on trust.",
      "WITNESS is an invite-only poll service. Voters sign in with a passkey and vote once. Each voter gets a receipt code to confirm the ballot is on a public tamper-evident bulletin board.",
    ],
    fallbackStatus: "design",
    fallbackStack: [],
    lens: "Security, concurrency, cryptographic commitments",
  },
  {
    slug: "dispatch",
    number: "002",
    codename: "DISPATCH",
    repo: "noir-dispatch",
    title: "On-demand fuel delivery",
    verdict: "One dispatch engine behind three surfaces, exercised by a driver simulator.",
    brief: [
      "On-demand delivery means coordinating customers, stations and drivers in real time while money moves and order states change concurrently.",
      "DISPATCH is planned as a customer app, a driver app and an operations console on one dispatch engine, demonstrated with a simulator of virtual drivers.",
    ],
    fallbackStatus: "design",
    fallbackStack: [],
    lens: "Real-time systems, state machines, payments",
  },
  {
    slug: "informant",
    number: "003",
    codename: "INFORMANT",
    repo: "noir-informant",
    title: "Calibrated match forecasting",
    verdict: "Forecasts published before kickoff and committed so the track record cannot be edited afterwards.",
    brief: [
      "Prediction sites sell certainty and never show a verifiable track record.",
      "INFORMANT is a pipeline that ingests results after every match, updates models, and publishes win, draw and loss probabilities for upcoming fixtures before kickoff.",
    ],
    fallbackStatus: "collecting",
    fallbackStack: [],
    lens: "Data pipelines, modelling, calibration",
  },
  {
    slug: "wiretap",
    number: "004",
    codename: "WIRETAP",
    repo: "noir-wiretap",
    title: "An analytics warehouse over my own systems",
    verdict: "A small warehouse that listens in on the other cases and on this site's repo activity.",
    brief: [
      "Data roles screen for SQL, data modelling, pipelines, data quality and reporting. A notebook on a public dataset shows none of these.",
      "WIRETAP is planned as a production-shaped warehouse fed by the other NOIR cases, so the data keeps growing without manual collection.",
    ],
    fallbackStatus: "design",
    fallbackStack: [],
    lens: "SQL, data modelling, orchestration, data quality",
  },
];

export const STATUS_NOTE: Record<string, string> = {
  design: "Design only. No running system yet.",
  building: "Under construction.",
  collecting: "Running and collecting data. Results are not yet published.",
  live: "Live. The public URL is linked below.",
  template: "Repository scaffolded from the NOIR template. No case work published yet.",
};
