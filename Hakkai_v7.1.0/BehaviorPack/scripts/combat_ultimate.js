import {GameMode} from '@minecraft/server';
import {combatEnemies,applyCombatHit,isCombatTarget} from './combat_resonance.js';
import {isTraceWeapon} from './combat_weapon_trace.js';
const COOLDOWN=600,DURATION=20;
const excluded=new Set(['void','selfDestruct','override']);
export function setupCombatUltimate({system,notice,visibleFrom}){
 const entries=new Map();
 function active(p,t){const e=entries.get(p?.id);return !!(e&&p?.isValid&&[GameMode.Survival,GameMode.Creative].includes(p.getGameMode())&&p.dimension.id===e.dim&&t<e.until);}
 function blocks(p,source,t){return active(p,t)&&typeof source?.cause==='string'&&!excluded.has(source.cause);}
 function cast(p,s,g){
  try{
   if(!p?.isValid||p.typeId!=='minecraft:player'||![GameMode.Survival,GameMode.Creative].includes(p.getGameMode())||s.busy||s.menu)return false;
   const t=system.currentTick,e=entries.get(p.id);
   if(e&&t<e.ready){notice(p,'§e必殺技はまだ再使用できません');return false;}
   const weapon=isTraceWeapon(g)?g:undefined;
   if(p.getGameMode()!==GameMode.Creative){
    if(weapon&&(s.s<20||s.m<10)){notice(p,'§e必殺にはスタミナ20と魔力10が必要',45);return false;}
    if(!weapon&&!(s.s>0&&s.s<=20&&s.m>=0&&s.m<=20)){notice(p,'§e護符はスタミナと魔力が両方20以下の時に使えます');return false;}
   }
   const spec=weapon?({剣:[8,.15],斧:[7,-1],弓:[14,.75],杖:[15,.7],ハンマー:[7,-1],槍:[12,.8],盾:[5,.35],扇:[9,.05]})[weapon.kind]:[8,-1];
   const view=spec[1]>-1?p.getViewDirection():undefined,vl=view?Math.hypot(view.x,view.z):1;
   if(view&&(!Number.isFinite(vl)||vl<.01))return false;
   const pool=weapon?p.dimension.getEntities({location:p.location,maxDistance:spec[0],closest:48}).filter(x=>x?.isValid&&x.id!==p.id&&isCombatTarget(x)):combatEnemies(p,8,8);
   const targets=pool.filter(x=>{
    try{
     if(!visibleFrom(p,x.getHeadLocation()))return false;
     if(weapon){
      const a=p.getHeadLocation(),b=x.getHeadLocation(),dx=b.x-a.x,dy=b.y-a.y,dz=b.z-a.z,n=Math.hypot(dx,dy,dz);if(n<.01)return false;
      const dir={x:dx/n,y:dy/n,z:dz/n},d=p.dimension;
      for(let i=0;i<=Math.ceil(n);i++){const k=Math.min(n,i);if(!d.isChunkLoaded({x:a.x+dir.x*k,y:a.y+dir.y*k,z:a.z+dir.z*k}))return false;}
      if(d.getEntitiesFromRay(a,dir,{maxDistance:n,ignoreBlockCollision:false}).some(h=>h.entity?.isValid&&h.entity.id!==p.id&&h.entity.id!==x.id&&h.distance<n&&!isCombatTarget(h.entity)))return false;
     }
     if(view){const dx=x.location.x-p.location.x,dz=x.location.z-p.location.z,n=Math.hypot(dx,dz);if(n>.01&&(dx*view.x+dz*view.z)/(n*vl)<spec[1])return false;}
     return true;
    }catch{return false;}
   }).slice(0,6);
   if(!targets.length){notice(p,'§e見通せる敵が近くにいません');return false;}
   if(p.getGameMode()!==GameMode.Creative){if(weapon){s.s-=20;s.m-=10;}else s.s=0;}entries.set(p.id,{dim:p.dimension.id,until:t+DURATION,ready:t+COOLDOWN});
   for(const target of targets){
    applyCombatHit(p,target,20,2,-1,1.2);
    if(!/^(?:hakkai:(?:time_warden|eclipse_colossus|fushi_chief|guardian_[0-7])|minecraft:(?:wither|ender_dragon|warden))$/.test(target.typeId??''))try{target.addEffect('slowness',40,{amplifier:1,showParticles:false});}catch{}
    try{p.dimension.spawnParticle('hakkai:wind_burst',{...target.location,y:target.location.y+1});}catch{}
   }
   if(weapon)try{p.dimension.spawnParticle(`hakkai:${weapon.visualId??weapon.id}`,{...p.location,y:p.location.y+1});}catch{}
   if(weapon)for(let i=0;i<36;i++){const a=i*Math.PI/9,r=1+i/18;try{p.dimension.spawnParticle(i%3?'hakkai:wind_trace':'hakkai:wind_burst',{x:p.location.x+Math.cos(a)*r,y:p.location.y+.25+i*.065,z:p.location.z+Math.sin(a)*r});}catch{}}
   for(let i=0;i<16;i++)try{const a=i*Math.PI/8;p.dimension.spawnParticle('hakkai:wind_burst',{x:p.location.x+Math.cos(a)*2,y:p.location.y+.7,z:p.location.z+Math.sin(a)*2});}catch{}
   try{p.playAnimation('animation.hakkai.magic_cast',{blendOutTime:.1,stopExpression:'query.any_animation_finished'});}catch{}
   try{p.playSound('random.levelup',{volume:.8,pitch:1.5});}catch{}
   try{notice(p,weapon?`§6必殺・${weapon.skill}！`:'§6必殺・あきらめない！',50);}catch{}
   return true;
  }catch{return false;}
 }
 function status(p,t){return active(p,t)?'§6必殺・攻撃回避中':'';}
 function invalidate(id){const e=entries.get(id);if(e)e.until=0;}
 function clear(id){entries.delete(id);}
 return {cast,active,blocks,status,invalidate,clear};
}
