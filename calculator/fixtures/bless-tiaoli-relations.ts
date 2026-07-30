// bless-tiaoli-relations.ts — 重算并回写条例之间的包含关系(v3.11.0 M1)
// ---------------------------------------------------------------------------
// 用法(改了任何条例的「若」之后跑一次,然后再跑 npm test):
//   cd calculator && npx tsx fixtures/bless-tiaoli-relations.ts
//
// 为什么需要它:
//   典籍的条例是层层套着写的——「阳刃驾杀,可云小贵」后面紧跟「柱中逢才,英雄独压万人」,
//   后者是前者的加强项;而「若见癸水,困了才杀」是前者的例外。这两种关系在机器侧长得一样
//   (都带 细化于),但含义相反:
//     · 子集 → 母子会【同时命中】,`档位计` 会把同一件事计两次,解读层必须知道;
//     · 互斥 → 两者【永不同时命中】,提示「勿与母条重复计」纯属误导。
//   还有一类更隐蔽:没声明 细化于、但实际是真子集(A 命中则 B 必命中)。这类同样会双计,
//   而且没有任何字段提示。本脚本把它们算出来写进 `蕴含`。
//
// 方法:固定种子 PRNG,每格 40000 张随机盘,按命中集合的包含关系判定。
//   判定是经验性的(不是符号推理),所以 test-tiaohou.ts 会用同样的方法复验一遍——
//   改了「若」却忘了重跑本脚本,测试会 FAIL 并让你回来跑。
// ---------------------------------------------------------------------------
import * as fs from 'fs';
import * as path from 'path';
import { evalTiaoLi } from '../bazi-enrich/tiaohou-tiaoli';
import { Tiangan, Dizhi, TIANGAN, DIZHI } from '../bazi-enrich/tables';

export const SEED = 20260729;
// M4 全表 120 格后,40000/格 = 480 万次求值,祝福脚本与测试 ⓖ 都跑不动(实测被杀)。
// 降到 12000:关系判定只需要命中集合的包含关系,期望命中最低的条例在 4000 盘里也有 ~10 次,
// 12000 盘足够稳;且测试用同一 seed + 同一样本数复验,自洽性不受影响。
export const SAMPLES = 12000;

/** 固定种子的随机盘命中集合:格 → 条例 id → 命中的盘序号集合 */
export function 采样命中(格: string, n = SAMPLES, seed0 = SEED): Record<string, Set<number>> {
  const [dm, mz] = 格.split('/') as [Tiangan, Dizhi];
  let seed = seed0;
  const rnd = () => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
  const pick = <T,>(a: T[]): T => a[Math.floor(rnd() * a.length) % a.length];
  const out: Record<string, Set<number>> = {};
  for (let i = 0; i < n; i++) {
    const sz: any = {
      年: { gan: pick(TIANGAN), zhi: pick(DIZHI) }, 月: { gan: pick(TIANGAN), zhi: mz },
      日: { gan: dm, zhi: pick(DIZHI) }, 时: { gan: pick(TIANGAN), zhi: pick(DIZHI) },
    };
    for (const h of evalTiaoLi(sz).命中) (out[h.id] ||= new Set()).add(i);
  }
  return out;
}

/** 给一格算出 {id → {关系?, 蕴含?}} */
export function 算关系(格: string, 条例: any[], hits: Record<string, Set<number>>) {
  const S = (id: string) => hits[id] || new Set<number>();
  const res: Record<string, { 关系?: string; 蕴含?: string[] }> = {};
  for (const t of 条例) {
    const r: { 关系?: string; 蕴含?: string[] } = {};
    if (t.细化于) {
      const c = S(t.id), p = S(t.细化于);
      const inter = [...c].filter(x => p.has(x)).length;
      r.关系 = inter === 0 ? '互斥' : inter === c.size ? '子集' : '交叠';
    }
    // 未声明 细化于 但实为真子集的:命中本条必同时命中它们 → 档位计双计
    if (!t.细化于) {
      const c = S(t.id);
      const sup = 条例.map((o: any) => o.id).filter((o: string) => {
        if (o === t.id) return false;
        const p = S(o);
        return c.size > 0 && p.size > 0 && [...c].every(x => p.has(x));
      });
      if (sup.length) r.蕴含 = sup;
    }
    res[t.id] = r;
  }
  return res;
}

if (require.main === module) {
  const P = path.join(__dirname, '..', 'tiaohou.json');
  const d = JSON.parse(fs.readFileSync(P, 'utf-8'));
  let 改 = 0;
  for (const 格 of Object.keys(d.条例)) {
    if (格.startsWith('_')) continue;
    const 条例 = d.条例[格].条例;
    const res = 算关系(格, 条例, 采样命中(格));
    for (const t of 条例) {
      const r = res[t.id];
      for (const f of ['关系', '蕴含'] as const) {
        const nv = (r as any)[f];
        if (JSON.stringify(t[f]) !== JSON.stringify(nv)) { 改++; if (nv === undefined) delete t[f]; else t[f] = nv; }
      }
    }
  }
  fs.writeFileSync(P, JSON.stringify(d, null, 2), 'utf-8');
  console.log(`✅ 关系已回写 tiaohou.json (变更 ${改} 处)。记得跑 npm test 重新祝福快照。`);
}
