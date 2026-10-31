# Release history

English · [简体中文](CHANGELOG.zh-CN.md)

Changes use **Added**, **Changed** and **Fixed**, followed by validation and limitations. Historical 0.1–0.3 entries were reconstructed from the saved design brief and archived release notes. They do not imply that Git tags or commits existed then.

## 0.8.0 — 2026-11-01

### Fourth review · split helper 0.8.2

- Explicitly identify Edge without an automatic split API and retain a working source-tab link.
- Close the helper-owned source partner when returning to Commons/Bing, embeddable sources or reading mode; serialize creation/cleanup and preserve unrelated user splits.
- Add a catalogue toggle, drag/keyboard resizing and browser-local preferences; collapse temporarily during splits and restore afterwards, with an overlay on narrow views.
- Adapt narrow headers, nameplates, articles and galleries. Current native split APIs cannot set 2:1 automatically; use the browser divider.

### Third review · split helper 0.8.1

- Recover from late bridge injection, missing optional Tab.url and empty responses; announce readiness and reconnect on retry.
- Explicitly create and verify native splits with matching pinned/group states, reuse helper-owned tabs after failures, and show the reason.
- Offer a split even when thumbnails exist but embedding is denied; retain bounded real actions across slow source checks and reject stale entries.
- Reload the updated extension in extension management, then refresh Atlas. The app stays v0.8.0; real browser installation and splits remain device checks.

### Second review · 2026-10-31

- Fixed abstract chapter hit positions while labels expand; an explicit click stays selected until manual scrolling.
- Audited all 18,379 record identities; added 1,046 Chinese names and 148 checklist family/genus placements. Missing vernacular names are labelled, and source evidence plus a full sampling CSV are included. 15,798 Chinese names remain unconfirmed.
- Added backup-backed, conservative per-workspace field repair that preserves user changes. The same-version v0.8 candidate is a supported update source.


### Added

- Immersive reading with local header search, retained identity/pronunciation, complete Wikipedia body and Commons groups only when pictures exist; hidden catalogue and low-frequency source controls.
- Collapsible chapter marks with keyboard/touch access and visibility-based active-section tracking. Loading and retry states reject obsolete requests.
- Language-ordered nameplates and a 31-family font catalogue with localized aliases, manual family entry and optional, click-initiated local font access. Font defaults belong to collection workspaces.

### Changed

- Reading mode, name fonts and the exploratory return state participate in saved views and Back/Forward. Exiting restores the previous source, filters, image window and scroll.
- Full packages carry actual 0.6→0.7→0.8 migrations; a smaller 0.7→0.8 patch preserves data, paths and the existing environment. No new third-party requirements.

### Fixed

- Optional developer preview now starts the checked-in synthetic fixture instead of a removed screenshot helper.
- Late image/article results and superseded mode exits cannot replace the current reading state; Home resets temporary choices, not personal history.
- Exiting reading restores the original whole-page scroll position on narrow layouts. The compressed source-checkout seed and checksum are regenerated as a matching pair.

### Validation

227 backend tests and 190 UI checks, controlled concurrency and font-permission cases, Chrome synthetic-layout checks and isolated real-package upgrades. Native Windows and actual local-font permission prompts remain device checks; see `data/verification_v08.json`.

## 0.7.0 — 2026-10-30

### Public project documentation

- Project display name: 香料图鉴-SpiceAtlas; public repository renamed to `Bravoll/SpiceAtlas`.
- English-first project overview, independent language guides, architecture and system introduction before the latest changes.
- Owner-supplied, unmodified English Basil and Simplified Chinese star-anise screenshots with attribution; startup defaults unchanged.
- MIT source-code licence and Chinese explanation, separated from third-party content terms.

### Review revision 5

- Manifest-based in-place updater and small patch: ordered migration chains, backups, conflict detection and whole-chain rollback; personal data and caches stay in place. Reuse the existing environment and retain extra packages at startup.
- Chinese/Western nameplates move to the hero with workspace-specific defaults. The reader becomes full width, the outline moves above it, Wiki controls align right in the knowledge heading, and header controls align vertically.
- Visible image search terms, additional public metadata gallery parsing and an optional native split-view helper. Actual browser APIs determine support; ordinary source tabs remain available. No verification bypass or forced embedding.
- Record v0.8 focused reading and v0.9 languages, with post-push reminders in the release checklist; future features are not implemented early.

### Review revision 4

- Non-Wiki reading and refresh no longer wait for unrelated Wiki language discovery.
- English and Chinese discovery survive partial failures; failed refreshes retain verified language links and mark their status unconfirmed. Conflicting Wikidata identities reject related-species matches.
- Obsolete reviewed-result cache misses cannot issue requests against a newer entry. Translation requests capture their input and cannot override a later original-text choice.
- Terminal no-service states clear the reader busy indicator. Added six backend and six controlled-concurrency UI regressions, reproduced before the fixes.

### Review revision 3

