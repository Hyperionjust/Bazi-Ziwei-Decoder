---
name: bazi-ziwei-decoder
description: 八字 + 紫微斗数 AI 排盘与综合分析。当用户提供生辰（阳历/农历日期、时辰、性别）询问八字、紫微、命理、命盘、流年大运相关问题时使用。基于 Yiqi 算法库 + enrichBazi 补全层精准排盘（杜绝 LLM 自行排盘出错），支持按需独立分析八字 / 独立分析紫微 / 两盘交叉印证。八字解读支持【流派镜片】（子平/滴天髓/神峰/盲派/段氏/不限）与【神煞】补层，开头加【成长心态声明】，采用【总领速览+按需下钻】输出。
---

# 八字 + 紫微斗数综合分析 Skill

## 何时触发

用户场景：
- 提供出生时间（"我是 2000-01-01 中午 12:00 男"）并希望分析
- 询问"帮我看八字 / 看紫微 / 算命 / 看命盘 / 看流年大运"
- 提供命盘文本（文墨天机、紫微斗数排盘软件导出格式）希望深度解读
- 询问特定大运/流年的吉凶

**不触发**：单纯的星座 / 塔罗 / 周公解梦 / 风水 / 姓名学。

## 必需输入

```
公历或农历日期 (YYYY-MM-DD)
出生时刻 (HH:MM, 24 小时制)
性别 (男/女)
```

若用户没给时辰，**必须主动询问**，不要默认子时。时辰对四柱日柱和紫微命宫影响极大。

> 不需要出生地。排盘直接使用钟表时间，不做真太阳时经度校正。

---

## 执行流程

### Step 0 — 决策门（开场必做） ⭐

**问题 1：要看哪种命理？**
> "我可以做三种分析：
> 1. **八字独立分析**（事业 / 财运 / 婚恋 / 子女 / 六亲 / 健康 — 提供长文 / 可视化海报 / 两种都要）
> 2. **紫微独立分析**（十二宫 + 大限 + 生年四化 + 流年 — 长文输出）
> 3. **八字 + 紫微综合印证**（两盘交叉对账 — 提供长文 / 可视化海报 / 两种都要）"

**如果用户选 3，再追问问题 2：呈现形态**
> "综合印证可以这样输出：
> A. **📜 长文深度版**（Markdown 散文，沉浸阅读）
> B. **🎴 结构化海报版**（单文件 HTML，可截图分享）
> C. **两种都要**"

**如果用户选 1（八字独立），追问问题 2′：流派镜片 + 呈现形态**
> "八字可按不同**流派镜片**解读（只影响怎么读，不影响排盘）：
> ① 子平派（格局）② 滴天髓（旺衰中和）③ 神峰通考（病药）④ 盲派（做功）⑤ 新派·段氏盲派 ⑥ 不限/综合（默认，多视角并陈）
> 呈现形态：A. **📜 长文深度版**（默认；总领速览 + 按需下钻，完整报告仅 Cowork 线建议） / B. **🎴 结构化海报版**（单文件 HTML，可截图分享） / C. **两种都要**"

> 流派只换"解读镜片"：神煞展开多少、用神视角随派变（子平丰富、滴天髓≈只羊刃空亡、盲派只取核心象；**现代神煞 MODERN 层仅『不限/open』启用**——红鸾/天喜/童子/孤鸾/阴差阳错/十恶大败/四废/天罗地网/天医/流霞/血刃/天厨，多版本查法任一命中即写并在 via 标注口诀/版本）；**四柱/十神/大运/神煞命中本身不变**。段氏已据《象的应用》《八字断句集》填入（取象六法 + 做功）。`--lineage` 取值：`ziping/ditian/shenfeng/mangpai/duanshi/open`。

**根据选择加载相应提示词和模板**：

