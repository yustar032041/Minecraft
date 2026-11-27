// Eight independently owned, invulnerable blade entities. Their poses are the
// only attack tells: never place a warning marker at the player's feet.
// The owner ID and death tombstone survive a script reload. If an owner is
// merely unloaded, its blades are left alone rather than guessed orphaned.
import {chooseWardenTarget} from './warden_ai.js';
const FAMILY='hakkai_warden_sword',OWNER='hakkai:warden_blade_owner';
const blades=Array.from({length:8},(_,i)=>`hakkai:warden_sword_${i}`);
const speed=[.72,.58,.49,.66,.94,.64,.81,.55];
export const WARDEN_BLADE_DAMAGE=Object.freeze([13.5,12,18,15,16.5,15,13.5,18]);
export const WARDEN_BLADE_PULSE_DAMAGE=Object.freeze({sand:15,ice:12});
const windup=[20,25,24,22,15,23,18,27];
// Sideways velocity turns the same visible blade itself, not an invisible
// remote hitbox. Fourth/fifth forms alternate a second path per blade.
export function bladeDirection(i,phase,seq,step,base){
 const a=step*.28,advanced=phase>=3&&seq%2===0;
 const patterns=[Math.sin(a)*.28,Math.sin(a*.55)*.48,(step<7?-.32:.32),Math.sin(a*1.5)*.18,(step%8<4?.36:-.36),Math.sin(a*.7)*-.4,Math.cos(a)*.32,(step<9?.42:-.18)];
 const lateral=patterns[i]*(advanced?1.5:1),vertical=advanced?[.06,0,.09,-.08,.04,.08,-.06,.05][i]*Math.sin(a):0;
 const v={x:base.x-base.z*lateral,y:base.y+vertical,z:base.z+base.x*lateral},n=Math.hypot(v.x,v.y,v.z);
 return {x:v.x/n,y:v.y/n,z:v.z/n};
}
const tombstone=id=>`hakkai:warden_blade_dead:${id}`;
const finite=p=>p&&[p.x,p.y,p.z].every(Number.isFinite);
const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y,a.z-b.z);
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
function clearPath(d,a,b){
 try{
  if(!finite(a)||!finite(b))return false;
  if(Math.abs(b.x)>13||Math.abs(b.z)>13||b.y<80||b.y>91)return false;
  const delta={x:b.x-a.x,y:b.y-a.y,z:b.z-a.z},len=Math.hypot(delta.x,delta.y,delta.z);
  // Check both the hilt and the full blade volume, not just its origin.
  for(const h of [.1,1,2.3]){
   const from={x:a.x,y:a.y+h,z:a.z},to={x:b.x,y:b.y+h,z:b.z};
   for(const point of [from,to])if(!d.isChunkLoaded(point)||!d.getBlock(point)?.isAir)return false;
   if(len>.001&&d.getBlockFromRay(from,{x:delta.x/len,y:delta.y/len,z:delta.z/len},{maxDistance:len}))return false;
  }
  return true;
 }catch{return false;}
}
function move(e,to){
 try{
  if(!clearPath(e.dimension,e.location,to))return false;
  e.teleport(to);return true;
 }catch{return false;}
}
function setPose(e,pose){try{e.setProperty('hakkai:blade_state',pose);return true;}catch{return false;}}
function nearby(d){try{return d.getEntities({families:[FAMILY]});}catch{return [];}}
function ownerOf(e){try{return e.getDynamicProperty(OWNER);}catch{return undefined;}}
function owned(d,id){return nearby(d).filter(e=>e.isValid&&ownerOf(e)===id&&blades.includes(e.typeId));}
function remove(e){try{e.remove();}catch{}}
function contactPoint(a,b,p){
 const ax=b.x-a.x,ay=b.y-a.y,az=b.z-a.z,den=ax*ax+ay*ay+az*az;
 const k=den?clamp(((p.x-a.x)*ax+(p.y-a.y)*ay+(p.z-a.z)*az)/den,0,1):0;
 return {x:a.x+k*ax,y:a.y+k*ay,z:a.z+k*az};
}
function clearSight(d,a,b){
 try{if(!d.isChunkLoaded(a)||!d.isChunkLoaded(b)||!d.getBlock(a)?.isAir||!d.getBlock(b)?.isAir)return false;
  const dx=b.x-a.x,dy=b.y-a.y,dz=b.z-a.z,n=Math.hypot(dx,dy,dz);
  return n<.001||!d.getBlockFromRay(a,{x:dx/n,y:dy/n,z:dz/n},{maxDistance:n});
 }catch{return false;}
}
export function setupWardenSwords({world,validPlayer,isEvading=()=>false,damageCause}){
 const sessions=new Map(),held=new Map();
 function release(e){
  const previous=held.get(e.id);
  try{e.setProperty('hakkai:held_blade',0);}catch{}
  if(previous)try{if(previous.isValid)previous.setProperty('hakkai:held',false);}catch{}
  held.delete(e.id);
 }
 function acquire(e,index){
  if(index<0||index>7)return false;
  const wanted=owned(e.dimension,e.id).find(x=>x.typeId===blades[index]);
  if(!wanted)return false;
  if(held.get(e.id)?.id===wanted.id)return true;
  release(e);
  try{
   wanted.setProperty('hakkai:held',true);
   e.setProperty('hakkai:held_blade',index+1);
   held.set(e.id,wanted);return true;
  }catch{try{wanted.setProperty('hakkai:held',false);}catch{}try{e.setProperty('hakkai:held_blade',0);}catch{}return false;}
 }
 // Only a confirmed boss death, never an unresolved entity ID, authorizes
 // deletion after unload/reload. This also prevents cross-boss cleanup.
 function sweep(d){
  for(const e of nearby(d))try{
   const id=ownerOf(e);if(typeof id==='string'&&world.getDynamicProperty(tombstone(id))===true)remove(e);
  }catch{}
 }
 function onDeath(e){
  if(!e||e.typeId!=='hakkai:time_warden')return;
  try{world.setDynamicProperty(tombstone(e.id),true);}catch{}
  try{for(const sword of owned(e.dimension,e.id))remove(sword);}catch{}
  release(e);sessions.delete(e.id);
 }
 function finish(sword,q,phase,t,i){
  // Later forms alternate a second, visibly re-cocked pass.
  if(phase>=3&&q.seq%2===0&&!q.reprise&&setPose(sword,1)){q.reprise=true;q.mode='windup';q.at=t+12;}
  else {q.mode='orbit';q.next=t+65+i*4;setPose(sword,0);}
 }
 function tick(e,phase,t,{peaceful=false,paused=false,brain,situation}={}){
  if(!e?.isValid||phase<2)return;
  let s=sessions.get(e.id);
  if(!s){
   s={ready:t+40,states:new Map(),last:t-1};sessions.set(e.id,s);
   // Clear a stale client-synced hold after reload, including blades that
   // survived in a loaded chunk while the script state was lost.
   try{e.setProperty('hakkai:held_blade',0);}catch{}
   for(const blade of owned(e.dimension,e.id))try{blade.setProperty('hakkai:held',false);}catch{}
   // The phase transition itself is announced, but not the individual blows.
   try{for(const p of e.dimension.getPlayers({location:e.location,maxDistance:45}).filter(validPlayer))p.sendMessage('§d八界の剣が集結する！ 構えを見て攻撃を避けよう。');}catch{}
  }
  if(s.last===t)return;
  if(s.last!==t-1){for(const state of s.states.values())state.mode='orbit';}
  s.last=t;
  if(peaceful||paused){release(e);for(const sword of owned(e.dimension,e.id))setPose(sword,0);for(const state of s.states.values())state.mode='orbit';return;}
  if(t<s.ready)return;
  const d=e.dimension,all=owned(d,e.id),byType=new Map();
  for(const sword of all){if(byType.has(sword.typeId))remove(sword);else byType.set(sword.typeId,sword);}
  // Reuse persistent owned entities on reload; replace an absent blade only
  // when this arena is loaded. Assign ownership before the blade can act.
  for(let i=0;i<8;i++)if(!byType.has(blades[i]))try{
   const a=i*Math.PI/4,at={x:clamp(e.location.x+Math.cos(a)*3,-12,12),y:clamp(e.location.y+1,80,89),z:clamp(e.location.z+Math.sin(a)*3,-12,12)};
   if(!clearPath(d,at,at))continue;
   const sword=d.spawnEntity(blades[i],at);try{sword.setDynamicProperty(OWNER,e.id);}catch{remove(sword);continue;}
   byType.set(blades[i],sword);
   for(let n=0;n<6;n++)try{const a=n*Math.PI/3;d.spawnParticle('hakkai:warden_earth',{x:at.x+Math.cos(a)*.6,y:at.y+1,z:at.z+Math.sin(a)*.6});}catch{}
  }catch{}
  let players=[];try{players=d.getPlayers({location:e.location,maxDistance:45}).filter(validPlayer);}catch{}
  players.sort((a,b)=>String(a.id).localeCompare(String(b.id)));
  for(let i=0;i<8;i++){
   const sword=byType.get(blades[i]);if(!sword?.isValid)continue;
   let q=s.states.get(sword.id);if(!q){q={mode:'orbit',next:t+35+i*9,seq:0};s.states.set(sword.id,q);}
   if(held.get(e.id)?.id===sword.id){q.mode='orbit';q.wasHeld=true;q.next=Math.max(q.next,t+30);continue;}
   if(!q.restored||q.wasHeld){
    try{sword.setProperty('hakkai:held',false);q.restored=true;q.wasHeld=false;}catch{continue;}
   }
   try{
    if(q.mode==='orbit'){
     const a=t*.018+(Math.PI*2*i/8),radius=3.5+(i%3)*.45;
     const desired={x:clamp(e.location.x+Math.cos(a)*radius,-12.5,12.5),y:clamp(e.location.y+.8+(i%3)*.35,80,89),z:clamp(e.location.z+Math.sin(a)*radius,-12.5,12.5)};
     // Move at bounded speed; never teleport a long distance through a wall.
     const from=sword.location,l=dist(from,desired),k=l?Math.min(1,.35/l):0;
     move(sword,{x:from.x+(desired.x-from.x)*k,y:from.y+(desired.y-from.y)*k,z:from.z+(desired.z-from.z)*k});
     if(t>=q.next&&players.length){
      if(!setPose(sword,1)){q.next=t+20;continue;}
      q.target=(brain&&situation?chooseWardenTarget(brain,situation,{origin:sword.location,avoidId:q.lastTarget}):players.slice().sort((a,b)=>dist(sword.location,a.location)-dist(sword.location,b.location))[0]);
      if(!q.target){q.next=t+20;setPose(sword,0);continue;}
      q.lastTarget=q.target.id;
      const profile=situation?.profiles.find(p=>p.player.id===q.target.id);
      // Pursuit and an altered trajectory are reactions to mobility/close
      // pressure, not a fixed every-other-strike pattern.
      if(brain&&profile)q.seq=(profile.speed>.12||profile.dodges>=1||profile.distance<4)?2:1;else q.seq++;
      q.reprise=false;q.mode='windup';q.at=t+windup[i];
     }
    }else if(q.mode==='windup'){
     if(!q.target?.isValid||!players.some(p=>p.id===q.target.id)){q.mode='orbit';q.next=t+30;setPose(sword,0);continue;}
     if(t>=q.at){
      const from=sword.location,target=q.target.location;
      const v={x:target.x-from.x,y:target.y+.8-(from.y+1),z:target.z-from.z},l=Math.hypot(v.x,v.y,v.z);
      if(!Number.isFinite(l)||l<.1){q.mode='orbit';q.next=t+40;setPose(sword,0);continue;}
      q.direction={x:v.x/l,y:v.y/l,z:v.z/l};q.remaining=Math.min(l+1,18);q.step=0;q.form=phase;q.hit=new Set();q.mode='strike';setPose(sword,2);
     }
    }else if(q.mode==='strike'){
     const from={...sword.location},length=Math.min(speed[i],q.remaining),v=bladeDirection(i,q.form,q.seq,q.step++,q.direction),to={x:from.x+v.x*length,y:from.y+v.y*length,z:from.z+v.z*length};
     if(length<=0||!move(sword,to)){
      if((i===2||i===3)&&q.step>2){q.mode='pulse';q.radius=0;q.pulseHit=new Set();}
      else finish(sword,q,phase,t,i);
      continue;
     }
     // One hit per player per thrust. Damage is applied only along the actual
     // unobstructed segment after movement succeeded, never a floor marker.
     const a={x:from.x,y:from.y+1,z:from.z},b={x:to.x,y:to.y+1,z:to.z};
     for(const p of players){
      if(q.hit.has(p.id)||isEvading(p))continue;
      const center={x:p.location.x,y:p.location.y+.9,z:p.location.z};
      const contact=contactPoint(a,b,center);
      if(dist(contact,center)>.9||!clearSight(d,contact,center))continue;
      q.hit.add(p.id);let hit=false;try{hit=Boolean(p.applyDamage(WARDEN_BLADE_DAMAGE[i],{cause:damageCause,damagingEntity:e}));}catch{}
      if(hit)try{
       if(i===0||i===6){const dx=center.x-contact.x,dz=center.z-contact.z,n=Math.hypot(dx,dz)||1;p.applyKnockback({x:dx/n*.55,z:dz/n*.55},i===6?.3:.12);}
       else {const effects=['','blindness','weakness','slowness','weakness','poison','','slowness'];p.addEffect(effects[i],i===7?75:50,{amplifier:0,showParticles:false});}
      }catch{}
     }
     q.remaining-=length;
     if(q.remaining<=0){
      if(i===2||i===3){q.mode='pulse';q.radius=0;q.pulseHit=new Set();}
      else finish(sword,q,phase,t,i);
     }
    }else if(q.mode==='pulse'){
     // Sand and ice blades finish with a visible, expanding local shockwave.
     // It originates at the actual blade, never at the target's feet.
     const center={...sword.location,y:sword.location.y+1},previous=q.radius,radius=q.radius+.3;
     let drawn=0,failed=false;for(let k=0;k<12;k++){
      const a=k*Math.PI/6,at={x:center.x+Math.cos(a)*radius,y:center.y,z:center.z+Math.sin(a)*radius};
      if(!clearSight(d,center,at))continue;
      try{d.spawnParticle(i===2?'hakkai:mob_sand':'hakkai:mob_frost',at);drawn++;}catch{failed=true;}
     }
     if(!drawn||failed){finish(sword,q,phase,t,i);continue;}
     for(const p of players){
      if(q.pulseHit.has(p.id)||isEvading(p)||Math.abs(p.location.y+.9-center.y)>1.8)continue;
      const dx=p.location.x-center.x,dz=p.location.z-center.z,r=Math.hypot(dx,dz),target={...p.location,y:p.location.y+.9};
      if(r>radius+.45||r<Math.max(0,previous-.45)||!clearSight(d,center,target))continue;
      q.pulseHit.add(p.id);try{if(p.applyDamage(i===2?WARDEN_BLADE_PULSE_DAMAGE.sand:WARDEN_BLADE_PULSE_DAMAGE.ice,{cause:damageCause,damagingEntity:e})&&i===3)p.addEffect('slowness',60,{amplifier:0,showParticles:false});}catch{}
     }
     q.radius=radius;if(radius>=2.4)finish(sword,q,phase,t,i);
    }
   }catch{q.mode='orbit';q.next=t+40;setPose(sword,0);}
  }
 }
 function forget(id){sessions.delete(id);held.delete(id);}
 return {tick,onDeath,sweep,forget,acquire,release};
}
