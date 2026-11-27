import {EntityDamageCause,GameMode} from '@minecraft/server';
import {isCombatTarget} from './combat_resonance.js';
import {weaponDirection} from './combat_weapon_style.js';
import {planRollSegment} from './combat_roll.js';
import {authoredMove} from './combat_weapon_movesets.js';
import {actionEnchantmentBonus} from './combat_action_enchantments.js';

// Experimental replacement combat for five add-on melee classes.
// No animation is assumed to have rendered merely because playAnimation returned.
const PROFILE=Object.freeze({
 '剣':{windup:4,recovery:11,range:3.8,cone:.50,damage:12},
 '斧':{windup:6,recovery:15,range:3.5,cone:.25,damage:16},
 '槍':{windup:5,recovery:13,range:5.2,cone:.80,damage:13},
 'ハンマー':{windup:7,recovery:17,range:3.8,cone:.35,damage:18},
 '扇':{windup:4,recovery:12,range:4.7,cone:.25,damage:10}
});
export const isActionWeapon=g=>!!g&&Object.hasOwn(PROFILE,g.kind)&&typeof g.id==='string';
const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y,a.z-b.z);
export function setupActionCombat({system,gear,selected,state,enabled,visibleFrom,onHit=()=>{},hasCounter=()=>false,consumeCounter=()=>false,notice=()=>{},report=()=>{}}){
 const actions=new Map(),airborne=new Map();
 // Start conservatively if first seen in midair; landing re-arms one strike.
 function tick(p){try{if(p?.isValid&&p.isOnGround)airborne.set(p.id,false);else if(p?.id&&!airborne.has(p.id))airborne.set(p.id,true);}catch{}}
 function eligible(p){
  try{const health=p?.getComponent('minecraft:health');return !!p?.isValid&&(!health||health.currentValue>0)&&p.typeId==='minecraft:player'&&p.getGameMode()===GameMode.Survival&&enabled(p)===true;}catch{return false;}
 }
 // Before-event callback is read-only. Cancel native damage only for living
 // hostile targets with an opted-in player and supported weapon. If the event
 // cannot be registered, the caller never enables this prototype.
 function cancelNative(event){
  try{
   const p=event.damageSource?.damagingEntity,target=event.hurtEntity;
   if(event.damageSource?.cause!==EntityDamageCause.entityAttack||!eligible(p)||!target?.isValid||target.dimension?.id!==p.dimension.id||!isCombatTarget(target,p))return false;
   if(!isActionWeapon(gear.get(selected(p)?.typeId)))return false;
   event.cancel=true;return true;
  }catch{return false;}
 }
 function clearLine(p,target){
  try{
   const a=p.getHeadLocation(),b=target.getHeadLocation(),dx=b.x-a.x,dy=b.y-a.y,dz=b.z-a.z,n=Math.hypot(dx,dy,dz),d=p.dimension;
   if(!Number.isFinite(n)||n<.01||!visibleFrom(p,b))return false;
   const dir={x:dx/n,y:dy/n,z:dz/n};
   for(let i=0;i<=Math.ceil(n);i++){const k=Math.min(i,n);if(!d.isChunkLoaded({x:a.x+dir.x*k,y:a.y+dir.y*k,z:a.z+dir.z*k}))return false;}
   return !d.getEntitiesFromRay(a,dir,{maxDistance:n,ignoreBlockCollision:false}).some(h=>h.entity?.isValid&&h.entity.id!==p.id&&h.entity.id!==target.id&&!isCombatTarget(h.entity,p)&&(!Number.isFinite(h.distance)||h.distance<0||h.distance<=n+1e-6));
  }catch{return false;}
 }
 function swing(event){
  try{
   const p=event.player,item=event.heldItemStack,g=gear.get(item?.typeId),t=system.currentTick;
   if(event.swingSource!=='Attack'||!eligible(p)||!isActionWeapon(g)||selected(p)?.typeId!==item.typeId)return false;
   const s=state(p),old=actions.get(p.id),identity=`${p.dimension.id}|${p.selectedSlotIndex}|${item.typeId}`;
   if(s.busy||s.menu||p.isSwimming||p.isGliding||p.isFlying||p.getComponent('minecraft:riding'))return false;
   if(old&&t<old.ready){
    // Repeated attack input during recovery breaks the combo. Ignore a
    // near-simultaneous duplicate event to tolerate event delivery order.
    if(t>old.started+1)old.mashed=true;
    return false;
   }
   let aerial=false;
   try{aerial=!p.isOnGround&&!p.isSneaking&&airborne.get(p.id)===false&&p.getVelocity().y<-.08&&Number.isFinite(s.s)&&s.s>=9;}catch{}
   const stage=aerial?1:old?.identity===identity&&!old.mashed&&old.stage<3&&t>=old.ready&&t<=old.ready+10?old.stage+1:1;
   const profile=PROFILE[g.kind],move=aerial?{name:'空中衝撃',shape:'spin',reach:3.5,windup:4,recovery:15,power:2}:authoredMove(g,stage),windup=move?.windup??profile.windup;
   const recovery=Math.max(move?.recovery??(profile.recovery+(stage===3?5:0)),windup+Math.max(...(move?.pulses??[0]))+1),cost=aerial?9:[0,6,8,12][stage];
   if(!Number.isFinite(s.s)||s.s<cost)return false;
   const view=p.getViewDirection(),n=Math.hypot(view.x,view.z);
   if(!Number.isFinite(n)||n<.01)return false;
   const facing={x:view.x/n,z:view.z/n},direction=weaponDirection(p),dim=p.dimension.id,slot=p.selectedSlotIndex,origin={...p.location};
   const action={identity,stage,started:t,ready:t+recovery,direction,mashed:aerial};
   actions.set(p.id,action);s.s-=cost;if(aerial)airborne.set(p.id,true);
   // Directional attacks attempt a short physical step, with a small hop on
   // forward input. Require a checked, supported run-up; collision is still
   // resolved by Bedrock physics, not guaranteed against every edge/impulse.
   if(direction!=='neutral'&&p.isOnGround){
    const step=direction==='forward'?facing:direction==='back'?{x:-facing.x,z:-facing.z}:direction==='left'?{x:facing.z,z:-facing.x}:{x:-facing.z,z:facing.x};
    try{const speed=move?.move??.36,hop=move?.hop??.20;const path=planRollSegment(p.dimension,origin,step,1.8,true);if(path&&path.travel>=1.79)p.applyImpulse({x:step.x*speed,y:direction==='forward'?hop:0,z:step.z*speed});}catch{}
   }
   const anim=aerial?'air_strike':move?.familyAnimation??move?.specialAnimation??(move?.animation?`action_finisher_${move.animation}`:stage===3?(['spin','ring'].includes(move?.shape??'spin')?'action_spin':move?.shape==='thrust'?'action_lunge':'action_cut_b'):direction==='forward'?'action_lunge':direction==='back'?'action_retreat':direction==='left'?'action_sidestep_left':direction==='right'?'action_sidestep_right':stage===2?'action_cut_b':'action_cut_a');
   try{p.playAnimation(`animation.hakkai.${anim}`,{blendOutTime:.1,stopExpression:'query.any_animation_finished'});}catch{}
   if(move?.name)try{notice(p,`§b${move.name}`,22);}catch{}
   try{p.playSound('random.orb',{volume:.30,pitch:stage===3?1.5:1.05});}catch{}
   // A quiet cue marks the end of recovery; client timing is still untested.
   system.runTimeout(()=>{
    try{if(actions.get(p.id)===action&&!action.cancelled&&eligible(p)&&p.dimension.id===dim&&p.selectedSlotIndex===slot&&selected(p)?.typeId===item.typeId)p.playSound('random.click',{volume:.25,pitch:1.5});}catch{}
   },action.ready-t);
   const pulses=move?.pulses??[0];
   // Every scheduled pulse is its own revalidated hit test; no timers or
   // damage survive a slot change, mode switch, teleport or unloaded path.
   for(let pulse=0;pulse<pulses.length;pulse++)system.runTimeout(()=>{
    try{
     if(actions.get(p.id)!==action||action.cancelled||!eligible(p)||p.dimension.id!==dim||p.selectedSlotIndex!==slot||selected(p)?.typeId!==item.typeId||state(p).menu||state(p).busy||dist(origin,p.location)>3)return;
     const center={...p.location},rank=Number.isFinite(g.rank)?Math.max(1,Math.min(3,Math.floor(g.rank))):1;
     const shape=move?.shape??(stage===3?'spin':'class'),range=(move?.reach??profile.range)+(direction==='forward'?.4:direction==='back'?-.25:0);
     const inner=move?.inner??.25,cone=shape==='spin'||shape==='ring'?-1:shape==='thrust'?.86:shape==='cleave'||shape==='cross'?.35:profile.cone;
     const turn=shape==='cross'?(pulse%2?-.38:.38):(move?.angle??0),c=Math.cos(turn),sn=Math.sin(turn),f={x:facing.x*c-facing.z*sn,z:facing.z*c+facing.x*sn};
     const spread=cone===-1?Math.PI:Math.acos(cone),start=Math.atan2(f.z,f.x);
     for(let i=0;i<18;i++){
      const angle=start-spread+2*spread*i/17,r=inner+(range-inner)*.7;
      try{p.dimension.spawnParticle(i%4===0?'hakkai:wind_burst':`hakkai:${['shot_wind','shot_spore','shot_sand','shot_frost','shot_spark','shot_shadow','shot_wind','shot_time'][g.wardenBlade]??'wind_trace'}`,{x:center.x+Math.cos(angle)*r,y:center.y+.7+(i%3)*.25,z:center.z+Math.sin(angle)*r});}catch{}
     }
     const inside=target=>{
      if(!target?.isValid||target.id===p.id||target.dimension?.id!==dim||!isCombatTarget(target,p))return false;
      const health=target.getComponent('minecraft:health');if(health&&Number.isFinite(health.currentValue)&&health.currentValue<=0)return false;
      const dx=target.location.x-center.x,dz=target.location.z-center.z,r=Math.hypot(dx,dz);
      return r>=inner&&r<=range&&Math.abs(target.location.y-center.y)<=2.25&&(dx*f.x+dz*f.z)/r>=cone&&clearLine(p,target);
     };
     const targets=p.dimension.getEntities({location:center,maxDistance:range+1,closest:48}).filter(target=>{try{return inside(target);}catch{return false;}})
      .sort((a,b)=>dist(a.location,center)-dist(b.location,center));
     const seen=new Set();
     for(const target of targets){
      if(seen.has(target.id))continue;if(seen.size>=(stage===3?6:3))break;seen.add(target.id);
      if(actions.get(p.id)!==action||action.cancelled||!eligible(p)||p.dimension.id!==dim||p.selectedSlotIndex!==slot||selected(p)?.typeId!==item.typeId||state(p).menu||state(p).busy||dist(origin,p.location)>3||dist(p.location,center)>.5||!inside(target))continue;
      const dx=target.location.x-center.x,dz=target.location.z-center.z,r=Math.hypot(dx,dz);
      // Honor each weapon's listed attack stat rather than flattening all
      // weapons of one class/rank. Unknown metadata uses the older fallback.
      const listed=Number.isFinite(g.damage)&&g.damage>0?Math.min(40,g.damage):profile.damage+rank*3;
      const base=Math.max(1,listed+(stage-1)*3+(move?.power??0));
      const sweet=g.kind==='剣'?r>=1.6&&r<=3:['斧','ハンマー'].includes(g.kind)?r>=.8&&r<=2.2:g.kind==='槍'?r>=3.2&&r<=5:r>=2.5&&r<=4.3;
      // Deep Shadow rewards positioning behind an opponent, not just weapon
      // damage. If the target's orientation is unavailable there is no bonus.
      let behind=false;
      if(move?.backBonus)try{const v=target.getViewDirection(),n=Math.hypot(v.x,v.z);behind=n>.01&&(v.x*(-dx)+v.z*(-dz))/(n*r)<-.3;}catch{}
      const hitTick=system.currentTick;let counter=false;try{counter=hasCounter(p,hitTick)===true;}catch{}
      const damage=base+(sweet?Math.ceil(base*.25):0)+(behind?move.backBonus:0)+(counter?6+rank*2:0)+actionEnchantmentBonus(selected(p),target);
      try{if(target.applyDamage(damage,{cause:EntityDamageCause.magic,damagingEntity:p})){
       if(counter)try{consumeCounter(p,hitTick);}catch{}
       try{onHit(p,target,g,damage);}catch(err){report('アクション命中',err);}
       try{p.dimension.spawnParticle('hakkai:wind_burst',{...target.location,y:target.location.y+1});}catch{}
       // Extra crowd control and knockback do not pin major bosses. Recheck
       // identity, world, target and visibility after synchronous callbacks.
       const major=/^(?:hakkai:(?:time_warden|eclipse_colossus|fushi_chief|(?:king_)?guardian_[0-7])|minecraft:(?:wither|ender_dragon|warden))$/.test(target.typeId??'');
       if(!major&&actions.get(p.id)===action&&!action.cancelled&&eligible(p)&&!state(p).menu&&!state(p).busy&&dist(origin,p.location)<=3&&dist(p.location,center)<=.5&&p.dimension.id===dim&&p.selectedSlotIndex===slot&&selected(p)?.typeId===item.typeId&&target.isValid&&inside(target)){
        if(move?.effect)try{const old=target.getEffect(move.effect);if(!old||old.amplifier===0&&old.duration<40)target.addEffect(move.effect,40,{amplifier:0,showParticles:false});}catch{}
        if(move?.push)try{target.applyKnockback({x:dx/r*move.push,z:dz/r*move.push},.08);}catch{}
       }
      }}catch(err){report('アクション攻撃',err);}
     }
    }catch(err){report('アクション攻撃の判定',err);}
   },windup+pulses[pulse]);
   return true;
  }catch(err){report('アクション攻撃',err);return false;}
 }
 function controls(p){try{return eligible(p)&&isActionWeapon(gear.get(selected(p)?.typeId));}catch{return false;}}
 // Invalidate a pending hit without erasing recovery: equipment or dimension
 // swapping must not allow a player to bypass a weapon's attack cadence.
 function invalidate(id){const e=actions.get(id);if(e){e.cancelled=true;e.mashed=true;}airborne.set(id,true);}
 function clear(id){actions.delete(id);airborne.delete(id);}
 function status(p,t){const e=actions.get(p.id);return e&&t<e.ready?'§e攻撃後の隙':'';}
 return {cancelNative,swing,controls,invalidate,clear,status,tick};
}
