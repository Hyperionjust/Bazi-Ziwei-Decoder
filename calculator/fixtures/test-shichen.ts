// test-shichen.ts — 时辰边界检测回归(P0-A)
// 用法: npx tsx test-shichen.ts (或 esbuild 打包后 node 直跑);全过 exit 0
import { detectShichenBoundary, BOUNDARY_THRESHOLD_MIN } from '../bazi-enrich/shichen-boundary';
import { resolveSolarClock } from '../yiqi-core/index';

let failed = 0;
function ok(cond: boolean, msg: string) { if (cond) console.log('✓', msg); else { console.log('✗', msg); failed++; } }

ok(BOUNDARY_THRESHOLD_MIN === 20, '阈值常量 = 20 分钟');

// ── 1) 交界前 5 分钟(12:55, 午→未交界 13:00) ─────────────────────────────
const r1 = detectShichenBoundary(12, 55);
ok(r1.boundary === true, '12:55 → boundary:true');
ok(r1.距交界分钟 === -5, `12:55 → Δ=-5(交界前) (得到 ${r1.距交界分钟})`);
ok(r1.当前时辰.startsWith('午时'), `12:55 当前=午时 (得到 ${r1.当前时辰})`);
ok(r1.候选时辰?.支 === '未', `12:55 候选=未时 (得到 ${r1.候选时辰?.支})`);
ok(!!r1.solar_note, '未传经度 → 附 solar_note(钟表时间口径)');
ok(r1.口径.includes('钟表时间'), '口径=钟表时间');

// ── 2) 交界后 15 分钟(13:15) ─────────────────────────────────────────────
const r2 = detectShichenBoundary(13, 15);
ok(r2.boundary === true, '13:15 → boundary:true');
ok(r2.距交界分钟 === 15, `13:15 → Δ=+15(交界后) (得到 ${r2.距交界分钟})`);
ok(r2.当前时辰.startsWith('未时'), `13:15 当前=未时 (得到 ${r2.当前时辰})`);
ok(r2.候选时辰?.支 === '午', `13:15 候选=午时 (得到 ${r2.候选时辰?.支})`);

// ── 3) 远离交界的对照例(12:00, 距两侧交界各 60 分钟) ─────────────────────
const r3 = detectShichenBoundary(12, 0);
ok(r3.boundary === false, '12:00 → boundary:false(对照例)');
ok(r3.候选时辰 === undefined, '12:00 → 无候选时辰');

// ── 4) 恰在交界(13:00, 归后一时辰) ───────────────────────────────────────
const r4 = detectShichenBoundary(13, 0);
ok(r4.boundary === true && r4.距交界分钟 === 0, '13:00 → Δ=0 boundary:true');
ok(r4.当前时辰.startsWith('未时') && r4.候选时辰?.支 === '午', '13:00 归未时,候选午时');

// ── 5) 23:00 交界(亥/晚子切换,候选说明须点明日柱同时改变) ─────────────────
const r5 = detectShichenBoundary(23, 10);
ok(r5.boundary === true && r5.距交界分钟 === 10, '23:10 → boundary:true Δ=+10');
ok(r5.当前时辰.startsWith('子时') && r5.候选时辰?.支 === '亥', `23:10 当前=晚子,候选=亥时 (得到 ${r5.候选时辰?.支})`);
ok((r5.候选时辰?.说明 || '').includes('日柱'), '23:10 候选说明点明日柱同时改变');
const r5b = detectShichenBoundary(22, 45);
ok(r5b.boundary === true && r5b.候选时辰?.支 === '子', `22:45 候选=子时(晚子) (得到 ${r5b.候选时辰?.支})`);
ok((r5b.候选时辰?.说明 || '').includes('日柱'), '22:45 候选说明点明日柱同时改变');

// ── 6) 子/丑交界跨日环形口径(00:50 距 01:00 交界 10 分钟;00:30 不临界) ────
const r6 = detectShichenBoundary(0, 50);
ok(r6.boundary === true && r6.候选时辰?.支 === '丑', `00:50 → 候选丑时 (得到 ${r6.候选时辰?.支})`);
const r6b = detectShichenBoundary(0, 30);
ok(r6b.boundary === false, '00:30 → 距最近交界 30 分钟,不临界');

// ── 7) 经度校正联动: 校正后时刻落入临界窗须检出,口径标真太阳时、无 solar_note ──
// 2000-06-14(六月中旬均时差≈0) 13:10 北京 lon=116.4 → 校正 ≈ -14min → ≈12:56 → 临界
const eff = resolveSolarClock({ year: 2000, month: 6, day: 14, hour: 13, minute: 10, gender: 'male', isLunar: false, timeZone: 8, longitude: 116.4 } as any);
const r7 = detectShichenBoundary(eff.hour, eff.minute, { corrected: true });
ok(r7.boundary === true, `lon=116.4 校正后 ${eff.hour}:${eff.minute} → boundary:true`);
ok(r7.口径.includes('真太阳时'), '校正后口径=真太阳时');
ok(r7.solar_note === undefined, '已校正 → 不附 solar_note');

if (failed === 0) { console.log('\n✅ 全部通过 (时辰边界)'); process.exit(0); }
else { console.log(`\n❌ ${failed} 项失败`); process.exit(1); }
