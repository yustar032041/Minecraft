// Compact cosmetic marks for warned scripted talents. No damage, hit test,
// extra scheduler, or projectile. The warning ring remains authoritative.
const COLORS=Object.freeze({
 leap:'impact',charge:'impact',thorns:'impact',leech:'impact',
 spore:'spore',web:'spore',frost:'frost',shock:'spark',
 time:'time',mark:'time',gust:'wind',burst:'wind',
 ward:'ward',armor:'ward',defend:'ward'
});
// The same web/area technique looks different in each realm. Poison, ice,
// electricity and time keep their talent-specific colors to avoid suggesting
// a different damaging effect. These palettes never influence damage.
const REALM_BURST=['wind','spore','sand','frost','spark','shadow','wind','time'];
const REALM_WEB=['shadow','spore','sand','frost','spark','shadow','wind','time'];
// One bounded instant visual along the already-validated drain line. It is not
// a projectile or a collision test, and particle failures do not govern damage.
export function drainLink(entity,target,realm){
 try{
  const a=entity.location,b=target.location;
  if(!a||!b||![a.x,a.y,a.z,b.x,b.y,b.z].every(Number.isFinite))return;
  const from={x:a.x,y:a.y+.55,z:a.z},to={x:b.x,y:b.y+.9,z:b.z};
  const dx=to.x-from.x,dy=to.y-from.y,dz=to.z-from.z,length=Math.hypot(dx,dy,dz);
  if(!Number.isFinite(length)||length>10)return;
  const count=Math.max(1,Math.min(10,Math.ceil(length)));
  const id=realm===7?'hakkai:mob_time':'hakkai:mob_shadow';
  for(let i=0;i<=count;i++)try{entity.dimension.spawnParticle(id,{x:from.x+dx*i/count,y:from.y+dy*i/count,z:from.z+dz*i/count});}catch{}
 }catch{}
}
function talentKind(profile){
 let kind=COLORS[profile?.talent];
 if(Number.isInteger(profile?.realm)&&profile.realm>=0&&profile.realm<8){
  if(profile.talent==='burst')kind=REALM_BURST[profile.realm];
  if(profile.talent==='web')kind=REALM_WEB[profile.realm];
 }
 return kind;
}
// Post-hit only: a single point at the victim's pre-damage position, using
// the same palette as the fixed-area effect. Failure cannot affect gameplay.
export function talentContact(d,position,profile){
 try{
  const kind=talentKind(profile);
  if(!kind||!position||![position.x,position.y,position.z].every(Number.isFinite))return;
  d.spawnParticle(`hakkai:mob_${kind}`,{x:position.x,y:position.y+.8,z:position.z});
 }catch{}
}
export function talentImpact(entity,profile,warning){
 const kind=talentKind(profile);
 if(!kind||!entity||!warning?.aim)return;
 try{
  // Defense is shown on the creature; all other techniques bloom inside the
  // already-warned area, not on a newly tracked target or a fake projectile.
  const center=(profile.talent==='ward'||profile.talent==='armor')?entity.location:warning.aim;
  if(!center||![center.x,center.y,center.z].every(Number.isFinite))return;
  const r=Math.max(0,Math.min(.45,Number(warning.radius)||0));
  for(const [x,z] of [[0,0],[r,0],[-r,0]]){
   try{entity.dimension.spawnParticle(`hakkai:mob_${kind}`,{x:center.x+x,y:center.y+.35,z:center.z+z});}catch{}
  }
 }catch{}
}
