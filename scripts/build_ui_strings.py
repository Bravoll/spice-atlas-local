"""Compile fixed UI labels for Simplified, Traditional and English."""
import json,re,sys
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
from bs4 import BeautifulSoup
from atlas.localization import to_hant
root=Path(__file__).resolve().parents[1]
text='''sourceCutoff	源目录截止	Source catalogue cutoff
nameAuditMissing	尚未确认可靠的{languages}常用名，暂以学名展示。	No reliable {languages} common name confirmed; the scientific name is shown.
nameEvidenceTitle	名称与分类出处	Name & classification evidence
taxonomyEvidence	分类	Classification
nameCheckedAt	名称核对时间	Names checked
nameAuditCoverage	内置名称核对：{zh} 个中文名；{missing} 个中文名未确认	Bundled name audit: {zh} Chinese names; {missing} Chinese names unconfirmed
scientificCategoryOnly	未确认中文分类名，显示正式学名。	Chinese classification label unconfirmed; the scientific name is shown.
cleanedAt	清洗时间	Cleaned at
lastSync	最近同步	Last synchronized
imageProfile	图片形态筛选	Image form filter
followForm	跟随原料形态	Follow material form
imagesOnly	仅影响图片检索	Image search only
versions	版本	Versions
favorites	收藏	Favorites
history	浏览历史	History
collections	收藏与历史	Saved lists
logs	操作日志	Activity log
about	关于与说明	About & help
collectionMode	查看列表	View list
favoriteAdd	☆ 收藏	☆ Save
favoriteRemove	★ 已收藏	★ Saved
translationService	翻译服务	Translation service
localModel	本地模型	Local model
disabled	关闭	Off
excludeLanguages	不自动翻译的来源语言（可多选）	Source languages to exclude (multiple)
enableLocal	启用本地模型连接与启动检测	Enable local model & startup check
cloudTranslation	云端翻译密钥	Cloud translation credentials
clearGoogleTranslation	删除 Google 翻译密钥	Clear Google translation key
clearAzureTranslation	删除 Azure 翻译密钥	Clear Azure translation key
cloudHelp	使用官方 Google Cloud / Azure API，需要自己的密钥和配额；与图片搜索 API 分开。启动检测会发送一小段欧芹测试文字，可能计入用量。	Official Google Cloud / Azure APIs require your own credentials and quota, separate from image search. Startup checks send a tiny Parsley translation and may count toward usage.
auditArchive	清洗审核档案	Data cleaning archive
viewAudit	查看排除与待审核记录	View excluded & pending records
versionHelp	每个版本独立保存目录、设置、缓存、图片词库、收藏、历史和日志。版本管理与列表排序保存在版本外。删除的版本可以恢复。	Each version contains its own catalogue, settings, cache, image vocabulary, favorites, history and logs. The manager and version ordering are stored separately. Deleted versions can be restored.
versionName	新版本名称	New version name
createFrom	创建方式	Create from
copyVersion	复制所选版本	Copy selected version
defaultVersion	内置目录与默认设置	Built-in catalogue & defaults
sourceVersion	复制来源	Source version
sortBy	排序	Sort by
customOrder	自定义	Custom order
sortName	名称	Name
sortCreated	创建时间	Created
sortModified	修改时间	Modified
sortDirection	方向	Direction
ascending	升序	Ascending
descending	降序	Descending
createVersion	新建版本	Create version
dragHint	拖动把手调整顺序，也可以使用上下箭头。修改名称后点击重命名。	Drag handles or use arrow buttons to reorder. After editing a name, click Rename.
deletedVersions	已删除的版本	Deleted versions
savedList	长期列表	Saved list
historyOrder	历史排序	History order
recentFirst	最近浏览优先	Recently visited first
logScope	日志范围	Log scope
currentVersion	当前版本	Current version
versionManager	版本管理	Version manager
refresh	刷新	Refresh
more	加载更多	Load more
aboutIntro	用于逐步探索植物、调味原料、文化与来源的本地资料阅读器。	A local reader for exploring plants, culinary materials, cultures and their sources.
sourcePolicy	语言与来源排序	Language & source order
serviceHelp	连接检测与临时禁用	Connection checks & temporary filtering
imageVocabulary	图片关键词库	Image search vocabulary
enterReadingMode	阅读模式	Reading mode
exitReadingMode	退出阅读	Exit reading
readingLoading	正在读取百科与图片…	Reading encyclopedia and image references…
readingRetry	百科暂未读取成功 · 点击重试	Encyclopedia unavailable · Retry
fontDefault	跟随排印默认	Typography default
fontFamilyLabel	字体名称	Font family
nameContentLabel	名称内容	Name content
fontCatalogueHelp	显示字体原名与已登记的本地名称。未安装的字体会回退；字体列表不保证字形覆盖。	Original names and recorded local aliases. Uninstalled fonts fall back; listed names do not guarantee glyph coverage.
readLocalFonts	读取本机字体（可选）	Read local fonts (optional)
localFontsPrivacy	仅在点击并经浏览器授权后读取。本机字体列表留在浏览器，不上传后台。	Read only after a click and browser permission. The font list stays in this browser.
localFontsUnavailable	此浏览器不能列出本机字体；仍可选登记字体或手动填写原名。	This browser cannot list local fonts. Use the catalogue or enter a family name.
localFontsReading	等待浏览器字体授权…	Waiting for browser font permission…
localFontsLoaded	已读取 {count} 个额外字体系列；仅保存在本次浏览器会话。	Loaded {count} additional font families for this browser session.
localFontsDenied	未获得本机字体权限。登记字体与手动输入仍可使用。	Local font permission was not granted. Catalogue and manual entry remain available.
customFontFamily	手动输入字体原名	Enter a font family name
applyCustomFont	预览此字体	Preview this font
fontInvalid	请输入有效的字体系列原名。	Enter a valid font family name.
defaultChineseNameFont	中文名称默认字体	Default Chinese name font
defaultWesternNameFont	英文名称默认字体	Default English name font
commonName	常用名称	Common name
scientificNameChoice	拉丁学名	Latin scientific name
nameMissing	尚未收录{language}名称，显示已有学名。	No {language} name recorded; showing the scientific name.
chapters	本页章节	Article chapters
noLocalMatches	没有匹配的本地条目。	No matching local entries.
licenseHelp	原创应用由 Bravoll 维护，源码采用 MIT。百科文字、照片与音频保留原来源、作者和各自许可；API 引用不会免除要求。植物参考记录不代表可食用。本版支持本机增量升级，GitHub 自动下载后续再加入。	Original application by Bravoll; source code uses MIT. Encyclopedia text, photos and audio retain their sources, authors and own licences; API access does not waive requirements. Botanical references do not establish edibility. Local incremental upgrades are included; automatic GitHub downloads are deferred.
rename	重命名	Rename
switchVersion	切换	Switch
remove	删除	Delete
restore	恢复	Restore
active	当前	Active
createdAt	创建	Created
modifiedAt	修改	Modified
moveUp	上移	Move up
moveDown	下移	Move down
notificationSummary	{count} 条通知 · 点击查看	{count} notification(s) · View details
dismiss	关闭通知	Dismiss
healthChanged	来源连接状态发生变化	Source availability changed
serviceRecovered	已恢复	Recovered
serviceDisabled	临时禁用	Temporarily disabled
refreshPending	下次内容操作将保留当前状态并刷新页面。	Your next content action will preserve the current view and refresh the page.
healthChecking	正在后台检测（欧芹 / Parsley）	Checking in background (Parsley)
backendRoute	后台连接	Backend route
browserRoute	浏览器直连	Browser route
frameRestricted	网页可访问，但禁止嵌入	Page reachable; framing restricted
apiUnavailable	API 暂不可用	API temporarily unavailable
primaryLanguage	优先语言	Preferred language
secondaryLanguage	另一语言	Other language
sourceKindExternal	来源网页／搜索	Source website / search
sourceKindReference	资料来源	Reference source
translated	机器译文	Translation
translationReady	机器译文 · 尚未人工核实	Machine translation · not human reviewed
translationLoading	正在通过所选服务翻译；原文仍可阅读…	Translating with the selected service; the original remains available…
modelNotReady	请在设置中启用并配置翻译服务。	Enable and configure a translation service in Settings.
autoTranslate	使用所选服务自动翻译不同语言的重点段落	Automatically translate focus paragraphs with the selected service
modelSettings	翻译服务	Translation services
allSourcesFailed	维基来源暂时无法连接，仍可查看可用的其他来源。	Wikipedia sources could not be reached. Other available sources remain accessible.
cutoff	数据截止／同步信息	Catalogue cutoff / sync metadata
vocabStats	{materials} 个原料 · {queries} 次真实检索 · {profiles} 类形态	{materials} materials · {queries} recorded searches · {profiles} image profiles
notSpecified	未记录	Not recorded
cleaningCounts	排除 {excluded} · 待审核 {pending} · 合并 {merged}	Excluded {excluded} · Pending {pending} · Merged {merged}
noServices	当前没有可用来源；连接会在后台重试。	No sources are currently available; checks will retry in the background.
loadingLocal	正在查询本地目录…	Searching the local catalogue…
cloudNoKey	未配置的服务不参与启动检测。	Unconfigured services are omitted from startup checks.
help_depth	起始分类是第 0 层。设为 2，会读取起始分类、子分类和子分类的子分类。这是维基目录的链接深度，不是植物学上的科、属、种等级。	The starting category is level 0. Depth 2 reads that category, its subcategories, and their subcategories. This is Wikipedia category-link depth, not botanical family, genus or species rank.
help_budget	200 指本次任务最多处理 200 个分类目录，不是 200 个香料条目。达到上限会保存队列和分页游标并暂停；提高上限后点击继续，不必重新导入。	200 limits the number of category directories processed by this job, not the number of material records. The queue and pagination cursor are saved at the limit. Increase the budget and Resume to continue.
help_policy	仅“自动＋系统简体中文”优先百度百科、国内 Bing、其他资源。其他模式（包含手动简体、手动繁体、自动繁体及英文）优先对应语言维基、国际 Bing、Google、其他资源，再列另一语言。设置中的正文语言独立于界面；没有中文维基时可显示英文并自动翻译。	Only Auto with a Simplified Chinese browser prioritizes Baidu Baike, Bing China and other resources. All other modes, including manual Simplified or Traditional Chinese, prioritize matching-language Wikipedia, Bing International, Google and other resources, followed by the other language. Article language is independent of the interface. English Wikipedia can be translated when Chinese is missing.
help_health	首次网页加入 2000 毫秒的固定检测轮次，之前来源默认开启；到点一次发布并拒绝迟到结果，未完成视为尚未确认；结束 10 分钟后再试全部服务。继续服务后可从通知手动重测。默认以欧芹 / Parsley 检查网页、API 及已配置的服务。网络失败与禁止嵌入分开记录。全部正常时不通知；状态变化通知需手动关闭。布局变更延迟到下一次内容操作，并保留条目、形态、列表和阅读位置后刷新。浏览器直连可与后台网络结果不同。	Sources start enabled. The first page joins one 2,000 ms diagnostic round; results publish once, unfinished tests remain unconfirmed, and late replies are ignored. Resume offers a manual retest in its notification. All services are retried 10 minutes after the round ends, using Parsley or a recorded representative page. Connection failure and framing restrictions are distinct. Healthy checks are silent. Change notices persist until dismissed. Layout changes wait for the next content action, then reload while preserving the entry, form, list and reading position. Browser and backend connectivity can differ.
help_images	图片形态词库来自多种代表性原料的 Commons 文件名实测，查询和时间保存在研究记录中。鲜叶、干叶碎、粉末、整粒、树皮、花蕾、根、切片、罐装和袋装分别组合检索。仅影响图片排序；候选图仍应核对对象和文件说明，包装不等于植物身份。	Image-form vocabulary uses recorded Commons filename searches across representative materials. Fresh leaves, flakes, powder, whole seeds, bark, buds, roots, slices, jars and bags use distinct queries. This affects image retrieval only. Verify candidate subjects and file descriptions; packaging is not botanical identity.
help_versions	复制会暂停来源版本的导入任务并保存可续传状态；内置默认版本不含你的密钥、收藏或历史。切换后异步请求继续归属于发起版本，旧标签页写入会被拒绝。版本删除进入可恢复区；版本管理日志单独保存。	Copying pauses imports and preserves resumable progress. A default version includes no personal keys, favorites or history. Async requests stay with their originating version, and stale tabs cannot write into the new active version. Deleted versions are recoverable. Manager logs are stored separately.'''
text+='''
photosDirect	浏览器实时加载远程图片	Remote images loaded by your browser
sourceWindowShown	原站搜索视窗已开启，随容器适应；也可打开上方原站链接。	Source window open and fitted to this container; original-site links remain above.
goBack	返回	Back
goForward	前进	Forward
randomExplore	随机探索	Surprise me
openElsewhere	新窗口	Open elsewhere
fitWindow	适应视窗	Fit window
nativeWindow	原始尺寸	Native size
adaptiveFrameNote	适应模式随视窗缩放原站页面。原站排版与嵌入权限由来源控制；若空白，可打开原站。	Fit mode scales the source page as this viewport changes. Layout and embedding permissions remain controlled by the source; open the original if the frame is blank.
readingComfort	阅读排版与动态效果	Reading comfort & motion
readingComfortNote	正文文字可独立调整，右侧 Aa 标签可随时打开快捷栏。	Resize article text independently. The Aa tab at the right opens reading shortcuts at any time.
openReadingTools	打开阅读快捷栏	Open reading shortcuts
readingTools	阅读	Reading
done	完成	Done
drawerIntro	调整仅作用于文章文字。点击外侧即可保存并继续阅读。	Adjust article typography without scaling the interface. Click outside to save and continue reading.
fontSize	正文字号	Article text size
fontSmall	小	Small
fontStandard	标准	Regular
fontLarge	大	Large
fontExtra	特大	Extra
lineHeight	行间距	Line spacing
readingFont	正文字体	Article typeface
fontSerif	书页 · 衬线	Book · Serif
fontSans	清晰 · 无衬线	Clear · Sans
fontKai	手稿 · 楷体	Script · Kai
animationLevel	动画层级	Motion level
motion0	0 · 无动画	0 · Still
motion1	1 · 轻量	1 · Minimal
motion2	2 · 舒适	2 · Refined
motion3	3 · 艺术	3 · Botanical
motionNote	动画遵循系统“减少动态效果”。最高档使用浏览器原生合成动画，实际帧率由屏幕与设备决定。	Respects your system’s reduced-motion preference. The highest level uses native browser animation; the display and device determine the actual frame rate.
readingSample	一片叶，一段风味的旅程。Every leaf holds a story.	Every leaf holds a story. Follow the quiet journey from plant to spice.
resetReading	恢复阅读默认	Reset reading defaults
startupMode	启动时展示	On startup
startupResume	继续上次阅读	Continue last reading
startupBasil	固定罗勒	Always open Basil
startupRandom	随机一个条目	Open a random record
randomScope	随机探索范围	Random exploration scope
listenEnglish	英语发音	Hear English
ipaUnavailable	英式语音优先；音标缺失或暂不可用时不生成。	British voice preferred; IPA is shown only when sourced.
pinyinNote	自动生成的普通话拼音，多音字及专名应以可靠词典为准。	Automatically generated Mandarin pinyin. Check a reliable dictionary for polyphonic characters and proper names.
pinyinAuto	自动拼音	Auto pinyin
pronunciationSource	词典来源 ↗	Dictionary source ↗
speechUnavailable	本机暂未提供可播放的英语语音。请安装系统英语语音包，或稍后重试词典音频。	No usable English voice is available. Install an English system voice, or retry dictionary audio later.
speechBritish	浏览器合成语音 · en-GB	Browser speech · en-GB
speechSystem	已请求 en-GB；本机可用口音由语音包决定。	Requested en-GB; the available accent depends on installed voices.
speechRecording	词典英式录音	British dictionary recording
help_pronunciation	进入条目时读取公开词典 API 的英语音标，并保留词典链接。播放优先使用标为 UK / GB 的词典音频，否则调用浏览器 Web Speech API，优先选择 en-GB 语音；本机没有英式语音包时会明确提示。中文拼音由本地 pypinyin 自动生成，多音字应核实；拉丁学名不合成朗读。词典或音频临时不可用时不会编造音标。	English IPA is retrieved from a public dictionary API with a source link. Playback prefers a UK / GB recording, then browser Web Speech with an en-GB voice. If a British voice is unavailable, the interface says so. Mandarin pinyin is generated locally by pypinyin and should be checked for polyphonic characters. Latin taxonomic names are not synthesized. Unavailable IPA is never invented.
help_reading	右侧 Aa 快捷栏可调整正文字号、行距、衬线／无衬线／楷体字体与四档动画。点击外侧或完成会保存到当前版本，保存失败时保留面板。0 关闭动画，1 轻量，2 常规细节，3 植物晕染与更丰富的过渡；系统减少动态效果优先。返回／前进记录最近 60 个阅读操作，包含条目、形态、来源、图片筛选、目录、阅读模式与位置；回退后新操作清除前进分支。设置或收藏修改不会被撤销。	The Aa drawer adjusts article size, spacing, typeface and four motion levels. Clicking outside or Done saves to the current version; failed saves keep the drawer open. Motion levels are 0 Still, 1 Minimal, 2 Refined and 3 Botanical, with system reduced motion taking priority. Back / Forward remembers up to 60 reading states including entry, form, source, image filter, catalogue, reading mode and position. A new action after going back discards forward states. Settings and saved-list changes are not undone.
pronunciationHelp	音标、拼音与发音	IPA, pinyin & pronunciation
navigationHelp	阅读快捷栏与导航	Reading shortcuts & navigation'''
text+='''\nresponsiveWindow	自适应宽度	Responsive width
scaledWindow	缩放预览	Scaled preview
expandWindow	放大视窗	Expand window
collapseWindow	收回视窗	Return inline
adaptiveFrameNote	按当前视窗宽度加载原站，完整查看可放大视窗。原站内部排版与嵌入权限仍由来源控制。	The source uses the current viewport width. Expand the window for a full browser-width view. The source controls its own layout and embedding permissions.
sourceWindowShown	原站搜索视窗已开启；可自适应宽度、切换缩放预览或放大查看。	Source window open. Use responsive width, scaled preview or expand it for more space.
repeatAction	重复上次操作	Repeat last action
catalogNextLabel	目录下一页	Next catalogue page
catalogPreviousLabel	目录上一页	Previous catalogue page
imageNextLabel	下一张图片	Next image
imagePreviousLabel	上一张图片	Previous image
auditNextLabel	加载更多审核记录	More audit records
logsNextLabel	加载更多日志	More log entries
keyboardShortcuts	键盘快捷键	Keyboard shortcuts
shortcutHint	? 查看快捷键	? Keyboard shortcuts
repeatHelp	Repeat：在当前状态重复最近一次可重复操作，如目录翻页、随机探索、图片切换或加载更多。	Repeat the last repeatable command against the current state: paging, random exploration, image stepping or loading more records.
pageShortcutHelp	Next / Previous：当前本地目录的下一页／上一页。	Next / Previous page in the current local catalogue.
navigationShortcutHelp	返回／前进至之前的阅读状态。	Back / Forward through reading states.
escapeShortcutHelp	关闭当前浮层；阅读侧栏先保存。原站放大视窗收回到页面内。	Close the current popup, saving reading-drawer changes first. An expanded source window returns inline.
searchShortcutHelp	聚焦左侧的本地搜索。	Focus the local catalogue search.
imageShortcutHelp	图片查看器中切换上一张／下一张。	Previous / next image while the image viewer is open.
shortcutsShortcutHelp	打开此快捷键说明。	Open this shortcut reference.
shortcutSafety	输入框、下拉选择、可编辑区域及输入法组合输入时，不抢占单键。原站内嵌网页中的输入由原站处理。Esc 不撤销数据库、设置或收藏。	Single-letter shortcuts do not capture input fields, selects, editable text or IME composition. Embedded websites handle their own input. Escape does not undo database, settings or saved-list changes.
help_reading	右侧 Aa 快捷栏独立调整正文。返回／前进悬浮于正文左上角，最多记录 60 个阅读状态。R 在当前状态重复上次可重复操作，N/P 目录翻页；Alt+方向键浏览历史，? 查看快捷键。0–3 动画覆盖弹窗进入与退出、列表与状态，系统减少动态效果优先。	The Aa drawer adjusts article typography independently. Back / Forward floats at the top left of the reading pane and retains up to 60 reading states. R repeats a command against the current state, N/P page the catalogue, Alt+arrows navigate history and ? opens help. Four motion levels cover popup entry/exit, lists and status; system reduced motion takes priority.'''
text+='''\ndismissCurrentNotice	关闭当前这条通知	Dismiss the current notification
servicePaused	服务已暂停 · 从托盘继续	Service paused · resume from the tray
otherHeading	其他来源 · 并行阅读	Other sources · a reading collection
otherIntro	按完整返回的先后顺序排列。每张卡片保留原标题、章节、正文与来源链接。	Cards appear in completion order, with their original titles, sections, article text and source links.
otherLatest	最新卡片 →	Latest card →
otherStop	停止请求	Stop requests
otherStopped	已停止本轮请求；已返回的卡片保留。	Requests stopped. Completed cards remain available.
otherLoading	正在并行读取来源；本轮最多等待 {seconds} 秒。	Reading sources in parallel · up to {seconds} seconds for this round.
otherReceived	已收到 {count} 张完整卡片，其他来源仍在返回。	{count} complete cards received; other sources are still responding.
otherProgress	已收到 {count} 张卡片 · {pending} 个任务等待返回	{count} cards received · {pending} tasks pending
otherFinished	已收到 {count} 张卡片 · {failed} 个读取失败	{count} cards received · {failed} unsuccessful reads
otherTimedOut	已达到本轮等待上限，剩余请求已停止。	The round time limit was reached; remaining requests were stopped.
otherCardLimit	已达到卡片数量上限，剩余请求已停止。	The card limit was reached; remaining requests were stopped.
otherComplete	本轮读取完成。	This reading round is complete.
otherStreamEnded	连接已结束；保留已完整收到的卡片。	The connection ended. Fully received cards are retained.
otherCandidate	来源候选 · 名称匹配不代表食用或分类核实。	Candidate source · a name match is not culinary or taxonomic verification.
otherFailures	未能读取的来源与检索状态	Unsuccessful reads and search status
sourceTerms	按来源自身许可使用	Use under the original source terms
otherSettings	其他来源阅读	Other-source reading
otherSourceTimeout	单个来源超时（秒）	Per-source timeout (seconds)
otherTotalTimeout	整轮读取上限（秒）	Total round timeout (seconds)
otherMaxCards	最多显示卡片	Maximum cards
otherSearchEnabled	按条目名称在三个搜索引擎补充查找候选网页	Supplement indexed candidates with named-engine searches
otherTimeoutHelp	来源并行读取，按完整返回顺序展示。验证页、名称不符和空页面不会当作文章。超时后取消剩余请求。	Sources load in parallel and appear when complete. Verification pages, name mismatches and empty pages are not articles. Remaining requests are cancelled at the deadline.'''
text+='\n'+'serviceUnconfirmed\t尚未确认（检测时间内未完成）\tUnconfirmed (not completed within the diagnostic window)\nservicePausingTitle\t服务即将暂停\tService is pausing\nservicePausedTitle\t服务已暂停\tService paused\nserviceResumedTitle\t服务已继续\tService resumed\nservicePausingBody\t后台正在准备暂停，新的互联网读取即将停止。已显示的资料保留。\tThe service is preparing to pause. New online reads will stop; displayed material remains available.\nservicePausedBody\t后台已暂停。可从托盘或香料图鉴窗口继续服务，通知仍可关闭。\tThe service is paused. Resume from the tray or Spice Atlas window. Notifications can still be dismissed.\nserviceResumedBody\t服务已继续。请点击下方按钮手动重新测试连接，随后更新来源状态。\tThe service has resumed. Use the button below to retest connections and update source availability.\nretestConnections\t重新测试连接\tRetest connections\nretestStarted\t已开始重新测试\tConnection retest started\nimportantNotice\t重要通知\tImportant notice\ncacheAndShortcuts\t缓存与快捷键\tCache & shortcuts\ncatalogueShortcuts\t目录快捷键\tCatalogue shortcuts\nshortcutCustomHelp\t设置四个不同的单字母或标点；输入框和输入法组合中不触发。R、/、? 保留。\tChoose four distinct letters or punctuation marks. Shortcuts do not fire in text fields or IME composition. R, / and ? are reserved.\ntreePrevious\t上一页子集\tPrevious subcategories\ntreeNext\t下一页子集\tNext subcategories\nentryPrevious\t上一页条目\tPrevious entries\nentryNext\t下一页条目\tNext entries\ntreePageShortcutHelp\t翻动当前层级的子集列表；按键可在设置中修改。\tPage through the current level of subcategories; customize the keys in Settings.\nadaptiveCache\t互联网资源缓存\tOnline-resource cache\ncacheExplanation\t第一页、收藏和高频资源长期缓存。预测只放入有界内存，并限于当前状态下一步可达的公共资源。本地搜索和目录翻页不参与统计。\tFirst-page, favorite and frequently used resources are retained. Predictions use bounded memory and public resources one action away. Local search and catalogue paging do not train the predictor.\nprefetchEnabled\t闲置时顺序预取互联网资源\tPrefetch online resources sequentially while idle\nhistoryWeight\t历史总次数权重\tAll-time weight\nsessionWeight\t本次启动权重\tCurrent-session weight\nrecentWeight\t最近 30 次权重\tLast 30 operations weight\ncacheSessionThreshold\t本次样本过渡阈值\tSession transition threshold\ncachePromoteHits\t长期缓存访问阈值\tRetention access threshold\ncacheWeightHelp\t启动初期主要用历史；本次样本接近阈值后，逐步采用三个设置权重。默认 0.2 / 0.3 / 0.5，同一资源封包达到 6 次转为长期缓存。刷新强制重新获取。云翻译复用已请求结果。\tEarly sessions rely on all-time history, then gradually adopt the configured weights: 0.2 / 0.3 / 0.5 by default. A packet is retained after 6 accesses. Refresh bypasses the cache. Cloud translation reuses previously requested results.\nrefreshCacheStats\t刷新统计\tRefresh statistics\nclearMemoryCache\t清空预测内存\tClear prediction memory\noperationKind\t操作类型\tOperation\nhistoricalCount\t历史\tAll-time\nsessionCount\t本次\tSession\nrecentCount\t最近 30\tLast 30\nweightedPriority\t优先分值\tPriority score\nresourcePackets\t资源封包字典与次数\tResource packets & access counts\nresource\t资源\tResource\npacketIdentity\t封包标识\tPacket ID\naccessCount\t访问次数\tAccesses\ncacheSummary\t长期资源 {retained} · 内存 {memory} 项 / {mb} MB · 本次操作 {session} · 当前有效权重 {weights}\t{retained} retained resources · {memory} memory records / {mb} MB · {session} session operations · Effective weights {weights}\nmemoryCache\t预测内存\tPrediction memory\nretainedCache\t长期缓存\tRetained cache\noperation_entry\t切换条目\tEntry change\noperation_form\t原料形态\tMaterial form\noperation_source\t知识来源\tKnowledge source\noperation_imageProfile\t图片筛选\tImage filter\noperation_provider\t图片来源\tImage provider\noperation_language\t界面语言\tInterface language\noperation_translate\t云端翻译\tCloud translation\noperation_refreshArticle\t刷新正文\tRefresh article\noperation_refreshImages\t刷新图片\tRefresh images'
text+='\nliveFirst\t普通缓存优先实时核验（高频与预测缓存优先读取）\tRevalidate ordinary caches online; retained and predicted content load first\n'
text+='\ncacheTier_memory\t预测内存\tPrediction memory\ncacheTier_retained\t长期缓存\tRetained cache\ncacheTier_disk\t普通缓存\tOrdinary cache\ncacheTier_not_cached\t暂未缓存\tNot cached\n'
text+='\nwikiLanguageChecking\t正在核对维基语言链接…\tChecking Wikipedia language links…\nwikiLanguageUnconfirmed\t语言映射尚未确认，可选已知语言\tLanguage mapping unconfirmed; known languages remain available\nwikiChineseMissing\t未找到中文对应页，回退英文\tNo matching Chinese article found; using English\nwikiLanguageHint\t先按英文页语言链接，再核对独立搜索\tEnglish interlanguage links, with identity-checked search fallback\nsearchVerification\t来源要求在原站完成验证，当前无法在本页读取。\tThis provider requires verification on its own site; results cannot be read here.\nsearchTimedOut\t检索超时，可以重试或前往原站。\tSearch timed out. Retry or open the provider.\nsearchConnectionError\t未能读取该引擎的公开结果，请前往原站。\tCould not read this engine’s public results. Open the provider.\nsearchNoResults\t当前响应没有可提取的结果，请前往原站。\tNo extractable results in this response. Open the provider.\nsearchResultsNote\t以下为实时检索结果；摘要不是完整百科正文。\tLive search results; snippets are not full encyclopedia articles.\nreadReviewedArticle\t在图鉴中读取\tRead in Atlas\nframePolicyDenied\t原站的安全响应禁止第三方内嵌；可查看下方可用结果或在新标签页打开。\tThe provider’s response forbids third-party embedding. View available results below or open a new tab.\n'
text+='publicSourceNote\t内容读取自公开网页或结构化 API，保留来源链接并省略活动控件、导航与远程图片。\tRead from public HTML or structured API data; source links remain, active controls, navigation and remote article images are omitted.\n'
text+='readWikipedia\t读取所选语言的维基条目\tRead Wikipedia in the selected language\n'
text+='originalSearchView\t原站检索视窗（内容由来源网站显示）\tOriginal search view (rendered by the provider)\n'
text+="\nstyleNote\t现代排印意象，不作历史起源认定\tModern typography study, not a historical attribution\nchineseNameLabel\t中文名称\tChinese name\nwesternNameLabel\t西文名称\tWestern name\ndefaultChineseName\t默认中文展签\tDefault Chinese nameplate\ndefaultWesternName\t默认西文展签\tDefault Western nameplate\nimageQueryLabel\t检索关键词\tSearch terms\nbrowserOther\t当前浏览器\tCurrent browser\nopenNativeSplit\t浏览器分屏打开\tOpen in browser split view\nopenSearchTab\t新标签页打开原站\tOpen source in a new tab\nsplitHelp\t分屏使用说明\tSplit-view help\nsplitHelperReady\t分屏助手已连接，原生接口可用\tSplit helper connected; native API available\nsplitHelperMissing\t普通网页无法直接控制浏览器分屏；可使用随包附带的可选助手\tA web page cannot control browser split views directly; an optional helper is included\nsplitFrameNote\t原站不允许内嵌。可在独立原站标签或支持的分屏中查看；图鉴只展示能公开读取的图片结果。\tThe source forbids embedding. Use an independent source tab or supported native split; Atlas displays only publicly readable image results.\nsplitVerificationNote\t来源要求原站验证；请在原站标签页或浏览器分屏中自行访问。图鉴不会自动完成验证。\tThe source requires verification. Visit it in a source tab or browser split. Atlas does not complete verification automatically.\nsplitOpened\t已在图鉴旁打开浏览器原生分屏，原站保持独立页面。\tOpened a native browser split beside Atlas. The source remains an independent page.\nsplitCouldNotOpen\t本次未能创建原生分屏，可使用新标签页入口，并在浏览器菜单中手动分屏。\tCould not create a native split. Open the source tab and use your browser's split-view menu.\nsplitHelpBody\t普通网页不能直接调用浏览器扩展的分屏 API。可选择在 Chrome／Edge 的扩展管理页加载已经安装的图鉴目录中的 browser_helper 文件夹；它只匹配本机图鉴页面，并只导航到批准的图片检索页面，不读取外站正文、不修改安全响应头。实际检测到原生分屏接口时，受限来源可自动在旁边打开；浏览器版本和策略不支持时，使用“新标签页打开原站”，再从标签菜单选择分屏。此助手不自动安装。\tWeb pages cannot call extension split-view APIs. Optionally load the release's browser_helper folder in Chrome/Edge extension management. It matches local Atlas pages and only navigates approved image-search pages. It does not read remote page content or change security headers. Supported native APIs enable automatic side-by-side opening; otherwise open a source tab and choose split view in the tab menu. The helper is not installed automatically.\n"
text+='splitApiMissing\t分屏助手已连接，但本浏览器未提供可用的原生分屏接口\tSplit helper connected, but this browser has no available native split API\n'
text+='''splitHelperVersion	助手 {version}	Helper {version}
splitHelperOutdated	连接到了旧版助手。请在扩展管理页重新加载已更新的助手，再刷新图鉴。	An old helper is connected. Reload the updated helper in extension management, then refresh Atlas.
splitOpening	正在打开浏览器分屏…	Opening browser split view…
splitHelperDisconnected	尚未连接到分屏助手。请在扩展管理页重新加载助手，再刷新图鉴并重试。	The split helper is not connected. Reload it in extension management, refresh Atlas and retry.
splitGestureExpired	请点击“浏览器分屏打开”继续打开当前来源。	Click “Open in browser split view” to continue opening this source.
splitExistingUser	图鉴当前位于另一个分屏中。请先退出该分屏，再重试。	Atlas is already in another split view. Exit that split and retry.
splitUnconfirmed	原站标签页已打开，但浏览器未确认分屏。可点击分屏按钮重试，或使用浏览器菜单分屏。	The source tab opened, but the browser did not confirm a split. Retry the split button or use the browser menu.
splitSourceChanged	图鉴页面已变化，请重新选择图片来源后再打开分屏。	The Atlas page has changed. Select the image source again before opening a split.
splitTabOnlyReason	原站标签页已打开，但未能建立分屏：{reason}	The source tab opened, but creating the split failed: {reason}
splitBrowserReason	浏览器未能建立分屏：{reason}	The browser could not create a split: {reason}
splitHelpBody	请在 Chrome／Edge 的扩展管理页加载已安装图鉴目录中的 browser_helper 文件夹。升级助手后，先在扩展管理页点击重新加载，再刷新图鉴；仅刷新网页不会更新扩展。图片来源下方会显示助手版本、连接和接口状态。受限来源返回后会自动尝试分屏；点击分屏按钮可重新连接并重试。浏览器必须实际提供原生分屏接口；内置应用窗口无法使用安装在其他浏览器中的扩展。不支持时，可打开原站新标签页，再使用浏览器菜单分屏。	Load the installed Atlas folder's browser_helper in Chrome/Edge extension management. After an upgrade, reload the extension first, then refresh Atlas; refreshing the page alone does not update the extension. The image-source area shows the helper version, connection and API status. Restricted sources automatically attempt a split; the split button reconnects and retries. The browser must expose the native split API. Embedded application windows cannot use an extension installed in a separate browser. Otherwise, open a source tab and use the browser split-view menu.
'''
text+='''splitEdgeCapability	助手已连接，当前 Edge 不支持助手自动分屏	Helper connected; this Edge does not support automatic splits through the helper
splitApiCapability	助手已连接，浏览器未提供自动分屏	Helper connected; automatic split view is unavailable in this browser
splitEdgeUnsupported	当前 Edge 未提供助手可用的自动分屏功能，安装助手也无法自动唤醒。请点击“新标签页打开原站”，或用 Edge 工具栏手动分屏。	This Edge does not expose automatic split view to the helper, even when installed. Open the source in a new tab, or use Edge's toolbar to split manually.
splitApiMissing	当前浏览器未提供助手可用的自动分屏功能。请打开原站标签页，或使用浏览器菜单手动分屏。	This browser does not expose automatic split view to the helper. Open the source tab or use the browser menu to split manually.
splitReconnect	检测并连接助手	Detect and connect helper
splitClose	关闭分屏	Close split view
splitClosed	已关闭助手打开的原站分屏，图鉴已恢复原布局。	Closed the helper's source pane and restored the Atlas layout.
splitUnmanaged	这个分屏不属于当前助手，请在浏览器中手动退出。	This split is not owned by the current helper. Exit it using the browser controls.
splitCloseFailed	未能收回原站分屏，请使用浏览器关闭右侧页面。	Could not close the source pane. Use the browser controls to close the right page.
splitRatioHint	两侧比例可拖动浏览器分隔线调整。	Drag the browser divider to adjust the two panes.
splitHelperReady	助手已连接，自动分屏可用	Helper connected; automatic split view is available
splitHelperOutdated	请更新并重新加载分屏助手（需要 0.8.2 或更新版本），然后刷新图鉴。	Update and reload the split helper (0.8.2 or later), then refresh Atlas.
catalogueToggle	目录	Catalogue
catalogueShow	显示目录	Show catalogue
catalogueHide	收起目录	Hide catalogue
catalogueResize	目录宽度	Catalogue width
catalogueResizeHelp	拖动调整目录宽度；方向键微调，双击或 Home 恢复默认。	Drag to resize the catalogue; use arrow keys for small changes, double-click or Home to reset.
'''
zh={};en={}
for line in text.splitlines():
 if not line.strip():continue
 key,a,b=line.split('\t');zh[key]=a;en[key]=b
