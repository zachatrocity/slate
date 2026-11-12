# Slate

Self-hosted Markdown-to-slideshow and PDF publishing, with an optional Obsidian plugin for desktop and mobile.

Upload Markdown and local images, choose a Marp theme, and publish. Republishing a deck updates its existing URLs. The Obsidian plugin saves those URLs in note frontmatter. Preview reflects the last publish, not unsaved edits.

## Run with Docker Compose

Requires Docker with Compose. From this directory:

```sh
git clone https://github.com/zachatrocity/slate.git
cd slate
cp .env.example .env
openssl rand -hex 32
# Set PUBLISH_TOKEN in .env to the generated value.
docker compose up -d --build
```

Open http://localhost:3000. Enter your publishing token to publish a deck or import a theme. Data and themes persist in the `slate_data` Docker volume.

### Access from other devices

Set `PUBLIC_URL` in `.env` to the URL your clients will use. The default port binds only to localhost. Use an HTTPS reverse proxy for remote access; set `BIND_ADDRESS` to a reachable interface if needed. `PORT` controls the host port. A containerized reverse proxy can instead share a Docker network and route to `slate:3000`.

Run `docker compose up -d` after configuration changes. No particular VPN, domain, or proxy is required.

**Access model:** the publishing token protects writes. Slideshow, PDF, theme-list and setup pages do not require authentication. For private presentations, restrict access with a VPN or an authenticated reverse proxy. Use HTTPS outside localhost to protect publishing tokens in transit.

Back up the data volume and `.env`. Previous deck revisions are retained; automatic cleanup is not implemented. Do not commit `.env` or plugin settings containing tokens.

## Obsidian

1. Download the plugin ZIP from your server and extract `main.js` and `manifest.json` into `.obsidian/plugins/slate/` in your vault.
2. Reload Obsidian and enable Slate under Community plugins.
3. In Slate settings, enter your server URL and publishing token.
4. Open a Markdown note and run **Slate: Publish slides**.

For mobile, copy or sync the plugin files and settings using a method supported by your device, then enable the plugin. Your device must be able to reach the server. Publishing credentials are stored in plugin `data.json`, not in notes.

Separate slides with `---`. Example note:

```markdown
---
slide_theme: graph_paper
---
# My presentation

A short introduction.

---
# Second slide

More content.
```

Publishing writes `slide_id`, `slides_url`, `slides_pdf`, and `slide_theme` to frontmatter. Keep `slide_id` to update the same deck; remove it to publish a separate deck.

## Themes

Includes `slate`, Marp’s `default` / `gaia` / `uncover`, `graph_paper`, `dracula`, `nord`, `neobeam`, and `rose-pine` / `rose-pine-moon` / `rose-pine-dawn`. Select a theme on the website or set `slide_theme` in your note. See [theme sources and adaptations](themes/SOURCES.md) for pinned upstream revisions and license notices. Import standard Marp CSS containing `/* @theme name */` through the website. Find themes in the [Marp Community Themes gallery](https://rnd195.github.io/marp-community-themes/).

Use self-contained themes or themes based on the built-ins. External fonts and network assets are blocked during rendering. Import dependency themes individually. Check each theme's license before redistributing it; Graph Paper's license is included in `themes/`.

## Development and verification

```sh
npm ci
npm test
cd plugin
npm ci
npm run build
```

To run the service without Docker, install Chromium, set `PUBLISH_TOKEN`, `PUBLIC_URL`, and `CHROME_PATH`, then run `npm start`. `DATA_DIR` defaults to `./data`; the service listens on `PORT` (default 3000).

The browser smoke test creates a deck, republishes it, checks navigation, and downloads its PDF. Against a running server:

```sh
# Supply PUBLISH_TOKEN through your shell environment.
PUBLIC_URL=http://localhost:3000 CHROME_PATH=/usr/bin/chromium node test-live.mjs
```

Artifacts go to `output/` (override with `TEST_OUTPUT_DIR`). The smoke test retains its generated deck. Browser tests do not substitute for testing the Obsidian command on a physical phone.

## Current limits

PNG/JPEG/GIF/WebP images are supported. Note embeds, SVG, video, and reference-style images are not. Rendering is limited to one concurrent job, 150 slides, and 40 MB of images. This is a shared-token service, not a multi-user permissions system.

## Demo

Start with [the 16-slide showcase](examples/showcase.md). Keep its `assets/` folder alongside the Markdown file. It demonstrates formatting, code, math, image layouts and filters, gradients, pagination, and themes, and explains current viewer limits.

## License

MIT. Third-party themes retain their own licenses; see `themes/LICENSE_*` and [theme sources](themes/SOURCES.md).

## AI-assisted theme authoring

The repo includes the [`slate-theme` agent skill](.agents/skills/slate-theme/SKILL.md). Compatible agents can discover it under `.agents/skills`; other agents can read that file directly.

Example requests:

- “Use $slate-theme to create a warm minimalist business theme with a plum accent.”
- “Use $slate-theme with this Slidesgo or Google Slides template link as visual inspiration. Build an original Marp theme and editable example deck.”

The skill covers reference inspection, original design, offline-compatible CSS, Markdown layout classes, source/license notes, and visual verification. Its local preview helper produces screenshots, a PDF, and diagnostics through Slate’s renderer without a running server or publishing token. It is theme authoring, not automatic Google Slides/PPTX conversion. See the skill for invocation and browser requirements.

## Presenter mode

Open a published slideshow and choose **Presenter**. The presenter screen shows the current and next slides, notes, navigation, and a start/pause/reset timer. Choose **Open audience window**, move that clean window to your projector, and press **F** or double-click inside it for fullscreen. Escape exits fullscreen. If popups are blocked, use **Open manually**; if fullscreen is unsupported, maximize the window or use browser fullscreen.

Write notes as ordinary Marp comments:

```markdown
# Quarterly results
<!-- Mention that the comparison uses the same quarter last year. -->
```

Notes are displayed as plain text. Directive comments such as `<!-- _class: title -->` are not speaker notes. **Notes are embedded in the published HTML and accessible to anyone who can access the deck.** Audience mode hides them visually; it is not a secrecy boundary.

Synchronization uses BroadcastChannel between windows in the same browser profile and same deck/session URL. Separate presenter sessions do not control one another. This is not casting, cross-device remote control, or automatic monitor selection. Mobile browsers may restrict multiple windows and fullscreen; use a desktop connected to the projector for the intended flow. If synchronization is unavailable, the UI explains how to fall back to the regular slideshow.

Existing published HTML keeps its original viewer until the deck is **republished** after upgrade. Republishing retains its URLs. PDF exports remain slide-only, without notes or presenter controls.

Browser regression tests: `CHROME_PATH=/path/to/chrome npm run test:browser`. Tests exercise two-window navigation, session isolation, notes, timer controls, blocked popups/fullscreen, touch navigation, and print layout. A physical projector and real mobile multiwindow behavior still require manual acceptance testing.