| 用户选 | 加载提示词 | 模板 | 输出 |
|---|---|---|---|
| 1 + A（长文·默认） | `prompts/disclaimer-preamble.md` ＋ `prompts/bazi-prompt.md`（注入所选流派 + `output-mode-B`） | — | Markdown（开头必出 disclaimer，默认总领速览） |
| 1 + B（海报） | `prompts/bazi-poster.md` | `templates/report-bazi-poster.html` | `<name>-bazi.html`（`render --mode=bazi`） |
| 1 + C（两者） | 上述两份都跑 | 同上 | Markdown + HTML 两份 |
| 2 | `prompts/ziwei-prompt.md` | — | Markdown 对话回复 |
| 3 + A | `prompts/zonghe-yinzheng-prompt.md` | — | Markdown 对话回复 |
| 3 + B | `prompts/zonghe-poster.md` | `templates/report-zonghe-poster.html` | `<name>-zonghe.html` |
| 3 + C | 上述两份都跑 | 同上 | Markdown + HTML 两份 |

> **海报现有两种**：综合印证海报（3+B/3+C）与**八字独立海报（1+B/1+C）**；紫微独立暂只长文。八字海报为**单系统**（无双盘 verdict/consistency/conflict），走 `render --mode=bazi`。

---

### Step 1 — 排盘（算法层，产出 JSON）

**绝对不要让 AI 自己排八字或紫微**。必须调用算法层脚本：

```bash
cd calculator
# 八字独立分析推荐 tsx 直跑(免编译)。--lineage 仅用于"神煞镜片"+解读视角, 绝不改排盘; 不传=中立全集。
npx tsx run-chart.ts --year=YYYY --month=MM --day=DD --hour=HH --minute=MM --gender=male \
  --lineage=<ziping|ditian|shenfeng|mangpai|duanshi|open> --output=chart.json
# (若已 npx tsc 编译, 亦可 node dist/run-chart.js ...; shensha.json/lineages.json 自动从上层目录解析)
```

**注意**：`run-chart.ts` 的 stdout 是纯 JSON，stderr 是 debug 信息。**重定向时只取 stdout**（`> chart.json`），不要 `2>&1`。

脚本输出 JSON：
- `bazi`：四柱 / 十神 / 星运 / 自坐 / 纳音 / 藏干 / 大运（含 startAge/endAge/startYear/endYear）
- `bazi.enrichment`：格局 / 旺衰 / 调候 / 五行旺相 / 五行统计 / 天干关系 / 地支关系 / 整柱判定
- `bazi.enrichment.神煞`：神煞命中（`hits`＝中立全集；传 `--lineage` 时附 `lineage.hits`＝该派镜片过滤子集，带 tier / 权重 / `needs_review`）
- `ziwei`：十二宫 / 生年四化 / 大限 / 阴阳 / 五行局 / 命主身主

> **关键约束**：纯 LLM 排盘会错排日柱 → 日主 → 格局 → 用神，全链失真。Case B 测试证明 DeepSeek/Gemini 自行排盘均出错。算法层不可绕过。

---

### Step 2 — 文本盘转换（算法层，产出可读文本）

LLM 读 JSON 不如读结构化文本。把 Step 1 的 JSON 转成文墨天机风格的树状文本：

```bash
npx tsx dump-text.ts --input=chart.json --output=chart.txt
```

文本盘包含：
- 紫微部分：基本信息 + 生年四化 + 十二宫（含主星 / 辅星 / 大限 / 流年）
- 八字部分：四柱（含藏干十神 / 星运 / 自坐 / 纳音）+ 大运 + **神煞块（按流派镜片；柱位 / tier /「⚠起法待核」标记）** + 算法补层（格局 / 旺衰 / 调候 / 关系 / 整柱）

将 `chart.txt` 内容连同对应提示词一起送给 LLM 做分析。

---

### Step 3 — 分析（按 Step 0 用户选择执行对应分支）

#### Step 3 — 长文版（用户选 1 / 2 / 3+A / 3+C）
读取对应长文提示词（`bazi-prompt.md` / `ziwei-prompt.md` / `zonghe-yinzheng-prompt.md`），喂入 `chart.txt`，输出 Markdown 长文。

> **八字独立（选 1）专属**：①**输出最开头必先整段输出 `prompts/disclaimer-preamble.md`**（成长心态两段），再进正文；②按 `prompts/output-mode-B.md` 走【总领速览 + 按需下钻】——默认先出速览（顶部告示 + 定调锚点 + 固定章号菜单），用户回「详细展开第 X 章」再只深写该章并在顶部复述锚点；③正文按 **五行→十神→神煞→大运** 骨架，注入所选流派的 `prompt_inject` / `pillar_emphasis` / `literature`，**严格在该派方法论内、以该派文献为核心分析、不串派**（见 bazi-prompt「流派忠实度」一节；仅『不限/open』才多派并陈），并强制神煞铁律；④除非用户在 Step0 选"完整报告"，否则不一次性下灌全文、不诱导继续。

