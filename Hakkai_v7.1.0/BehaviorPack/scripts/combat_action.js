import {EntityDamageCause,GameMode} from '@minecraft/server';
import {isCombatTarget} from './combat_resonance.js';
import {weaponDirection} from './combat_weapon_style.js';
import {planRollSegment} from './combat_roll.js';

// Experimental replacement combat, limited to these three melee classes.
// No animation is assumed to have rendered merely because playAnimation returned.
const PROFILE=Object.freeze({
 '剣':{windup:4,recovery:11,range:3.8,cone:.50,damage:12},
 '斧':{windup:6,recovery:15,range:3.5,cone:.25,damage:16},
 '槍':{windup:5,recovery:13,range:5.2,cone:.80,damage:13}
});
export const isActionWeapon=g=>!!g&&Object.hasOwn(PROFILE,g.kind)&&typeof g.id==='string';
const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y,a.z-b.z);
export function setupActionCombat({system,gear,selected,state,enabled,visibleFrom,onHit=()=>{},hasCounter=()=>false,consumeCounter=()=>false,report=()=>{}}){
 const actions=new Map();
 function eligible(p){
  try{return !!p?.isValid&&p.typeId==='minecraft:player'&&p.getGameMode()===GameMode.Survival&&enabled(p)===true;}catch{return false;}
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
   const stage=old?.identity===identity&&!old.mashed&&old.stage<3&&t>=old.ready&&t<=old.ready+10?old.stage+1:1;
   const profile=PROFILE[g.kind],cost=[0,6,8,12][stage];
   if(!Number.isFinite(s.s)||s.s<cost)return false;
   const view=p.getViewDirection(),n=Math.hypot(view.x,view.z);
   if(!Number.isFinite(n)||n<.01)return false;
   const facing={x:view.x/n,z:view.z/n},direction=weaponDirection(p),dim=p.dimension.id,slot=p.selectedSlotIndex,origin={...p.location};
   const action={identity,stage,started:t,ready:t+profile.recovery+(stage===3?5:0),direction,mashed:false};
   actions.set(p.id,action);s.s-=cost;
   // Directional attacks attempt a short physical step, with a small hop on
   // forward input. Require a checked, supported run-up; collision is still
   // resolved by Bedrock physics, not guaranteed against every edge/impulse.
   if(direction!=='neutral'&&p.isOnGround){
    const step=direction==='forward'?facing:direction==='back'?{x:-facing.x,z:-facing.z}:direction==='left'?{x:facing.z,z:-facing.x}:{x:-facing.z,z:facing.x};
    try{const path=planRollSegment(p.dimension,origin,step,1.8,true);if(path&&path.travel>=1.79)p.applyImpulse({x:step.x*.36,y:direction==='forward'?.20:0,z:step.z*.36});}catch{}
   }
   const anim=stage===3?'spin':direction==='forward'?'lunge':direction==='back'?'retreat':direction==='left'?'sidestep_left':direction==='right'?'sidestep_right':stage===2?'cut_b':'cut_a';
   try{p.playAnimation(`animation.hakkai.action_${anim}`,{blendOutTime:.1,stopExpression:'query.any_animation_finished'});}catch{}
   try{p.playSound('random.orb',{volume:.30,pitch:stage===3?1.5:1.05});}catch{}
   // A quiet cue marks the end of recovery; client timing is still untested.
   system.runTimeout(()=>{
    try{if(actions.get(p.id)===action&&!action.cancelled&&eligible(p)&&p.dimension.id===dim&&p.selectedSlotIndex===slot&&selected(p)?.typeId===item.typeId)p.playSound('random.click',{volume:.25,pitch:1.5});}catch{}
   },action.ready-t);
   system.runTimeout(()=>{
    try{
     if(actions.get(p.id)!==action||action.cancelled||!eligible(p)||p.dimension.id!==dim||p.selectedSlotIndex!==slot||selected(p)?.typeId!==item.typeId||state(p).menu||state(p).busy||dist(origin,p.location)>3)return;
     const center={...p.location},rank=Number.isFinite(g.rank)?Math.max(1,Math.min(3,Math.floor(g.rank))):1;
     const range=profile.range+(direction==='forward'?.4:direction==='back'?-.25:0),cone=stage===3?-1:profile.cone;
     // Draw the sweep in the same geometry used to select enemies.
     const spread=stage===3?Math.PI:Math.acos(cone),start=Math.atan2(facing.z,facing.x);
     for(let i=0;i<18;i++){
      const angle=start-spread+2*spread*i/17,r=range*.75;
      try{p.dimension.spawnParticle('hakkai:wind_trace',{x:center.x+Math.cos(angle)*r,y:center.y+1,z:center.z+Math.sin(angle)*r});}catch{}
     }
     const targets=p.dimension.getEntities({location:center,maxDistance:range+1,closest:48}).filter(target=>{
      try{
       if(!target?.isValid||target.id===p.id||target.dimension?.id!==dim||!isCombatTarget(target,p))return false;
       const dx=target.location.x-center.x,dz=target.location.z-center.z,r=Math.hypot(dx,dz);
       return r>=.25&&r<=range&&Math.abs(target.location.y-center.y)<=2.25&&(dx*facing.x+dz*facing.z)/r>=cone&&clearLine(p,target);
      }catch{return false;}
     }).sort((a,b)=>dist(a.location,center)-dist(b.location,center)).slice(0,stage===3?6:3);
     for(const target of targets){
      if(actions.get(p.id)!==action||action.cancelled||!eligible(p)||p.dimension.id!==dim||p.selectedSlotIndex!==slot||selected(p)?.typeId!==item.typeId||dist(p.location,center)>.5||!target.isValid||target.dimension?.id!==dim||!isCombatTarget(target,p))continue;
      const dx=target.location.x-center.x,dz=target.location.z-center.z,r=Math.hypot(dx,dz);
      if(r<.25||r>range||Math.abs(target.location.y-center.y)>2.25||(dx*facing.x+dz*facing.z)/r<cone||!clearLine(p,target))continue;
      // Fixed class/rank/stage technique values, not the item's native attack.
      const base=profile.damage+rank*3+(stage-1)*3;
      // Each class rewards a different spacing, separately from native damage.
      const sweet=g.kind==='剣'?r>=1.6&&r<=3:g.kind==='斧'?r>=.8&&r<=2.2:r>=3.2&&r<=5;
      let counter=false;try{counter=hasCounter(p,t)===true;}catch{}
      const damage=base+(sweet?Math.ceil(base*.25):0)+(counter?6+rank*2:0);
      try{if(target.applyDamage(damage,{cause:EntityDamageCause.magic,damagingEntity:p})){
       if(counter)try{consumeCounter(p,t);}catch{}
       onHit(p,target,g,damage);try{p.dimension.spawnParticle('hakkai:wind_burst',{...target.location,y:target.location.y+1});}catch{}
      }}catch(err){report('アクション攻撃',err);}
     }
    }catch(err){report('アクション攻撃の判定',err);}
   },profile.windup);
   return true;
  }catch(err){report('アクション攻撃',err);return false;}
 }
 function controls(p){try{return eligible(p)&&isActionWeapon(gear.get(selected(p)?.typeId));}catch{return false;}}
 // Invalidate a pending hit without erasing recovery: equipment or dimension
 // swapping must not allow a player to bypass a weapon's attack cadence.
 function invalidate(id){const e=actions.get(id);if(e){e.cancelled=true;e.mashed=true;}}
 function clear(id){actions.delete(id);}
 function status(p,t){const e=actions.get(p.id);return e&&t<e.ready?'§e攻撃後の隙':'';}
 return {cancelNative,swing,controls,invalidate,clear,status};
}
