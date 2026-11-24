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
 const d=controller.dimension,out=loaded(d,{x:controller.x,y:controller.y+1,z:controller.z});
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
  targets.push({crop,old,info,product});
 }
 return {run:()=>{
  for(const {crop,old,info,product} of targets){
   if(!factoryTransaction({input:EMPTY,output,costs:[],product,report,
    commitExternal:()=>crop.setPermutation(old.withState(info.state,0)),rollbackExternal:()=>crop.setPermutation(old)}))return false;
  }
  return true;
 }};
}
