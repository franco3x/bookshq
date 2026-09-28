# 7. Quote card image rendering: satori + @resvg/resvg-js

## Status

Proposed — not yet implemented or validated by building it. Update this ADR to "Accepted" once Phase 2 of the Quote Card Copy + Share feature (see `CLAUDE.md`) actually ships and the approach is confirmed to work end-to-end; if a different approach is used instead, supersede this ADR rather than editing it in place.

## Context

BooksHQ's "Share as Image" feature for highlights (quote cards) is currently non-functional: `server/services/image-generator.js` is a stub left over from a V1 attempt that used `node-canvas`, abandoned due to native-binding install issues (a common failure mode for `node-canvas` across different machines/Node versions/OSes). The stub returns an empty buffer, so the existing (partially wired-up) Share button in `HighlightCard.jsx` silently downloads a broken file today.

A new design for this feature (see the "Spec: Quote Card Copy + Share" section of `CLAUDE.md`) calls for multiple visual style presets (some using the book's cover image as a background) across four aspect ratios, inspired by Readwise's and Kindle's own quote-sharing UIs. This requires a real image-generation approach to replace the stub.

## Decision (proposed)

Use `satori` (the layout engine behind Vercel's OG image generation, which converts a JSX/HTML-like layout description to SVG using flexbox — no browser and no native canvas bindings needed for the layout step) to generate an SVG per style preset, then rasterize that SVG to PNG using `@resvg/resvg-js`. `@resvg/resvg-js` does use a native binary, but it ships broadly precompiled binaries for common platforms and has a better track record than `node-canvas` had for this project.

The alternative considered was a headless browser (Playwright/Puppeteer) rendering an HTML/CSS template to a screenshot — more flexible (arbitrary CSS, could reuse the app's existing Tailwind classes and CSS variables directly) but heavier to run per-request for a self-hosted single-user app. The plan is to use satori+resvg first, and only fall back to headless-browser rendering for a specific template if satori's flexbox-only layout model turns out too limiting (e.g. for effects like a blurred/darkened cover-image background in the "Cover Bleed" style preset).

## Consequences (anticipated — to be confirmed once built)

- Templates become declarative layout objects, which should make it straightforward to add the planned 4-5 style presets and reuse layout logic across the 4 aspect ratios.
- Avoids repeating the V1 `node-canvas` installation failure mode.
- `@resvg/resvg-js`'s native binary still introduces *some* platform-compatibility risk, even if lower than `node-canvas`'s historical track record — this should be explicitly verified during Phase 2 implementation (does it install cleanly, does it run correctly, particularly for whatever platform/architecture the self-hosted deployment actually runs on) before treating this ADR as validated.
- If satori's flexbox model can't express a needed visual effect for a given preset and headless-browser rendering has to be introduced instead, that's a partial reversal of this decision worth its own follow-up ADR rather than a silent scope change.