- English-anchored Wiki language discovery, identity-checked independent Chinese search and a separate Wiki language control; primary-cache and asynchronous language races fixed.
- Actual GBIF v2/v1, NParks, ICAR and PlantNET reading; proxy-owned DNS support stays restricted to reviewed HTTPS hosts. Bing/Google results and reviewed article details now render inside the reader. Two additional public-page provider profiles.
- Frame checks use real responses; public image metadata can form a local gallery. Google SAMEORIGIN and Baidu verification remain explicit limits.
- Immediate theme changes, bounded real-text word/character motion, untouched tables, and progressively animated native pickers. No full-page theme snapshot or article-wide blur/slide.
- Loading preserves the user’s scroll; title returns home without clearing history/statistics. Windows browser opening is more robust; the log has a scrollbar and Jump to latest.
- Other-source defaults become 25 s per provider / 35 s per round; existing custom values remain. Old index-page packet caches are invalidated without clearing accumulated counts.

### Added

- Review revision 2: version-local online-operation distributions, resource fingerprints/counts, sequential first-page/favourite warming, six-access retention and weighted depth-one RAM predictions; cache/shortcut settings and documentation.

- Persistent launcher terminal output with a reversible Show / Hide details control, protected soft pause/resume, same-instance checks and a page pause indicator.
- Other sources: 19 reviewed provider groups, a 184-record stratified sample and 257 candidate links; public API and bounded HTML readers stream complete article cards in completion order with headings, links, independent scrolling and timeouts.
- A notification bell/count, hover or keyboard/touch expansion, fixed-position first-notice dismissal and animated queue advancement.
- Level-3 language word dissolution, source ink reveals and arriving-card motion; Chinese word segmentation and immediate level-0 cleanup.
- A Chinese source investigation with named-engine failures separated from supplemental discovery, live-reader summaries, and new backend/DOM acceptance coverage.

### Changed

- Four bounded catalogue regions, height-dependent page capacity, sticky paths/pagers and pointer-held controls. Imports move to Settings; [ / ] pages subcategories and , / . pages entries, with configurable keys.
- Launcher measures content and wrapping, with two columns of themed controls. Pause announces before the content gate; resume offers a manual retest and holds automatic diagnostics.
- Bell uses a 1.5-radius halo and four-sided panel padding, reversible collapse and quick-click protection.

- Window title is 香料图鉴 - Spice Atlas. Tray single click toggles it; double click opens the page. The menu exposes visibility and pause/resume, and the tooltip persists after updates.
- Diagnostics use one fixed 2,000 ms publication deadline with a round ID. Late results are ignored; the next round starts 600 seconds later, preserving the previous state while checking.
- Source-reader settings include per-source and total deadlines, card limit and optional search discovery. Old streams are cancelled when stopped or replaced.

### Fixed

- Unfinished two-second probes remain unconfirmed instead of disabling readable sources. Browser successes publish independently; automatic Wiki bodies retain the v0.6 reading fallback.
- Curated Commons references query live metadata first, then keywords; the first usable image ends the wait. Retained/memory packets precede browser and backend transport.
- Short-window record clipping and pager stretching on hover no longer hide rows or move click targets.

- Detail output can be hidden with the same button; runtime output continues after readiness.
- Startup no longer publishes partial disable/recovery states. Dismissed notices do not reappear from stale polls.
- Generic HTML IDs and links cannot collide with app controls. A late related-species mention alone does not validate the selected article. Temporary source URL session suffixes are removed.

### Validation and limitations

Automated results and release smoke details are recorded in `data/verification_v07.json`. A three-record live-reader check returned seven cards. Named Google/Bing first-page discovery yielded no extractable results in this environment; supplemental research is explicitly distinct. Generic HTML sites encountered DNS limits. Native Windows tray/Tk behaviour and 120 Hz performance still require target-device acceptance. Other-source cards retain their original language. Multiple design-style presets and their separate investigation remain deferred. The owner approved commit/push on 2026-10-30; no hosted application deployment is implied.

## 0.6.0 — 2026-10-29 · reviewed source checkpoint


### Added

- Windows windowed bootstrap with real stage milestones, hidden child processes, startup logs, project icon and tray controls to open, inspect or stop the owned local service. The visible-console launcher remains available.
- A fixed reading navigation bar, discoverable shortcut reference, and context-aware repeat commands: R, N/P, Alt+arrows, Esc, / and image-viewer arrows. Typing and IME composition are protected.
- A complete interaction/motion inventory, shared popup entry/exit lifecycle, image paging, focus return, animated details, notifications and stable-ID list reordering. Level 0 and system reduced motion remain authoritative.
- Complete standalone English and Chinese guides; the default GitHub homepage includes English first, then Chinese. A small composition script keeps them synchronized.

### Changed

- Source windows use their actual container width by default. Optional scaled preview uses the browser width; expanded view occupies the browser viewport while keeping the same iframe and its input state.
- Settings keep a stable outer frame and scroll individual sections. Reading-history persistence is debounced during scrolling.

### Fixed

- English scientific labels no longer show the Chinese genus annotations in Thyme, Cinnamon and Paprika. Original scientific metadata and identifiers are preserved.
- Modal exits finish before closing and returning focus. Rapid reopening and disabling motion cancel obsolete effects safely.
- Managed shutdown verifies the launch instance and a per-instance secret; a second launch does not stop a service it did not start.

