import {GameMode} from '@minecraft/server';
import {combatEnemies,applyCombatHit} from './combat_resonance.js';
const COOLDOWN=600,DURATION=20;
const excluded=new Set(['void','selfDestruct','override']);
export function setupCombatUltimate({system,notice,visibleFrom}){
 const entries=new Map();
 function active(p,t){const e=entries.get(p?.id);return !!(e&&p?.isValid&&p.getGameMode()===GameMode.Survival&&p.dimension.id===e.dim&&t<e.until);}
 function blocks(p,source,t){return active(p,t)&&typeof source?.cause==='string'&&!excluded.has(source.cause);}
 function cast(p,s){
  try{
   if(!p?.isValid||p.typeId!=='minecraft:player'||p.getGameMode()!==GameMode.Survival||s.busy||s.menu)return false;
   const t=system.currentTick,e=entries.get(p.id);
   if(e&&t<e.ready){notice(p,'§e必殺技はまだ再使用できません');return false;}
   if(!(s.s>0&&s.s<=20&&s.m>=0&&s.m<=20)){notice(p,'§eスタミナと魔力が両方20以下の時に使えます');return false;}
   const targets=combatEnemies(p,8,8).filter(x=>{try{return visibleFrom(p,x.getHeadLocation());}catch{return false;}}).slice(0,6);
   if(!targets.length){notice(p,'§e見通せる敵が近くにいません');return false;}
   s.s=0;entries.set(p.id,{dim:p.dimension.id,until:t+DURATION,ready:t+COOLDOWN});
   for(const target of targets){
    applyCombatHit(p,target,20,2,-1,1.2);
    if(!/^(?:hakkai:(?:time_warden|eclipse_colossus|fushi_chief|guardian_[0-7])|minecraft:(?:wither|ender_dragon|warden))$/.test(target.typeId??''))try{target.addEffect('slowness',40,{amplifier:1,showParticles:false});}catch{}
    try{p.dimension.spawnParticle('hakkai:wind_burst',{...target.location,y:target.location.y+1});}catch{}
   }
   for(let i=0;i<16;i++)try{const a=i*Math.PI/8;p.dimension.spawnParticle('hakkai:wind_burst',{x:p.location.x+Math.cos(a)*2,y:p.location.y+.7,z:p.location.z+Math.sin(a)*2});}catch{}
   try{p.playAnimation('animation.hakkai.magic_cast',{blendOutTime:.1,stopExpression:'query.any_animation_finished'});}catch{}
   try{p.playSound('random.levelup',{volume:.8,pitch:1.5});}catch{}
   try{notice(p,'§6必殺・あきらめない！',50);}catch{}
   return true;
  }catch{return false;}
 }
 function status(p,t){return active(p,t)?'§6必殺・攻撃回避中':'';}
 function invalidate(id){const e=entries.get(id);if(e)e.until=0;}
 function clear(id){entries.delete(id);}
 return {cast,active,blocks,status,invalidate,clear};
}
