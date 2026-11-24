// A client-animated, non-colliding entity is a visual overlay only. Machines
// and inventory remain real blocks. Reconcile duplicate / stale overlays.
const KINDS={'hakkai:shaft':0,'hakkai:wind_rotor':1,'hakkai:water_wheel':2,'hakkai:gear_up':3,'hakkai:gear_down':3,'hakkai:gear_up_z':3,'hakkai:gear_down_z':3,'hakkai:gear_up_y':3,'hakkai:gear_down_y':3,'hakkai:clutch':3,'hakkai:crusher':4,'hakkai:saw':4,'hakkai:press':5,'hakkai:washer':6,'hakkai:mixer':7,'hakkai:assembler':8,'hakkai:fluid_basin':7};
const TYPE='hakkai:kinetic_visual';
export function syncKineticVisual(block,network){
 const kind=KINDS[block.typeId];if(kind===undefined)return;
 const d=block.dimension,l={x:block.x+.5,y:block.y+.01,z:block.z+.5};
 try{
  const matches=d.getEntities({type:TYPE,location:l,maxDistance:.35}).filter(e=>Math.floor(e.location.x)===block.x&&Math.floor(e.location.y)===block.y&&Math.floor(e.location.z)===block.z);
  let visual=matches.shift();for(const extra of matches)extra.remove();
  if(!visual){visual=d.spawnEntity(TYPE,l,{initialPersistence:true});visual.setRotation({x:0,y:0});}
  const rpm=network.status==='running'?Math.round(network.rpm):0;
  if(visual.getProperty('hakkai:rpm')!==rpm)visual.setProperty('hakkai:rpm',rpm);
  if(visual.getProperty('hakkai:kind')!==kind)visual.setProperty('hakkai:kind',kind);
 }catch{}
}
export function cleanKineticVisuals(d){
 let visuals;try{visuals=d.getEntities({type:TYPE});}catch{return;}
 for(const e of visuals)try{
  const p={x:Math.floor(e.location.x),y:Math.floor(e.location.y),z:Math.floor(e.location.z)};
  if(!d.isChunkLoaded(p))continue;
  const b=d.getBlock(p);if(b&&KINDS[b.typeId]===undefined)e.remove();
 }catch{}
}
