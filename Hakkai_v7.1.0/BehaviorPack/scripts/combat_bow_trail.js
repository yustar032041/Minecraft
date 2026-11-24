import {GameMode} from '@minecraft/server';
// Native arrows remain responsible for their own collision and damage. This
// observer never applies damage, so the trail cannot double-hit the arrow.
export function setupBowTrail({system,gear,selected,state,airAttack=()=>false}){
 const active=new Map();
 function clear(id){const set=active.get(id);if(set)for(const token of set)token.cancelled=true;active.delete(id);}
 function spawned(arrow){
  if(arrow?.typeId!=='minecraft:arrow')return;
  try{system.runTimeout(()=>{
   try{
    if(!arrow.isValid)return;
    const p=arrow.getComponent('minecraft:projectile')?.owner;
    if(!p?.isValid||p.typeId!=='minecraft:player'||![GameMode.Survival,GameMode.Creative].includes(p.getGameMode())||p.dimension.id!==arrow.dimension.id)return;
    const g=gear.get(selected(p)?.typeId);if(g?.kind!=='弓')return;
    let set=active.get(p.id);if(!set){set=new Set();active.set(p.id,set);}if(set.size>=4)return;
    const token={cancelled:false};set.add(token);const dim=p.dimension.id;
    try{airAttack(p,state(p),g,system.currentTick);}catch{}
    try{arrow.dimension.spawnParticle(`hakkai:${g.visualId??g.id}`,arrow.location);}catch{}
    let remaining=100;
    const tick=()=>{
     try{
      if(token.cancelled||!p.isValid||!arrow.isValid||p.dimension.id!==dim||arrow.dimension.id!==dim||remaining--<=0){set.delete(token);if(!set.size&&active.get(p.id)===set)active.delete(p.id);return;}
      const v=arrow.getVelocity();if(!Number.isFinite(v.x+v.y+v.z)||Math.hypot(v.x,v.y,v.z)<.05){set.delete(token);if(!set.size&&active.get(p.id)===set)active.delete(p.id);return;}
      arrow.dimension.spawnParticle('hakkai:wind_trace',arrow.location);system.runTimeout(tick,1);
     }catch{set.delete(token);if(!set.size&&active.get(p.id)===set)active.delete(p.id);}
    };
    tick();
   }catch{}
  },1);}catch{}
 }
 return {spawned,clear};
}
