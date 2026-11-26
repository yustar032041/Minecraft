import {farmCrop} from './factory_farm.js';
import {at,loaded} from './factory_motion.js';
const HEAD='hakkai:gantry_harvester';
const EMPTY={size:0,getItem:()=>undefined,setItem:()=>{throw Error('read-only');}};
// The head is a purely inert part. Crops are one block below its destination;
// outputs go to the stationary controller's top barrel, never a moved chest.
export function planMobileHarvest(controller,parts,axis,step,{ItemStack,factoryTransaction,report=()=>{}}){
 const heads=parts.filter(p=>p.id===HEAD);if(!heads.length)return {run:()=>true};
 if(axis[1]||heads.length>8)return {reason:'farm_layout'};
 if(!ItemStack||!factoryTransaction)return {reason:'farm_unavailable'};
 const d=controller.dimension,controllerPos={x:controller.x,y:controller.y,z:controller.z};
 const controllerId=controller.typeId,controllerState=controller.permutation;
 const expectedOffset=controllerState.getState('hakkai:offset')+step,expectedMode=controllerState.getState('hakkai:motion');
 const out=loaded(d,{x:controller.x,y:controller.y+1,z:controller.z});
 if(out.typeId!=='minecraft:barrel')return {reason:'farm_output'};
 const output=out.getComponent('minecraft:inventory')?.container;if(!output)return {reason:'farm_output'};
 const slots=Array.from({length:output.size},(_,i)=>output.getItem(i)?.clone());
 const virtual={size:slots.length,getItem:i=>slots[i]?.clone(),setItem:(i,v)=>{slots[i]=v?.clone();}};
 const targets=[];
 for(const head of heads){
  const dest=at(head.p,axis,step),pos=at(dest,[0,-1,0]),below=at(pos,[0,-1,0]);
  const crop=loaded(d,pos),soil=loaded(d,below),info=farmCrop(crop.typeId);
  if(!info||soil.typeId!=='minecraft:farmland')continue;
  const old=crop.permutation;if(old.getState(info.state)!==info.max)continue;
  const product=new ItemStack(info.item,info.amount);
  if(!factoryTransaction({input:EMPTY,output:virtual,costs:[],product,report}))return {reason:'farm_full'};
  targets.push({pos,below,headPos:dest,id:crop.typeId,info,product});
 }
 return {run:()=>{
  const readOutput=()=>{
   const barrel=loaded(d,{x:controller.x,y:controller.y+1,z:controller.z});
   return barrel.typeId==='minecraft:barrel'?barrel.getComponent('minecraft:inventory')?.container:undefined;
  };
  const verifyMachine=headPos=>{
   const live=loaded(d,controllerPos);
   if(live.typeId!==controllerId||live.permutation.getState('hakkai:offset')!==expectedOffset||live.permutation.getState('hakkai:motion')!==expectedMode)throw Error('gantry changed');
   if(headPos&&loaded(d,headPos).typeId!==HEAD)throw Error('harvest head changed');
  };
  try{verifyMachine();if(!readOutput())return false;}catch(err){report('移動後の装置・出力確認失敗',err);return false;}
  for(const {pos,below,headPos,id,info,product} of targets){
   // Moving blocks may trigger engine updates. Do not harvest a crop from
   // the old preflight snapshot if it changed, disappeared, or lost soil.
   // Re-read the live permutation and use it for both update and rollback.
   let crop,old,liveOutput;
   try{
    verifyMachine(headPos);crop=loaded(d,pos);const soil=loaded(d,below);
    if(crop.typeId!==id||soil.typeId!=='minecraft:farmland')return false;
    old=crop.permutation;if(old.getState(info.state)!==info.max)return false;
    // An earlier crop update can itself change the barrel. Fetch it again
    // for each head rather than writing to a detached container reference.
    liveOutput=readOutput();if(!liveOutput)return false;
   }catch(err){report('移動後の収穫対象確認失敗',err);return false;}
   let writeAttempted=false,rollbackCrop,rollbackPermutation;
   if(!factoryTransaction({input:EMPTY,output:liveOutput,costs:[],product,report,
    commitExternal:()=>{
     // The output write precedes the crop write. A native callback could have
     // changed either block in between; reject a stale harvest without
     // restoring over somebody else's change.
     verifyMachine(headPos);const current=loaded(d,pos),soil=loaded(d,below),barrel=readOutput();
     if(!barrel||current.typeId!==id||soil.typeId!=='minecraft:farmland')throw Error('harvest target changed');
     const latest=current.permutation;
     if(latest.getState(info.state)!==info.max)throw Error('crop is no longer mature');
     rollbackCrop=current;rollbackPermutation=latest;writeAttempted=true;
     current.setPermutation(latest.withState(info.state,0));
    },
    rollbackExternal:()=>{if(writeAttempted)rollbackCrop.setPermutation(rollbackPermutation);}}))return false;
  }
  return true;
 }};
}