for el in BeautifulSoup((root/'static/index.html').read_text(),'html.parser').select('[data-i18n]'):zh.setdefault(el['data-i18n'],el.get_text())
# Static labels supplement the original dynamic dictionary, which remains authoritative for existing values.
script='"use strict";\nObject.assign(window.ATLAS_I18N.zh,'+json.dumps(zh,ensure_ascii=False)+');\nObject.assign(window.ATLAS_I18N.en,'+json.dumps(en,ensure_ascii=False)+');\nwindow.ATLAS_I18N["zh-Hans"]=window.ATLAS_I18N.zh;\nwindow.ATLAS_I18N["zh-Hant"]='+json.dumps({k:to_hant(v) for k,v in zh.items()},ensure_ascii=False)+';\n'
# Fill traditional dynamic labels too, by parsing the original JSON-like JS object through Node.
import subprocess
out=subprocess.check_output(['node','-e','global.window={};require("./static/i18n.js");process.stdout.write(JSON.stringify(window.ATLAS_I18N.zh))'],cwd=root,text=True)
allzh={**json.loads(out),**zh};script=script[:script.index('window.ATLAS_I18N["zh-Hant"]=')]+ 'window.ATLAS_I18N["zh-Hant"]='+json.dumps({k:to_hant(v) for k,v in allzh.items()},ensure_ascii=False)+';\n'
(root/'static/ui_strings.js').write_text(script)
