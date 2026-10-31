# 内容、图片与署名

本版随包保存目录元数据、清洗决策和 Wikidata 结构化证据，不分发百科正文快照或下载图片。研究抽查用过的维基简介全文不随发行包提供，保留原页、获取时间和历史入口索引。使用过程中获取的文本、图像和译文仍遵循各来源许可，缓存与直链不会改变许可。

## 维基百科文本与分类

正文经 MediaWiki Action API 获取，记录原文地址、固定版本、作者历史、获取时间与许可入口。显示时清理脚本、统一排版、去除正文图片、改写相对链接和引用锚点；重点模式按原章节筛选。启用本地或云端翻译时另标为机器译文。

维基百科文本通常采用 CC BY-SA，具体以原页和适用条款为准。分类标题、页面名称等来源数据保留站点和原始标识；本项目不把第三方文本重新授予其他许可。

- [Wikimedia 使用条款](https://foundation.wikimedia.org/wiki/Policy:Terms_of_Use)
- [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/)
- [MediaWiki 分类成员 API](https://www.mediawiki.org/wiki/API:Categorymembers)

## 其他来源阅读器与研究索引

可选阅读器使用 Wikispecies／Wikibooks 公共 Action API、GBIF 兼容 v1 名称匹配元数据，以及经审阅站点的有界 HTML 读取。没有公开接口的网站标记为 HTML 适配器，不宣称其为官方 API。第三方正文保留来源与适用条款，实时读取不额外授予转载许可。研究文件仅保存查询记录、候选元数据，不保存完整文章；补充检索与指定搜索引擎直接请求分开标注，清理短期 URL 会话后缀。文本名称匹配不代表分类或食用核实。

Wikispecies 和 Wikibooks 卡片保留来源、固定版本与 CC BY-SA 链接；GBIF 卡片说明兼容 v1／旧标识的匹配依据，并链接来源。通用 HTML 读取清理活动内容及文章图片，原站条款仍适用。

## Wikidata

名称、别名、站点对应关系、学名及主图文件名来自 Wikidata 结构化数据，按 CC0 提供。对应图片文件本身的许可并不因此变成 CC0。

- [Wikidata 许可](https://www.wikidata.org/wiki/Wikidata:Licensing)

## GBIF 植物分类元数据

本版使用 GBIF Secretariat 发布的 GBIF Backbone Taxonomy 数据集，键为 d7dddbf4-2cf0-4f39-9b2a-bb099caae36c，数据集页面列明 CC BY 4.0。发布日为 2023-08-28；本包同步日为 2026-10-27。

范围为唇形科、伞形科、胡椒科中该数据集的 accepted species 记录；保留来源记录键、学名、科／属和来源入口。分类记录不提供可食用性保证，也不等于实时更新后的全球分类学共识。

引用：GBIF Secretariat (2023). GBIF Backbone Taxonomy. Checklist dataset. Accessed via the GBIF species API on 2026-10-27.

- [数据集与许可](https://www.gbif.org/dataset/d7dddbf4-2cf0-4f39-9b2a-bb099caae36c)
- [数据集 DOI](https://doi.org/10.15468/39omei)
- [GBIF species API](https://techdocs.gbif.org/en/openapi/v1/species)
- [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/)

## Commons 图片

API 返回图像地址、文件说明页、作者、许可与许可链接。默认直接加载远程缩略图；选择后台中转、或远程图片加载失败后自动重试中转时才下载。图像可能经 object-fit 裁切预览，原图入口保留完整画面。

API 可访问、直链可显示与许可条件是不同事情。Commons 多数作品可按各文件许可复用；应核查文件说明页，依要求署名、链接许可，并说明裁切、加字等修改。API 返回元数据不能替代逐图核对。

图库为候选检索结果，未逐张人工鉴定植物和原料形态。以后发布视频时，需把所用图片的作者、文件页、许可与修改记录带入发布材料。

- [Commons 复用说明](https://commons.wikimedia.org/wiki/Commons:Reusing_content_outside_Wikimedia)

## 其他网站和搜索

NParks、ICAR、McCormick 等只有少量简短编辑阅读提示与原站链接，不随包复制完整文章。不同条目可以有不同来源，不假定这些站点都有可通用调用的公开 API。

百度百科和图片保留原站入口；Bing 在当前响应允许时可尝试原站 iframe；Google 为原站入口或已有资格的 API。搜索结果不是图片复用授权。来源视窗显示原站内容，仍受原站嵌入与使用规则控制。

- [Bing Search APIs 退役公告](https://learn.microsoft.com/en-us/lifecycle/announcements/bing-search-api-retirement)
- [Google Custom Search JSON API 状态](https://developers.google.com/custom-search/v1/overview)
- [Wikimedia User-Agent 政策](https://foundation.wikimedia.org/wiki/Policy:Wikimedia_Foundation_User-Agent_Policy)
- [浏览器 X-Frame-Options](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/X-Frame-Options)

## 字体

网页可从 Google Fonts 加载 Noto Serif SC、Cormorant Garamond、Cinzel、Ma Shan Zheng；本包未重新分发字体文件。离线回退到系统字体。展签是现代排印意象，不是字体年代或香料历史起源的考据结论。

## 翻译服务与项目代码

Google Cloud Translation 与 Azure AI Translator 分别采用其官方服务条款、凭据和计量规则。用户需要自行配置账号、配额和密钥；搜索网页的可访问性不等于翻译 API 已开通。

- <https://docs.cloud.google.com/translate/docs/setup>
- <https://cloud.google.com/products/translate/pricing>
- <https://learn.microsoft.com/en-us/azure/ai-services/translator/text-translation/reference/v3/translate>

原创应用代码、图标和原创文档由 Bravoll 维护，采用 [MIT 许可证](LICENSE)，详见 [中文说明](LICENSE.zh-CN.md)。第三方内容保留各自许可。学习与科普定位不对 MIT 增加“禁止商用”限制。

README 使用项目所有者提供的截图，保留原有署名。截图中的 Commons 照片分别适用 CC BY-SA 4.0，见 [截图署名](docs/screenshots/README.md)，不改为 MIT。

## 0.5：英语音标、录音与中文拼音

英语音标来自 [Free Dictionary API](https://dictionaryapi.dev/) 及其链接的 Wiktionary 资料，只选取音标字段，不随包分发词典释义。保留词典入口及每条声音数据提供的来源、许可。只将明确标为 UK / GB 的音频用于“英式词典录音”；缺失音标不生成。

音频从允许的词典／Wikimedia／词典音频域名实时播放，不随发行包打包。具体音频许可可能不同，复用前仍需查看文件页。浏览器 Web Speech 属于单独标识的合成语音，本机是否有英式语音取决于设备、浏览器及已安装语音包。

中文拼音使用独立安装的 [pypinyin](https://github.com/mozillazg/python-pinyin)，明确标为自动生成，多音字和专名应核对。依赖继续遵循其维护者随包提供的许可，本文件不代替依赖自身声明。

原站视窗的适应功能只缩放显示，不改写原站正文，也不移除原站嵌入限制。

[English](CONTENT_LICENSES.md) · 简体中文

## 应用图标

`static/atlas-icon.svg` 和多尺寸 ICO 是为启动器及网页绘制的项目原创图形，不含第三方照片。其项目许可状态随源码，本声明不另行授予授权。原站视窗只调整可用宽度或整体预览缩放，展开时保留同一 iframe，不改写来源正文或绕过嵌入限制。

## 本地缓存留存

工作版本可通过重复访问或闲置预热保留已取正文、云译文及图片元数据；保留原来源／版本、获取时间、链接和提供的许可。预测载荷只在内存，运行缓存及操作统计不进入发行包。长期保存和 API 获取不额外授予复用权利。

第三次修订的公开检索阅读器展示有标签的结果元数据与链接，审阅站点 HTML 清理后显示。公开图像结果保留原文件页，不把可获取等同于免费许可。原站 frame 限制与验证保留，不移除安全头或代理活动原站。Wikidata 名称表保留 CC0 来源说明，GBIF v2／v1 仍遵循来源数据集条款。

## v0.8 名称核对来源

应用代码仍为 MIT。**中科院《中国生物物种名录 2023》v1.1 来源数据采用 CC BY-NC 4.0**，需署名并受非商业使用限制；引用为 The Biodiversity Committee of Chinese Academy of Sciences (2024)，DOI [10.15468/ae6ush](https://doi.org/10.15468/ae6ush)。**TaiCOL v1.13 采用 CC BY 4.0**，Shao K (2024), TaiBIF，DOI [10.15468/auw1kd](https://doi.org/10.15468/auw1kd)。Wikidata 结构化数据采用 CC0；GBIF Backbone Taxonomy 采用 CC BY 4.0，汇入来源仍遵守原条款。[名称核对档案](data/research_curation/name_audit_v08/README.md)保留各名称的署名、原记录号、版本及下载哈希。不能将这些数据重新宣称为 MIT 代码。
