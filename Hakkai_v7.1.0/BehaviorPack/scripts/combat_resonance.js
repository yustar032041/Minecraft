import {playWeaponMotion} from './combat_weapon_motion.js';
import {weaponDirection} from './combat_weapon_style.js';
import { EntityDamageCause, GameMode } from '@minecraft/server';
import { friendlyFireEnabled,isPlayerOpponent } from './friendly_fire.js';
// An original Hakkai combat prototype: confirmed melee hits gather wind marks;
// the player's next successful weapon skill may spend a full mark. No target
// selection, damage, timers or visual assets from the reference addon are used.
const MAX=3, GAP=80, READY_GAP=120, MIN_INTERVAL=8;
const WEAPONS=new Set(['剣','斧','槍']);
export function isCombatTarget(entity,attacker){
 if(!entity)return false;
 if(entity.typeId==='minecraft:player')return isPlayerOpponent(attacker,entity);
 if(entity.typeId==='hakkai:time_warden'||entity.typeId==='hakkai:fushi_chief'||/^hakkai:ender_[0-7]$/.test(entity.typeId??''))return true;
 try{return !!entity.getComponent('minecraft:type_family')?.hasTypeFamily('monster');}catch{return false;}
}
export function setupCombatResonance({system,notice,attackMotionHandled=()=>false}){
 const entries=new Map();
 const identity=(p,g)=>`${p.dimension.id}|${p.selectedSlotIndex}|${g.id}`;
 function current(p,g,t){
  const e=entries.get(p.id);
  if(!g||!WEAPONS.has(g.kind)||!e||e.identity!==identity(p,g)||t>e.expires){entries.delete(p.id);return undefined;}
  return e;
 }
 function onHurt(p,target,g,damage){
  if(!p?.isValid||p.getGameMode()===GameMode.Spectator||!target?.isValid||!g||!WEAPONS.has(g.kind)||p.isSneaking||!(damage>0)||!isCombatTarget(target,p)||p.dimension.id!==target.dimension.id)return 0;
  const t=system.currentTick,old=current(p,g,t);
  if(old&&t-old.last<MIN_INTERVAL)return old.count;
  const count=Math.min(MAX,(old?.count??0)+1);
  entries.set(p.id,{identity:identity(p,g),count,last:t,expires:t+(count===MAX?READY_GAP:GAP)});
  // Telegraphs are cosmetic only: all existing weapon damage remains native.
  trace(p,target,count,g);
  if(count===MAX&&old?.count!==MAX)notice(p,'§b風紋が満ちた！ 武器スキルを使うと威力上昇',45);
  return count;
 }
 function trace(p,target,count,g){
  const a=p.location,b=target.location,dx=b.x-a.x,dz=b.z-a.z,len=Math.hypot(dx,dz)||1,fx=dx/len,fz=dz/len;
  // A tilted sequence of short wind strokes, changing direction with each hit.
  const sign=count%2?1:-1,n=8+count*3;
  for(let i=0;i<n;i++){
   const u=i/(n-1),side=(u-.5)*2.0,curve=Math.sin(u*Math.PI)*.36;
   const at={x:a.x+fx*(1+curve)-fz*side,y:a.y+.55+(sign>0?u:1-u)*1.3,z:a.z+fz*(1+curve)+fx*side};
   try{p.dimension.spawnParticle('hakkai:wind_trace',at);}catch{}
  }
  // Swing-start already plays the selected individual motion when supported.
  // Keep this fallback only for API versions that lack that event.
  try{if(!attackMotionHandled())playWeaponMotion(p,g,'attack',count-1,weaponDirection(p));}catch{}
  try{p.playSound('random.orb',{volume:.22,pitch:1+count*.12});}catch{}
 }
 function consume(p,g){
  const e=current(p,g,system.currentTick);if(!e||e.count!==MAX)return false;
  entries.delete(p.id);return true;
 }
 // Two confirmed weak strikes can be spent on the charged finisher. Three
 // marks remain reserved for the existing full resonance / wind ray.
 function consumeCombo(p,g){
  const e=current(p,g,system.currentTick);if(!e||e.count!==2)return false;
  entries.delete(p.id);return true;
 }
 function level(p,g,t=system.currentTick){return current(p,g,t)?.count??0;}
 function clear(id){entries.delete(id);}
 return {onHurt,consume,consumeCombo,level,clear};
}

// Keep neutral creatures out of ambient area attacks. The trial warden is
// deliberately targetable even though it does not belong to 'monster'.
export function combatEnemies(p,r,cap=6,{players=true}={}){
 const opts={location:p.location,maxDistance:r,closest:cap+3,excludeTypes:['minecraft:player']};
 const all=p.dimension.getEntities({...opts,families:['monster']});
 try{all.push(...p.dimension.getEntities({...opts,type:'hakkai:time_warden'}));}catch{}
 const unique=new Map();
 for(const e of all)if(e.isValid&&e.typeId!=='minecraft:player')unique.set(e.id,e);
 if(players&&friendlyFireEnabled())try{for(const e of p.dimension.getPlayers({location:p.location,maxDistance:r,closest:cap+3}))if(isPlayerOpponent(p,e))unique.set(e.id,e);}catch{}
 return [...unique.values()].sort((a,b)=>{
  const d=x=>Math.hypot(x.location.x-p.location.x,x.location.y-p.location.y,x.location.z-p.location.z);
  return d(a)-d(b);
 }).slice(0,cap);
}

// Recheck after synchronous damage callbacks: a target may become invalid or
// player protection may be enabled while the attack is being processed.
export function combatEffectAllowed(p,e){
 try{return !!e?.isValid&&!!p?.dimension?.id&&e.dimension?.id===p.dimension.id&&(e.typeId!=='minecraft:player'||isPlayerOpponent(p,e));}catch{return false;}
}
// Only a damage accepted by the engine can produce hit-dependent effects.
// Optional effects are independent: failure of one never cancels the hit or
// the others. Damage callbacks can move or invalidate a target synchronously.
export function applyCombatHit(p,e,str,a,mod,push){
 try{
  if(!e?.isValid||e.typeId==='minecraft:player'&&!isPlayerOpponent(p,e))return false;
  let vector;
  try{const dx=e.location.x-p.location.x,dz=e.location.z-p.location.z,d=Math.hypot(dx,dz)||1;vector={x:push*dx/d,z:push*dz/d};}catch{}
  const anchored=e.typeId==='hakkai:time_warden'||e.typeId==='hakkai:eclipse_colossus'||e.typeId==='hakkai:fushi_chief'||/^hakkai:guardian_[0-7]$/.test(e.typeId??'');
  if(!e.applyDamage(str,{cause:EntityDamageCause.magic,damagingEntity:p}))return false;
  try{
   if(!combatEffectAllowed(p,e))return true;
   try{if(a===2||mod===2)e.setOnFire(3,true);}catch{}
   try{if([7,10,11,16].includes(a)||[7,10,11,16].includes(mod))e.addEffect('slowness',65,{amplifier:a===7?3:1,showParticles:false});}catch{}
   if(!anchored&&vector)try{e.applyKnockback(vector,.15);}catch{}
  }catch{}
  return true;
 }catch{return false;}
}
