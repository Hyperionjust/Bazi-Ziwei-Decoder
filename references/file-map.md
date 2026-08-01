# 文件清单（按需查阅，不必常驻上下文）

> 运行时只用 `calculator/dist-bundle/*.js`（自足单文件，零安装、兼容只读目录）。
> `.ts` 源码随包只为可读可改，**不是运行入口**；`calculator/dist/`（tsc 中间产物）自 v3.9.1 起不入库、不随包。

```
bazi-ziwei-decoder/
├── SKILL.md                          ← 技能主文件（触发条件 / 门禁 / Step 0–3 / 关键约束）
├── VERSION                           ← 版本号唯一事实源（启动版本检查比对的就是它）
├── references/                       ← 按需查阅的参考资料（不常驻上下文）
│   ├── file-map.md                   ← 本文件
│   ├── install-and-deps.md           ← 安装后行为、依赖与只读目录须知
│   ├── troubleshooting.md            ← 失败模式与处理
│   ├── walkthrough.md                ← 一次完整对话的走法示例
│   └── calibration.md                ← ⭐ 三类校准（典籍 / 现实事件 / 对照组）与调候校勘规程
├── scripts/
│   └── release.sh                    ← 发版唯一入口：写版本号 → 白名单打包 → 校验无垃圾件
├── calculator/
│   ├── dist-bundle/                  ← ⭐ 运行时入口（run-chart / dump-text / render / check-analysis / version-check）
│   ├── run-chart.ts                  ← 源码·入口：生辰 → JSON（stdout 纯 JSON / stderr debug）
│   ├── dump-text.ts                  ← 源码·JSON → 文墨天机风文本
│   ├── render.ts                     ← 源码·渲染：chart.json + analysis.json + 模板 → HTML
│   ├── shensha.ts                    ← 神煞计算引擎（数据驱动，读 shensha.json + 流派 policy）
│   ├── check-analysis.ts             ← 解读体检器（--mode=bazi|zonghe|ziwei|mbti|longform）
│   ├── schema-check.ts               ← 配置自检（json↔ts 一致性）
│   ├── spec.json                     ← ⭐ 形态规格单一事实源（判词字数/句数区间/连接词白名单/timeline 项数/禁词分层）
│   ├── tiaohou.json                  ← ⭐ 调候 120 格（日干×月支）+ 条例块（v3.11.0 全表吸收：1396 条条件树）+ 校勘块（M5 待核清单已全结案；取值权威性仍未主张，底本级确证须另立）
│   ├── shensha.json                  ← 神煞单一事实源（起法/tier/出处/needs_review）
│   ├── lineages.json                 ← 流派配置（用神模型/神煞白名单权重/支柱侧重）
│   ├── package.json                  ← 依赖声明 + npm test（fixtures 一键跑法）
│   ├── yiqi-core/                    ← Yiqi 算法（已 vendored 入库，无外部依赖）
│   ├── bazi-enrich/                  ← enrichBazi 补层（格局/旺衰 v3/调候/关系/整柱/时辰边界/置信度四维/流月/多年对比）
│   │   ├── wang-shuai-v3.ts          ← ⭐ F0 v6 冻结调整层：重复耗方支群势 + 月柱普通六冲折正向月令支持
│   │   ├── interactions.ts           ← ⭐ 合冲刑害裁决 + 稳定关系 ID；open 先裁决后供旺衰与解读同源复用
│   │   └── tiaohou-tiaoli.ts         ← ⭐ 调候条例求值器（受控词表 + DSL 解析，对盘面求值每条「若」；v3.11.0 M1 立）
│   └── fixtures/                     ← 回归测试
│       ├── test-shensha.ts           ← 神煞 13 例
│       ├── test-relations.ts         ← 关系 / 运岁 / 正缘
│       ├── test-boundary.ts          ← 阴阳年干 / 农历 / 时区 / 晚子时 / 真太阳时
│       ├── test-check.ts             ← 体检器五模式
│       ├── test-shichen.ts           ← 时辰边界检测 + 晚子时约定
│       ├── test-liuyue.ts            ← 流月引动
│       ├── test-compare.ts           ← 多年对比
│       ├── test-spec-sync.ts         ← ⭐ 规格漂移哨兵（spec.json ↔ 提示词/SKILL 数字比对）
│       ├── test-poster-v2.ts         ← ⭐ 八字海报 v2 五项算法块 + 新旧兼容 + source↔dist
│       ├── test-tiaohou.ts           ← ⭐ 调候表结构 + 快照锁 + 寒暖不变式
│       ├── test-shunni.ts            ← ⭐ 顺逆双轴 + 验收实况点
│       ├── test-wangshuai-v3.ts      ← ⭐ 22 例生产对齐 + F1/F2/F3 正反例 + 七项账本
│       ├── test-lineage-invariance.ts← ⭐ 五派镜片下旺衰/open关系/confidence 不变
│       ├── test-wangshuai-distribution.ts ← ⭐ 两种子 5000 盘 v3.12→v3.13 分布门
│       ├── check-template.ts         ← 海报模板完整性
│       ├── test-golden.ts            ← ⭐ 随包样例即金标（四线 sample-analysis 过对应 mode 体检）
│       ├── bless-tiaoli-relations.ts ← 条例「关系/蕴含」生成脚本（重跑会冲掉手工块——跑完须回填 EXPECTED_TIAOLI_HASH）
│       └── calibration/              ← 校准回测 + 韦千里 22 例语义金标/算法快照/F0 v1–v6 审计/5000 盘冻结基线
├── prompts/
│   ├── disclaimer-preamble.md        ← ⭐ 成长心态前置声明（八字/紫微/综合三线开头必出）
│   ├── output-mode-B.md              ← ⭐ 总领速览 + 按需下钻 输出模式规则
│   ├── novice-mode.md                ← ⭐ 小白模式（触发式旁路：决策门坍缩/双层锚点/菜单重排/核对点）
│   ├── bazi-prompt.md                ← 八字独立分析（流派 + 神煞 + disclaimer + 模式B）
│   ├── ziwei-prompt.md               ← 紫微独立分析（长文）
│   ├── zonghe-yinzheng-prompt.md     ← ⭐ 综合印证（长文）
│   ├── zonghe-poster.md              ← ⭐ 综合印证海报（JSON 输出）
│   ├── bazi-poster.md                ← ⭐ 八字独立海报（JSON 输出·单系统）
│   ├── bazi-poster-review.md         ← ⭐ 八字海报评审—重生（逐字段挑错，只重写 FAIL 字段）
│   ├── ziwei-poster.md               ← ⭐ 紫微独立海报（JSON 输出·十二宫盘算法注入）
│   ├── mbti-poster.md                ← ⭐ 八字 MBTI 海报（荣格八维×十神，JSON 输出）
│   └── liunian-qa.md                 ← ⭐ 流年问答模式（「我 202X 年适合…吗」直达通道）
├── templates/
│   ├── report-zonghe-poster.html     ← 综合印证海报模板（占位符）
│   ├── report-bazi-poster.html       ← 八字独立海报模板（占位符）
│   ├── report-ziwei-poster.html      ← 紫微独立海报模板（十二宫盘可视化）
│   └── report-mbti-poster.html       ← MBTI 海报模板（实测×底盘差异版块）
├── examples/                         ← 四条海报线各一套金标样例（chart / analysis / 渲染产物）
└── docs/                             ← 当前工单 + release-notes/（版本流水见 CHANGELOG.md）
    ├── 工单-v3.13-旺衰v3.md          ← ⭐ 已立项：群势/冲根/双轴校准，先证据门后生产改分
    ├── 工单-v3.14-八字海报v2.md      ← 已立项：确定性新区块可视化（排在 v3.13 后）
    ├── 条例撰写规范.md               ← 条例怎么写/词表边界/影印本抽查法
    └── archive/                      ← 已完结工单归档（v3.11 工单发版后移入）
```

## 四条海报管线对照

| 线别 | 提示词 | 模板 | 渲染 | 体检 |
|---|---|---|---|---|
| 综合印证 | `zonghe-poster.md` | `report-zonghe-poster.html` | `render`（缺省模式） | `check-analysis --mode=zonghe` |
| 八字独立 | `bazi-poster.md` + `bazi-poster-review.md` | `report-bazi-poster.html` | `render --mode=bazi` | `check-analysis`（缺省 bazi） |
| 紫微独立 | `ziwei-poster.md` | `report-ziwei-poster.html` | `render --mode=ziwei` | `check-analysis --mode=ziwei` |
| 八字 MBTI | `mbti-poster.md` | `report-mbti-poster.html` | `render --mode=mbti` | `check-analysis --mode=mbti` |
