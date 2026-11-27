import {mobContent} from './mob_content.js';
import {creatureVisualAnimation} from './mob_visual_styles.js';
// Cosmetic only. Warning rings and damage remain controlled by combat systems.
// Visual failure must never cancel, add, or delay damage.
const PATROL_STRIKE='animation.hakkai.patrol_strike',PATROL_CAST='animation.hakkai.patrol_cast';
const PATROL_MELEE=new Set(['hakkai:village_watch','hakkai:village_mage']);
function animate(entity,id){try{entity.playAnimation(id,{blendOutTime:.12,stopExpression:'query.any_animation_finished'});}catch{}}
function defaultVisual(entity,phase){
 const m=/^hakkai:(guardian|ender)_([0-7])$/.exec(entity?.typeId??'');
 if(m)return `animation.hakkai.${m[1]}_${m[2]}_${phase}`;
 // Neutral rebuilt wildlife have individual rigs too; passive wildlife
 // remain non-attacking in the native-hit handler.
 if(/^hakkai:wild_[0-7]_[012]$/.test(entity?.typeId??''))return `animation.hakkai.${entity.typeId.slice(7)}_${phase}`;
 return creatureVisualAnimation(mobContent.get(entity?.typeId),phase);
}
export function creatureWindup(entity,animation){animate(entity,animation??defaultVisual(entity,'windup'));}
// Called only by the real village magic action; purely cosmetic.
export function patrolCast(entity){if(entity?.typeId==='hakkai:village_mage')animate(entity,PATROL_CAST);}
// Post-impact cosmetic only. Arrow physics, damage and shooter ownership remain
// engine-controlled. If the source or impact location is unavailable, skip.
export function patrolArrowImpact(event){
 try{
  const arrow=event?.projectile;
  if(event?.source?.typeId!=='hakkai:village_archer'||arrow?.typeId!=='minecraft:arrow')return false;
  let point;
  try{const l=event.getEntityHit?.()?.entity?.location;if(l&&[l.x,l.y,l.z].every(Number.isFinite))point={x:l.x,y:l.y+.6,z:l.z};}catch{}
  if(!point){const l=arrow.location;if(!l||![l.x,l.y,l.z].every(Number.isFinite))return false;point={x:l.x,y:l.y,z:l.z};}
  arrow.dimension.spawnParticle('hakkai:mob_impact',point);
  return true;
 }catch{return false;}
}
export function creatureStrike(entity,animation){
 animate(entity,animation??defaultVisual(entity,'strike'));
 try{
  const l=entity.location,d=entity.dimension;
  d.spawnParticle('hakkai:wind_burst',{x:l.x,y:l.y+1,z:l.z});
 }catch{}
}
// Only actual native contact events are animated. This is not a pre-hit
// telegraph, and no passive mob is given an attack by this visual handler.
export function setupNativeMobStrikes(mobContent){
 const next=new Map();
 function hit({damagingEntity,hitEntity},tick){
  if(!damagingEntity?.isValid||!hitEntity?.isValid||!Number.isFinite(tick))return false;
  const id=damagingEntity.typeId;
  const profile=mobContent.get(id);
  if((!profile||profile.temper==='passive')&&!/^hakkai:(?:king_)?guardian_[0-7]$/.test(id)&&id!=='hakkai:eclipse_colossus'&&!PATROL_MELEE.has(id))return false;
  const key=damagingEntity.id;if(!key||tick<(next.get(key)??0))return false;
  if(next.size>=512){for(const [k,v] of next)if(v<=tick)next.delete(k);if(next.size>=512)return false;}
  next.set(key,tick+8);
  if(PATROL_MELEE.has(id)){
   animate(damagingEntity,PATROL_STRIKE);
   try{const l=hitEntity.location;damagingEntity.dimension.spawnParticle('hakkai:mob_impact',{x:l.x,y:l.y+.6,z:l.z});}catch{}
  }else{
   // Contact is not a warned ability: use the actual contact location and a
   // neutral impact rather than implying an elemental/area talent. The king
   // has its own rebuilt rig and must not receive the generic old track.
   // Native contacts have no scripted windup. Keep their existing poses on
   // separate tracks while warned specials join windup and strike keyframes.
   const foe=/^hakkai:(foe_[0-7]_(?:[0-9]|1[01])|wild_[0-7]_[12])$/.exec(id);
   const guardian=/^hakkai:(?:king_)?(guardian_[0-7])$/.exec(id);
   const animation=id==='hakkai:eclipse_colossus'?'animation.hakkai.eclipse_cleave_contact':foe?`animation.hakkai.${foe[1]}_contact`:guardian?`animation.hakkai.${guardian[1]}_contact`:defaultVisual(damagingEntity,'strike');
   animate(damagingEntity,animation);
   try{const l=hitEntity.location;if(l&&[l.x,l.y,l.z].every(Number.isFinite))damagingEntity.dimension.spawnParticle('hakkai:mob_impact',{x:l.x,y:l.y+.6,z:l.z});}catch{}
  }
  return true;
 }
 return {hit,clear:id=>next.delete(id)};
}
