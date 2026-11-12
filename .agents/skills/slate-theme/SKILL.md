---
name: slate-theme
description: Create and refine original Slate-compatible Marp CSS themes from natural-language briefs or visual inspiration such as Slidesgo, Google Slides, PowerPoint templates, screenshots, and existing decks. Use for theme design and layout systems, not ordinary slide content editing.
---

# Slate theme authoring

Create a usable presentation system, not just a recolored title slide. Work in this repository; resolve all paths below relative to its root. This skill is repository-owned and can be edited with normal file tools.

## Establish the design direction

- For a prompt, infer a coherent palette, type hierarchy, spacing rhythm, and layout vocabulary from the audience and mood. State consequential assumptions; ask only if missing information prevents a useful design.
- For links or screenshots, read [reference-led design](references/inspiration.md). Inspect actual slide visuals before claiming to match them. A template URL is inspiration, not an instruction to import proprietary files or an assurance of redistribution rights.
- Produce a short design brief: audience, mood, colors with roles, available font stack, density, and intended layouts. Distinguish observed traits from your own design decisions.
- Do not force Slate’s purple branding onto every theme. Preserve the requested style. Prefer a distinct, original theme name rather than implying affiliation with the reference publisher.

## Build for Slate, not unrestricted HTML

Read `render.mjs`, `server.mjs`, an existing CSS theme, and `themes/SOURCES.md` before implementing. They define the current contract; do not silently expand renderer capabilities to make a design work.

- Save `themes/<slug>.css`, with a unique `/* @theme <slug> */` and normally `@import 'default';`. Use a lowercase hyphenated slug. Never overwrite an existing theme unless requested.
- Use self-contained CSS. Imports must resolve to built-in or bundled themes. Avoid remote fonts/assets and relative CSS asset URLs. Prefer installed fonts (`Noto Sans`, `Liberation Sans`, `Liberation Mono`, system fallbacks), CSS geometry, and local raster images in the example note. Document font substitutions.
- Scope rules to Marp slide content (`section`, headings, lists, tables, code, etc.); do not style Slate’s outer page, navigation, or controls. Define reusable color/spacing variables on `section` where practical.
- Slate disables author HTML. Make layouts work with standard Markdown and `<!-- _class: ... -->` directives. Do not require `<div>` wrappers, scripts, iframes, raw SVG, Mermaid, or per-note `style` frontmatter. Math already works through Marp.
- Frontmatter forwarded by the current renderer is limited. `slide_theme` selects the theme; `size`, `class`, `paginate`, `header`, `footer`, `backgroundColor`, and `color` are forwarded. Consult the code if this changes. CSS layout classes belong in the theme.
- Keep text selectable and notes editable; do not flatten whole slides into background images. Use raster assets only where they add value.

Cover the actual intended layouts: title, section divider, ordinary content, comparison/data, quote, image-with-text, code/math, and closing slide as appropriate. A small coherent set beats many fragile classes. Define and document only classes that work. Account for headers, footers, pagination, long titles, and the viewer’s bottom-right controls. Avoid blanket `overflow: hidden` or tiny type as a clipping fix.

Create `examples/<slug>.md` with `slide_theme: <slug>` and working examples of every new class. Keep fixtures neutral and reusable, with relative local image paths. Include representative long text, a table, fenced code, inline/display math, and an image split so the design is tested beyond its easiest slide. Explain how to choose the theme and use its layout classes in that file.

## Render, inspect, refine

Install dependencies with `npm ci` if absent. From the repo root:

```sh
npm test
CHROME_PATH=/path/to/chromium node .agents/skills/slate-theme/scripts/preview.mjs <slug>
```

The helper renders a standard stress deck through `render.mjs`, blocks network requests, and writes HTML, PDF, individual screenshots, and a diagnostic report under ignored `output/theme-previews/<slug>/`. It needs a local Chromium executable; the Docker image has `/usr/bin/chromium`. It does not publish or require a token.

Also render the theme’s actual example using the helper’s optional Markdown argument:

```sh
CHROME_PATH=/path/to/chromium node .agents/skills/slate-theme/scripts/preview.mjs <slug> examples/<slug>.md
```

Relative raster image paths in the supplied example resolve relative to that Markdown file. Inspect screenshots at presentation size and a phone-sized viewer. Review title wrapping, text contrast, data density, code/math, split backgrounds, footer/control collisions, and each custom class. Inspect the PDF pages too; a `%PDF` signature only proves a PDF was generated. Fix observed problems and rerun the affected checks. Report unverified browser/phone/projector behavior honestly.

The helper’s overflow report is advisory, not visual approval. Transforms, SVG containers, and deliberate bleed can defeat simple bounds checks. A successful Marp render does not prove the design is usable.

## Integrate and hand off

- Add an original-theme entry or adaptation record to `themes/SOURCES.md`. For reused source, record upstream URL/revision, retained license, and modifications. For inspiration-only work, label the URL as inspiration, not as the CSS source or license.
- Extend `test/themes.test.mjs` to exercise the new theme and its import dependencies. Run tests and `git diff --check`.
- Bundled `themes/*.css` are discovered by the server at startup; no hardcoded API registry is needed. A running deployment needs its normal rebuild/restart before the theme appears. Check whether README/UI/plugin theme lists need updates; if changing plugin code, rebuild the downloadable ZIPs as well.
- Creation does not itself authorize a production deploy, public push, or theme upload. Follow the user’s existing scope; do not ask again if publication/deployment is already authorized.
- Deliver CSS, editable example, source/license notes, reviewed previews/PDF, exact `slide_theme` value, and any limitations. Link the artifacts or deployed theme only when they exist. Do not claim a Google Slides/PPTX import or conversion: the output is a new Marp CSS theme.
