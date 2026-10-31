# Spice Atlas

English · [简体中文](../README.zh-CN.md) · [Release history](../CHANGELOG.md)

A local botanical reading desk for exploring herbs, spices and their sources. Search a catalogue stored on your computer, open live encyclopedia articles and ingredient images, and keep the references beside what you read. Material colours, quiet typography and botanical transitions give each ingredient its own atmosphere.

**Local-first catalogue · live references · bilingual reading**

The public repository contains the application source. Run the Python service on your own computer; the repository is not a hosted copy of the application. The current feature set is described in the [release history](../CHANGELOG.md).

## Start locally

Python **3.11 or newer** is required. The first dependency installation and new online content require internet access.

**Windows:** extract the complete release into a writable folder and double-click `run.cmd`. The **香料图鉴 - Spice Atlas** window shows startup stages while packages and the server run without a persistent console. The page opens after its local API is ready. Windows first uses the default Shell browser handler; the console entry waits up to 120 seconds for the matching local app, with proxy-free loopback checks. A tray single click shows/hides this window; a double click opens the page. The tooltip shows the application name. The tray menu also offers **Pause / Resume service**, logs and **Stop service & exit**. Closing the window hides it; the service continues. If the tray is unavailable, the window remains available. The native launcher requires Python with **Tcl/Tk**; `run_console.cmd` is the console fallback.

**Show details / Hide details** toggles a live terminal panel with a vertical scrollbar and **Jump to latest**, including later HTTP requests, source reads, control actions and UI identifiers. The file log continues while the panel is hidden; the browser event bridge sends control identifiers instead of entered values, and HTTP tracing omits request bodies and authentication headers. Import progress remains auditable; sensitive fields are redacted. Pause keeps the client and port alive, rejects new content API work, and pauses diagnostics and imports; in-flight external work may take its bounded timeout to settle. A persistent notice reaches the page before the content gate closes. Resume reuses the same service and adds a notice with **Retest connections**; automatic diagnostics wait for that deliberate retest. The launcher fits its measured content, including wrapped status text and both rows of styled controls, and remembers separate compact/details sizes.

The progress percentage represents completed stages, not a download measurement: package checks begin at 30%, server readiness waits at 90%, and the browser opens after readiness. Startup logs are in `data/launcher/logs/`. A second launch from the same folder reopens the running instance. When port 8765 is occupied, the launcher can use a nearby free port and opens its actual address. The Windows tray and progress UI still require validation on a Windows device; the automated lifecycle tests run separately.

**macOS / Linux:** run `sh run.sh` in the extracted folder. Keep the terminal open; Ctrl+C stops the service. The default local address is <http://127.0.0.1:8765>.

| Setup | Commands |
| --- | --- |
| With uv | `uv sync --frozen --inexact`, then `uv run --no-sync python launch.py` |
| With pip | Create a virtual environment, install `requirements.txt`, then run `python launch.py` from that environment |
| Alternate port | `python launch.py --port 8766` |

Use the local HTTP address. Opening HTML directly cannot connect to the Python API. Node.js is optional and used only for developer checks and the synthetic preview.

**Existing installation:** use the small v0.7→v0.8 update bundle (v0.6 needs the full v0.8 package), or the full new release's `Update_Atlas.cmd`. Select your existing folder after choosing **Stop service & exit**. The manifest-based updater retains its path, `.venv`, all named workspaces, history, settings and caches, with backups and whole-chain rollback. It does not replace your database with the release baseline. See [Upgrade in place](UPGRADING.en.md). Fresh installations still use `run.cmd`.

The Git checkout stores the baseline as `data/catalogue.sqlite3.gz`. First launch verifies its size and SHA-256 before restoring SQLite. Existing databases are preserved. Portable ZIP releases contain the plain baseline and require no manual decompression.

Two language-ordered nameplates occupy the hero. Font choices are independent; Settings saves each workspace's defaults. The reader uses the full content width with its chapter outline above it. Wiki and its language selector sit at the upper right of the knowledge heading, with the short source note next to the title.

