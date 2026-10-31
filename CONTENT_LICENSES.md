# Content, audio and dependency notices

English · [简体中文](CONTENT_LICENSES.zh-CN.md)

The release contains catalogue metadata, cleaning decisions and structured Wikidata evidence. It does not redistribute encyclopedia article snapshots or standalone downloaded photographs; the README includes two attributed interface screenshots containing Commons photographs. Research extracts are excluded; their source URLs, timestamps and revision/history links are retained. Retrieved texts, images and translations remain subject to their own terms.

## Wikipedia text and categories

MediaWiki Action API content retains the source page, fixed revision, author history, fetch time and licence link. Rendering removes scripts and article images, standardizes typography and rewrites relative links and citation anchors. Focus mode selects original sections; machine translation is labelled separately.

Wikipedia text generally uses CC BY-SA, subject to the original page and applicable terms. The application does not relicense third-party text. Category titles and identifiers retain source provenance.

- [Wikimedia Terms of Use](https://foundation.wikimedia.org/wiki/Policy:Terms_of_Use)
- [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/)
- [Categorymembers API](https://www.mediawiki.org/wiki/API:Categorymembers)

## Other-source reader and research index

The optional reader uses public Wikispecies / Wikibooks Action APIs, compatible GBIF v1 name-match metadata, and bounded HTML reads from a reviewed host registry. A website without a documented API is identified as an HTML adapter, not advertised as an official API. Third-party HTML keeps its original source link and terms; live retrieval does not supply a republication licence. Research files contain query records and candidate metadata, not full article bodies. Search-service results are distinguished from direct named-engine requests; temporary URL session suffixes are removed. Names matched in text do not establish accepted taxonomy or edible use.

Wikispecies and Wikibooks cards retain source/revision and CC BY-SA links. GBIF cards identify their compatible v1/legacy name-match basis and point to the source. Generic readers remove active content and article images, but the original provider's terms still apply.

## Wikidata

Names, aliases, sitelinks, scientific names and main-image filenames use Wikidata structured data under CC0. A referenced image does not thereby become CC0.

- [Wikidata licensing](https://www.wikidata.org/wiki/Wikidata:Licensing)

## GBIF taxonomy metadata

The baseline uses the GBIF Secretariat’s **GBIF Backbone Taxonomy**, dataset `d7dddbf4-2cf0-4f39-9b2a-bb099caae36c`, whose page lists CC BY 4.0. Dataset publication: 2023-08-28. Baseline API access: 2026-10-27.

The imported scope is accepted species in Lamiaceae, Apiaceae and Piperaceae from that dataset, retaining record keys, names, family/genus and source links. Taxonomy does not establish culinary use or guarantee current global taxonomic consensus.

Attribution: GBIF Secretariat (2023). GBIF Backbone Taxonomy. Checklist dataset. Accessed via the GBIF species API on 2026-10-27.

- [Dataset and licence](https://www.gbif.org/dataset/d7dddbf4-2cf0-4f39-9b2a-bb099caae36c)
- [DOI](https://doi.org/10.15468/39omei)
- [Species API](https://techdocs.gbif.org/en/openapi/v1/species)
- [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/)

## Wikimedia Commons images

Image metadata retains the file page, author, licence, licence link and original URL. Remote thumbnails load by default; backend delivery downloads only when selected or needed after failure. Previews may be cropped with object-fit; the original remains accessible.

API accessibility and hotlinking are separate from reuse permission. Check each file description and satisfy its attribution, licence-link and modification requirements. Search results are candidates, not verified ingredient identifications. Future video assets need their own attribution and modification records.

- [Commons reuse guidance](https://commons.wikimedia.org/wiki/Commons:Reusing_content_outside_Wikimedia)

## Dictionary IPA, recordings and pinyin

English phonetics come from [Free Dictionary API](https://dictionaryapi.dev/) and its linked Wiktionary sources. The application selects available phonetic fields rather than bundling definitions. It retains source links and the licence supplied for each sound. Only recordings explicitly marked UK / GB are used for British-recording playback; an absent IPA is never generated.

Audio streams from an allowed dictionary, Wikimedia or dictionary-audio host and is not bundled. Audio files may carry different licences; inspect their file pages before reuse. Browser Web Speech output is synthetic and is labelled separately; available voices depend on the device and browser.

Mandarin pinyin uses [pypinyin](https://github.com/mozillazg/python-pinyin), a separately installed dependency. The application labels pinyin automatic and does not claim dictionary verification of every pronunciation. Dependency licences remain those shipped by their maintainers; this file does not replace their notices.

- [Free Dictionary API source](https://github.com/meetDeveloper/freeDictionaryAPI)
- [Wiktionary copyright guidance](https://en.wiktionary.org/wiki/Wiktionary:Copyrights)
- [Web Speech API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Speech_API)
- [pypinyin documentation](https://pypinyin.readthedocs.io/)

## Other websites and search

NParks, ICAR, McCormick and similar sources provide limited editorial reading notes and original links; their full articles are not bundled. No universal public API is assumed. Baidu resources are source links. Bing framing is attempted only when the response permits it. Google is a source link or an eligible existing-customer API. Search results do not grant image reuse permission.

The adaptive source window uses the available container width or an optional scaled preview without rewriting source content or bypassing framing restrictions. Expanded view preserves the same iframe.

- [Bing Search API retirement](https://learn.microsoft.com/en-us/lifecycle/announcements/bing-search-api-retirement)
- [Google Custom Search JSON API](https://developers.google.com/custom-search/v1/overview)
- [Wikimedia User-Agent policy](https://foundation.wikimedia.org/wiki/Policy:Wikimedia_Foundation_User-Agent_Policy)
- [X-Frame-Options](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/X-Frame-Options)

## Fonts

The website may load Noto Serif SC, Cormorant Garamond, Cinzel and Ma Shan Zheng from Google Fonts. Font files are not redistributed in this package. Offline and reading-drawer choices use available system fallbacks. These are modern typographic treatments, not evidence of an ingredient’s historical origin or an exact historical typeface.

## Translation and source code

Google Cloud Translation and Azure AI Translator have their own credentials, quotas and service terms. A reachable search webpage does not mean a translation API has been enabled. Local models remain subject to their own licences.

- [Google translation setup](https://docs.cloud.google.com/translate/docs/setup)
- [Google pricing](https://cloud.google.com/products/translate/pricing)
- [Azure Translator API](https://learn.microsoft.com/en-us/azure/ai-services/translator/text-translation/reference/v3/translate)

Original project code, icons and original documentation use [MIT](LICENSE), copyright 2026 Bravoll. See the [Chinese explanation](LICENSE.zh-CN.md). Third-party content retains its own terms. Educational purpose adds no noncommercial restriction to MIT.

README screenshots supplied by the project owner preserve photo credits. Their Commons photographs have separate CC BY-SA 4.0 terms; see [screenshot attribution](docs/screenshots/README.md). Third-party photographs are not relicensed as MIT.

## Application icon

`static/atlas-icon.svg` and its multi-resolution ICO are original project artwork, drawn in code for the Windows launcher and page favicon. They contain no third-party photograph. Their project licence status follows the source code; this notice does not grant a new licence.

## Local cache retention

User workspaces can retain fetched articles, cloud translations and image metadata after repeated use or idle warming. Original source/revision, fetch time, links and supplied licences remain attached. Predicted payloads stay in RAM; runtime caches and operation statistics are excluded from portable releases. Retention and API delivery grant no additional reuse rights.

The review-3 public search reader displays labelled result metadata and links; reviewed HTML is sanitized before rendering. Public image-result metadata keeps original file-page links and does not assert a free licence. Frame restrictions and verification are respected, without stripping security headers or proxying active provider pages. Wikidata name tables retain CC0 attribution; GBIF v2 and v1 responses retain their source dataset terms.

## v0.8 nomenclature sources

The application code remains MIT. **CAS Catalogue of Life China 2023 v1.1 data is CC BY-NC 4.0**, requiring attribution and restricting commercial use of that source data. Citation: The Biodiversity Committee of Chinese Academy of Sciences (2024), DOI [10.15468/ae6ush](https://doi.org/10.15468/ae6ush). **TaiCOL v1.13 is CC BY 4.0**, Shao K (2024), TaiBIF, DOI [10.15468/auw1kd](https://doi.org/10.15468/auw1kd). Wikidata structured data is CC0; GBIF Backbone Taxonomy is CC BY 4.0, with underlying source terms retained. Per-name attribution, exact record IDs, versions and retrieval hashes are in [the naming audit](data/research_curation/name_audit_v08/README.md). These dataset terms apply separately from MIT; the source data is not relicensed as application code.
