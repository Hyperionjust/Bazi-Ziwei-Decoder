# Bazi-Ziwei-Decoder · 八字紫微命理基板

> **版本 `v1.2.0`** ｜ 神煞 + 流派镜片 · 超级魔改版 ｜ 协议 MIT ｜ 📜 [更新日志 CHANGELOG](./CHANGELOG.md)

> 📦 本基板基于 [dzcmemory-web / bazi-ziwei-skill](https://github.com/dzcmemory-web/bazi-ziwei-skill)（MIT，排盘内核源自 [Yiqi 八字紫微排盘系统](https://github.com/fdxuyq/Yiqi-BaZi-ZiWei)）的开源资料，**进一步超级魔改而来**——在其精准排盘内核之上，再叠加神煞引擎、流派镜片、成长心态、按需下钻、文献核验五层。

一个**精准排盘 + 多流派解读**的命理 AI 基板。核心理念一句话：**排盘交给算法，解读交给大模型，绝不让 AI 自己瞎排盘。** 普通大模型直接「帮我算八字」常把日柱、大运排错——一步错、满盘垮；本基板用内置算法层把四柱 / 十神 / 大运 / 神煞**算准**，再把「命盘文本」喂给大模型只做**解读**。

### 目录

- [✨ 主要功能](#-主要功能)
- [🚀 快速开始（通用三步）](#-快速开始通用三步)
- [📦 安装 / 使用指南](#-安装--使用指南) ｜ [Claude](#-claude原生最省事) · [ChatGPT](#-chatgpt做成-custom-gpt) · [Gemini](#-gemini做成-gem) · [DeepSeek](#-deepseek) · [Kimi](#-kimi)
- [📚 详细参考](#-详细参考术语--参数--清单)
- [🙏 致谢 & 协议](#-致谢--开源协议) ｜ [⚠️ 免责声明](#️-免责声明)

---

## ✨ 主要功能

### 🔥 魔改特色功能（本基板新增 —— 相比原版的「超级魔改」）

| # | 特色功能 | 说明 |
|---|---|---|
| 1 | **神煞进算法层** | 24 个神煞由代码精准起例（数据驱动、每个都带《三命通会》等**文献出处**），不再靠模型凭记忆瞎报。 |
| 2 | **流派镜片（6 派）** | 子平 / 滴天髓 / 神峰通考 / 盲派 / 段氏 / 不限。**只换「怎么解读」，绝不改「排了什么」**——同一盘换流派，四柱不变、神煞展开与用神视角随派变。 |
| 3 | **按流派 + 文献为核心解读** | 选定流派后，模型**严格在该派方法论内、以该派代表文献为核心**分析，不串派、宁存疑勿乱用（仅「不限」才多派并陈）。 |
| 4 | **成长心态声明置顶** | 每次八字分析开头先讲「为什么会越算越不好」+「以成长心态看命」，反焦虑、反宿命。 |
| 5 | **总领速览 + 按需下钻** | 第一回合先给一页全局速览（含章号菜单），你说「详细展开第 6 章」才深写那一章——不一次性灌长文、不诱导你继续算。 |
| 6 | **文献核验 + 防编造铁律** | 起法有分歧/查不到的，宁可标「⚠起法待核」也**绝不编**。文昌/福星还做**古法交叉校验**（通行版命中时，再核一遍《三命通会》古法，没有就提示「古法无」）。 |
| 7 | **自带回归测试** | `schema-check`（配置自检）+ 9 例神煞 fixtures，改完一键验证不跑偏。 |

> 神煞铁律：**神煞只增色、不定大局**；与五行/十神/格局/用神核心冲突时，一律以核心为准。

### 🧱 基础功能（继承自基板的精准排盘内核）

- **精准排盘**：四柱 / 十神 / 藏干 / 星运 / 自坐 / 纳音 / 大运 / 流年（源自 Yiqi 排盘内核，免「LLM 瞎排」）。
- **紫微斗数**：十二宫 / 主辅星 / 生年四化 / 大限 / 流年 / 命主身主 / 五行局。
- **enrich 补层**：格局 / 旺衰（四维评分）/ 调候用神 / 五行统计 / 刑冲合害 / 盖头截脚。
- **三种分析**：八字独立 · 紫微独立 · **八字＋紫微综合印证**（两盘交叉对账）。
- **两种输出**：📜 长文深度版（Markdown）· 🎴 结构化海报版（单文件 HTML，可截图分享）。

---

## 🚀 快速开始（通用三步）

> 前提：电脑装了 [Node.js](https://nodejs.org)（18+）。**任何大模型都先做这三步拿到命盘文本 `chart.txt`。**

```bash
# 0) 进入算法层目录，装依赖（仅首次；依赖只有一个 lunar-typescript）
cd calculator
npm install

# 1) 排盘：生辰 → 命盘 JSON（--lineage 选流派，只影响解读镜片，不改排盘）
npx tsx run-chart.ts --year=1990 --month=6 --day=15 --hour=14 --minute=30 \
  --gender=male --lineage=ziping --output=chart.json

# 2) 转成可读「文本盘」
npx tsx dump-text.ts --input=chart.json --output=chart.txt
```

**第 3 步：把 `chart.txt` ＋ 提示词喂给大模型** —— 打开 `prompts/bazi-prompt.md`，连同 `chart.txt` 一起发给模型，它就按「成长心态声明 → 五行 → 十神 → 神煞 → 大运 → 六维事项」、并**严格依所选流派与其文献**输出解读。

> 记住：**模型只读 `chart.txt` 做解读，不自己排盘。** 这就是本基板的全部意义。

---

## 📦 安装 / 使用指南

> 除 **Claude** 外，下面这些平台**不能在云端跑排盘脚本**。所以统一是：**先在本机完成上面「快速开始」三步拿到 `chart.txt`，再喂给模型**——模型只解读、不排盘。换流派＝改 `--lineage` 重排一次。

### 🟣 Claude（原生，最省事）

把整个基板文件夹放进 Claude 的 skills 目录（Claude Code / Cowork），或直接「Save skill」安装本仓库的 `.skill` 包。之后直接说「我是 1990 年 6 月 15 日下午 2 点半出生的男生，按子平派看八字」，skill 会**自动**跑算法层、选流派、出解读，无需手动敲命令。

### 🟢 ChatGPT（做成 Custom GPT）

> 需要 ChatGPT **Plus / Team / Enterprise**。排盘在你电脑上跑（快速开始 1–2 步），`chart.txt` 贴进对话即可。

1. 左下角头像 → **My GPTs** → **Create a GPT** → 切到 **Configure** 标签。
2. **Name**：八字命理助手。
3. **Instructions**：把 `prompts/bazi-prompt.md` 全文粘进去；再附上 `prompts/disclaimer-preamble.md`、`prompts/output-mode-B.md` 两份内容。
4. **Knowledge → Upload files**：上传 `prompts/` 提示词、`calculator/lineages.json`、`calculator/shensha.json`，以及一两份示例 `chart.txt`（最多 20 个文件）。
5. 右侧 **Preview** 贴一份 `chart.txt` 测试 → 满意后点右上 **Create / Update**，选「仅自己」或「有链接可用」。
6. 以后每次：本机排盘得到 `chart.txt` → 丢给这个 GPT。

📎 [Creating and editing GPTs（官方）](https://help.openai.com/en/articles/8554397-creating-and-editing-gpts)

### 🔵 Gemini（做成 Gem）

> 用 Gemini 的「Gems」自定义助手。同样：本机排盘，`chart.txt` 喂进去。

1. 打开 Gemini → 左侧 **Gems / Gem manager** → **New Gem**。
2. **Instructions**：粘贴 `prompts/bazi-prompt.md`（＋ disclaimer ＋ output-mode-B）。可点魔法棒让 Gemini 帮你润色。
3. **Knowledge → Add files**：上传 `prompts/`、`lineages.json`、`shensha.json`、示例 `chart.txt`（每个 Gem 最多 10 个文件）。
4. 右侧 **Preview** 测试 → 点 **Save**（只预览不点保存不会存）。
5. 以后：本机排盘出 `chart.txt` → 在这个 Gem 里发给它。

📎 [Tips for creating custom Gems（官方）](https://support.google.com/gemini/answer/15235603)

### 🟠 DeepSeek

> 网页版没有「自定义助手」入口，但支持**文件上传**。每次把提示词 + 命盘一起给它。

1. 本机跑通用三步，拿到 `chart.txt`。
2. 打开 [chat.deepseek.com](https://chat.deepseek.com)，新建对话。
3. 第一条消息：**先粘贴 `prompts/bazi-prompt.md` 全文**（＋ disclaimer ＋ output-mode-B），再**上传或粘贴 `chart.txt`**，说明「按上面的提示词、严格依所选流派解读这份命盘，先出成长心态声明与总领速览」。
4. 换流派：改 `--lineage` 重排，拿新的 `chart.txt` 再发。
5. 小技巧：把这套提示词存进浏览器「常用语 / 收藏」，免得每次复制。

📎 [DeepSeek API Docs（系统提示参考）](https://api-docs.deepseek.com/)

### 🟡 Kimi

> Kimi（Moonshot）长上下文、可一次传多份文件，很适合贴长提示词 + 命盘。

1. 本机跑通用三步，拿到 `chart.txt`。
2. 打开 [kimi.com](https://www.kimi.com)，新建对话。
3. **上传文件**：把 `prompts/bazi-prompt.md`、`disclaimer-preamble.md`、`output-mode-B.md` 和 `chart.txt` 一起拖进去。
4. 发一句：「严格按 bazi-prompt 的提示词与所选流派镜片解读 chart.txt 这份命盘；开头先出成长心态声明，再走总领速览。」
5. 换流派同样是重排 `chart.txt` 再传。

📎 [How to use Kimi（指南）](https://kimi-ai.chat/guide/how-to-use-kimi-ai/)

---

## 📚 详细参考（术语 · 参数 · 清单）

### 一、流派镜片对照（`--lineage` 取值）

| key | 流派 | 用神模型 | 神煞展开 |
|---|---|---|---|
| `ziping` | 子平派（格局） | 月令定格、六格成败救应、喜用忌神 | 丰富，作辅助吉凶 |
| `ditian` | 滴天髓（旺衰/中和） | 日主旺衰、五行气势流通、贵中和 | 弱化（≈ 仅羊刃、空亡） |
| `shenfeng` | 神峰通考（病药） | 找全局最旺/矛盾为「病」、去病之字为「药」 | 批判，原则略过 |
| `mangpai` | 盲派（做功） | 弃旺衰废用忌、看命局「做功」组合 | 只取核心象：禄/刃/华盖(墓)/驿马/空亡/桃花 |
| `duanshi_TODO` | 新派·段氏盲派 | 同源做功（⚠ 文献未补，**stub**，自动退回盲派近似） | 段氏《理象学》5 类象，待补 |
| `open` | **不限/综合（默认）** | 格局 + 旺衰 + 病药 三视角并陈、冲突标分歧 | 按 tier 全列 |

> 流派是**解读层镜片**：换流派只改「展开哪些神煞、用神看哪派、依哪家文献」，**四柱/十神/大运/神煞命中本身永不变**。除「不限」外，模型会**严格在该派方法论内、以该派文献为核心**分析，不串派。

### 二、命令行参数

`run-chart.ts`（排盘）：

| 参数 | 必填 | 说明 |
|---|---|---|
| `--year/--month/--day/--hour/--minute` | ✅ | 出生年月日时分（24 小时制） |
| `--gender` | ✅ | `male` / `female`（或 男/女） |
| `--lineage` | 否 | 流派 key（见上表）；不传=只写中立全集神煞 |
| `--isLunar` | 否 | `true`=输入为农历（默认公历） |
| `--timeZone` | 否 | 时区，默认 8 |
| `--output` | 否 | 输出 JSON 路径；不传则打印到 stdout |

`dump-text.ts`（转文本盘）：`--input=chart.json [--output=chart.txt]`

> 排盘直接用钟表时间，不做真太阳时经度校正；范围约 1900–2100。

### 三、神煞清单（24，带 tier 与出处）

- **T1 核心（9）**：天乙贵人 · 文昌贵人 · 桃花(咸池) · 驿马 · 华盖 · 将星 · 羊刃 · 禄神 · 空亡
- **T2 常用（8）**：天德贵人 · 月德贵人 · 太极贵人 · 金舆 · 魁罡 · 国印贵人 · 福星贵人 · 红艳煞
- **COMPOUND 复合（2）**：德秀贵人 · 三奇（严格顺布连珠）
- **T3 凶煞（5）**：劫煞 · 亡神 · 灾煞 · 孤辰寡宿 · 元辰

起例与象解全部抄自 `shensha.json` 的 `source` 字段（多为《三命通会》卷二/卷三/卷六）。

### 四、文献核验 & 防编造（本基板底线）

- 每个神煞起例都标 `source`（文献出处）；起法有分歧/不在所引文献的，标 `needs_review` 并在文本盘打「⚠起法待核」。
- **古法交叉校验（文昌/福星）**：以通行版为命中主表，命中时再用《三命通会》古法核一遍——古法亦合→标「古法亦合@柱」；古法无→标「古法无」；古法原文字句残损/未列全的部分→标「未校验」而**不编造**。
- **解读层同理**：选定流派后以该派文献为核心、不串派；某结论该派文献无据则标存疑，不借他派充数。
- 本版 `needs_review` 已全部消化（红艳对齐三命通会原文、国印纳入、元辰实现、三奇启用严格顺布、魁罡戊辰/羊刃阴干刃按文献默认关闭）。详见 `CHANGELOG.md` / `CHANGES-v2.md`。

### 五、目录结构

```
Bazi-Ziwei-Decoder/
├── SKILL.md                      # skill 主控（决策门 / 流程 / 约束）
├── CHANGELOG.md                  # 版本更新日志（每版 update）
├── CHANGES-v2.md                 # 详细变更摘要 + 文献核验结论
├── prompts/
│   ├── disclaimer-preamble.md    # ⭐ 成长心态声明（开头必出）
│   ├── output-mode-B.md          # ⭐ 总领速览 + 按需下钻
│   ├── bazi-prompt.md            # 八字解读（流派忠实度+神煞+disclaimer+模式B）
│   ├── ziwei-prompt.md / zonghe-*.md
└── calculator/
    ├── run-chart.ts              # 生辰 → 命盘 JSON（+神煞）
    ├── dump-text.ts              # JSON → 文本盘
    ├── shensha.ts / shensha.json # 神煞引擎 + 单一事实源
    ├── lineages.json             # 流派配置（用神模型/神煞权重/文献）
    ├── schema-check.ts           # 配置自检
    ├── fixtures/                 # 神煞回归测试（9 例）
    ├── yiqi-core/ · bazi-enrich/ # 排盘内核 + 补层（已 vendored）
    └── dist/                     # 预编译 JS（`node dist/...` 亦可）
```

### 六、自检 / 测试

```bash
cd calculator
npx tsx schema-check.ts                 # 配置一致性，exit 0 为过
cd fixtures && npx tsx test-shensha.ts  # 9 例神煞回归，全绿为过
```

---

## 🙏 致谢 & 开源协议

- **基板**：[dzcmemory-web / bazi-ziwei-skill](https://github.com/dzcmemory-web/bazi-ziwei-skill)（MIT）—— 本项目在其之上超级魔改。
- **排盘内核**：[Yiqi 八字紫微排盘系统](https://github.com/fdxuyq/Yiqi-BaZi-ZiWei)（MIT，vendored 于 `calculator/yiqi-core/`）。
- **农历换算**：[lunar-typescript](https://github.com/6tail/lunar-typescript)（MIT）。

本基板沿用 **MIT 协议**；魔改部分（神煞引擎 / 流派配置 / prompts / 文献核验）同以 MIT 发布。详见 `NOTICE` 与 `LICENSE`。

## ⚠️ 免责声明

本基板基于传统八字与紫微斗数理论框架，**仅供文化研究与自我观照参考**，不构成医疗、投资、婚姻、法律等任何决策依据。命运由个人选择与客观环境共同塑造——你始终是自己命运的主笔人。
