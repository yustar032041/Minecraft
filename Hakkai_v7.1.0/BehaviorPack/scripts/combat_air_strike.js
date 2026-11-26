import {GameMode} from '@minecraft/server';
import {isCombatTarget,applyCombatHit} from './combat_resonance.js';
import {isTraceWeapon} from './combat_weapon_trace.js';
const WEAPONS=new Set(['剣','斧','槍']),RADIUS=2.5,AIR_COST=9;
// The aerial technique costs 9; native melee hits no longer charge stamina.
export function setupAirStrike({notice,visibleFrom}){
 const entries=new Map();
 function entry(p){let e=entries.get(p.id);if(!e){e={dim:p.dimension.id,spent:!p.isOnGround};entries.set(p.id,e);}return e;}
 function tick(p,t){
  const e=entry(p);if(e.dim!==p.dimension.id){entries.delete(p.id);return;}
  if(p.isOnGround)e.spent=false;
 }
 // New all-weapon aerial attack replaces the corresponding trace, rather
 // than applying additional damage to the native target. This is an ordinary
 // swing; its aerial technique costs 9 stamina.
 function beginSwing(p,s,g){
  try{
   if(!p?.isValid||p.typeId!=='minecraft:player'||![GameMode.Survival,GameMode.Creative].includes(p.getGameMode())||p.isOnGround||p.isSneaking||p.isSwimming||p.isFlying||p.isGliding||p.getComponent('minecraft:riding')||s.busy||s.menu||!isTraceWeapon(g))return false;
   const e=entry(p);if(e.spent||e.dim!==p.dimension.id||p.getVelocity().y>=-.08)return false;
   if(p.getGameMode()!==GameMode.Creative&&s.s<AIR_COST)return false;
   if(p.getGameMode()!==GameMode.Creative)s.s-=AIR_COST;e.spent=true;
   try{p.playAnimation('animation.hakkai.air_strike',{blendOutTime:.1,stopExpression:'query.any_animation_finished'});}catch{}
   try{notice(p,'§b空中攻撃！',35);}catch{}return true;
  }catch{return false;}
 }
 function onHurt(p,target,s,g,damage,t){
  try{
   if(!p?.isValid||p.typeId!=='minecraft:player'||![GameMode.Survival,GameMode.Creative].includes(p.getGameMode())||p.isOnGround||p.isSneaking||p.isSwimming||p.isFlying||p.isGliding||p.getComponent('minecraft:riding')||s.busy||s.menu||!g||!WEAPONS.has(g.kind)||!(damage>0)||!target?.isValid||!isCombatTarget(target,p)||p.dimension.id!==target.dimension.id)return false;
   const e=entry(p);if(e.spent||e.dim!==p.dimension.id||p.getVelocity().y>=-.08)return false;
   if(p.getGameMode()!==GameMode.Creative&&s.s<AIR_COST)return false;
   const a=p.location,b=target.location;if(Math.hypot(a.x-b.x,a.y-b.y,a.z-b.z)>5)return false;
   const opts={location:b,maxDistance:RADIUS,closest:8,excludeTypes:['minecraft:player']};
   const all=p.dimension.getEntities({...opts,families:['monster']});
   all.push(...p.dimension.getEntities({...opts,type:'hakkai:time_warden'}));
   try{all.push(...p.dimension.getPlayers({location:b,maxDistance:RADIUS,closest:8}));}catch{}
   const extra=new Map();
   for(const other of all){
    if(!other?.isValid||other.id===target.id||other.id===p.id||other.dimension.id!==p.dimension.id||!isCombatTarget(other,p))continue;
    const l=other.location;if(Math.hypot(l.x-b.x,l.y-b.y,l.z-b.z)>RADIUS)continue;
    try{if(!visibleFrom(p,other.getHeadLocation()))continue;}catch{continue;}
    extra.set(other.id,other);
   }
   const splash=[...extra.values()].sort((x,y)=>Math.hypot(x.location.x-b.x,x.location.y-b.y,x.location.z-b.z)-Math.hypot(y.location.x-b.x,y.location.y-b.y,y.location.z-b.z)).slice(0,3);
   // Commit before damage events; our extra damage is magic and never recurses.
   if(p.getGameMode()!==GameMode.Creative)s.s-=AIR_COST;e.spent=true;
   for(const other of [target,...splash])applyCombatHit(p,other,4,g.a,g.modifier,.8);
   for(let i=0;i<12;i++){const angle=i*Math.PI/6;try{p.dimension.spawnParticle('hakkai:wind_burst',{x:b.x+Math.cos(angle)*1.5,y:b.y+.2,z:b.z+Math.sin(angle)*1.5});}catch{}}
   try{p.playAnimation('animation.hakkai.air_strike',{blendOutTime:.1,stopExpression:'query.any_animation_finished'});}catch{}
   try{p.playSound('random.orb',{volume:.3,pitch:.8});}catch{}
   try{notice(p,'§b空中衝撃！',35);}catch{}return true;
  }catch{return false;}
 }
 function clear(id){entries.delete(id);}
 return {tick,beginSwing,onHurt,clear};
}
