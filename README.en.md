<div align="center">

# bazi-ziwei-skill

**An AI Skill for BaZi (Four Pillars) + Zi Wei Dou Shu charting & cross-validation**

Deterministic charting (not LLM guesswork) · 3 analysis modes · 4 ink-style HTML poster themes

[![Version](https://img.shields.io/badge/version-3.12.0-blue.svg)](./CHANGELOG.md)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](./LICENSE)
[![SKILL.md](https://img.shields.io/badge/SKILL.md-compatible-c1432f.svg)](#-installation)

[简体中文](./README.md) | English

<br>

<img src="./docs/jietu.png" alt="Cross-validation poster sample" width="680">

<sub>Cross-validation poster sample (synthetic subject, for display only)</sub>

</div>

---

## What is this

A Chinese metaphysics analysis Skill following the [SKILL.md open standard](https://code.claude.com/docs/en/skills). It plugs into any compatible AI agent — Claude Code / Claude Desktop / Codex / Cursor / Hermes / OpenClaw, etc.

It does three things an LLM alone does poorly:

1. **Accurate charting**: the Four Pillars (BaZi), the twelve palaces of Zi Wei Dou Shu, and the luck/year cycles are all computed by a bundled algorithm library — **the LLM never charts on its own**. Pure-LLM charting routinely gets the day pillar, day master, or chart structure wrong, and one wrong step corrupts everything downstream.
2. **Structural enrichment**: on top of the raw chart, an extra layer computes "chart structure / strength / climatic adjustment / clashes-combinations-harms / capped-pillars", feeding the LLM grounded inputs.
3. **Cross-validation**: it reconciles the conclusions of two independent systems — BaZi and Zi Wei — checking whether their main axes agree, whether life windows line up, and which one to trust on conflict. This is the core value that "any LLM + any charting tool" cannot replicate.

---

## ✨ Features

- 🎯 **Accurate algorithm**: charting core derived from the open-source project Yiqi (MIT); the enrichment layer is guarded by regression suites — 13 symbolic-star cases, 20 interaction/luck-cycle groups, boundary tests (lunar leap month / timezone / late-Zi hour / true solar time) and checker suites
- 🧭 **3 analysis modes**: BaZi only / Zi Wei only / BaZi + Zi Wei cross-validation, plus a direct annual-fortune Q&A channel (`liunian-qa`)
- 📜 **2 output formats**: in-depth Markdown long-form + 🎴 single-file HTML posters in 4 themes (cross-validation / BaZi-only / MBTI / Zi Wei standalone)
- 🎴 **Ink-style chart posters**: modern minimal × Chinese ink — Zi Wei 12-palace chart, BaZi four-pillar chart, six-dimension cross-check, MBTI ancient-style characters, ready to screenshot and share
- 🕰️ **Optional true-solar-time correction**: `--longitude=<deg>` adds the longitude offset ((lon−120)×4 min, east positive) plus the equation of time on top of the UTC+8 clock time; off by default
- 🔌 **Cross-agent**: one SKILL.md, works across major agents
- 🔒 **Privacy-first**: all charting runs locally, no network needed; runtime artifacts are gitignored by default
- 🧭 **Dual-axis luck reading**: momentum ("does it move") and resilience ("can you take it") are narrated separately — "opportunity arrives but you can't catch it" is finally sayable
- 📖 **Classical canon as a rule base**: all 120 cells of the *Qiongtong Baojian* / *Zaohua Yuanyao* live in the algorithm as 1,396 machine-evaluable clauses — citing a clause your chart didn't match gets blocked by the checker
- ⏰ **Birth-time confidence**: near-boundary birth times trigger verification instead of silent guessing; uncertain conclusions automatically soften their wording (four independent dimensions, no blanket downgrade)

---

## 🚀 Installation

### 1. Clone

```bash
git clone https://github.com/dzcmemory-web/bazi-ziwei-skill.git
```

### 2. Install algorithm dependencies

```bash
cd bazi-ziwei-skill/calculator
npm install
```
> Requires Node.js >= 18. Only one runtime dependency: `lunar-typescript` (MIT).

### 3. Register with your agent

Drop the whole `bazi-ziwei-skill/` folder into your agent's skills directory:

| Agent | skills directory |
|---|---|
| Claude Code / Claude Desktop | `~/.claude/skills/bazi-ziwei/` |
| Codex | `~/.codex/skills/bazi-ziwei/` or reference via project AGENTS.md |
| Cursor | reference from project `.cursor/` rules |
| Hermes Agent | `~/.hermes/skills/bazi-ziwei/` |
| OpenClaw | its skills directory / local ClawHub install |

The agent reads `SKILL.md` automatically and invokes it on demand.

---

## 📖 Usage

Once installed, just tell the agent a birth time:

```
I'm a male born at noon (12:00) on Jan 1, 2000. Read my chart.
```

The agent will:
1. Ask which analysis you want (BaZi / Zi Wei / cross-validation)
2. For cross-validation, ask long-form vs. HTML poster
3. Call the algorithm layer → load the matching prompt → output analysis or render the poster

See [`SKILL.md`](./SKILL.md) for the full flow and [`TEST-GUIDE.md`](./TEST-GUIDE.md) for testing.

### Charting directly from the CLI (no agent)

Zero-install: `calculator/dist-bundle/` ships **five** self-contained esbuild bundles (`run-chart` / `dump-text` / `render` / `check-analysis` / `version-check`) that run with plain `node` — no `npm install` needed, and read-only skill directories work.

```bash
cd calculator
# chart -> JSON
node dist-bundle/run-chart.js --year=2000 --month=1 --day=1 --hour=12 --minute=0 --gender=male --output=chart.json
# optional flags: --lineage=ziping|ditian|shenfeng|mangpai|open · --isLunar=true (negative month = leap month) ·
#   --timeZone=<tz> (default 8) · --currentYear=YYYY ·
#   --longitude=<deg> true-solar-time correction (off by default; east longitude positive; may shift the hour/day pillar)
# JSON -> readable text chart
node dist-bundle/dump-text.js --input=chart.json --output=chart.txt
# JSON + analysis JSON + template -> HTML poster
node dist-bundle/render.js --chart=chart.json --analysis=analysis.json \
  --template=../templates/report-zonghe-poster.html --output=report.html --currentYear=2026
# render modes: --mode=zonghe (default) | bazi | mbti | ziwei (Zi Wei standalone poster; match templates/report-*.html)
# optional quality gate before rendering:
node dist-bundle/check-analysis.js --mode=zonghe --analysis=analysis.json --chart=chart.json
# (default checks the BaZi poster; --mode=mbti|zonghe|ziwei for the other posters; --mode=longform --text=report.md scans long-form drafts)
```

A synthetic sample is bundled (male, 2000-01-01, not a real person):
- `examples/sample-chart.json` — algorithm chart output
- `examples/sample-chart.txt` — text chart
- `examples/sample-analysis-zonghe.json` — cross-validation analysis (sample)
- `examples/sample-zonghe-report.html` / `sample-bazi-report.html` / `sample-ziwei-report.html` — **finished posters; open in a browser to preview**

---

## 📁 Layout

```
Bazi-Ziwei-Decoder/
├── SKILL.md                       Skill entry point (the agent reads this)
├── TEST-GUIDE.md                  Testing guide
├── calculator/
│   ├── run-chart.ts               charting entry: birth time -> JSON
│   ├── dump-text.ts               JSON -> text chart
│   ├── render.ts                  JSON + analysis + template -> single-file HTML (--mode=zonghe|bazi|mbti|ziwei)
│   ├── check-analysis.ts          analysis quality gate (posters + long-form)
│   ├── version-check.ts             one-shot version check (read-only; no download, no exec)
│   ├── dist-bundle/               5 zero-install self-contained bundles (run with plain node)
│   ├── shensha.ts + shensha.json  43 symbolic stars, data-driven with literature sources
│   ├── lineages.json              five lineage lenses (whitelists + adjudication rules + literature)
│   ├── yiqi-core/                 charting core (vendored from Yiqi, MIT)
│   ├── bazi-enrich/               structure/strength/climate/clash/luck-cycle enrichment
│   └── fixtures/                  regression suites (shensha / relations / boundary / checker / template)
├── prompts/
│   ├── bazi-prompt.md · ziwei-prompt.md · zonghe-yinzheng-prompt.md    long-form prompts (3 modes)
│   ├── bazi-poster.md (+ -review) · zonghe-poster.md · mbti-poster.md · ziwei-poster.md    poster prompts
│   ├── liunian-qa.md              annual-fortune Q&A (direct channel)
│   └── disclaimer-preamble.md · output-mode-B.md    shared guardrails
├── templates/                     4 poster templates (zonghe / bazi / mbti / ziwei)
└── examples/                      synthetic samples (chart / text / analysis / rendered posters)
```

---

## ✅ Self-check

```bash
cd calculator
npx tsx schema-check.ts
cd fixtures
npx tsx test-shensha.ts      # 13 symbolic-star cases
npx tsx test-relations.ts    # 20 groups: clash/combination adjudication, luck cycles, yongshen, BaWei
npx tsx test-boundary.ts     # boundary regression (lunar leap month / timezone / late-Zi hour / true solar time)
npx tsx test-check.ts        # checker regression (bazi / mbti / zonghe / ziwei / longform)
npx tsx check-template.ts    # poster template integrity
```

---

## 🏗️ How it works

```
birth time ──> run-chart.ts ──> chart.json ──> dump-text.ts ──> chart.txt
                  (deterministic charting)                       (LLM-friendly text)
                                                                      │
                                  ┌───────────────────────────────────┤
                                  ▼                                   ▼
                          long-form prompt                     poster prompt
                          (Markdown prose)                     (strict JSON output)
                                                                      │
                                                              render.ts + template
                                                                      ▼
                                                              single-file HTML poster
```

**Key design**: the LLM only does *analysis* — never charting or HTML. Charting is handled by deterministic algorithms, the HTML visual by a fixed template, and the LLM's structured output fills template slots. Three concerns, cleanly separated.

---

## 🙏 Acknowledgements

- Charting core derived from the [Yiqi BaZi/Zi Wei system](https://github.com/fdxuyq/Yiqi-BaZi-ZiWei) (MIT); see [`NOTICE`](./NOTICE)
- Lunar conversion via [lunar-typescript](https://github.com/6tail/lunar-typescript) (MIT)

---

## 📬 Contact

Feedback, collaboration, or questions: **dzcmemory@gmail.com**

If this project helps you, a ⭐ Star is appreciated.

---

## ⚠️ Disclaimer

This project is based on traditional BaZi and Zi Wei Dou Shu theory and is **for cultural research and entertainment only**. It does not constitute medical, financial, marital, legal, or any other decision-making basis. Your life is shaped by your own choices and circumstances.

---

## 📄 License

[MIT](./LICENSE) © 2026 dzcmemory-web
