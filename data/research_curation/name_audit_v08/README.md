# v0.8 第二轮名称与分类核对

本轮逐行处理 18,379 条记录，以完整学名、原始 GBIF ID 或原 Wikidata QID 匹配，**不使用模糊学名合并、自动翻译或拼造中文名**。其中主要是三个科的植物参考，不是 18,379 种已确认食用香料。

- `names.csv`：UTF-8 BOM，供 Excel 抽查的全部记录；含中英文、学名、科属、状态、来源和身份匹配。
- `audit_records.json`：同一批记录的结构化审计结果。
- `corrections.json`：原位升级的字段修订；保存旧值，仅更新仍符合原身份的字段，用户自定义值保留。
- `summary.json`：本次真实覆盖数量及来源版本；缺失名称不是已核实名称。
- `identity_conflicts.json`：学名或来源 ID 冲突，当前为空。
- `material_scope_notes.json`：芹菜、百里香、肉桂、红椒粉等原料与物种概念差异，保留原料范围。
- `source_snapshots.json`：请求 URL、取得时间和原始响应 SHA-256，供重现核对。

本轮新增 1,046 个有来源的中文名，中文名总计 2,581 个；**15,798 条仍未确认可靠中文名**，显示学名并明确说明。英文常用名 2,906 个，其余 15,473 条使用学名，不把拉丁学名标成英语常用名。959 个分类节点中 448 个具有中文标签，其余使用原文分类名。148 条记录补充名录中的科属和导航关系；原有 Wiki 分类关系保留。

17,830 条原 GBIF 记录均与新取得的原 ID 和完整学名一致。植物中文名称优先中科院名录，其次 TaiCOL、精确 P225 的 Wikidata 和 GBIF 汉字名称；13 个整理过的原料展签保留原料命名。异名与地区名称保留在别名中；旧别名不等于逐项重新确认。

## 数据来源与许可

1. The Biodiversity Committee of Chinese Academy of Sciences (2024). **Catalogue of Life China 2023 Annual Checklist**, v1.1. Chinese Academy of Sciences. DOI: <https://doi.org/10.15468/ae6ush>。数据包：<https://www.gbifchina.org.cn/resource?r=chinacol2023&v=1.1>。**CC BY-NC 4.0**，非商业限制属于本来源数据，不属于应用代码的 MIT 许可。
2. Shao K (2024). **The National Checklist of Taiwan (TaiCOL)**, v1.13. TaiBIF. DOI: <https://doi.org/10.15468/auw1kd>。<https://ipt.taibif.tw/resource?r=taibnet_com_all&v=1.13>。**CC BY 4.0**。保留繁体地区名为别名，简体显示使用 OpenCC 转换。
3. **GBIF Backbone Taxonomy**，数据集 `d7dddbf4-2cf0-4f39-9b2a-bb099caae36c`，通过官方 species search API 核对原始分类 ID。<https://www.gbif.org/dataset/d7dddbf4-2cf0-4f39-9b2a-bb099caae36c>。**CC BY 4.0**；被汇入的名称仍需参考原数据集条款。
4. **Wikidata** 官方实体 API 和 SPARQL，精确 P225，原料/混合物等无学名概念使用原 QID；结构化数据 **CC0**。语言链接保留指向原百科的页面。

完整 DwCA/API 下载快照不随应用重复打包；本目录保留来源、版本、记录号、请求及哈希。重现时按 `source_snapshots.json` 下载到快照目录，并保持 `china_dwca.zip`、`taicol.zip`、`gbif/*.json`、`wikidata/*.json`、`wikidata_plants.json`、`wikidata_nodes/*.json`；JSON 响应包装为 `{url,fetched_at,sha256,data}`。以修订前数据库运行：

```bash
python scripts/audit_names_v08.py SNAPSHOT_DIR ORIGINAL_DB data/research_curation/name_audit_v08
```

新获取数据可能与本次快照不同，重跑会改变统计和时间戳；不要把它当成相同发行包。来源名称有地区与分类系统差异，“有来源”不代表不存在争议。
