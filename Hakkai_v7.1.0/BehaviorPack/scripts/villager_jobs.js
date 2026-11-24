// An additive role: the entity stays a vanilla villager, including its trades.
export const JOBS={guide:'案内人',healer:'手当て係',artisan:'物資係',guard:'守り手',builder:'建築係'};
const ROLE='hakkai:work_role_v1',CLAIM='hakkai:work_claim_v1_';
export const jobBlock=role=>`hakkai:workstation_${role}`;
const villagers=new Set(['minecraft:villager','minecraft:villager_v2']);
const key=(dimension,at)=>`${CLAIM}${dimension.id}_${at.x}_${at.y}_${at.z}`;
function parse(e){try{const j=JSON.parse(String(e.getDynamicProperty(ROLE)??''));return JOBS[j.role]&&typeof j.dim==='string'&&['x','y','z'].every(k=>Number.isInteger(j[k]))?j:undefined;}catch{return undefined;}}
export function villagerJob(e,world){
 try{
  if(!e?.isValid||!villagers.has(e.typeId))return;
  const j=parse(e);if(!j||j.dim!==e.dimension.id)return;
  const at={x:j.x,y:j.y,z:j.z},d=e.dimension;
  // A workplace in an unloaded chunk cannot be inspected. Keep the role until
  // its block can be checked, instead of destroying persistent job data.
  if(!d.isChunkLoaded(at))return j.role;
  if(d.getBlock(at)?.typeId!==jobBlock(j.role)||world.getDynamicProperty(key(d,at))!==e.id)return;
  return j.role;
 }catch{return;}
}
export function workstationTick(block,world,homeForBlock=()=>undefined){
 try{
  const role=Object.keys(JOBS).find(r=>jobBlock(r)===block.typeId);if(!role)return false;
  const d=block.dimension,at=block.location,k=key(d,at);
  if(world.getDynamicProperty(k)!==undefined)return false;
  const candidates=d.getEntities({families:['villager'],location:at,maxDistance:6,closest:16});
  const e=candidates.find(e=>e.isValid&&villagers.has(e.typeId)&&!e.getComponent('minecraft:is_baby')&&!String(e.nameTag??'').startsWith('§d風記の案内人§r｜')&&!villagerJob(e,world));
  if(!e)return false;
  const j={role,dim:d.id,x:at.x,y:at.y,z:at.z};
  // Reserve first; a failure rolls back. Never remove, respawn or rename a villager.
  world.setDynamicProperty(k,e.id);
  try{
   // A previous, unclaimed builder project must not attach to a new village.
   e.setDynamicProperty('hakkai:builder_project_v1',undefined);
   e.setDynamicProperty('hakkai:builder_home_v1',role==='builder'?homeForBlock(block):undefined);
   e.setDynamicProperty('hakkai:builder_paused_v1',undefined);
   e.setDynamicProperty(ROLE,JSON.stringify(j));
  }catch(err){world.setDynamicProperty(k,undefined);throw err;}
  return true;
 }catch{return false;}
}
// Used on deliberate break/reset or death. If the villager is unloaded, its
// stale role is ignored as soon as its workplace is next checked.
export function releaseWorkstation(d,at,world,onRelease=()=>{}){
 try{
  const k=key(d,at),id=world.getDynamicProperty(k);if(typeof id!=='string')return false;
  const e=world.getEntity(id);world.setDynamicProperty(k,undefined);
  if(e?.isValid){onRelease(e,world);const j=parse(e);if(j&&j.dim===d.id&&j.x===at.x&&j.y===at.y&&j.z===at.z)e.setDynamicProperty(ROLE,undefined);}
  return true;
 }catch{return false;}
}
export function releaseDeadWorker(e,world){
 try{const j=parse(e);if(!j)return;const k=key(e.dimension,j);if(world.getDynamicProperty(k)===e.id)world.setDynamicProperty(k,undefined);}catch{}
}
