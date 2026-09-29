# ADR 0003: Swiss industrial print, full brand layer

Status: accepted

The site is a public surface, so it gets the full NOIR treatment from the brand system: bone-paper substrate, carbon ink, one red `signal` used only for the rule under the hero, hover and focus accents and the live status marker (well under 10% of any surface), square corners, a visible 4 or 12 column hairline grid, `[ 001 ]` case badges. Archivo at 62% width for display, IBM Plex Sans for body, IBM Plex Mono for data. Tokens are copied from the template's `tokens.css`; the dark theme flips them under `prefers-color-scheme`, with a lighter `signal` so it stays visible on ink.

Deliberate omissions: no grain, scanlines, gradients or shadows (the brand doc allows a costume on public pages, but the recruiter scene wants readability over atmosphere), no client JavaScript, no dark-only terminal look.

`signal` is never used for small text: it does not reach 4.5:1 on bone, so status is carried by the label and marker shape, colour is a second cue.
