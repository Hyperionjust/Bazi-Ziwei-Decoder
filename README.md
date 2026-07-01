# Bazi-Ziwei-Decoder · 八字紫微命理基板

> `v1.2.0` ｜ 神煞 + 流派镜片 ｜ MIT ｜ 📜 [CHANGELOG](./CHANGELOG.md)

基于 [dzcmemory-web / bazi-ziwei-skill](https://github.com/dzcmemory-web/bazi-ziwei-skill) 超级魔改，排盘内核源自 [Yiqi](https://github.com/fdxuyq/Yiqi-BaZi-ZiWei)。

精准排盘 + 多流派解读的命理基板。核心一句话：**排盘交给算法，解读交给大模型，绝不让 AI 瞎排盘。** 普通模型直接算八字常把日柱大运排错；本基板用算法层把四柱、十神、大运、神煞算准，再喂给模型只做解读。

### 目录

- [主要功能](#-主要功能)
- [安装与使用](#-安装与使用)（Claude · Gemini · Kimi · Codex · ChatGPT · DeepSeek）
- [详细参考](#-详细参考)
- [致谢 & 协议](#-致谢--协议) ｜ [免责声明](#️-免责声明)

---

## ✨ 主要功能

### 🔥 魔改特色

| # | 特色 | 说明 |
|---|---|---|
| 1 | 神煞进算法层 | 24 神煞代码起例、数据驱动、每个带文献出处，不靠模型瞎报。 |
| 2 | 流派镜片 6 派 | 子平 / 滴天髓 / 神峰 / 盲派 / 段氏 / 不限。只换解读、不改排盘；换流派四柱不变，神煞与用神随派变。 |
| 3 | 按流派 + 文献解读 | 选定流派后严格用该派方法、以该派文献为核心，不串派。 |
| 4 | 成长心态置顶 | 每次开头先讲「越算越不好」的原理与成长心态，反焦虑反宿命。 |
| 5 | 总领速览 + 按需下钻 | 先给全局速览与章号菜单，你说「展开第 6 章」才深写，不灌长文。 |
| 6 | 文献核验防编造 | 起法查不到就标待核、绝不编；文昌福星做古法交叉校验。 |
| 7 | 自带回归测试 | schema-check + 9 例 fixtures，改完一键验证。 |

> 铁律：神煞只增色、不定大局，与五行十神格局用神冲突时以核心为准。

### 🧱 基础功能

精准排盘四柱十神大运、紫微十二宫四化大限、格局旺衰调候刑冲合害等补层；支持八字 / 紫微 / 综合印证；长文与 HTML 海报两种输出。

---

## 🧭 安装与使用

排盘由内置算法层完成，模型只做解读。支持 Skills 且能运行代码的 Agent（Claude、Kimi Code、Gemini CLI）可直接调用；纯聊天模型需先在本机排盘、再将结果粘贴给模型。请先获取文件，再按所用模型操作。

**获取文件**（通用，三选一）：GitHub 页面点 `<> Code` → Download ZIP 后解压；或在 Releases 下载 `bazi-ziwei-decoder.skill`；或 `git clone https://github.com/<用户名>/Bazi-Ziwei-Decoder.git`。得到 `Bazi-Ziwei-Decoder` 文件夹。

### 1. Claude

适用于 Claude 桌面版（Cowork）与 Claude Code；安装后排盘、解读全自动，无需命令行。

1. 安装：桌面版将 `bazi-ziwei-decoder.skill` 拖入对话，点 **Save skill**；Claude Code 将文件夹放入 `~/.claude/skills/`（Windows 为 `C:\Users\<用户名>\.claude\skills\`）。
2. 首次排盘若提示缺少依赖，Claude 会在 `calculator/` 目录自动执行一次 `npm install`。
3. 使用：在对话中提供出生日期、时间、性别与流派。例：「1990 年 6 月 15 日 14:30 男，按子平派看八字」。

### 2. Gemini

Gemini CLI 支持 SKILL.md 技能并可运行脚本，安装后自动排盘（需已安装 Node.js）。

1. 安装 Gemini CLI，参见 [官方文档](https://geminicli.com/docs/cli/skills/)。
2. 将 `Bazi-Ziwei-Decoder` 文件夹复制到技能目录 `~/.gemini/skills/bazi-ziwei-decoder/`（须包含 `SKILL.md`）。
3. 启动 Gemini CLI，提供生辰与流派，CLI 会自动识别技能并排盘解读。
4. 仅使用 Gemini 网页版（不安装 CLI）时：按第 6 节完成本机排盘，再将 `chart.txt` 粘贴给它。

### 3. Kimi

Kimi Code CLI 原生支持 SKILL.md 技能（需已安装 Node.js）。

1. 安装 Kimi Code CLI，参见 [官方文档](https://www.kimi.com/zh-cn/help/agent/use-skills-in-code)。
2. 将 `Bazi-Ziwei-Decoder` 文件夹放入 Kimi Code 的用户级 Skills 目录（对所有项目生效，路径见文档）。
3. 在会话中输入 `/skill:bazi-ziwei-decoder`，或直接提供生辰由其自动识别。
4. 仅使用 Kimi 网页版时：按第 6 节完成本机排盘，再上传 `chart.txt`。

### 4. Codex

OpenAI Codex CLI 支持 SKILL.md 技能（2025 年底起）并可运行脚本，安装后自动排盘（需已安装 Node.js）。

1. 安装 Codex CLI，参见 [官方文档](https://developers.openai.com/codex/skills)。
2. 将 `Bazi-Ziwei-Decoder` 文件夹放入 Codex 的 Skills 目录（如 `~/.codex/skills/`，具体路径见文档），须包含 `SKILL.md`。
3. 在会话中用 `/skills` 选择该技能，或直接提供生辰由其自动识别，Codex 会运行排盘并解读。

### 5. ChatGPT

需具备代码解释器（Plus / Team / Enterprise）；可在其容器内运行排盘脚本，无需本机操作。

1. 在对话中上传 `bazi-ziwei-decoder.zip`。
2. 指示其执行：解压后进入 `calculator` 运行 `npm install`，再用 `run-chart.ts`、`dump-text.ts` 排盘，最后按 `prompts/bazi-prompt.md` 及所选流派解读。
3. 可选：创建启用代码解释器的 Custom GPT，将提示词置于 Instructions、项目置于 Knowledge，此后仅需提供生辰。参见 [创建 Custom GPT](https://help.openai.com/en/articles/8554397-creating-and-editing-gpts)。

### 6. DeepSeek 及其他纯聊天模型

适用于 DeepSeek 网页版、Gemini / Kimi 网页版等无法运行代码的场景，需先在本机排盘。

1. 安装 Node.js：访问 [nodejs.org](https://nodejs.org) 下载 LTS 版并安装；打开终端（Windows 搜索「PowerShell」，macOS 打开「终端」），输入 `node -v`，显示版本号即成功。
2. 本机排盘：在终端进入 `calculator` 目录，依次执行——

   ```bash
   npm install
   npx tsx run-chart.ts --year=1990 --month=6 --day=15 --hour=14 --minute=30 --gender=male --lineage=ziping --output=chart.json
   npx tsx dump-text.ts --input=chart.json --output=chart.txt
   ```

   完成后 `calculator` 目录生成 `chart.txt`。
3. 交给模型：新建对话，先粘贴 `prompts/bazi-prompt.md`（及 `disclaimer-preamble.md`、`output-mode-B.md`），再上传或粘贴 `chart.txt`，要求其按提示词与所选流派解读。DeepSeek 用 chat.deepseek.com；Gemini 网页可存成 Gem；Kimi 网页可一次传多份文件。

## 📚 详细参考

### 一、流派镜片 `--lineage`

| key | 流派 | 用神模型 | 神煞展开 |
|---|---|---|---|
| `ziping` | 子平（格局） | 月令定格、六格成败、喜用忌神 | 丰富 |
| `ditian` | 滴天髓（旺衰中和） | 日主旺衰、气势流通、贵中和 | 弱化，约仅羊刃空亡 |
| `shenfeng` | 神峰（病药） | 取最旺矛盾为病、去病之字为药 | 批判略过 |
| `mangpai` | 盲派（做功） | 弃旺衰、看命局做功组合 | 只取禄刃墓马空亡桃花 |
| `duanshi_TODO` | 段氏盲派 | 同源做功，文献未补，stub 退回盲派 | 段氏 5 类象待补 |
| `open` | 不限 · 默认 | 格局 + 旺衰 + 病药三视角并陈 | 按 tier 全列 |

> 流派只是解读镜片：换流派只改展开哪些神煞、用哪家方法与文献，四柱十神大运神煞命中不变。除 open 外严格按该派文献解读、不串派。

### 二、命令行参数

`run-chart.ts`：`--year --month --day --hour --minute --gender` 必填；`--lineage` 选流派、不传只写中立全集；`--isLunar=true` 农历；`--timeZone` 默认 8；`--output` 输出路径。
`dump-text.ts`：`--input=chart.json --output=chart.txt`。
> 用钟表时间，不做真太阳时校正，范围约 1900–2100。

### 三、神煞清单 24

- T1 核心 9：天乙 · 文昌 · 桃花 · 驿马 · 华盖 · 将星 · 羊刃 · 禄神 · 空亡
- T2 常用 8：天德 · 月德 · 太极 · 金舆 · 魁罡 · 国印 · 福星 · 红艳
- 复合 2：德秀 · 三奇
- T3 凶煞 5：劫煞 · 亡神 · 灾煞 · 孤辰寡宿 · 元辰

起例出处见 `shensha.json` 的 source 字段，多为《三命通会》。

### 四、文献核验 & 防编造

- 每个神煞标 source 文献出处；有分歧或查不到就标 needs_review、文本盘打「⚠起法待核」。
- 文昌福星古法交叉校验：通行版命中时核一遍《三命通会》古法，无则标「古法无」，原文残损未列全的标「未校验」，绝不编。
- 解读层同理，按该派文献、不串派。
- 本版 needs_review 已全部消化，详见 `CHANGELOG.md`。

### 五、目录结构

```
Bazi-Ziwei-Decoder/
├── SKILL.md            主控：决策门 / 流程 / 约束
├── CHANGELOG.md        版本更新日志
├── prompts/            disclaimer · output-mode-B · bazi-prompt 等
└── calculator/         run-chart · dump-text · shensha 引擎 · lineages · yiqi-core · fixtures
```

### 六、自检

```bash
cd calculator
npx tsx schema-check.ts
cd fixtures && npx tsx test-shensha.ts
```

---

## 🙏 致谢 & 协议

- 基板：[dzcmemory-web / bazi-ziwei-skill](https://github.com/dzcmemory-web/bazi-ziwei-skill)，MIT。
- 排盘内核：[Yiqi](https://github.com/fdxuyq/Yiqi-BaZi-ZiWei)，MIT。
- 农历换算：[lunar-typescript](https://github.com/6tail/lunar-typescript)，MIT。

本项目 MIT，详见 `NOTICE` 与 `LICENSE`。

## ⚠️ 免责声明

仅供文化研究与自我观照参考，不构成医疗、投资、婚姻、法律等任何决策依据。命运由个人选择与客观环境共同塑造。