Image results show the actual search terms. Readable public HTML metadata can form local thumbnail/title/source cards. Google/Baidu verification or frame restrictions remain possible. An [optional native split helper](../browser_helper/README.md) can open the original site beside Atlas when the actual browser API supports it; it is not installed automatically. The ordinary new-tab links remain available.

**Updating the split helper:** This release includes helper 0.8.2. Reload its card in extension management, then refresh Atlas; refreshing the page alone does not reload the extension. Restricted sources automatically attempt a split, and the split button reconnects and retries. The source area shows the version, connection and API status. Use the browser where it is installed; embedded app windows do not share another browser’s extensions.

## Immersive reading and fonts

Select an entry and choose **Reading mode**. The page keeps Home, local header search, theme and Aa while hiding the catalogue and provider/form switches. Local names, scientific identity, pinyin and pronunciation appear immediately; the complete Wiki body is shown once ready. Commons groups appear only when pictures are returned, with file links, authors and licences. Up to eight forms are queried with two concurrent workers, at most three pictures per group and a 40-second image-round limit.

The slim chapter rail expands on hover, focus or tap. A completely visible section wins first, then visible height; sufficiently visible child sections take priority, with a small stability margin. Translation remains limited to focus paragraphs, so translated/bilingual views hide the full-body chapter marks and retain their scope notice. Wiki failures reach a retry state rather than loading forever.

**Exit reading** restores the previous source, forms, image window and position. If you selected another entry, its exploratory sources start from defaults. Back/Forward includes mode, names and fonts. Home clears temporary choices without clearing favourites, history, settings or statistics. Reading mode does not warm unrelated exploratory providers.

English UI puts English on the left and Chinese on the right; both Chinese variants reverse that order. Labels name the actual language. Future language pairs and `localized_names` fields are prepared, but no additional UI language is enabled in v0.8. Common English names versus Latin scientific names are independent of their font family.

Exploratory title selectors are temporary choices; Settings saves Chinese (for the current variant) and English defaults per workspace. Aa separately previews and saves article fonts. The catalogue contains 31 families, showing their original name plus a recorded localized alias when available. These aliases are not claims of official trademark translations or of installed glyph coverage.

When supported, **Read local fonts** in Aa asks the browser for permission only after you click. The resulting family inventory stays in page memory; it is not uploaded with settings. If the API is unavailable or permission is denied, use the catalogue or enter a system family name manually. A listed font may be missing on your device, in which case the browser falls back. No font is installed or downloaded by this feature.

## Explore the collection

1. Choose **Auto, Simplified Chinese, Traditional Chinese or English** in the header.
2. Search names, scientific names or recorded aliases in the left catalogue. Typing queries only the local database.
3. Select a record to fetch its article and automatically query Wikimedia Commons. Source links, citations, authors and file licences remain accessible.
4. Switch material forms, such as fresh leaves and dried flakes. The independent image filter also supports powder, seeds, bark, buds, roots, slices, jars and bags.
5. Use **Back / Forward** to revisit reading states, or **Surprise me** to discover another local record.
6. Open the **Aa** edge tab to adjust article typography independently. Click outside or Done to save and close.

The desktop catalogue uses bounded regions for the current level/count, subcategory path and children, entries with an always-visible range/pager, and collection totals. Page capacity follows the available height; records do not extend below the pane. Subcategory paths stay at the top of their region. Paging controls stay under the mouse while the content changes, then move smoothly to their new position after it leaves. Imports and catalogue management are in Settings. Narrow screens use ordinary page scrolling. The image toolbar groups its heading and form filter on the left, and source choices and external links on the right, with space between them.

### Reading comfort and motion

Article size ranges from 14–28 px, with quick presets, adjustable line spacing and serif, sans-serif or Kai-style typefaces. Available fonts depend on the operating system. Interface text keeps its own size.

| Level | Behaviour |
| --- | --- |
| 0 · Still | No application animation or smooth scrolling |
| 1 · Minimal | Short feedback and simple fades |
| 2 · Refined | Reading transitions, sliding drawer and theme reveal |
| 3 · Botanical | Thumbnail-aware popups, a small local colour glow, staggered lists, short word/character flips, source text fades, supported native picker transitions and arriving source cards |

