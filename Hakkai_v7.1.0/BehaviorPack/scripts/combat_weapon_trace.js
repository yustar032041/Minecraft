import {playWeaponMotion} from './combat_weapon_motion.js';
import {resolveSwingStyle,styleGeometry,styleIdentity,styleFacing,linkedTechnique} from './combat_weapon_style.js';
import {EntityDamageCause,GameMode} from '@minecraft/server';
import {isCombatTarget} from './combat_resonance.js';
import {prepareCombatRay} from './combat_wind_ray.js';
import {linkFinisher} from './combat_link_finish.js';
// The 95 catalog weapons plus the two ultimate weapons use their own
// pre-existing skill particles. Tools, armor, accessories and vanilla items
// are deliberately outside this catalog-specific effect system.
export const TRACE_WEAPON_KINDS=new Set(['剣','斧','弓','杖','ハンマー','槍','盾','扇']);
const RANGE={'剣':4.5,'斧':4.0,'弓':4.0,'杖':16,'ハンマー':4.3,'槍':6,'盾':3.4,'扇':6};
const CONE={'剣':.50,'斧':.32,'弓':.78,'杖':.50,'ハンマー':.38,'槍':.82,'盾':.55,'扇':.28};
const d3=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y,a.z-b.z);
export function isTraceWeapon(g){return !!g&&TRACE_WEAPON_KINDS.has(g.kind)&&typeof g.id==='string'&&Number.isFinite(g.damage)&&g.damage>0;}
export function setupWeaponTrace({system,gear,selected,state,visibleFrom,airAttack=()=>false,enabled=true,report=()=>{}}){
 const recent=new Map(),lastSwing=new Map(),tokens=new Map(),motionIndex=new Map(),styles=new Map();
 function record(p,target,damage){
  try{
   if(!enabled||!p?.id||!target?.id)return;
   const t=system.currentTick,list=(recent.get(p.id)??[]).filter(v=>t-v.t<=8);
   list.push({id:target.id,t,damage:Number.isFinite(damage)&&damage>0?damage:undefined,target,friendly:!isCombatTarget(target,p)});
   recent.set(p.id,list.slice(-24));
   // entityHitEntity can occur without confirmed damage; only entityHurt's
   // positive damage qualifies. Deduplicate both event orders and do not add a
   // second damage instance to the native hit.
   const entry=styles.get(p.id),g=gear.get(selected(p)?.typeId);
   if(Number.isFinite(damage)&&damage>0&&entry?.linked&&entry.stage===3&&g&&entry.identity===styleIdentity(p,g)&&t>=entry.tick&&t-entry.tick<=4&&target.dimension?.id===p.dimension.id){
    const seen=entry.finished??(entry.finished=new Set());
    if(!seen.has(target.id)){seen.add(target.id);linkFinisher(p,target,g,entry,true);}
   }
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
   return !hits.some(h=>h.entity?.isValid&&h.entity.id!==p.id&&h.entity.id!==target.id&&!isCombatTarget(h.entity,p)&&(!Number.isFinite(h.distance)||h.distance<0||h.distance<=n+1e-6));
  }catch{return false;}
 }
 function swing(e){
  try{
   const p=e.player,item=e.heldItemStack,g=gear.get(item?.typeId),t=system.currentTick;
   if(!enabled||e.swingSource!=='Attack'||!p?.isValid||p.typeId!=='minecraft:player'||p.getGameMode()===GameMode.Spectator||!isTraceWeapon(g)||selected(p)?.typeId!==item.typeId)return false;
   const s=state(p);if(s.busy||s.menu||t-(lastSwing.get(p.id)??-100)<4)return false;
   const view=p.getViewDirection(),n=Math.hypot(view.x,view.z),full=Math.hypot(view.x,view.y,view.z);if(!Number.isFinite(full)||full<.01||!Number.isFinite(n))return false;
   const aim={x:view.x/full,y:view.y/full,z:view.z/full},origin={...p.location},dim=p.dimension.id,slot=p.selectedSlotIndex;let range=RANGE[g.kind],cone=CONE[g.kind];
   const style=resolveSwingStyle(styles.get(p.id),p,g,t);styles.set(p.id,style);
   const f=styleFacing(n<.01?{x:0,z:1}:{x:view.x/n,z:view.z/n},g.kind==='杖'?'neutral':style.direction);
   const geometry=styleGeometry(style.direction,range,cone);range=geometry.range;cone=geometry.cone;
   // Linked technique damage is defined by class/rank/chain, not the native
   // attack component. Direct-hit deduplication and ally/wall checks remain.
   const fallback=(style.linked?linkedTechnique(g,style):g.damage)*(p.getGameMode()!==GameMode.Creative&&s.s<=0?.55:1);
   lastSwing.set(p.id,t);const token=tokens.get(p.id)??{};tokens.set(p.id,token);
   const aerial=airAttack(p,s,g,t);
   const variant=motionIndex.get(p.id)??0;motionIndex.set(p.id,variant+1);
   playWeaponMotion(p,g,'attack',variant,style.direction);
   if(style.linked&&style.stage===3)try{p.playSound('random.orb',{volume:.35,pitch:1.4});}catch{}
   if(aerial){range+=g.kind==='杖'?2:.5;cone=Math.max(.2,cone-.1);}
   // Each weapon class has an intentionally different trace silhouette.
   // Staff is the exception: its damaging visual moves forward over time.
   if(g.kind!=='杖'){
    const maxAngle=Math.acos(cone);
    for(let i=0;i<13;i++){
     const u=i/12,angle=(u*2-1)*maxAngle,c=Math.cos(angle),sn=Math.sin(angle);
     const r=g.kind==='槍'?1+u*(range-1):g.kind==='ハンマー'?range*(.35+u*.65):range*(i%2?.88:.55);
     const y=g.kind==='ハンマー'?origin.y+.15:g.kind==='盾'?origin.y+.4+u*1.2:origin.y+1+(aerial?.3*Math.sin(u*Math.PI):0);
     try{p.dimension.spawnParticle(g.kind==='ハンマー'?'hakkai:wind_burst':'hakkai:wind_trace',{x:origin.x+(f.x*c-f.z*sn)*r,y,z:origin.z+(f.z*c+f.x*sn)*r});}catch{}
    }
   }
   if(aerial)for(let i=0;i<8;i++){const a=i*Math.PI/4;try{p.dimension.spawnParticle('hakkai:wind_burst',{x:origin.x+Math.cos(a),y:origin.y+.3,z:origin.z+Math.sin(a)});}catch{}}
   try{p.dimension.spawnParticle(`hakkai:${g.visualId??g.id}`,{x:origin.x+f.x*2,y:origin.y+1,z:origin.z+f.z*2});}catch{}
   // Let the engine register the direct hit before considering effect hits.
   system.runTimeout(()=>{
    try{
     if(tokens.get(p.id)!==token||!p.isValid||p.dimension.id!==dim||p.selectedSlotIndex!==slot||selected(p)?.typeId!==item.typeId||d3(p.location,origin)>1.5)return;
     // Follow normal player movement during windup but cancel long teleports.
     // Every actual hit still checks visibility and friendly blockers from the
     // current head position; no line is allowed to pass through a wall.
     const strikeOrigin={...p.location};
     const direct=(recent.get(p.id)??[]).filter(x=>x.t>=t-1&&x.t<=t+4);
     // A native hit may be reported just before swing-start. Check confirmed
     // damage again after the grace period, without ever applying extra damage.
     if(style.linked&&style.stage===3){
      const seen=style.finished??(style.finished=new Set());
      for(const hit of direct)if(hit.damage>0&&!hit.friendly&&!seen.has(hit.id)){
       seen.add(hit.id);linkFinisher(p,hit.target,g,style,true);
      }
     }
     if(direct.some(x=>x.friendly))return; // no sweeping past a friendly direct target
     const damage=fallback;
     if(g.kind==='杖'){
      // A confirmed direct hit absorbs the staff shot. Otherwise a bounded
      // script projectile advances, raycasting each segment and stopping at
      // the first wall, entity (including friends), or unloaded chunk.
      if(direct.length)return;
      let pos={...p.getHeadLocation()},remaining=range,steps=0;
      const step=()=>{
       try{
        if(tokens.get(p.id)!==token||!p.isValid||p.dimension.id!==dim||p.selectedSlotIndex!==slot||selected(p)?.typeId!==item.typeId||remaining<=0)return;
        const length=Math.min(2,remaining),beam=prepareCombatRay(p,length,e=>isCombatTarget(e,p),pos,aim);if(!beam)return;
        const travel=beam.distance;
        for(let k=.25;k<=travel+.01;k+=.5)try{p.dimension.spawnParticle('hakkai:wind_trace',{x:pos.x+aim.x*k,y:pos.y+aim.y*k,z:pos.z+aim.z*k});}catch{}
        const end={x:pos.x+aim.x*travel,y:pos.y+aim.y*travel,z:pos.z+aim.z*travel};
        if((steps++%2)===0)try{p.dimension.spawnParticle(`hakkai:${g.visualId??g.id}`,end);}catch{}
        if(beam.target){try{if(beam.target.isValid&&beam.target.dimension.id===dim&&isCombatTarget(beam.target,p)){const landed=beam.target.applyDamage(damage,{cause:EntityDamageCause.magic,damagingEntity:p});linkFinisher(p,beam.target,g,style,landed);p.dimension.spawnParticle('hakkai:wind_burst',end);}}catch(err){report('杖の弾',err);}return;}
        if(beam.blocked)return;
        pos=end;remaining-=length;if(remaining>0)system.runTimeout(step,1);
       }catch(err){report('杖の弾',err);}
      };
      step();return;
     }
     const candidates=p.dimension.getEntities({location:strikeOrigin,maxDistance:range+1,closest:48}).filter(target=>{
      if(!target?.isValid||target.id===p.id||target.dimension.id!==dim||!isCombatTarget(target,p)||direct.some(x=>x.id===target.id))return false;
      const dx=target.location.x-strikeOrigin.x,dz=target.location.z-strikeOrigin.z,r=Math.hypot(dx,dz);
      if(r<.25||r>range||Math.abs(target.location.y-strikeOrigin.y)>2.25||(dx*f.x+dz*f.z)/r<cone)return false;
      return lineClear(p,target);
     }).sort((a,b)=>d3(a.location,strikeOrigin)-d3(b.location,strikeOrigin)).slice(0,8);
     const hit=new Set();
     for(const target of candidates){if(hit.has(target.id))continue;hit.add(target.id);
      // A prior damage callback may have changed PvP rules, position or world.
      // Revalidate every target, including ally occlusion, before each hit.
      if(tokens.get(p.id)!==token||!p.isValid||p.dimension.id!==dim||p.selectedSlotIndex!==slot||selected(p)?.typeId!==item.typeId||d3(p.location,strikeOrigin)>.5||!target.isValid||target.dimension.id!==dim||!isCombatTarget(target,p))continue;
      const dx=target.location.x-strikeOrigin.x,dz=target.location.z-strikeOrigin.z,r=Math.hypot(dx,dz);
      if(r<.25||r>range||Math.abs(target.location.y-strikeOrigin.y)>2.25||(dx*f.x+dz*f.z)/r<cone||!lineClear(p,target))continue;
      // Magic cause avoids retriggering native melee/airstrike/affinity hooks;
      // Neutral damage uses the base attack; linked technique damage uses its
      // own class/rank/chain value. Exhaustion and armor can alter final loss.
      try{const landed=target.applyDamage(damage,{cause:EntityDamageCause.magic,damagingEntity:p});linkFinisher(p,target,g,style,landed);}catch(err){report('武器の軌跡ダメージ',err);}
     }
    }catch(err){report('武器の軌跡',err);}
   },4);
   return true;
  }catch(err){report('武器の振り',err);return false;}
 }
 function takeLink(p,g,t){
  try{
   const entry=styles.get(p.id);
   if(!enabled||!entry?.linked||entry.linkConsumed||entry.identity!==styleIdentity(p,g)||t<entry.tick||t-entry.tick>12)return false;
   // Consuming the skill follow-up must not erase the already scheduled swing.
   entry.linkConsumed=true;return {direction:entry.direction,stage:entry.stage};
  }catch{return false;}
 }
 function clear(id){recent.delete(id);lastSwing.delete(id);tokens.delete(id);motionIndex.delete(id);styles.delete(id);}
 return {swing,record,clear,takeLink,enabled:()=>enabled};
}
