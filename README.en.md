# 香料图鉴-SpiceAtlas

English · [简体中文](README.zh-CN.md) · [User guide](docs/USER_GUIDE.en.md) · [MIT licence](LICENSE)

**A botanical reading desk for the ingredients behind everyday cooking.**

SpiceAtlas brings a searchable local catalogue, source-linked encyclopedia reading and ingredient images into one calm interface. Explore names and plant relationships, compare material forms, and follow a reference back to its original page. The project combines a Python service, a SQLite collection and a browser interface with English, Simplified Chinese and Traditional Chinese support.

![English main interface showing Basil, its nameplates and source-linked reading](docs/screenshots/main-en-basil.png)

*v0.7 English example: Basil. Screenshots supplied by the project owner retain source credits; they do not change the default startup ingredient. [Capture details and attribution](docs/screenshots/README.md).*

## What the current system does

| Area | Capabilities |
| --- | --- |
| Local discovery | Chinese/English/scientific-name and alias search, bounded spelling matching, hierarchical navigation, favourites and browsing history |
| Traceable reading | Wikipedia focus/full articles, language-link resolution, headings, citations, original hyperlinks and reviewed botanical source adapters |
| Ingredient images | Automatic Commons lookup, separate material/packaging filters, thumbnail/source/licence cards and original search links |
| Languages & translation | Auto / English / Simplified / Traditional interface modes; configurable LM Studio-compatible, Google Cloud and Azure translation for up to eight focus paragraphs |
| Personal collections | Named, editable workspaces with separate catalogues, settings, caches and logs; copy, switch, reorder, recover deleted workspaces |
| Reading experience | Immersive Wiki/Commons reading, language-ordered names, independent font families, light/dark themes, four motion levels, operation Back/Forward, random exploration and configurable paging shortcuts |
| Desktop operation | Windows background launcher, progress/details panel, tray controls and pause/resume notifications; console startup on macOS/Linux |
| Incremental upgrades | Manifest checks, original-folder updates, program backups and failure rollback while retaining personal data and the dependency environment |

The baseline contains **18,379 records**: **92 culinary candidates** and **18,287 botanical references**. These are not 18,379 verified edible spices. Thirteen examples have curated presentation fields; uncertain culinary identity remains explicit. The cleaning audit retains 699 exclusion, review and exact-identity merge decisions. Catalogue metadata was imported on 27 October 2026, with cleaning evidence obtained on 28 October; live sources have their own fetch times.

The v0.8 second review audits every bundled record by scientific identity, adds **1,046 sourced Chinese names**, and supplies **2,581 Chinese names / 2,906 English common names**. **15,798 Chinese common names remain unconfirmed** and are explicitly labelled; scientific names remain available. It also adds 148 checklist-based family/genus placements and Chinese labels for 448 of 959 category nodes. [Audit, full CSV and limitations](data/research_curation/name_audit_v08/README.md). CAS-derived naming data uses **CC BY-NC 4.0**, separately from the application’s MIT code; TaiCOL uses CC BY 4.0.

## A closer look

The exploratory reader keeps its chapter outline above the article. **Reading mode** hides the catalogue and source switches, centres the full Wikipedia body and available Commons images, and moves chapter navigation into a slim, expandable rail. Nameplates follow the interface language: English/Chinese, or Chinese/English; labels name the actual language. Each workspace can save title and article font families, with original family names and localized aliases. The **Aa** edge tab changes article size and spacing without scaling the whole interface. System reduced-motion preferences take priority over the four motion levels.

“Versions” in the application are editable **collection workspaces**, separate from application release numbers. Each keeps its own catalogue, settings, favourites, history, resource cache and operation counts. The manager registry and program-upgrade history sit outside these workspaces. Retained online resources keep their original source and fetch time; Refresh requests a newer copy.

## Run on your computer

This public repository distributes the local application; it is not a hosted web service. Python **3.11+** is required. First installation and new online references need internet access. Node.js is optional for developer UI checks.

**Windows:** extract the complete package into a writable directory and double-click **`run.cmd`**. Python with Tcl/Tk is needed for the desktop window. Startup stages appear before the browser opens; the service stays in the tray. Single-click the tray icon to show/hide the window, double-click to open the page, and use its menu to pause, resume or **Stop service & exit**. `run_console.cmd` provides a visible diagnostic fallback.

**macOS / Linux:** run `sh run.sh` and keep its terminal open. Ctrl+C stops the service.

For a source checkout:

```bash
git clone https://github.com/Bravoll/SpiceAtlas.git
cd SpiceAtlas
uv sync --frozen --inexact
uv run --no-sync python launch.py
```

Without uv, create a Python virtual environment, install `requirements.txt`, and run `python launch.py`. The default address is <http://127.0.0.1:8765>; an occupied port may cause the launcher to select a nearby free one. Open the address it reports. Opening `index.html` directly cannot use the backend.

**Already using v0.7?** Stop the old service, extract the **v0.7→v0.8** patch elsewhere, run **its** `Update_Atlas.cmd`, and select the original installation directory. A full v0.8 package also includes the actual **0.6→0.7→0.8** chain for older installations. Keep the path and `.venv`; do not replace your `data/` directory with a fresh baseline. [In-place upgrade guide](docs/UPGRADING.en.md). Automatic GitHub downloading is not implemented.

## How it fits together

