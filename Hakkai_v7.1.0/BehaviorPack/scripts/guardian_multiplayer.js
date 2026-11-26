// In-memory encounter tracking. Damage contribution expires after five minutes;
// rewards are limited to online, non-spectator participants near the death.
const WINDOW=20*60*5, DISTANCE=64, MAX_ENCOUNTERS=128, MAX_PLAYERS=64;
const guardian=e=>/^hakkai:guardian_[0-7]$/.test(e?.typeId??'');
function attacker(source){
 try{
  if(source?.damagingEntity?.typeId==='minecraft:player')return source.damagingEntity;
  const owner=source?.damagingProjectile?.getComponent('minecraft:projectile')?.owner;
  if(owner?.typeId==='minecraft:player')return owner;
 }catch{}
}
export function createGuardianMultiplayer({spectator,tracked=guardian,resolveAttacker=attacker}){
 const fights=new Map(),sites=new Map(),finished=new Map();
 const key=(site,dimension)=>`${dimension.id}:${site.id}`;
 function prune(t){
  for(const [id,entries] of fights){
   for(const [pid,entry] of entries)if(t-entry.tick>WINDOW||!entry.player.isValid)entries.delete(pid);
   if(!entries.size)fights.delete(id);
  }
  for(const [k,e] of sites)try{if(!e.isValid)sites.delete(k);}catch{sites.delete(k);}
  for(const [id,tick] of finished)if(t-tick>WINDOW)finished.delete(id);
 }
 function record(e,source,damage,t){
  if(!tracked(e)||!e.id||finished.has(e.id)||!(damage>0))return;
  const p=resolveAttacker(source);if(!p?.isValid||!p.id)return;
  try{if(p.getGameMode()===spectator)return;}catch{return;}
  if(!fights.has(e.id)){
   prune(t);
   if(fights.size>=MAX_ENCOUNTERS)return;
   fights.set(e.id,new Map());
  }
  const entries=fights.get(e.id);
  if(!entries.has(p.id)&&entries.size>=MAX_PLAYERS)return;
  entries.set(p.id,{player:p,tick:t});
 }
 function participants(e,source,t){
  if(!tracked(e)||!e?.id||finished.has(e.id))return [];
  record(e,source,1,t); // covers lethal hits if the hurt event arrives after death
  const entries=fights.get(e.id);fights.delete(e.id);
  if(finished.size>=1024)finished.delete(finished.keys().next().value);
  finished.set(e.id,t);
  if(!entries)return [];
  const result=[];
  for(const {player:p,tick} of entries.values())try{
   if(t-tick>WINDOW||!p.isValid||p.getGameMode()===spectator||p.dimension.id!==e.dimension.id)continue;
   const a=p.location,b=e.location;
   if(Math.hypot(a.x-b.x,a.y-b.y,a.z-b.z)<=DISTANCE)result.push(p);
  }catch{}
  return result;
 }
 function active(site,dimension){
  const k=key(site,dimension),e=sites.get(k);
  if(!e)return false;
  try{if(e.isValid)return true;}catch{}
  sites.delete(k);return false;
 }
 function track(site,dimension,e){if(e?.isValid)sites.set(key(site,dimension),e);}
 function clear(e){for(const [k,boss] of sites)if(boss.id===e?.id)sites.delete(k);}
 return {record,participants,active,track,clear,prune};
}