Validation and concrete environment limits are recorded in `data/verification_v06.json`. Native Windows progress/tray behaviour and 120 Hz rendering still need target-device validation. This entry describes a local candidate, not a published Git tag or GitHub Release.

## 0.5.0 — 2026-10-29 · Local review milestone

### Added

- Article typography drawer: independent size, spacing and typeface, preview, outside-click / Escape save, per-workspace persistence.
- Four motion levels, system reduced-motion support, native theme reveal and botanical colour washes with browser fallback.
- Sourced English common-name IPA and UK audio via Free Dictionary API / Wiktionary; browser en-GB speech fallback; labelled automatic local Mandarin pinyin.
- Local random exploration and resume / fixed Basil / random startup settings.
- Up to 60 operation-level Back / Forward states per tab/workspace, including source, form, image filter, catalogue and position. New actions prune the forward branch.
- Separate English / Chinese homepages, histories and third-party notices; Chinese development and decision records.

### Changed

- Image heading and form filter on the left; provider controls and external links on the right, with space between.
- More usable article width and wrapping, preserving independent scrolling.
- Embedded search pages fit the container and recalculate on resize, with native-size mode available.

### Fixed

- Partial startup checks no longer disable sources before the complete first pass.
- View persistence includes the independent image profile and source-window state.
- Navigation survives deferred service-layout reloads and completes the requested operation.
- Section jumps survive late article loading; manual scrolling cancels that pending positioning.

Validation: backend regression, two DOM suites and desktop browser checks; final evidence in `data/verification_v05.json`. Live dictionary observations are separate. Personal translation credentials, audible output on the user’s device and 120 Hz performance are not claimed as verified. The archived ZIP is a local review milestone; it does not imply a Git tag or published release.

## 0.4.0 — 2026-10-28

### Added

- Simplified / Traditional Chinese UI and normalized search; explicit automatic-versus-manual source ordering.
- Background checks every ten minutes, persistent change notices and deferred layout reloads.
- Independent workspace catalogue, settings, caches, image vocabulary, favourites, history and logs; recovery and remembered ordering.
- Official Google / Azure translation adapters, write-only keys and excluded languages.
- A 12-profile image vocabulary informed by 39 searches across 30 materials.

### Fixed

- Cleaned 19,078 inputs into 18,379 admitted records, with 699 exclusion, review or merge decisions archived. Removed JDB Group and other mismatches.
- Separated desktop scrolling and aligned header controls.
- Automatic browser Commons queries with backend and image recovery paths.

Original validation: 87 backend tests and 15 DOM checks, plus desktop/live observations. The later GitHub import added validated gzip seed restoration and five more tests. Automatic GitHub updating stayed deferred. See `docs/history/development_v0.4.zh-CN.md`.

## 0.3.0 — 2026-10-27

### Added

- SQLite catalogue/aliases, classification graph, pagination, Chinese/English lookup and bounded spelling matching.
- Resumable Wikipedia-category and GBIF-family imports: 19,078 source records and 815 category nodes at that stage.
- Web configuration for local translation, language, networking and diagnostics; separate browser CORS/backend paths.

### Changed and fixed

- Expanded beyond 13 fixed records, keeping catalogue metadata local and bodies/images on demand.
- Separated interface/source/translation languages; made keys write-only.
- Distinguished failed connections from absent pages, retained cache on refresh failure, and saved category queues/cursors.

Validation: 48 backend tests, DOM behaviour checks and live metadata. Imported plant counts were references, not verified edible species. See `docs/history/development_v0.3.zh-CN.md`.

## 0.2.0 — 2026-10-27

### Added

- First preserved runnable Python/FastAPI release: 13 records, material forms, botanical colour themes and four name-label treatments.
- Wikipedia Action API articles, focus/full views, outlines, fixed revisions and preserved links/citations.
- Commons metadata, author/licence/file links; existing-customer Google image adapter; external Baidu/Bing and specialist links.
- SQLite cache and fetched snapshots; optional LM Studio focus translation, bilingual reading, JSON export and browser print/PDF.

### Changed

- Connected the approved visual direction to traceable sources, distinguishing links from embedded text.

The archive records backend/syntax validation and a real fetch manifest. This release bundled article/image snapshots and thumbnails; later versions moved toward live delivery. Web-based model configuration was not implemented yet. See `docs/history/development_v0.2.zh-CN.md`.

## 0.1 — 2026-10-27 · Design foundation, retrospective

### Added

- A phased brief for a local herb/spice encyclopedia and later video-material workflow.
- Separate plant identity, ingredient part, processing form and packaging concepts; source, translation and attribution fields.
- A botanical atlas direction: leaf, seed, red-fruit and bark palettes, with modern Chinese/book/inscription typography studies.

The surviving v0.1 document explicitly describes proposals and unverified examples. It **does not establish that a working crawler, translation API or complete website existed then**. The first runnable archive available here is v0.2. See `docs/history/PROJECT_BRIEF_v0.1.zh-CN.md`.