System reduced motion overrides all levels. CSS and native browser animations avoid a fixed frame timer. Actual frame rate depends on the display, browser and device; 120 Hz playback has not been measured here. Theme colours apply in the input event, without taking a full-page View Transition snapshot. Motion uses at most 64 simultaneous English-word / Han-character / punctuation units in short visible text; tables and long prose keep normal layout. Unsupported animated select pickers retain the operating system menu.

### Pronunciation

English common names show sourced IPA when returned by **Free Dictionary API / Wiktionary**. Playback first uses a recording explicitly marked UK / GB. Otherwise, browser **Web Speech** requests `en-GB` and prefers an installed British voice. If none is installed, the interface explains that the available accent depends on system voices. No user API key is required.

Missing IPA is not invented, and Latin scientific names are not synthesized. Mandarin pinyin is generated locally by **pypinyin**, labelled automatic, and may need checking for polyphonic characters or proper names. Dictionary/audio links retain sources and supplied licensing information. Audio is not bundled.

### Navigation and startup

The floating navigation bar stays at the upper left of the reading pane while the article scrolls. **Back / Forward** remembers up to **60 reading states** in the current tab, separately for each workspace: record, material form, source, image filter, catalogue query/position, reading mode and scroll positions. After going back, a new reading action discards the forward branch. These controls do not undo settings, favourites or database edits. Clicking the Spice Atlas title returns to the Basil home view and clears temporary paths/filters/source windows, while keeping history, favourites, settings and accumulated statistics. Loading an article no longer resets scrolling performed while waiting.

Settings → Reading & language lets startup continue the last reading, always open **Basil**, or select a random local record. A fresh workspace starts with Basil. Explicit entry URLs and a service-change reload continuation take priority. Random exploration defaults to culinary candidates, excludes the current record, and can optionally include botanical references, which are not evidence of edibility.

### Keyboard shortcuts

