// Opt-in village harvest: only a registered barrel and its adjacent field.
// Residents do not carry items or pathfind here; one nearby worker enables
// the same ripe-crop/actual-barrel operation used by the fixed harvester.
const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y,a.z-b.z);
const coordinate=p=>p&&['x','y','z'].every(k=>Number.isSafeInteger(p[k])&&Math.abs(p[k])<30000000);
export function validVillageHarvest(t,at){
 return Boolean(coordinate(at)&&coordinate(t?.l)&&distance(t.l,at)<=(t.factoryVillage?50:28));
}
export function villageHarvestStep(t,at,{farmStep,factoryTransaction,ItemStack,cursors,workerRole,currentHarvest=()=>at,report=()=>{}}){
 if(!validVillageHarvest(t,at))return false;
 const d=t.d,pos={...at};
 try{
  if(!d.isChunkLoaded(pos))return false;
  const barrel=d.getBlock(pos);if(barrel?.typeId!=='minecraft:barrel')return false;
  const output=barrel.getComponent('minecraft:inventory')?.container;if(!output)return false;
  const eligible=e=>Boolean(e?.isValid&&e.dimension?.id===d.id&&
   ['minecraft:villager','minecraft:villager_v2'].includes(e.typeId)&&
   !e.getComponent('minecraft:is_baby')&&distance(e.location,pos)<=6&&workerRole(e));
  const worker=d.getEntities({families:['villager'],location:pos,maxDistance:6,closest:32}).find(eligible);
  if(!worker)return false;
  const valid=()=>{
   const current=currentHarvest();
   return validVillageHarvest(t,current)&&distance(current,pos)===0&&eligible(worker)&&
    d.isChunkLoaded(pos)&&d.getBlock(pos)?.typeId==='minecraft:barrel';
  };
  if(!valid())return false;
  return farmStep({block:{...pos,dimension:d},mode:'harvest',output,ItemStack,factoryTransaction,cursors,verifyContainer:valid,report});
 }catch(err){report('村の収穫',err);return false;}
}
