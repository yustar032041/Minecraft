import {seasonalPlants} from './data.js';
import {adjacentWaterTank,consumeTankWater,tankState} from './factory_fluids.js';
const CROPS={
 'minecraft:wheat':{state:'growth',max:7,item:'minecraft:wheat',amount:1},
 'minecraft:carrots':{state:'growth',max:7,item:'minecraft:carrot',amount:2},
 'minecraft:potatoes':{state:'growth',max:7,item:'minecraft:potato',amount:2},
 'minecraft:beetroot':{state:'growth',max:7,item:'minecraft:beetroot',amount:1}
};
for(const p of seasonalPlants)CROPS['hakkai:'+p.id]={state:'hakkai:age',max:3,item:'hakkai:'+p.id+'_produce',amount:2};
const SEEDS={'minecraft:wheat_seeds':'minecraft:wheat','minecraft:carrot':'minecraft:carrots','minecraft:potato':'minecraft:potatoes','minecraft:beetroot_seeds':'minecraft:beetroot'};
for(const p of seasonalPlants)SEEDS['hakkai:'+p.id+'_seed']='hakkai:'+p.id;
export const farmCrop=id=>CROPS[id];
export const farmSeed=id=>SEEDS[id];
// Copies of the live fixed-farm definitions, for the in-game action guide.
export function farmGuideCrops(){return Object.entries(SEEDS).map(([seed,crop])=>({seed,crop,...CROPS[crop]}));}
const EMPTY={size:0,getItem:()=>undefined,setItem:()=>{throw Error('read-only');}};
// Inventory and block writes may fail after mutation, or cause native updates.
// Re-read the live target before overwriting it and never restore over a
// changed block unless this operation actually attempted that block write.
function currentCrop(d,q,floor,id,state,age){
 if(!d.isChunkLoaded(q)||!d.isChunkLoaded(floor))throw Error('farm target unloaded');
 const crop=d.getBlock(q),soil=d.getBlock(floor);
 if(!crop||crop.typeId!==id||soil?.typeId!=='minecraft:farmland')throw Error('farm target changed');
 const old=crop.permutation;
 if(state&&old.getState(state)!==age)throw Error('crop age changed');
 return {crop,old};
}
function currentTank(d,tank,expected){
 const p=tank.location;if(!p||!d.isChunkLoaded(p))throw Error('tank unloaded');
 const live=d.getBlock(p),state=tankState(live);
 if(!state||state.kind!==expected.kind||state.n!==expected.n)throw Error('tank changed');
 return live;
}
// Fixed bounded scan; cursor rotates to avoid a frequently ripe first plant
// starving the rest. Only actual crops on farmland are touched.
export function farmStep({block,mode,input,output,ItemStack,factoryTransaction,cursors,resolve,verifyContainer=()=>true,report=()=>{}}){
 if(!['harvest','fertilize','plant'].includes(mode))return false;
 const d=block.dimension,p={x:block.x,y:block.y,z:block.z},key=`${d.id}:${p.x},${p.y},${p.z}:${mode}`;
 try{
  let slot=-1,tank,seedCrop,selectedId;
  if(mode==='harvest'&&!output)return false;
  if(mode==='fertilize'||mode==='plant'){
   if(!input)return false;for(let i=0;i<input.size;i++){
    const id=input.getItem(i)?.typeId;
    if(mode==='fertilize'?id==='minecraft:bone_meal':Boolean(SEEDS[id])){slot=i;seedCrop=SEEDS[id];selectedId=id;break;}
   }
   if(slot<0)return false;
   if(mode==='fertilize'){tank=adjacentWaterTank(d,p,1);if(!tank)return false;}
  }
  const cells=[];for(let dz=-2;dz<=2;dz++)for(let dx=-2;dx<=2;dx++)if(dx||dz)cells.push({x:p.x+dx,y:p.y,z:p.z+dz});
  const start=(cursors.get(key)??0)%cells.length;
  for(let j=0;j<cells.length;j++){
   const i=(start+j)%cells.length,q=cells[i],floor={x:q.x,y:q.y-1,z:q.z};
   if(!d.isChunkLoaded(q)||!d.isChunkLoaded(floor))continue;
   const crop=d.getBlock(q);if(!crop||d.getBlock(floor)?.typeId!=='minecraft:farmland')continue;
   if(mode==='plant'){
    if(crop.typeId!=='minecraft:air')continue;
    const before=input.getItem(slot);if(!before||before.typeId!==selectedId||!Number.isInteger(before.amount)||before.amount<1)return false;
    const info=farmCrop(seedCrop),next=resolve(seedCrop).withState(info.state,0),after=before.amount>1?before.clone():undefined;
    if(after)after.amount=before.amount-1;
    if(cursors.size>=8192)cursors.clear();cursors.set(key,(i+1)%cells.length);
    let attempted=false,liveCrop,liveOld;
    try{
     input.setItem(slot,after);
     if(!verifyContainer())throw Error('farm barrel changed');
     ({crop:liveCrop,old:liveOld}=currentCrop(d,q,floor,'minecraft:air'));
     attempted=true;liveCrop.setPermutation(next);return true;
    }catch(err){let incomplete=false;
     const restore=[];if(attempted)restore.push(['作物',()=>liveCrop.setPermutation(liveOld)]);restore.push(['種',()=>input.setItem(slot,before)]);
     for(const [label,undo] of restore)try{undo();}catch(e){incomplete=true;report('播種機の'+label+'復旧失敗',e);}
     report(incomplete?'播種失敗（復旧要確認）':'播種失敗（復旧を試行）',err);return false;}
   }
   const cropId=crop.typeId,info=farmCrop(cropId);if(!info)continue;
   const old=crop.permutation,age=old.getState(info.state);
   if(!Number.isInteger(age)||age<0||age>info.max||(mode==='harvest'?age!==info.max:age===info.max))continue;
   if(cursors.size>=8192)cursors.clear();cursors.set(key,(i+1)%cells.length);
   if(mode==='harvest'){
    let attempted=false,liveCrop,liveOld;
    return factoryTransaction({input:EMPTY,output,costs:[],product:new ItemStack(info.item,info.amount),report,
     commitExternal:()=>{
      if(!verifyContainer())throw Error('farm barrel changed');
      ({crop:liveCrop,old:liveOld}=currentCrop(d,q,floor,cropId,info.state,info.max));
      attempted=true;liveCrop.setPermutation(liveOld.withState(info.state,0));
     },rollbackExternal:()=>{if(attempted)liveCrop.setPermutation(liveOld);}});
   }
   const before=input.getItem(slot);if(!before||before.typeId!==selectedId||!Number.isInteger(before.amount)||before.amount<1)return false;
   const after=before.amount>1?before.clone():undefined,waterState=tankState(tank);if(after)after.amount=before.amount-1;
   let waterAttempted=false,cropAttempted=false,liveTank,waterBefore,liveCrop,liveOld;
   try{
    input.setItem(slot,after);
    if(!verifyContainer())throw Error('farm barrel changed');
    ({crop:liveCrop,old:liveOld}=currentCrop(d,q,floor,cropId,info.state,age));
    liveTank=currentTank(d,tank,waterState);waterBefore=liveTank.permutation;
    waterAttempted=true;consumeTankWater(liveTank,1);
    if(!verifyContainer())throw Error('farm barrel changed');
    ({crop:liveCrop,old:liveOld}=currentCrop(d,q,floor,cropId,info.state,age));
    cropAttempted=true;liveCrop.setPermutation(liveOld.withState(info.state,age+1));return true;
   }catch(err){
    let incomplete=false;const restores=[];
    if(cropAttempted)restores.push(['作物',()=>liveCrop.setPermutation(liveOld)]);
    if(waterAttempted)restores.push(['水',()=>liveTank.setPermutation(waterBefore)]);
    restores.push(['骨粉',()=>input.setItem(slot,before)]);
    for(const [label,restore] of restores)try{restore();}catch(e){incomplete=true;report('農機の'+label+'復旧失敗',e);}
    report(incomplete?'農機の処理失敗（復旧要確認）':'農機の処理失敗（復旧を試行）',err);return false;
   }
  }
 }catch(err){report('農機の事前確認失敗',err);}
 return false;
}
