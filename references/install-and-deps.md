# 安装后行为 · 依赖 · 只读目录须知

## 装好不自检（硬规则，SKILL.md 关键约束第 1 条）

**装好 Skill 后不要主动跑任何验证 / 自检命令。** 不要试 Smoke Test、不要排示例盘、不要分析示例命主。装好就是装好，等用户来给生辰再开始工作。

自检命令在 `TEST-GUIDE.md` 中由人工按需运行，不在 Agent 的职责范围内。Agent 主动跑会浪费 token + 触发上下文压缩。

## 运行时只用 dist-bundle

`calculator/dist-bundle/*.js` 是自足单文件（依赖已打进去），`node` 直跑，零安装，兼容只读安装目录。五个入口：

```
run-chart.js      生辰 → chart.json
dump-text.js      chart.json → chart.txt
render.js         chart.json + analysis.json + 模板 → HTML
check-analysis.js analysis.json / 长文 → 体检报告
version-check.js  比对远端 VERSION（只读；不下载、不执行）
```

> `shensha.json` / `lineages.json` / `spec.json` 由脚本从 `dist-bundle` 上层目录自动解析，只读目录下同样成立。

## 只读目录须知

Skill 安装后位于**只读缓存目录**：

- **不要** `cd` 进技能目录写文件
- **不要**在里面 `npm install`
- `--output` **一律指向会话工作目录**

## 什么时候才需要装依赖

只有 bundle 缺失、或需要改源码重新编译时才需要。此时**必须把 `calculator/` 复制到可写工作目录再装**：

```bash
cp -r <skill-root>/calculator <工作目录>/calculator && cd <工作目录>/calculator
rm -f package-lock.json && npm install   # 锁文件源不可达时删除后再装
npm run bundle                            # 重建 dist-bundle
npm test                                  # 跑全部 fixtures
```

依赖问题**报错时再修**，不要装好就主动检查。

> `calculator/dist/` 是 `tsc` 的本地中间产物，自 v3.9.1 起不入库、不随包。
> 历史教训：它曾入库并停在旧版，导致走 `node dist/run-chart.js` 会**静默跑出旧逻辑且不报错**。

## 发版

改版本号一律走 `scripts/release.sh <x.y.z>`，它负责把 VERSION / package.json / 两个 README 徽章一次改齐，再按白名单打包并校验包内无垃圾件。**不要手改任何单个版本号字段**——GitHub 上曾出现「内容已到 3.4、VERSION 还写 2.7.0」正是手工漏传单文件造成的。
