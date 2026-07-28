# bazi-ziwei v3.9.0 变更摘要（v-next 改进批次）

> 主线：全链准确性此前只防了「LLM 排盘错」，没防「输入错」——本批把**时辰输入可信度**纳入算法层管辖（边界检测→核盘流程→置信度传播），并新增**触发式小白模式**与流年问答的**流月/多年**两个维度。
> 底线全程遵守：排盘必走算法层、流派只改解读不改排盘、幕后台前分离、可证伪护栏原样、深度模式一行未降级、dist-bundle 自足单文件零安装。

## 测试结果（唯一对错信号，全过）

- fixtures 全绿 exit 0：`test-shensha`(13例) / `test-relations` / `test-boundary` / `test-check`(+5) / **`test-shichen`(新)** / **`test-liuyue`(新)** / **`test-compare`(新)** / `check-template` / `schema-check`
- dist-bundle 已重建，`node dist-bundle/run-chart.js` 等五入口直跑验证通过
- 端到端冒烟三链路：
  - 2000-01-01 **12:55**（交界前 5 分钟）→ `时辰边界.boundary=true`、chart.txt 顶部「⚠时辰临界」块、`confidence_tier=low`、违规长文被 `--mode=longform` 新红线拦下（合规文本零误伤）
  - 2000-01-01 **23:10**（晚子时）→ 日柱推次日己未（实测确认换日约定），「⚠晚子时约定」与临界块同现
  - 2000-01-01 12:00 + `--currentYear=2026 --compareYears=2026,2027,2028` → 流月 12 行（庚寅…辛丑，节气公历对照）与多年对比逐年行渲染正常；两张海报渲染无占位符残留、大运行为年份为主格式

## 工单完成情况

| 工单 | 状态 | 说明 |
|---|---|---|
| P0-A 边界时辰检测与核盘 | ✅ | `shichen-boundary.ts`（\|Δ\|≤20min→boundary+候选时辰；未传经度附 solar_note）；dump-text 顶部施工图块；SKILL Step 1.5 阻断性核盘分支（追问出生地重排 / 双盘核对大事年份 / 坚持则降档）；fixture 7 组 |
| P0-B 晚子时约定披露 | ✅ | **先实测后写码**：临时脚本确认引擎为换日约定（23:30≡次日00:30）；`zishi_convention` 字段 + dump-text 提示行 + bazi/ziwei 提示词白话披露强制规则 + SKILL 失败模式条目；结论固化进 fixture 断言 |
| P0-C 置信度传播 | ✅ | `confidence.ts` 聚合 confidence_tier（规则头注可复现）；bazi-prompt「置信度传播(强制)」节（low 档条件句/区间应期/禁高确定词/锚点声明一次）；longform 体检新增 `_边界盘高确定断语` 红线（常量表+单年断事启发式，正反样例入回归） |
| P0-D 小白模式 | ✅ | `prompts/novice-mode.md` 六节全承载（识别/决策门坍缩/双层锚点/菜单重排/核对点/disclaimer 照旧）；SKILL 决策门旁路+description 触发句；纯 prompts 变更，识别不到零打扰 |
| P1-A 流月粒度 | ✅ | `liuyue.ts`：12 节气月（精确节气时刻，五虎遁起月干）逐月 vs 原局/大运，**复用**现有检测器（suiVsYun 仅加 label 参数）；liunian-qa 月级窗口（农历月序+公历对照）；fixture 验证 2026 全部 12 干支与多条已知命中 |
| P1-B 多年对比 | ✅ | `--compareYears`（≤5，校验）→ 逐年引动+用神出口喜忌评分+重级标记；liunian-qa 比较型问法（单一领域逐年顺逆梯度+相对排序，给信号不给指令）；fixture 11 断言含确定性复现 |
| P1-C 大运年份为主 | ✅ | 「2008–2018 年(约 8–18 岁)」统一：render 三处注入 + yunsui.年龄字段 + dump-text 大运块 + 五份提示词逐一落实；紫微大限保持虚岁（不在范围）；模板占位符改名（旧键保留兼容） |
| P2 校准脚手架 | ✅（只搭架子） | `fixtures/calibration/`：case schema（含时辰来源可靠度）+ 空白模板 + runner 骨架（排盘→待人工评分对照表，应期自动标 命中/±1年/未中）+ 职业映射空 schema；`*.case.json` 不入库 |

## 明确未做（按任务书范围外声明）

紫微飞星四化/宫干自化、胎元命宫 `--extras`、职业映射库**内容**、disclaimer 精简分层、深度模式任何"顺手优化"——均未动。

## 其他

- 随包样例 `sample-chart.{json,txt}` 按新引擎重生成（新增字段固化进 golden）。
- 每项独立 commit（P0-A→P0-B→P0-C→P0-D→P1-A→P1-B→P1-C→P2→收尾），commit message 注明编号。
