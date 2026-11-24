import { isCombatTarget } from './combat_resonance.js';
// A short, instant wind-trace attack, not an entity projectile. It requires a
// fully loaded path and successful raycasts; never travels through a wall.
const RANGE={'剣':10,'斧':8,'槍':13};
const add=(a,v,n)=>({x:a.x+v.x*n,y:a.y+v.y*n,z:a.z+v.z*n});
const length=(v)=>Math.hypot(v.x,v.y,v.z);
export function prepareCombatRay(p,range,accept=isCombatTarget,from,aim){
 if(!Number.isFinite(range)||range<=0||!p?.isValid)return undefined;
 try{
  const d=p.dimension,origin=from??p.getHeadLocation(),raw=aim??p.getViewDirection(),n=length(raw);
  if(!Number.isFinite(n)||n<.01||![origin.x,origin.y,origin.z].every(Number.isFinite))return undefined;
  const direction={x:raw.x/n,y:raw.y/n,z:raw.z/n};
  for(let step=0;step<=range;step++)if(!d.isChunkLoaded(add(origin,direction,step)))return undefined;
  let limit=range;
  const wall=d.getBlockFromRay(origin,direction,{maxDistance:range});
  if(wall){
   const block=wall.block.location,f=wall.faceLocation;
   if(!block||!f||![block.x,block.y,block.z,f.x,f.y,f.z].every(Number.isFinite))return undefined;
   limit=Math.max(0,Math.min(range,length({x:block.x+f.x-origin.x,y:block.y+f.y-origin.y,z:block.z+f.z-origin.z})-.05));
  }
  const hits=d.getEntitiesFromRay(origin,direction,{maxDistance:range,ignoreBlockCollision:false});
  const first=hits.filter(h=>h.entity?.isValid&&h.entity.id!==p.id&&Number.isFinite(h.distance)&&h.distance>=0&&h.distance<=limit)
   .sort((a,b)=>a.distance-b.distance)[0];
  // A player or friendly creature absorbs the ray harmlessly, rather than
  // allowing damage to an enemy hidden behind them.
  const target=first&&accept(first.entity)?first.entity:undefined;
  return {origin,direction,distance:first?first.distance:limit,target,blocked:!!first||!!wall};
 }catch{return undefined;}
}
export function prepareWindRay(p,g){return prepareCombatRay(p,RANGE[g?.kind],e=>isCombatTarget(e,p));}
export function renderWindRay(p,beam){
 const count=Math.min(24,Math.ceil(beam.distance/.55));
 for(let i=0;i<=count;i++){
  const at=add(beam.origin,beam.direction,count?beam.distance*i/count:0);
  try{p.dimension.spawnParticle('hakkai:wind_trace',at);}catch{}
 }
 const tip=add(beam.origin,beam.direction,beam.distance);
 for(let i=0;i<6;i++){
  const a=i*Math.PI/3;
  try{p.dimension.spawnParticle('hakkai:wind_burst',{x:tip.x+Math.cos(a)*.35,y:tip.y+Math.sin(a)*.35,z:tip.z});}catch{}
 }
}
