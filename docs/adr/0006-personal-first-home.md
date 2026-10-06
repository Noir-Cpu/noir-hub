# ADR 0006: Home page leads with the person, NOIR is the second layer

Status: accepted

v0 was a case index with one line about the author. A visitor now arrives from a CV or a LinkedIn profile as often as from a repo, so the home page is ordered as a personal site: hero (name, one line, email button), About, Now, Projects, Teaching and work, Skills, Research interests, Contact. The four NOIR cases stay as case files inside Projects, and each case page keeps its brief, status and evidence panel. The brand layer is unchanged (ADR 0003); the case-file vocabulary stays in structure, not in the biography.

- **Email is the call to action.** It appears as visible text and a `mailto:` link in the hero and in Contact. It is public on purpose and appears in the Person JSON-LD. A form would need a backend and a spam defence; neither is warranted.
- **Facts live in `src/data/profile.ts`**, supplied by John from his CVs. Nothing else is claimed. The following are deliberately never published and are enforced by `tests/build.test.ts`: phone number (shape-based check), grades or any percentage outside the measured uptime figures, citizenship or visa wording, the unfinished BEng, and any PDF or Word file in `dist/`.
- **No CV file is hosted.** Both CV versions carry a phone number. A redacted copy is a TODO in `docs/NEXT.md`.
- **Percentages are measurements or nothing.** The build test removes `<probe-data>` regions (the uptime figures) before looking for metric-looking text, and checks those regions separately: figures only appear with a first-probe date and a probe count.
- **Competition numbers** (composite error 0.215 against 0.861 and 1.703) are John's own cross-validation results from his CV, worded as such. They are not reproduced or verified by this site.
- The `.cta` button uses ink on bone; `signal` appears on hover and press only, in line with ADR 0003.
