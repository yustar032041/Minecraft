// Crafted from renewable guardian and final-boss rewards. Sword skills use the
// existing weapon targeting, cooldown, mana and player protection rules.
import {combatEffectAllowed} from './combat_resonance.js';
const names=['風裂の剣','霧縫いの剣','砂葬の剣','氷鏡の剣','雷迅の剣','深影の剣','雲翼の剣','時環の剣'];
const skills=['風裂・疾風','霧縫い・幻惑','砂葬・重圧','氷鏡・凍縛','雷迅・閃撃','深影・衰弱','雲翼・浮遊','時環・遅刻'];
const attrs=[0,10,12,11,4,6,15,7];
const playerEffects=['speed','invisibility','resistance','absorption','strength','night_vision','slow_falling','haste'];
const targetEffects=[undefined,'weakness','weakness','slowness',undefined,'weakness',undefined,'slowness'];
const particles=['shot_wind','shot_spore','shot_sand','shot_frost','shot_spark','shot_shadow','shot_wind','shot_time'];
export const WARDEN_BLADES=Object.freeze(names.map((label,i)=>Object.freeze({id:`warden_blade_${i}`,number:String(144+i),label,stars:'§6★★★★★',kind:'剣',a:attrs[i],modifier:attrs[i],damage:27,defense:0,power:38,cost:16,seconds:12,rank:3,skill:skills[i],visualId:'gear_144',wardenBlade:i})));
export function wardenBladeOnCast(p,g){
 const i=g?.wardenBlade;if(!Number.isInteger(i)||i<0||i>7)return;
 try{p.addEffect(playerEffects[i],100,{amplifier:0,showParticles:false});}catch{}
 try{const v=p.getViewDirection(),l=p.location;p.dimension.spawnParticle(`hakkai:${particles[i]}`,{x:l.x+v.x*1.2,y:l.y+1,z:l.z+v.z*1.2});}catch{}
}
export function wardenBladeOnHit(p,target,g,landed){
 const i=g?.wardenBlade;
 if(!landed||!Number.isInteger(i)||i<0||i>7||!targetEffects[i]||!combatEffectAllowed(p,target))return;
 // Avoid locking major bosses down with the extra blade-specific status.
 if(/^(?:hakkai:(?:time_warden|eclipse_colossus|fushi_chief|(?:king_)?guardian_[0-7])|minecraft:(?:wither|ender_dragon|warden))$/.test(target.typeId??''))return;
 try{target.addEffect(targetEffects[i],50,{amplifier:0,showParticles:false});}catch{}
}
