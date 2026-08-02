#!/usr/bin/env bash
# release.sh — 版本单一事实源 + 打包白名单
# ---------------------------------------------------------------------------
# 用法:  ./scripts/release.sh 3.9.1  [--no-bundle]
#
# 存在的理由(三起真实事故的共同根因 = 发布靠手工挑文件):
#   ① GitHub 上 VERSION 停在 2.7.0 而内容已到 3.4  —— 网页上传时漏传 VERSION 单文件
#   ② v3.8 的 .skill 里混进 33 个陈旧 calculator/dist 文件 + _probe.txt
#   ③ GitHub 仓库里躺着 calculator/_sync_probe_bash.txt 探针垃圾
# 本脚本把「写版本号 → 按白名单打包 → 校验无垃圾件」固化,不再靠人记。
# ---------------------------------------------------------------------------
set -euo pipefail

VER="${1:-}"
if [[ ! "$VER" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
  echo "用法: $0 <x.y.z> [--no-bundle]" >&2; exit 1
fi
DO_BUNDLE=1
[[ "${2:-}" == "--no-bundle" ]] && DO_BUNDLE=0

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"
OUT="$ROOT/dist-release"
PKG="bazi-ziwei-decoder"

# ---------- 1. 写版本号(全部由 VERSION 派生,禁止别处手改) ----------
echo "$VER" > VERSION
# 只用 node 做文本替换(避免依赖 perl/sed 的平台差异;git bash 下同样成立)
node -e '
const fs=require("fs"), V=process.argv[1];
const j=JSON.parse(fs.readFileSync("calculator/package.json","utf-8"));
j.version=V; fs.writeFileSync("calculator/package.json", JSON.stringify(j,null,2)+"\n");
const sub=(p,re,to)=>{const s=fs.readFileSync(p,"utf-8");const n=s.replace(re,to);
  if(n===s && !s.includes(to)) console.error("⚠ 未命中版本号占位:"+p); fs.writeFileSync(p,n);};
sub("README.md",   /^> `v\d+\.\d+\.\d+`/m,            "> `v"+V+"`");            // 抬头徽章行
sub("README.en.md",/badge\/version-\d+\.\d+\.\d+-blue/g, "badge/version-"+V+"-blue"); // shields 徽章
' "$VER"
echo "✅ 版本号已同步 → VERSION / calculator/package.json / README.md / README.en.md = $VER"

# ---------- 2. 重建自足单文件(运行时唯一入口) ----------
if [[ $DO_BUNDLE -eq 1 ]]; then
  if [[ -d calculator/node_modules ]]; then
    if command -v npm >/dev/null 2>&1; then
      (cd calculator && npm run bundle >/dev/null) && echo "✅ dist-bundle 已重建(npm)"
    elif command -v node >/dev/null 2>&1; then
      # Codex/精简 Node 运行时可能只有 node.exe、没有 npm；已有 node_modules 时直接调用本地 esbuild。
      (cd calculator && node ./node_modules/esbuild/bin/esbuild \
        run-chart.ts dump-text.ts render.ts check-analysis.ts version-check.ts \
        --bundle --platform=node --format=cjs --target=node18 --outdir=dist-bundle >/dev/null) \
        && echo "✅ dist-bundle 已重建(local esbuild)"
    else
      echo "❌ calculator/node_modules 已存在，但找不到 npm 或 node，无法重建 bundle" >&2; exit 1
    fi
  else
    echo "⚠ 跳过 bundle(calculator/node_modules 不存在);如改过源码请先 npm install 再重跑" >&2
  fi
fi

# ---------- 3. 按白名单打包 ----------
rm -rf "$OUT/$PKG" && mkdir -p "$OUT/$PKG"
# 白名单:运行时真正需要的 + 必要文档。刻意不含:
#   calculator/dist(编译产物,与 dist-bundle 重复且极易陈旧) / node_modules / .git
#   docs/jietu.png(829KB 仅供 GitHub README 展示,装进技能目录没人看)
WHITELIST=(
  SKILL.md VERSION README.md README.en.md CHANGELOG.md TEST-GUIDE.md LICENSE NOTICE .gitignore
  references prompts templates examples scripts
  calculator/dist-bundle calculator/yiqi-core calculator/bazi-enrich calculator/fixtures
  calculator/run-chart.ts calculator/dump-text.ts calculator/render.ts
  calculator/shensha.ts calculator/check-analysis.ts calculator/version-check.ts
  calculator/schema-check.ts calculator/spec.json calculator/shensha.json calculator/tiaohou.json
  calculator/lineages.json calculator/package.json calculator/tsconfig.json
  docs/release-notes
)
for p in "${WHITELIST[@]}"; do
  [[ -e "$p" ]] || { echo "⚠ 白名单条目缺失,跳过: $p" >&2; continue; }
  mkdir -p "$OUT/$PKG/$(dirname "$p")"
  cp -r "$p" "$OUT/$PKG/$(dirname "$p")/"
done
# R 会在任意工作目录留下会话历史；它既不是运行时依赖，也不应因 references/ 递归复制进入发布包。
find "$OUT/$PKG" -name '.Rhistory' -delete

# ---------- 4. 校验:包内不得有垃圾件 ----------
# case.json 口径与 .gitignore 一致(S2/v3.11.0):classics/ 典籍命例白名单放行(test-shunni 锚点随包必需),
# 现实事件类 *.case.json 仍属违禁——两处口径若再改,必须同步改。
BAD=$(cd "$OUT/$PKG" && find . \
  \( -name '_probe*' -o -name '_sync_probe*' \
     -o \( -name '*.case.json' ! -path './calculator/fixtures/calibration/classics/*' \) \
     -o -name 'node_modules' -o -name '.DS_Store' -o -name '*.log' \
     -o -name '.Rhistory' \
     -o -path './calculator/dist/*' \) -print)
if [[ -n "$BAD" ]]; then
  echo "❌ 包内发现不该出现的文件:" >&2; echo "$BAD" >&2; exit 1
fi
[[ "$(cat "$OUT/$PKG/VERSION")" == "$VER" ]] || { echo "❌ 包内 VERSION 与目标不符" >&2; exit 1; }

# ---------- 5. 压包 ----------
SKILL="$OUT/$PKG-$VER.skill"
ZIP_TMP="$OUT/$PKG-$VER.zip"
rm -f "$SKILL" "$ZIP_TMP"
if command -v zip >/dev/null 2>&1; then
  (cd "$OUT" && zip -qr "$PKG-$VER.skill" "$PKG")
elif [[ -x /c/Windows/System32/tar.exe ]]; then
  # Git for Windows 通常不带 zip；系统 bsdtar 可按 .zip 扩展名生成标准正斜杠 ZIP。
  # 不使用 Compress-Archive：它会把 entry 名写成反斜杠，跨平台安装器兼容性较差。
  (cd "$OUT" && /c/Windows/System32/tar.exe -a -cf "$PKG-$VER.zip" "$PKG")
  mv "$ZIP_TMP" "$SKILL"
else
  echo "❌ 找不到 zip，也找不到 Windows bsdtar fallback" >&2; exit 1
fi
echo "✅ 出包: $SKILL  ($(du -h "$SKILL" | cut -f1), $(unzip -l "$SKILL" | tail -1 | awk '{print $2}') 个文件)"
echo
echo "下一步(凭证在你本机,脚本不代推):"
echo "  git add -A && git commit -m \"release: v$VER\" && git push origin main"
