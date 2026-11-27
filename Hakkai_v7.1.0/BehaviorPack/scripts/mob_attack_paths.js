// Explicit per-creature trajectory design. These choices affect the route,
// not damage, cooldown, target authorization or the number of hits.
// Curves start at the source and end at the captured aim; no homing occurs.
const GROUPS=Object.freeze({
 straight:['wild_0_2','foe_0_1','foe_4_1','foe_4_4','foe_4_6','foe_4_11','foe_7_0'],
 leftArc:['wild_6_2','foe_1_0','foe_2_4','foe_3_4','foe_5_4','foe_6_4','foe_6_9'],
 rightArc:['wild_3_2','foe_0_4','foe_1_4','foe_2_6','foe_3_6','foe_5_6','foe_7_4'],
 leftWave:['wild_5_2','foe_0_6','foe_1_6','foe_1_11','foe_3_8','foe_5_9','foe_6_6'],
 rightWave:['foe_0_8','foe_1_10','foe_2_9','foe_3_11','foe_5_8','foe_7_6','foe_7_10'],
 loft:['foe_0_5','foe_1_1','foe_1_5','foe_2_5','foe_5_1','foe_5_5','foe_6_5','foe_7_5'],
 loftLeft:['foe_0_9','foe_3_0','foe_3_5','foe_4_5','foe_6_0','foe_6_11','foe_5_11'],
 loftRight:['foe_1_9','foe_3_1','foe_4_9','foe_6_1','foe_4_7','foe_7_9'],
 clockLeft:['wild_7_2','foe_0_7','foe_1_7','foe_2_7','foe_3_7','foe_5_7'],
 clockRight:['foe_7_1','foe_6_7','foe_7_7']
});
const entries=Object.entries(GROUPS).flatMap(([path,ids])=>ids.map(id=>[id,path]));
if(new Set(entries.map(([id])=>id)).size!==entries.length)throw Error('duplicate creature trajectory');
export const CREATURE_PATHS=Object.freeze(Object.fromEntries(entries));
export const TRAVELER_PATHS=Object.freeze(['leftWave','rightArc','straight','loft','leftArc','rightWave','loftLeft','clockRight']);
export const PATH_LABELS=Object.freeze({straight:'直進',leftArc:'左弧',rightArc:'右弧',leftWave:'左から蛇行',rightWave:'右から蛇行',loft:'山なり',loftLeft:'左へ山なり',loftRight:'右へ山なり',clockLeft:'左へ刻む',clockRight:'右へ刻む'});
export function attackPath(profile){
 if(profile?.talent==='traveler')return TRAVELER_PATHS[profile.realm];
 return CREATURE_PATHS[profile?.id];
}
// Offset at a normalized progress. Zero at both endpoints keeps a stationary
// target interceptable while making the entire damaging path visible.
export function attackPathOffset(path,u,length){
 const p=Math.max(0,Math.min(1,u)),a=Math.min(.7,length*.18),bow=Math.sin(Math.PI*p),wave=Math.sin(2*Math.PI*p);
 switch(path){
  case 'straight':return {side:0,up:0};
  case 'leftArc':return {side:-a*bow,up:0};
  case 'rightArc':return {side:a*bow,up:0};
  case 'leftWave':return {side:-a*wave,up:0};
  case 'rightWave':return {side:a*wave,up:0};
  case 'loft':return {side:0,up:a*bow};
  case 'loftLeft':return {side:-a*bow,up:a*bow};
  case 'loftRight':return {side:a*bow,up:a*bow};
  case 'clockLeft':return {side:-a*wave,up:a*.55*bow};
  case 'clockRight':return {side:a*wave,up:a*.55*bow};
  default:return undefined;
 }
}
