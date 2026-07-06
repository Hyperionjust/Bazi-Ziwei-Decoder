"use strict";
// 八字增强分析主入口 — 给定四柱, 输出格局/旺衰/刑冲合害/调候/自坐 等所有 Yiqi 未算的字段
Object.defineProperty(exports, "__esModule", { value: true });
exports.enrichBazi = enrichBazi;
const tables_1 = require("./tables");
const zhi_relations_1 = require("./zhi-relations");
const gan_relations_1 = require("./gan-relations");
const wu_xing_1 = require("./wu-xing");
const wang_shuai_1 = require("./wang-shuai");
const ge_ju_1 = require("./ge-ju");
const tiao_hou_1 = require("./tiao-hou");
const yongshen_1 = require("./yongshen");
function enrichBazi(siZhu) {
    const dm = siZhu.日.gan;
    const monthZhi = siZhu.月.zhi;
    // 自坐 — 每柱干在自身支的长生位
    const ziZuo = {};
    for (const p of ['年', '月', '日', '时']) {
        ziZuo[p] = (0, tables_1.getChangSheng)(siZhu[p].gan, siZhu[p].zhi);
    }
    const geJu = (0, ge_ju_1.judgeGeJu)(siZhu);
    const wangShuai = (0, wang_shuai_1.judgeWangShuai)(siZhu);
    const tiaoHou = (0, tiao_hou_1.getTiaoHou)(dm, monthZhi);
    const wxCount = (0, wu_xing_1.countWuXing)(siZhu, dm);
    const wxForYs = wxCount.withCangGan || wxCount.surface || wxCount;
    return {
        自坐: ziZuo,
        五行旺相: (0, wu_xing_1.wuXingMonthStatus)(monthZhi),
        五行统计: wxCount,
        调候用神: tiaoHou,
        格局: geJu,
        旺衰: wangShuai,
        用神建议: (0, yongshen_1.adviseYongShen)(dm, wangShuai, tiaoHou, geJu, wxForYs),
        天干关系: (0, gan_relations_1.detectGanRelations)({
            年: siZhu.年.gan, 月: siZhu.月.gan, 日: siZhu.日.gan, 时: siZhu.时.gan
        }),
        地支关系: (0, zhi_relations_1.detectZhiRelations)({
            年: siZhu.年.zhi, 月: siZhu.月.zhi, 日: siZhu.日.zhi, 时: siZhu.时.zhi
        }),
        整柱: (0, gan_relations_1.judgePillars)(siZhu)
    };
}
