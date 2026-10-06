/**
 * Facts about John Balogun, written in his voice. Source: his CVs, supplied for this site.
 * Deliberately absent: phone number, grades, citizenship or visa status, any unfinished degree, any CV file.
 * tests/build.test.ts fails the build if any of those appear in the built pages.
 */
export const PERSON = {
  name: "John Balogun",
  email: "oluwasegunbalogun@outlook.com",
  linkedin: "https://www.linkedin.com/in/john-balogun",
  github: "https://github.com/Noir-Cpu",
  repo: "https://github.com/Noir-Cpu/noir-hub",
  jobTitle: "Computer Science Honours student",
  university: "Stellenbosch University",
  universityUrl: "https://www.sun.ac.za/",
  place: "Stellenbosch, South Africa",
} as const;

export const ONE_LINER =
  "Computer Science Honours student at Stellenbosch University. I tutor programming, build software in public, and I am interested in reliable LLM tutoring.";

export const ABOUT: string[] = [
  "I finished a BSc in Computer Science (Computer Systems) at Stellenbosch University in 2025 and I am now in the Honours year, which I expect to complete in November 2026. Since February 2025 I have been a tutor and teaching assistant in the department. Since August 2023 I have also built websites for clients at J&G Digital.",
  "Outside coursework I build projects in public. The four NOIR case files below are the larger ones. NOIR is the name I put on that work; on its own it is a film genre and a lot of brands, so it always appears next to my name.",
];
export const LOOKING_FOR =
  "I am looking for a first full-time role or an internship once my Honours year ends in November 2026, in software engineering or on a team building tools for learning.";

export const NOW: { title: string; text: string; href?: string; link?: string }[] = [
  {
    title: "Honours project",
    text: "In progress this year: a tool that turns patterns written in a small domain-specific language into diagrams you can interact with. It builds on an existing language and parser from earlier research by another author, and the scope is agreed with my supervisor.",
  },
  {
    title: "Tutoring",
    text: "Tutor and teaching assistant in Computer Science at Stellenbosch, including the first-year module Computer Science 144.",
    href: "#teaching",
    link: "Teaching and work",
  },
  {
    title: "NOIR cases",
    text: "Four public case files. Each one has a brief, a status read from its repository, and an honest note where there is no evidence yet.",
    href: "#projects",
    link: "The case files",
  },
];

export const PROJECTS: { name: string; meta: string; text: string }[] = [
  {
    name: "Golf-ball trajectory prediction",
    meta: "InRange student competition entry",
    text: "A physics-informed model: fit a drag, lift and sidespin ODE, then a LightGBM and Ridge ensemble on top. In my own 5-fold cross-validation for the competition, the composite error was 0.215, against 0.861 for the physics model alone and 1.703 for a naive baseline.",
  },
  {
    name: "SIMPL to JVM bytecode compiler",
    meta: "Aug to Nov 2024",
    text: "Lexing, parsing from an EBNF grammar, type checking and code generation.",
  },
  {
    name: "Machine learning from first principles",
    meta: "HMM, PCA, LDA",
    text: "Hidden Markov models (forward, Viterbi, Baum-Welch/EM, in log space) and PCA and LDA, each checked against scikit-learn.",
  },
  {
    name: "Othello engine",
    meta: "2025",
    text: "Minimax with alpha-beta pruning and a parallel search using MPI.",
  },
  {
    name: "Web-application security assessment",
    meta: "Technical report",
    text: "Found SQL injection and file-upload vulnerabilities and wrote them up in a technical report.",
  },
  {
    name: "GLYDE Payments",
    meta: "Industry-partnered project",
    text: "An expense-tracking and payment-splitting app built by a group of six. I led the three-person backend team.",
  },
  {
    name: "k-NN against classification trees",
    meta: "UNSW-NB15 dataset",
    text: "A comparison of the two classifiers, using Wilcoxon signed-rank tests to judge the differences.",
  },
  {
    name: "Ant-colony optimisation",
    meta: "Optimisation",
    text: "Graph colouring with an ant-colony optimisation algorithm.",
  },
];

export const EXPERIENCE: { dates: string; role: string; org: string; text: string[] }[] = [
  {
    dates: "Feb 2025 to now",
    role: "Tutor and teaching assistant, Computer Science",
    org: "Stellenbosch University",
    text: [
      "I tutor first- to third-year modules that use C, Arduino, Java and Python.",
      "As a teaching assistant for Computer Science 144, a first-year module of about 350 students, I mark Python tutorial submissions, assign students to tutorial sessions and answer their queries.",
    ],
  },
  {
    dates: "Aug 2023 to now",
    role: "Web developer",
    org: "J&G Digital",
    text: ["I have built more than six client websites, including online payments for one shop."],
  },
];

export const SKILLS: { group: string; items: string[] }[] = [
  { group: "Languages", items: ["Python (NumPy, scikit-learn)", "SQL", "Java", "C", "Haskell", "JavaScript and TypeScript", "x86 assembly"] },
  { group: "Databases", items: ["PostgreSQL", "SQLite", "MySQL"] },
  { group: "Tools", items: ["Linux", "Git", "LaTeX", "MPI", "OpenMP", "React and Next.js"] },
  { group: "In the NOIR cases, some still in design", items: ["Cloudflare Workers", "Neon Postgres", "Hono", "WebAuthn", "dbt", "DuckDB"] },
];
export const CERTIFICATIONS: string[] = ["Mendix Rapid Developer (2025)", "HyperionDev Software Engineering (2024)"];

export const RESEARCH: string[] = [
  "Reliable LLM tutoring",
  "Constrained and grammar-guided generation",
  "Knowledge tracing and adaptive learning",
  "Evaluation of AI systems in education",
];