> 综合印证（3+A）的前置条件：先跑八字 + 紫微独立分析拿到中间报告，再喂给 `zonghe-yinzheng-prompt.md`。
> 如输出被截断，分段输出。

#### Step 3 — 海报版（3+B/3+C 综合印证海报 · 或 1+B/1+C 八字独立海报）

**通用**：对应提示词让 LLM **输出严格 JSON**（非 Markdown，末尾要求"直接以 `{` 开头"）→ 存为 `analysis.json` → 渲染。**LLM 只产数据不产 HTML**；若输出含 ```json 包装，渲染前剥掉。生成后把 HTML 路径告诉用户用浏览器打开。

> **海报文字长度规则【用户定】**：标签/表格/条目类字段守字数上限保版式；**解读类字段（提示词内标〔段落〕者）不限篇幅，但每个必须是成型段落**——至少 3~5 个完整句子、有盘面依据、有白话落地，**禁止一句话敷衍**；模板高度自动撑开，不会溢出。

**综合印证海报（3+B/3+C）** — 提示词 `prompts/zonghe-poster.md`：
```bash
cd calculator
npx tsx render.ts --chart=chart.json --analysis=analysis.json \
  --template=../templates/report-zonghe-poster.html --output=<name>-zonghe.html --currentYear=<YYYY>
```

**八字独立海报（1+B/1+C）** — 提示词 `prompts/bazi-poster.md`，**必带 `--mode=bazi`**（单系统；盘面数据由算法层注入，LLM 只产解读性字段）：
```bash
cd calculator
npx tsx render.ts --mode=bazi --chart=chart.json --analysis=analysis.json \
  --template=../templates/report-bazi-poster.html --output=<name>-bazi.html --currentYear=<YYYY>
```

---

## 安装后行为（重要）

**装好 Skill 后不要主动跑任何验证 / 自检命令。** 不要试 Smoke Test、不要排示例盘、不要分析示例命主。装好就是装好，等用户来给生辰再开始工作。

> 自检命令在 `TEST-GUIDE.md` 中由人工按需运行，不在 Agent 的职责范围内。Agent 主动跑会浪费 token + 触发上下文压缩。

依赖检查（仅在用户首次提供生辰、Agent 准备跑 run-chart.ts 报错时）：
```bash
cd <skill-root>/calculator
ls node_modules >/dev/null 2>&1 || npm install
```
也就是说，依赖问题**报错时再修**，不要装好就主动检查。

---

## 关键约束

1. **装好不自检**：见上节"安装后行为"。不要主动跑示例排盘 / 自检 / smoke test
2. **决策门必做**：永远先问用户要哪种分析，避免无意义的 token 消耗 + 输出截断
3. **排盘必须走算法层**：不要徒手算四柱、紫微宫位、大限。错一步全盘垮
4. **不引入命盘外变量**：风水、姓名、阳宅、紫白飞星不在本 Skill 范围
5. **冲突要说出来**：八字与紫微出现矛盾信号时按综合印证提示词的 4 条规则判定，不和稀泥
6. **置信度自评**：边界情况（旺衰临界、格局模糊、两盘对立）必须标"置信度：低"
7. **不替用户做决策**：投资、择偶、医疗、堕胎等决策类问题，给信号不给指令
8. **敏感问题拒答**：下蛊、断人财路、害人命运等违禁内容直接拒绝
9. **免责声明**：分析末尾必带"仅供文化研究与娱乐参考"
10. **流派只改解读不改排盘**：选流派只换解读镜片（用神视角 / 神煞展开多少），四柱·十神·大运·神煞命中一律以算法层为准，不得因流派重排
11. **神煞铁律**：神煞只增色、不定大局；与五行/十神/格局/用神核心冲突，一律以核心为准，不得由神煞反推翻核心
12. **不编造神煞/起法**：只解算法层「神煞」块已命中项；`needs_review`（起法待核）项照标、不当确定值；无文献依据者不补全
13. **成长心态置顶**：八字分析每次开头必出 `disclaimer-preamble.md` 两段（为什么"越算越不好" + 成长心态），不可省

---

## 文件清单

```

