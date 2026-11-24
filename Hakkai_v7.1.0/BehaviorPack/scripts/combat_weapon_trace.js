import {EntityDamageCause,GameMode} from '@minecraft/server';
import {isCombatTarget} from './combat_resonance.js';
// The 95 catalog weapons plus the two ultimate weapons use their own
// pre-existing skill particles. Tools, armor, accessories and vanilla items
// are deliberately outside this catalog-specific effect system.
export const TRACE_WEAPON_KINDS=new Set(['剣','斧','弓','杖','ハンマー','槍','盾','扇']);
const RANGE={'剣':4.2,'斧':4.0,'弓':4.0,'杖':4.5,'ハンマー':4.3,'槍':5.2,'盾':3.8,'扇':4.5};
const CONE={'剣':.50,'斧':.32,'弓':.78,'杖':.50,'ハンマー':.38,'槍':.82,'盾':.55,'扇':.28};
const d3=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y,a.z-b.z);
export function isTraceWeapon(g){return !!g&&TRACE_WEAPON_KINDS.has(g.kind)&&typeof g.id==='string'&&Number.isFinite(g.damage)&&g.damage>0;}
export function setupWeaponTrace({system,gear,selected,state,visibleFrom,enabled=true,report=()=>{}}){
 const recent=new Map(),lastSwing=new Map(),tokens=new Map();
 function record(p,target,damage){
  try{
   if(!enabled||!p?.id||!target?.id)return;
   const t=system.currentTick,list=(recent.get(p.id)??[]).filter(v=>t-v.t<=8);
   list.push({id:target.id,t,damage:Number.isFinite(damage)&&damage>0?damage:undefined,friendly:!isCombatTarget(target)});
   recent.set(p.id,list.slice(-24));
  }catch{}
 }
 function lineClear(p,target){
  try{
   const d=p.dimension,from=p.getHeadLocation(),to=target.getHeadLocation(),dx=to.x-from.x,dy=to.y-from.y,dz=to.z-from.z,n=Math.hypot(dx,dy,dz);
   if(!Number.isFinite(n)||n<.01||!visibleFrom(p,to))return false;
   const dir={x:dx/n,y:dy/n,z:dz/n};
   for(let i=0;i<=Math.ceil(n);i++){const k=Math.min(i,n);if(!d.isChunkLoaded({x:from.x+dir.x*k,y:from.y+dir.y*k,z:from.z+dir.z*k}))return false;}
   // A friendly entity between player and enemy blocks this beam. Unknown or
   // failed raycasts suppress damage rather than piercing an obstacle.
   const hits=d.getEntitiesFromRay(from,dir,{maxDistance:n,ignoreBlockCollision:false});
   return !hits.some(h=>h.entity?.isValid&&h.entity.id!==p.id&&h.entity.id!==target.id&&Number.isFinite(h.distance)&&h.distance<n&&!isCombatTarget(h.entity));
  }catch{return false;}
 }
 function swing(e){
  try{
   const p=e.player,item=e.heldItemStack,g=gear.get(item?.typeId),t=system.currentTick;
   if(!enabled||e.swingSource!=='Attack'||!p?.isValid||p.typeId!=='minecraft:player'||p.getGameMode()===GameMode.Spectator||!isTraceWeapon(g)||selected(p)?.typeId!==item.typeId)return false;
   const s=state(p);if(s.busy||s.menu||t-(lastSwing.get(p.id)??-100)<4)return false;
   const view=p.getViewDirection(),n=Math.hypot(view.x,view.z);if(!Number.isFinite(n)||n<.01)return false;
   const f={x:view.x/n,z:view.z/n},origin={...p.location},dim=p.dimension.id,slot=p.selectedSlotIndex,range=RANGE[g.kind],cone=CONE[g.kind];
   const fallback=g.damage*(p.getGameMode()!==GameMode.Creative&&s.s<=0?.55:1);
   lastSwing.set(p.id,t);const token={};tokens.set(p.id,token);
   // Visible arc and weapon-specific existing particles are generated at the
   // same swing, including a swing that missed a native melee target.
   const maxAngle=Math.acos(cone);
   for(let i=0;i<13;i++){
    const angle=(i/12*2-1)*maxAngle,r=i%2?range*.88:range*.55,c=Math.cos(angle),sn=Math.sin(angle);
    try{p.dimension.spawnParticle('hakkai:wind_trace',{x:origin.x+(f.x*c-f.z*sn)*r,y:origin.y+1,z:origin.z+(f.z*c+f.x*sn)*r});}catch{}
   }
   try{p.dimension.spawnParticle(`hakkai:${g.visualId??g.id}`,{x:origin.x+f.x*2,y:origin.y+1,z:origin.z+f.z*2});}catch{}
   // Let the engine register the direct hit before considering effect hits.
   system.runTimeout(()=>{
    try{
     if(tokens.get(p.id)!==token||!p.isValid||p.dimension.id!==dim||p.selectedSlotIndex!==slot||selected(p)?.typeId!==item.typeId||d3(p.location,origin)>1.5)return;
     const direct=(recent.get(p.id)??[]).filter(x=>x.t>=t-1&&x.t<=t+4);
     if(direct.some(x=>x.friendly))return; // no sweeping past a friendly direct target
     const damage=fallback;
     const candidates=p.dimension.getEntities({location:origin,maxDistance:range+1,closest:48}).filter(target=>{
      if(!target?.isValid||target.id===p.id||target.dimension.id!==dim||!isCombatTarget(target)||direct.some(x=>x.id===target.id))return false;
      const dx=target.location.x-origin.x,dz=target.location.z-origin.z,r=Math.hypot(dx,dz);
      if(r<.25||r>range||Math.abs(target.location.y-origin.y)>2.25||(dx*f.x+dz*f.z)/r<cone)return false;
      return lineClear(p,target);
     }).sort((a,b)=>d3(a.location,origin)-d3(b.location,origin)).slice(0,8);
     const hit=new Set();
     for(const target of candidates){if(hit.has(target.id))continue;hit.add(target.id);
      // Magic cause avoids retriggering native melee/airstrike/affinity hooks;
      // the numerical input equals the weapon base attack, adjusted for exhausted
      // stamina. Enchantments, effects and armor can alter final HP loss.
      try{target.applyDamage(damage,{cause:EntityDamageCause.magic,damagingEntity:p});}catch(err){report('武器の軌跡ダメージ',err);}
     }
    }catch(err){report('武器の軌跡',err);}
   },4);
   return true;
  }catch(err){report('武器の振り',err);return false;}
 }
 function clear(id){recent.delete(id);lastSwing.delete(id);tokens.delete(id);}
 return {swing,record,clear,enabled:()=>enabled};
}
