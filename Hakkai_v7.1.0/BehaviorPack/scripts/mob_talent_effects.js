// Compact cosmetic marks for scripted talents. Damage and movement are
// controlled by their respective attack systems, never these helpers.
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
// Initial, source-centred flash. These static particles last only 0.6s: they
// do not track a moving mob and are NOT the attack boundary or a projectile.
// This flash is not a hitbox; each attack checks its own geometry.
// Failures are cosmetic and cannot accidentally suppress/authorize damage.
export function talentTell(entity,profile,aim,style='forward'){
 try{
  const kind=talentKind(profile),a=entity?.location,d=entity?.dimension;
  if(!kind||!a||![a.x,a.y,a.z,aim?.x,aim?.y,aim?.z].every(Number.isFinite))return;
  let dx=aim.x-a.x,dz=aim.z-a.z,len=Math.hypot(dx,dz);
  if(len<.001){dx=0;dz=1;len=1;}
  const fx=dx/len,fz=dz/len,rx=-fz,rz=fx;
  // Chest and shoulders, then a short directional chevron; a radial cast
  // uses four side points rather than falsely suggesting a directed hit.
  const points=[[0,.9,0],[-.45,1.15,0],[.45,1.15,0],[0,1.55,0]];
  if(style==='radial')points.push([-.8,.85,0],[.8,.85,0],[0,.85,-.8],[0,.85,.8]);
  else points.push([0,1,.55],[-.3,1,.85],[.3,1,.85],[0,1,1.2]);
  for(const [side,y,forward] of points)try{
   d.spawnParticle(`hakkai:tell_${kind}`,{x:a.x+rx*side+fx*forward,y:a.y+y,z:a.z+rz*side+fz*forward});
  }catch{}
 }catch{}
}
// A brief attack effect, not an advance warning: the source-centred pulse
// appears at impact height and radius, matching the guardian's hit cylinder.
export function guardianPulse(entity,realm,origin,radius){
 try{
  const kind=talentKind({talent:'burst',realm});
  if(!kind||!origin||![origin.x,origin.y,origin.z,radius].every(Number.isFinite)||radius<=0||radius>8)return;
  const d=entity.dimension,count=Math.max(16,Math.min(24,Math.ceil(radius*4)));
  for(let i=0;i<count;i++){
   const a=2*Math.PI*i/count;
   try{d.spawnParticle(`hakkai:mob_${kind}`,{x:origin.x+radius*Math.cos(a),y:origin.y+.8,z:origin.z+radius*Math.sin(a)});}catch{}
  }
 }catch{}
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
  // Defense is shown on the creature; other effects use the supplied
  // impact position. This helper does not itself determine hit geometry.
  const center=(profile.talent==='ward'||profile.talent==='armor')?entity.location:warning.aim;
  if(!center||![center.x,center.y,center.z].every(Number.isFinite))return;
  const r=Math.max(0,Math.min(.45,Number(warning.radius)||0));
  for(const [x,z] of [[0,0],[r,0],[-r,0]]){
   try{entity.dimension.spawnParticle(`hakkai:mob_${kind}`,{x:center.x+x,y:center.y+.35,z:center.z+z});}catch{}
  }
 }catch{}
}