├── SKILL.md                          ← 本文件
├── calculator/
│   ├── run-chart.ts                  ← 入口：生辰 → JSON（stdout 纯 JSON / stderr debug）
│   ├── dump-text.ts                  ← JSON → 文墨天机风文本
│   ├── render.ts                     ← 渲染脚本：chart.json + analysis.json + 模板 → HTML
│   ├── shensha.ts                    ← 神煞计算引擎（数据驱动，读 shensha.json + 流派 policy）
│   ├── shensha.json                  ← 神煞单一事实源（起法/tier/出处/needs_review）
│   ├── lineages.json                 ← 流派配置（用神模型/神煞白名单权重/支柱侧重）
│   ├── schema-check.ts               ← 配置自检（json↔ts 一致性）
│   ├── fixtures/                     ← 神煞回归测试（shensha-cases.json + test-shensha.ts，12 例）
│   ├── package.json                  ← 算法层依赖声明
│   ├── yiqi-core/                    ← Yiqi 算法（已 vendored 入库，无外部依赖）
│   └── bazi-enrich/                  ← enrichBazi 补层（格局/旺衰/调候/关系/整柱）
├── prompts/
│   ├── disclaimer-preamble.md        ← ⭐ 成长心态前置声明（八字分析开头必出）
│   ├── output-mode-B.md              ← ⭐ 总领速览 + 按需下钻 输出模式规则
│   ├── bazi-prompt.md                ← 八字独立分析（v2：流派+神煞+disclaimer+模式B）
│   ├── ziwei-prompt.md               ← 紫微独立分析（长文）
│   ├── zonghe-yinzheng-prompt.md     ← ⭐ 综合印证（长文）
│   ├── zonghe-poster.md              ← ⭐ 综合印证海报（JSON 输出）
│   └── bazi-poster.md                ← ⭐ 八字独立海报（JSON 输出·单系统）
├── templates/
│   ├── report-zonghe-poster.html     ← 综合印证海报模板（占位符）
│   └── report-bazi-poster.html       ← 八字独立海报模板（占位符）
└── fixtures/                         ← 7 个验证案例（Case A-G）
```

**注**：HTML 海报现支持**综合印证（`render` 默认模式）**与**八字独立（`render --mode=bazi`）**两种；紫微独立暂只长文。

---

## 工作示例

**用户**：我是 2000 年 1 月 1 日 12:00 出生的男生，帮我看下命盘。

**Skill 应该走**：
1. 信息确认（日期/时辰/性别 ✅）
2. **决策门**："想要八字分析 / 紫微分析 / 综合印证？"
3. 用户回 "八字"：
   - Step 1：跑 `run-chart.ts` 产出 `chart.json`
   - Step 2：跑 `dump-text.ts` 产出 `chart.txt`
   - Step 3a：加载 `prompts/bazi-prompt.md` + 喂入 `chart.txt` → 输出八字分析
4. 提醒"若要紫微 / 综合印证可随时追问"

---

## 失败模式与处理

| 现象 | 原因 | 处理 |
|---|---|---|
| 排盘脚本报错 | 日期超 1900-2100 / 时辰格式错 | 询问用户校正 |
| AI 想"凭记忆排盘" | 偷懒走捷径 | **拒绝**。算法层是不可绕过的硬约束 |
| 输出被截断 | 三段一锅出超 token 上限 | 回到决策门，拆分输出 |
| 算法层和用户其他软件结果不一致 | 命名流派差异（建禄格 vs 比肩格） | 按算法层 `notes` 解释，不偷换说法 |
| Windows + 中文路径 + PowerShell 编码错乱 | 平台特性 | 在 cmd / git bash / WSL 下运行，避免 PowerShell |

---

## 免责声明（每次输出末必带）
> 本分析基于传统八字与紫微斗数理论框架，仅供文化研究与娱乐参考，不构成医疗、投资、婚姻、法律等任何决策依据。命运由个人选择与客观环境共同塑造。
