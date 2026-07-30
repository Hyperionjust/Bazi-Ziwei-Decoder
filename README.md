# Bazi-Ziwei-Decoder · 八字紫微命理基板

> `v3.12.0` ｜ 43 神煞 + 五派镜片 + 作用裁决 + 八字MBTI ｜ MIT ｜ 📜 [CHANGELOG](./CHANGELOG.md)

基于 [dzcmemory-web / bazi-ziwei-skill](https://github.com/dzcmemory-web/bazi-ziwei-skill) 超级魔改，排盘内核源自 [Yiqi](https://github.com/fdxuyq/Yiqi-BaZi-ZiWei)。

这是一个装进 AI 里的「命理师技能包」。把它装进 Claude（或 Gemini、Kimi、Codex 等）之后，你只要说一句——「我是 2000 年 1 月 1 日中午 12 点出生的，男，帮我算算」——就能得到一份**排盘精确、说话有出处、不吓唬人**的八字 / 紫微解读。完全不懂命理也没关系，它认得出新手，会改用白话引导你，只问一个问题就开工。

为什么要装它，而不是直接问 AI？因为直接让大模型算八字，日柱、大运经常排错——盘一错，后面的解读全是错的。这个技能包把排盘交给内置的算法程序（实测对照过专业排盘软件），AI 只负责它擅长的那部分：把算好的盘讲成人话。

### 目录

- [它能帮你做什么](#它能帮你做什么)
- [安装与使用](#-安装与使用)（Claude · Gemini · Kimi · Codex · ChatGPT · DeepSeek）
- [主要功能](#-主要功能)
- [3.x 比 2.x 多了什么](#-3x-比-2x-多了什么30-秒速览)
- [详细参考·术语与命令行参数](#-详细参考)（放在最后，普通用户可以不看）
- [致谢 & 协议](#-致谢--协议) ｜ [免责声明](#️-免责声明)

---

## 它能帮你做什么

- **一份全面的人生分析**——事业、财运、婚恋、子女、健康。先给你一页速览和章节菜单，你说「展开第几章」它才细讲，不会一次灌几千字。
- **具体年份的具体问题**——「我 2027 年适合跳槽吗」「明年运势如何」，直接问，它会单独排那一年的运势精确作答，还能细到月份。
- **可以保存分享的海报长图**——一张设计好的命盘解读图（另有紫微版、八字 MBTI 版），可截图发朋友圈。
- **八字版 MBTI**——把你的先天格局翻译成你熟悉的 MBTI 语言，告诉你「你最像哪一型」，还能和你实测的 MBTI 对照着看。

几件它**不做**的事：不说「必然」「注定」「大凶」这类宿命话（每次开头还会先讲成长心态）；查不到出处的神煞老实标「待核」，绝不现编；你的出生时刻如果离时辰交界很近，它会先停下来跟你核对，而不是硬着头皮解错盘。

**隐私**：生辰在你自己的电脑上由本地程序排盘，本工具不上传、不收集任何个人信息。

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

---

## ✨ 主要功能

| # | 功能 | 一句话 |
|---|---|---|
| 1 | 精准排盘 | 四柱、十神、大运、紫微十二宫全部由程序算，模型不插手，盘不会错。 |
| 2 | 神煞进算法层 | 43 个神煞按古籍起法由代码排出、个个带出处，查不到的老实标「待核」，绝不现编。 |
| 3 | 流派镜片 | 子平 / 滴天髓 / 神峰 / 盲派（含段氏）/ 不限，五种视角随你选——换派只换讲法，盘面不变。 |
| 4 | 合冲刑害裁决 | 哪个合生效、哪个冲被解，由规则集先判好再交给模型讲，各派口径不同也讲得明白。 |
| 5 | 典籍条例层 | 《穷通宝鉴》120 格的书面条件全进了算法，说你「寒木向阳」时是真的查过你的盘，引错书会被程序拦下。 |
| 6 | 顺逆双轴 | 「事情推不推得动」和「你扛不扛得住」分开讲，不再一锅烩成吉凶。 |
| 7 | 时辰可信度 | 出生时间挨着交界会先跟你核对；拿不准的结论自动把话说保守。 |
| 8 | 成长心态置顶 | 每次开头先讲「为什么越算越不好」，反焦虑、反宿命。 |
| 9 | 速览 + 按需下钻 | 先给一页速览和章节菜单，你点哪章才细讲，不灌长文。 |
| 10 | 海报长图 | 综合 / 八字 / MBTI / 紫微四种主题的单文件 HTML 长图，截图就能分享。 |
| 11 | 八字 MBTI | 把先天格局翻成你熟悉的 MBTI 语言，措辞永远是「最像」，不是测评。 |
| 12 | 流年问答直达 | 「我 2027 年适合跳槽吗」直接问，能细到月份、能多年对比。 |
| 13 | 自带质检 | 四条海报线都有体检器把关，13 套回归测试一条命令跑完。 |
| 14 | 零安装可跑 | 五个入口打包成单文件，`node` 直接跑，免装依赖。 |

> 铁律：神煞只增色、不定大局，与五行十神格局用神冲突时以核心为准。

---

## 🆕 3.x 比 2.x 多了什么（30 秒速览）

> 只列 3.x 定稿后的新能力，不列中间过程。

- 🧬 **八字 MBTI**——把你的先天格局翻译成 MBTI 语言，告诉你「最像哪一型」，还能和实测结果对照；带 16 型×男女 32 套古风小人的独立海报。
- 📖 **典籍条例层**——《穷通宝鉴》/《造化元钥》120 格全部书面条件进了算法（1396 条），说你「寒木向阳」时是真的查过你盘里丙透没透，引用错书会被程序拦下。
- 🧭 **顺逆双轴**——运势不再一锅烩吉凶：「事情推不推得动」和「你的状态接不接得住」分开讲，「机会来了但身体接不住」这种最有用的话终于说得出来。
- ⚖️ **格局相神裁决 + 韦例校准**——身旺但伤官/七杀特别重的盘不再被「身旺忌印」一刀切；旺衰与用神判定用民国命理师韦千里的 **22 个真实判例**持续校准（当前 14 例完全一致、4 例部分一致），对照表随包可查。
- 🕰️ **时辰可信度体系**——出生时间挨着时辰交界会先跟你核对而不是硬算；深夜 11 点后出生主动讲清两种排法差异；judgment 拿不准的地方措辞自动变保守（分四类各管各的，不连坐）。
- ⏳ **应期引爆窗口**——盘里「差一个字」的潜伏组合（拱、半合、三刑缺一），直接算出哪年那个字会来。
- 📅 **流年问答升级**——「我 2027 年适合跳槽吗」直达通道，能细到月份、能多年对比排序。
- 🖼️ **紫微独立海报**——紫微线也有了自己的长图（十二宫盘可视化）。
- 🙋 **小白模式**——认出新手就改用白话、只问一个问题；老手完全无感。
- 🛡️ **质量与安全**——四条海报线都有体检器把关 + 随包金标样例进回归（369 断言）；移除了 2.7 的启动自动更新（不再有远程代码执行面）；发版脚本成为版本号唯一入口。

---

## 📚 详细参考

> 本节及以下是**术语与命令行参数**层面的内容，写给想调参数、换流派、跑脚本的用户；只想「装上就用」的话，看到这里就够了。

### 一、流派镜片 `--lineage`

| key | 流派 | 用神模型 | 神煞展开 |
|---|---|---|---|
| `ziping` | 子平（格局） | 月令定格、六格成败、喜用忌神 | 丰富 |
| `ditian` | 滴天髓（旺衰中和） | 日主旺衰、气势流通、贵中和 | 弱化，约仅羊刃空亡 |
| `shenfeng` | 神峰（病药） | 取最旺矛盾为病、去病之字为药 | 批判略过 |
| `mangpai` | 盲派（做功·含段氏取象） | 弃旺衰、做功为纲；段氏取象六法并入，段氏特有分析标注〔段氏〕（`duanshi` 保留为别名） | 只取禄刃华盖墓马空亡桃花，并入神煞象 |
| `open` | 不限 · 默认 | 格局 + 旺衰 + 病药三视角并陈 | 按 tier 全列 |

> 流派只是解读镜片：换流派只改展开哪些神煞、用哪家方法与文献，四柱十神大运神煞命中不变。除 open 外严格按该派文献解读、不串派。

### 二、命令行参数

`run-chart.ts`：`--year --month --day --hour --minute --gender` 必填；`--lineage` 选流派、不传只写中立全集；`--isLunar=true` 农历（闰月传负月份）；`--timeZone` 默认 8；`--currentYear` 定当前大运/流年（缺省=系统年）；`--output` 输出路径。
`--longitude=<经度>`（v3.8，可选，默认关）：真太阳时校正——真太阳时 = 东八区钟表时 + 经度差（(经度−120)×4 分钟，东经为正）+ 均时差（NOAA 通行近似式，误差 <1 分钟）；取值 -180~180，校正可能改动时柱甚至日柱。不传则与旧版行为完全一致。
`dump-text.ts`：`--input=chart.json --output=chart.txt`。
`render.ts`：`--chart --analysis --template --output` + `--mode=zonghe|bazi|mbti|ziwei`（缺省 zonghe；ziwei 为 v3.7 紫微独立海报）、`--currentYear=YYYY`、`--name=命主姓名`、`--testedMBTI=XXXX`（可选，MBTI 实测类型）。
`check-analysis.ts`：解读体检器——`--analysis --chart`（默认八字海报体检）、`--mode=mbti|zonghe|ziwei` 对应其余海报线、`--mode=longform --text=report.md` 长文形态红线扫描；FAIL 即送回重写，ALL PASS 才渲染。
> **零安装**：以上入口连同 `version-check` 共五个均有 `dist-bundle/` 自足单文件版本，`node dist-bundle/run-chart.js ...` 直跑，无需安装依赖（只读目录可用）。
> 默认用东八区钟表时间（约 1900–2100），真太阳时校正需显式传 `--longitude` 才开启。

### 三、神煞清单 43

- T1 核心 9：天乙（分昼贵/夜贵当值标注）· 文昌 · 桃花 · 驿马 · 华盖 · 将星 · 羊刃 · 禄神 · 空亡
- T2 常用 15：天德 · 月德（标注日干见足格/力减）· 天德合 · 月德合 · 太极 · 金舆 · 魁罡 · 国印 · 福星 · 红艳 · 学堂词馆（纳音正偏 + 干禄词馆变体）· 天福 · 日贵 · 日德 · 福德秀气
- 复合 2：德秀 · 三奇
- T3 凶煞 5：劫煞 · 亡神 · 灾煞 · 孤辰寡宿 · 元辰
- MODERN 现代 12（**仅『不限流派 open』启用**，引擎白名单强制门禁）：红鸾 · 天喜 · 童子煞 · 孤鸾煞 · 阴差阳错 · 十恶大败 · 四废 · 天罗地网 · 天医 · 流霞 · 血刃 · 天厨

起例出处见 `shensha.json` 的 source 字段，多为《三命通会》；现代层多版本查法（童子/流霞/血刃/天厨/天罗地网/孤鸾）按【任一查法命中即写】政策，命中 via 标注所用口诀/版本。不限流派下每个命中另附「派系侧重」（五传统派 重用/参用/不用），供解读标注分歧；天乙分昼夜贵当值、月德标日干见足格。

### 四、文献核验 & 防编造

- 每个神煞标 source 文献出处；有分歧或查不到就标 needs_review、文本盘打「⚠起法待核」。
- 文昌福星古法交叉校验：通行版命中时核一遍《三命通会》古法，无则标「古法无」。v2.0 起古法十干已补全——文昌甲乙句据宋·《五行精纪》卷十三（与通会一致），福星丙–癸按通会「余倒推」+《甲丙相邀入虎乡歌》补全，不再有「未校验」项。
- 解读层同理，按该派文献、不串派。
- 本版 needs_review 已全部消化，详见 `CHANGELOG.md`。

### 五、目录结构

```
Bazi-Ziwei-Decoder/
├── SKILL.md            主控：决策门 / 流程 / 约束
├── CHANGELOG.md        版本更新日志
├── prompts/            disclaimer · output-mode-B · bazi/ziwei/zonghe 长文提示词 · 海报提示词（bazi + bazi-poster-review / zonghe / mbti / ziwei）· liunian-qa 流年问答
├── templates/          海报模板 ×4（综合印证 + 八字独立 + MBTI + 紫微独立，含完整性门禁校验）
└── calculator/
    ├── run-chart · dump-text · render · check-analysis · version-check   五入口（dist-bundle/ 零安装自足版 ×5；dist/ 为本地 tsc 产物不入库）
    ├── shensha 引擎 + shensha.json         43 神煞 SSOT（T1/T2/T3/COMPOUND/MODERN）
    ├── bazi-enrich/                        格局旺衰调候 · 合冲刑害裁决(interactions) · 运岁引动(yunsui) · 八维(bawei)
    ├── lineages.json                       五派镜片（神煞白名单 + 作用规则集 + 文献）
    └── fixtures/                           回归测试（神煞13例 · 关系20组 · 边界 test-boundary · 体检 test-check · 模板门禁）
```

### 六、自检

```bash
cd calculator
npx tsx schema-check.ts
cd fixtures
npx tsx test-shensha.ts      # 神煞 13 例
npx tsx test-relations.ts    # 合冲刑害裁决 + 运岁/用神/八维 20 组
npx tsx test-boundary.ts     # 边界回归（农历闰月/时区换算/晚子时/真太阳时等）
npx tsx test-check.ts        # 体检器回归（bazi/mbti/zonghe/ziwei/longform 五模式）
npx tsx check-template.ts    # 海报模板完整性(结尾/开闭平衡/占位符)
```

---

## 🙏 致谢 & 协议

- 基板：[dzcmemory-web / bazi-ziwei-skill](https://github.com/dzcmemory-web/bazi-ziwei-skill)，MIT。
- 排盘内核：[Yiqi](https://github.com/fdxuyq/Yiqi-BaZi-ZiWei)，MIT。
- 农历换算：[lunar-typescript](https://github.com/6tail/lunar-typescript)，MIT。

本项目 MIT，详见 `NOTICE` 与 `LICENSE`。

## ⚠️ 免责声明

仅供文化研究与自我观照参考，不构成医疗、投资、婚姻、法律等任何决策依据。命运由个人选择与客观环境共同塑造。
