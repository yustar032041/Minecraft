// These labels describe the same effect IDs applied by applyArmorSetBonuses.
const EFFECT_NAMES={speed:'移動速度上昇',night_vision:'暗視',fire_resistance:'火炎耐性',resistance:'耐性',haste:'採掘速度上昇',regeneration:'再生能力',slow_falling:'低速落下',jump_boost:'跳躍力上昇',water_breathing:'水中呼吸',health_boost:'体力増強',strength:'攻撃力上昇'};
export function armorEffectName(id){return EFFECT_NAMES[id]??id??'不明';}
// The generated index is the source of truth for item names and JSON recipes.
// Match the complete ID, never an ID prefix (gear_01 versus gear_010).
export function armorRecipe(index,id){
 const suffix=`（hakkai:${id}）`;
 return index.find(row=>typeof row?.[1]==='string'&&row[1].endsWith(suffix));
}
export function armorPieceLines(index,ids){
 const labels=['胴','頭','足','脚'];
 return ids.map((id,i)=>`${labels[i]}：${armorRecipe(index,id)?.[1]??`hakkai:${id}`}`).join('\n');
}
export function armorSeriesSummary(index,ids,effect,have,active){
 return `収集状況：${have}/4　｜　装備条件：${active?'満たしています':'満たしていません'}\n\n${armorPieceLines(index,ids)}\n\nセット効果：${armorEffectName(effect)} I\n頭・胴・足・脚をそれぞれ対応するスロットに装備すると発動。\n効果は約5秒ごとに更新され、外した後もしばらく残る場合があります。同じ系列でも段階が変わるとセット効果が変わります。Iは対応する鉄防具、II以降は前段階の同じ部位とその系列の結晶・欠片を使います。IIはダイヤモンド、IIIはネザライトインゴットも各1個必要です。金床の修理素材はIが鉄インゴット、IIがダイヤモンド、IIIがネザライトの欠片で、1個あたり最大耐久の約4分の1を修理する設定です。下から各部位の作業台レシピを確認できます。`;
}
export const ULTIMATE_ARMOR_IDS=['ult_chest','ult_helmet','ult_boots','ult_leggings'];
export function ultimateArmorSummary(index,active){
 return `装備状態：${active?'4部位装備中':'4部位そろっていません'}\n\n${armorPieceLines(index,ULTIMATE_ARMOR_IDS)}\n\n4部位着用中：耐性III・攻撃力上昇III・体力増強III、移動速度上昇II・再生能力II・採掘速度上昇II、火炎耐性・水中呼吸・暗視I。約5秒ごとに更新し、脱いだ後も短時間残ります。より強い効果は上書きしません。\n定義上の防御値：兜11・鎧20・脚8・靴8。耐久値：兜750・鎧3600・脚950・靴850。金床修理はネザライトの欠片1個あたり最大耐久の約4分の1を修理する設定。実際の軽減や耐久・修理の挙動は統合版で要検証。\nさらにプラスのスタミナ・マナ回復量が1.2倍、パリィ成功時に体力を2回復（最大体力まで）。水泳による消耗は減りません。通常ダッシュ自体はスタミナを消費しません。試作のため実機検証が必要です。元の装備のエンチャント等は製作時に引き継がれません。`;
}