| Key | Action |
| --- | --- |
| **R** · Repeat | Repeat the last eligible action against the current state, such as the next catalogue page |
| **[ / ]** | Previous / next subcategory page |
| **, / .** | Previous / next entry page; N / P remain aliases |
| **Alt + ← / →** | Back / Forward through reading states |
| **Esc** | Close the active popup; return an expanded source window inline |
| **/** | Focus local search |
| **← / →** in the image viewer | Previous / next image |
| **?** | Open the shortcut reference |

Settings → Cache & shortcuts lets you change the four subcategory/entry keys independently. The floating **R** control names the repeatable action. At list boundaries it stops; repeated requests during loading are coalesced. Single-letter commands do not fire in input fields, selects, editable text or IME composition, and commands stay within the active popup. Keys typed inside an external source window belong to that source. Esc closes a surface; it does not undo a database change.

## Languages and source order

Interface language, preferred article language and translation target are separate settings.

| Interface mode | Preferred-language sources |
| --- | --- |
| **Only Auto**, when the browser resolves to Simplified Chinese | Baidu Baike → Bing China → other resources, including available Wikipedia |
| Auto English / Traditional Chinese; every manual language mode | Matching Wikipedia → Bing International → Google → other resources |

The other language follows afterwards. Manual Simplified Chinese uses the international order. Wikipedia has its own button and English / Simplified / Traditional selector. Language links are resolved from the English article; if Chinese is unlinked, independent Wikipedia search must pass a scientific-name or identity check. Known Chinese mappings can load without waiting for background discovery. Missing Chinese falls back to English; connection failure remains distinct from absence. Changing interface language clears obsolete explicit Wiki selection, with ordered saves and stale-response guards.

Wikipedia supports live API articles, focus/full views, outlines, citations and source hyperlinks. Automatic reading retains the v0.6 Wikipedia fallback order even when a short connection probe is inconclusive; a search page never silently replaces a mapped Wiki article. Bing / Google can show labelled public search results in the reader. Reviewed links can be opened as sanitized articles without leaving the atlas; detail views participate in Back / Forward. GBIF uses v2 taxonomy JSON with v1 compatibility; NParks, ICAR and other reviewed hosts use bounded HTML readers. Wikidata renders structured names. Unreadable, client-rendered or verification-gated pages retain a clear status and original-site link. Name-label typography is a modern design treatment, not historical evidence.

If a search response contains only a dynamic shell, the reader can show the original search frame when the response permits embedding. Redirects stay within the approved HTTPS search-engine hosts. This is a fallback attempt, not a guarantee: this round's live Bing response had no extractable text results, and Google text search timed out.

Non-Wiki sources load and refresh independently of Wiki language discovery. Partial failures preserve verified language links with an unconfirmed status. Obsolete detail and translation tasks cannot override a newer entry or an explicit return to original text. See the [Chinese review notes](V07_REVIEW4.zh-CN.md) for the failure cases and test boundaries.

### Other knowledge sources

**Other sources** opens a horizontal reading collection. Complete articles appear in the order they finish, in tall cards with independently scrolling bodies, headings, original hyperlinks, source URLs and applicable terms. New cards enter from the right; the rail follows them only while you are already at its end. **Stop requests** keeps completed cards. Refreshing or selecting another record cancels the previous round.

The registry now contains **21 provider groups**: the original 19 plus Baidu Baike and McCormick public-page adapters. The **257 candidate links** were discovered for a reproducible **184-record sample** of the 18,379-record catalogue. It includes Kew, World Flora Online, IPNI, NParks, university extensions and regional floras, alongside Wikispecies, Wikibooks and GBIF APIs. A candidate link is not a promise of readable content. New names use public API/name candidates and optional Google / Bing International / Bing China first-page discovery, restricted to reviewed hosts. Login, verification, missing pages and unsuitable text are reported rather than substituted with invented articles.

Settings → Network & diagnostics controls the **per-source timeout (25 s)**, **whole-round timeout (35 s)**, **card limit (6)** and optional search discovery. HTML is sanitized; active content and remote article images are removed. Existing heading IDs and hyperlinks are remapped. Other-source cards currently retain their original language; the focus-paragraph translation controls below apply to the Wikipedia reader.

The original named-engine investigation did **not** yield extractable results in this environment. Its recorded outcome is preserved; current adapter checks are stored separately. The sample's supplemental search-service research is recorded separately. Live smoke checks returned seven cards across Parsley, Oregano and one botanical reference; generic HTML sites also encountered DNS limits. These checks do not establish that every registered site is readable. See the [Chinese source investigation](SOURCE_RESEARCH_v0.7.zh-CN.md) and [current adapter fixes](V07_REVIEW3.zh-CN.md).

## Live images and source windows

On record or form selection, the browser automatically queries the official **Commons CORS API**, with the backend as fallback. Known curated file references first obtain current Commons metadata and licensing; keyword queries remain the fallback. The first usable result can render without waiting for unrelated searches. Images normally use remote thumbnails. A failed image URL gets one backend-delivery attempt. The application bundles no standalone gallery photographs; the README includes two attributed interface screenshots.

The 12-profile image vocabulary is based on 39 recorded Commons searches across 30 representative materials and 326 returned filenames. Results are candidates, not verified identifications. Packaging queries affect images only. Empty results are preserved rather than replaced with unrelated forms.

The source window defaults to **Responsive width**: its iframe uses the actual available container width at scale 1. **Scaled preview** is an optional overview based on the browser viewport width. **Expand window** opens the same iframe across almost the entire browser viewport; Return inline or Esc restores it without replacing the iframe, so source inputs and scroll state are retained. Container and browser changes recalculate the dimensions. Frame capability is tested from the actual response for every supported provider. Public result metadata can render as a local gallery when available. The tested Google Images response has SAMEORIGIN; Baidu redirected to verification, while Bing permitted a frame attempt. These are not presented as fixed, embeddable original sites. Cross-origin layout, access and embedding permissions remain controlled by the source; the app does not strip security headers or proxy an active search site.

Images retain file pages, authors, original URLs and supplied licences. API access, search results and hotlinking do not grant reuse rights. Verify individual permissions before producing a video. See [content and dependency notices](../CONTENT_LICENSES.md).

## Translation

Settings → Translation services supports:

- Local **LM Studio / OpenAI-compatible** chat API. Default: `http://127.0.0.1:1234/v1`. Start the server and test `/models`; translation uses `/chat/completions`.
- Official **Google Cloud Translation Basic v2**, with your key and quota.
- Official **Azure AI Translator v3**, with your key, region and quota.

Automatic translation covers up to **eight suitable focus paragraphs**, preserving link markers and checking numbers. Original, translation and bilingual views are available. Multiple source languages can be excluded. Full-article batch translation is not implemented; model output requires review.

Keys are write-only through the settings API and saved in the selected workspace. Blank fields retain saved credentials; explicit clear controls remove them. Copying a workspace copies its settings and keys. Environment overrides are shown separately. Do not share personal workspace folders.

Configured cloud diagnostics send a small Parsley sample and can count toward usage. Unconfigured translation services are not probed. A remote container’s localhost is not your computer’s LM Studio.

Official references: [LM Studio](https://lmstudio.ai/docs/developer), [Google setup](https://docs.cloud.google.com/translate/docs/setup), [Azure Translator](https://learn.microsoft.com/en-us/azure/ai-services/translator/text-translation/reference/v3/translate).

## Connection checks

Sources start **enabled**. The first page joins one diagnostic round with a fixed **2,000 ms** deadline for browser and backend evidence. Results publish once at that deadline; unfinished probes are cancelled and marked **unconfirmed**, preserving the previous availability (initially enabled). Only completed negative evidence disables a service; late results wait for the next round. Browser successes are submitted independently. For APIs with browser and backend routes, either completed success keeps the source available. A later round preserves the last published state while checking. The default sample is **Parsley**; specialist sites without a mapping use recorded representative pages. Dictionary pronunciation is also checked.

All services, including failed ones, are rechecked **600 seconds after the round ends**. Healthy checks are silent. A theme-coloured bell and count appear at the upper right. The bell opens as the pointer enters a circular halo of 1.5 times its radius. It stays open within the entire panel plus half a bell radius of padding on every side, and collapses with the reverse animation on exit. Touch and keyboard users can activate it. A quick approach-and-click opens the queue without dismissing a notice accidentally. Service pause/resume notices use the same queue. The same spot becomes a close button for the first notice, and the next card moves up after dismissal. Notices persist until dismissed. Later layout changes wait for the next content action, save safe reading state, reload globally and complete that action.

Browser and backend routes are assessed separately. HTTP failure, missing pages and framing restrictions are different conditions. A temporary 403, 429 or 5xx is not proof of permanent unavailability. Detailed diagnostics and manual retesting live in Settings.

## Idle loading and version-local caches

Only online resources participate; catalogue search and paging stay local and do not train the predictor. After idle time, the first 30 records in the complete catalogue and saved favourites are warmed sequentially and retained. The table in **Settings → Cache & shortcuts** shows all-time, current-launch and last-30 operation counts, effective weights, resource fingerprints/access counts and cache tiers.

Depth-one predictions combine normalized frequencies. Defaults gradually move from history at startup to **20% all-time + 30% current launch + 50% last 30** after 30 online operations; you can change the coefficients, transition threshold and retention threshold. Predictions use bounded RAM only: 32 MiB per workspace, 64 MiB total, at most 30 minutes. Activity cancels pending predictions; they never change the displayed article.

The same resource packet becomes retained after **six distinct accesses** by default. Cache lookups precede live requests; retained text and image references keep their source, licence and original fetch time. **Refresh** bypasses cached content. Long-term content does not expire automatically, so use Refresh when you need a newer source revision. Copying a workspace carries counts, resource records and retained data; speculative RAM and the current-launch count are not copied into a new launch. The corrected other-source reader uses a new packet cache schema so previously retained index/home pages are not reused. Idle loading never proactively spends a configured cloud translation quota.

See the [Chinese cache design](CACHE_DESIGN.zh-CN.md) and [review-fix record](V07_REVIEW_FIXES.zh-CN.md).

## Catalogue, imports and data quality

The cleaned baseline contains **18,379 records**, not 18,379 confirmed edible spices:

| Records | Count | Meaning |
| --- | ---: | --- |
| Culinary material/mixture candidates | 92 | Includes 13 curated examples; others need individual verification |
| Botanical references | 18,287 | Taxa, cultivars or names; culinary use is not confirmed |
| Excluded | 392 | Companies, brands, people, events, utensils, dishes and other mismatches |
| Pending review | 101 | Insufficient/conflicting identity or use evidence |
| Exact-identity merges | 206 | Shared identity or exact scientific name, with archived input |

JDB Group, masala dabba and other unsuitable records are removed from search. The 699 archived decisions retain reasons, original payloads and evidence. Unknown future imports go to review. Simplified / Traditional Chinese search is normalized; bounded English spelling matching supplements indexed lookup. Related records explain known family relationships, not flavour equivalence or substitution.

The source catalogue cutoff is **2026-10-27T04:34:04Z**; entity evidence and cleaning were obtained on **2026-10-28**. This does not mean all world knowledge is current to those dates. Metadata is visible in Settings → Catalogue imports / About.

**Subcategory depth 2** reads the starting Wikipedia category, children and grandchildren. It is category-link depth, not botanical rank. **Category budget 200** limits processed categories, not ingredient records. The queue and pagination cursor are saved; increase the budget and Resume. Information buttons explain both controls.

Imports synchronize identity, names, aliases, classification and mappings; bodies and images stay on demand. The initial GBIF scope uses three specified Backbone families. Use one application process and avoid simultaneous CLI/UI imports into a workspace. Details are in the [Chinese development guide](../development.md).

## Workspaces, saved lists and logs

Named **versions** are independent, editable workspaces. Copy one or create from the built-in baseline/defaults; switch, rename, reorder, delete and restore it. Each contains its catalogue, settings, cache, image vocabulary, favourites, history, reading state and log. The manager registry/log sit outside individual workspaces.

Drag handles or arrows persist ordering. Copying/switching pauses imports and retains resumable cursors. Async requests stay with their originating workspace; stale tabs cannot write into a new active one. Deleted workspaces are recoverable. To freeze a state, copy/name it and keep working in another copy. Back up the data folder with the service stopped.

## Documentation and validation

- [Release history](../CHANGELOG.md) · [Chinese release history](../CHANGELOG.zh-CN.md)
- [Chinese developer and acceptance guide](../development.md)
- [Chinese interaction and animation design](MOTION_DESIGN.zh-CN.md) · [Current motion research](MOTION_RESEARCH_v0.7_review3.zh-CN.md)
- [Chinese decision / conversation log](CONVERSATIONS.zh-CN.md)
- [Content, audio and dependency notices](../CONTENT_LICENSES.md)
- [Historical design and development notes](history/)

Backend regression: `uv run python -m unittest discover -s tests -q`. Optional UI checks: `npm ci && npm run test:ui`. `npm run dev` starts a clearly labelled **synthetic QA preview**, not the Python application. Current evidence: `data/verification_v08.json` (v0.8 review candidate). Earlier evidence and live observations retain their original versioned filenames.

Native Windows UI, personal LM Studio/Google/Azure credentials and target-device audio were not exercised in the Linux test environment. Installed voice packs, audible British output, 120 Hz performance and third-party framing must be checked on the target device. Full-article translation, verified culinary facts for every plant, video production, GitHub automatic downloading remain future work. Original application source is now licensed under [MIT](../LICENSE). Third-party content keeps its own applicable terms.

## Second-review naming and chapter selection

Chapter hit positions stay fixed when labels expand; clicked sections remain selected until manual scrolling. Expand **Name & classification evidence** beneath a title to inspect its sources. Missing common names are labelled as scientific-name fallbacks. This revision adds 1,046 Chinese names; 15,798 remain unconfirmed. The [second-review report](V08_REVIEW2.zh-CN.md) and full CSV describe coverage and the conservative workspace repair.

## Catalogue and browser split view

Use Catalogue in the header to show/hide the left pane. Drag its edge on desktop (190–420 px), use arrow keys for small changes, and double-click/Home to reset. Preferences stay in this browser. Splits collapse it temporarily; narrow screens open it as an overlay, dismissible with Escape or the backdrop.

Google/Baidu reuse the helper source partner. Commons/Bing, embeddable sources and reading mode close that partner. Unrelated user splits are preserved. Edge without an automatic API cannot be invoked by installing the helper; Atlas states this and offers a source-tab link. Use the browser toolbar for manual splits. Current APIs cannot set 2:1; drag the browser divider.
