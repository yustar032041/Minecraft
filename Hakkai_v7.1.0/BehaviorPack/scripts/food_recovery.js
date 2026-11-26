import {GameMode} from '@minecraft/server';

// Additional 8界風記 resource recovery. Nutrition, consumption and hunger
// restrictions are handled by the native food component, not this table.
// Values are deliberately identical to the former on-use implementation.
const RECOVERY={
 trail_ration:[35,0,'旅人の携帯食'],camp_stew:[50,10,'野営の具だくさんスープ'],
 dried_meat:[18,0,'乾燥肉'],preserved_ration:[35,5,'保存食セット'],
 spring_garden_soup:[25,8,'春庭の山菜スープ'],summer_corn_stew:[30,5,'夏陽のコーンシチュー'],
 autumn_squash_potage:[28,8,'紅葉カボチャのポタージュ'],frost_blossom_tea:[22,15,'氷花のあたたかい煮込み'],
 sunflower_trail_bowl:[32,5,'風向きヒマワリの旅人椀'],spring_water_flask:[10,4,'湧水の小瓶'],
 camp_herbal_tea:[14,8,'野営の薬草茶'],gathered_herb_bundle:[8,4,'野草の採集束'],
 roasted_root_plate:[24,3,'根菜の焚き火焼き'],forest_trail_meal:[30,12,'森歩きの滋養食'],
 camp_mushroom_wrap:[26,6,'野営のきのこ包み'],forager_nut_mix:[20,10,'採集者の木の実袋'],
 dried_sweet_berries:[12,0,'乾燥ベリー'],smoked_fish_strip:[16,2,'燻製魚の切り身'],
 expedition_bento:[38,8,'遠征用の幕の内弁当'],camp_supply_pack:[44,14,'野営の補給袋']
};
export function isRecoveryFood(id){
 return typeof id==='string'&&id.startsWith('hakkai:')&&Object.hasOwn(RECOVERY,id.slice(7));
}
// Called only from the native item custom component's onConsume event. Do not
// depend on the current selected stack: the last item may already be gone.
// Never manually debit or alter hunger. Duplicate engine events, crashes and
// item-consumption ordering still require actual Bedrock verification.
export function applyFoodRecovery(event,{state,notice,max}){
 try{
  const p=event?.source,id=event?.itemStack?.typeId;
  if(!isRecoveryFood(id)||!p?.isValid||p.typeId!=='minecraft:player'||p.getGameMode()===GameMode.Spectator||!Number.isFinite(max)||max<=0)return false;
  const [stamina,mana,label]=RECOVERY[id.slice(7)],s=state(p);
  if(!s||!Number.isFinite(s.s)||!Number.isFinite(s.m))return false;
  s.s=Math.max(0,Math.min(max,s.s+stamina));s.m=Math.max(0,Math.min(max,s.m+mana));
  try{notice(p,`§a${label}でスタミナ${mana?'と魔力':''}が回復した`);}catch{}
  return true;
 }catch{return false;}
}