| Component | Responsibility |
| --- | --- |
| Browser · HTML/CSS/JavaScript | Local catalogue UI, reading states, source cards, image references, accessible controls and motion |
| FastAPI service | Workspace-scoped APIs, sanitization, source/translation adapters, diagnostics and bounded requests |
| SQLite & local files | Catalogues, identity evidence, settings, history, caches, resumable imports and audit logs |
| Desktop launcher | Dependency preparation, owned service lifecycle, readiness checks, tray/window and live process log |
| External providers | Wikipedia / Commons / Wikidata, GBIF and reviewed websites; optional configured translation services |

Typing in the main search box queries local data. Selecting a record fetches online content. Idle warming retains frequently used references and favourites; depth-one predictions use bounded RAM. Source adapters have timeouts, reject stale responses, and keep links and provenance. A website without an official API is described as an HTML adapter, not an API.

## Sources, translation and practical boundaries

- **Wikipedia:** dedicated language controls resolve linked language editions and try identity-checked search when necessary. Missing Chinese can fall back to English. Other sources keep their separate preferred/secondary-language rows. Only automatically detected Simplified Chinese uses the domestic source order; manual language choices use the international order.
- **Images:** actual search terms are visible. Publicly readable search metadata can produce image cards, but Google/Baidu may return verification or dynamic pages. The latest Google Images probe returned no extractable images. Original-site links remain available. The [optional split helper](browser_helper/README.md) requires actual browser extension API support and is not installed automatically; it was fixture-tested, not installed/native-tested here.
- **Translation:** configure your own LM Studio / OpenAI-compatible endpoint, Google Cloud Translation or Azure Translator. Original and bilingual focus-paragraph views are supported. Full-article batch translation is not implemented; machine output needs checking. No translation key or local model is bundled.
- **Pronunciation:** available dictionary IPA/UK recordings retain their sources; browser speech prefers `en-GB`. Voice availability depends on the device. Mandarin pinyin is generated locally and labelled automatic. Latin scientific names are not synthesized.
- **Content quality:** botanical relatedness does not establish flavour equivalence, substitution or edibility. Source availability and copyright remain provider-specific. Website verification and framing restrictions are respected.

Personal keys, editable workspaces, caches, logs and downloaded media are excluded from Git and release bundles. Settings APIs hide saved secret values. Keep the local service on loopback and do not share personal workspace folders. See the [user guide](docs/USER_GUIDE.en.md) for source order, translation setup, caching, shortcuts and import controls.

## Project, licence and development

Created and maintained by **[Bravoll](https://github.com/Bravoll)** for learning, engineering practice and botanical/cooking curiosity. Original application code, icons and original documentation use the **[MIT License](LICENSE)**; MIT permits commercial reuse with its notice requirements. The project's educational purpose is not an extra noncommercial restriction.

Third-party encyclopedia text, taxonomy data, photographs, audio, fonts and dependencies retain their own terms. A search/API response is not a reuse licence. Read [content notices](CONTENT_LICENSES.md), the [Chinese licence explanation](LICENSE.zh-CN.md) and [screenshot attribution](docs/screenshots/README.md) before reusing those materials.

- [Full user guide](docs/USER_GUIDE.en.md) · [中文使用指南](docs/USER_GUIDE.zh-CN.md)
- [Chinese development guide](development.md) · [Cache design](docs/CACHE_DESIGN.zh-CN.md) · [Motion design](docs/MOTION_DESIGN.zh-CN.md)
- [Version history](CHANGELOG.md) · [Roadmap](docs/ROADMAP.zh-CN.md) · [Source research](docs/SOURCE_RESEARCH_v0.7.zh-CN.md)

```bash
uv run --no-sync python -m unittest discover -s tests -q
npm ci
npm run test:ui
```

The v0.8 release passes **227 backend tests** and **190 UI checks**, Chrome synthetic-layout observations and isolated actual-ZIP upgrades. See `data/verification_v08.json`; earlier v0.7 evidence remains separate. `npm run dev` is a labelled synthetic QA preview, not the Python service. Actual font installation/glyph coverage, local-font permission prompts, Windows native UI, default-browser association, personal translation credentials, audible speech and 120 Hz rendering remain target-device checks.

## What's new in v0.8 · 2026-11-01

- Focused reading with immediate local identity, staged full Wiki content, optional Commons image groups and a compact chapter rail; empty image forms are omitted.
- Actual-language name labels, automatic left/right order and a general 31-family font picker with localized aliases. Optional local font enumeration is initiated only by the user; its inventory stays in browser memory. Unsupported browsers retain the catalogue and manual family entry.
- Saved reading states and reversible return to exploratory sources, filters, image window and scroll; late responses cannot replace newer content.
- Real 0.7→0.8 patch and chained 0.6→0.7→0.8 upgrade support with the same third-party requirements.
- Fixed the optional developer preview entry point. Public README screenshots above remain owner-supplied v0.7 views; no startup default has changed.
- Stable chapter hit areas and explicit selection; exiting reading also restores whole-page scroll on narrow layouts.
- Exact-identity name audits, source evidence, per-workspace backup and conservative repairs that preserve custom names. Missing common names stay explicit.

[Complete changes and earlier releases →](CHANGELOG.md)


- Split helper 0.8.2 makes Edge support explicit and cleans up its source pane on Commons/Bing. Catalogue toggle/resize and narrow layouts are included. Adjust 2:1 manually with the browser divider. Reload the updated helper and refresh Atlas.
