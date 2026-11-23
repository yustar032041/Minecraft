// 結晶鉱は未生成のシード地形にだけ埋める。数値は既存 ore_N / crystal_N ID。
export const realmOres = [
 [0, 3, 18],       // 草原: 風・土・港
 [10, 13, 16],     // 霧の森: 霧・森・夢
 [2, 12],          // 砂: 火・砂
 [1, 11, 19],      // 氷湖: 水・雪・湖
 [4],              // 雷
 [6, 17],          // 地下: 闇・音
 [5, 8, 15],       // 空: 光・星・空
 [7, 9, 14]        // 時: 時・虹・海
];

// 4×4ごとに最大1本の小鉱脈。hash は地形と同じシードを使う。
// 地表と島の底を残すので、鉱石に到達するには掘る必要がある。
export function oreColumn(realm, x, z, top, bottom, hash) {
 const ores = realmOres[realm];
 if (!ores || top - bottom < 4) return undefined;
 const gx = Math.floor(x / 4), gz = Math.floor(z / 4);
 if (hash(gx, gz, realm, 601) >= 0.34) return undefined;
 const ox = Math.min(3, Math.floor(hash(gx, gz, realm, 607) * 4));
 const oz = Math.min(3, Math.floor(hash(gx, gz, realm, 613) * 4));
 if (x - gx * 4 !== ox || z - gz * 4 !== oz) return undefined;
 const id = ores[Math.min(ores.length - 1, Math.floor(hash(gx, gz, realm, 617) * ores.length))];
 const depth = 3 + Math.min(5, Math.floor(hash(gx, gz, realm, 619) * 6));
 const upper = Math.max(bottom + 2, top - depth);
 return { id, lower: Math.max(bottom + 1, upper - 2), upper };
}
