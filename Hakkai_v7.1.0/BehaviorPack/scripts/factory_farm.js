import {seasonalPlants} from './data.js';
import {adjacentWaterTank,consumeTankWater} from './factory_fluids.js';
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
const EMPTY={size:0,getItem:()=>undefined,setItem:()=>{throw Error('read-only');}};
// Fixed bounded scan; cursor rotates to avoid a frequently ripe first plant
// starving the rest. Only actual crops on farmland are touched.
export function farmStep({block,mode,input,output,ItemStack,factoryTransaction,cursors,resolve,report=()=>{}}){
 if(!['harvest','fertilize','plant'].includes(mode))return false;
 const d=block.dimension,p={x:block.x,y:block.y,z:block.z},key=`${d.id}:${p.x},${p.y},${p.z}:${mode}`;
 try{
  let slot=-1,tank,seedCrop;
  if(mode==='harvest'&&!output)return false;
  if(mode==='fertilize'||mode==='plant'){
   if(!input)return false;for(let i=0;i<input.size;i++){
    const id=input.getItem(i)?.typeId;
    if(mode==='fertilize'?id==='minecraft:bone_meal':Boolean(SEEDS[id])){slot=i;seedCrop=SEEDS[id];break;}
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
    const old=crop.permutation,info=farmCrop(seedCrop),next=resolve(seedCrop).withState(info.state,0),before=input.getItem(slot),after=before.amount>1?before.clone():undefined;
    if(after)after.amount=before.amount-1;
    if(cursors.size>=8192)cursors.clear();cursors.set(key,(i+1)%cells.length);
    try{input.setItem(slot,after);crop.setPermutation(next);return true;}
    catch(err){let incomplete=false;for(const [label,restore] of [['作物',()=>crop.setPermutation(old)],['種',()=>input.setItem(slot,before)]])try{restore();}catch(e){incomplete=true;report('播種機の'+label+'復旧失敗',e);}
     report(incomplete?'播種失敗（復旧要確認）':'播種失敗（復旧を試行）',err);return false;}
   }
   const info=farmCrop(crop.typeId);if(!info)continue;
   const old=crop.permutation,age=old.getState(info.state);
   if(!Number.isInteger(age)||age<0||age>info.max||(mode==='harvest'?age!==info.max:age===info.max))continue;
   if(cursors.size>=8192)cursors.clear();cursors.set(key,(i+1)%cells.length);
   if(mode==='harvest'){
    return factoryTransaction({input:EMPTY,output,costs:[],product:new ItemStack(info.item,info.amount),report,
     commitExternal:()=>crop.setPermutation(old.withState(info.state,0)),rollbackExternal:()=>crop.setPermutation(old)});
   }
   const before=input.getItem(slot),after=before.amount>1?before.clone():undefined,waterBefore=tank.permutation;if(after)after.amount=before.amount-1;
   try{
    input.setItem(slot,after);
    consumeTankWater(tank,1);crop.setPermutation(old.withState(info.state,age+1));return true;
   }catch(err){
    let incomplete=false;
    for(const [label,restore] of [['作物',()=>crop.setPermutation(old)],['水',()=>tank.setPermutation(waterBefore)],['骨粉',()=>input.setItem(slot,before)]])try{restore();}catch(e){incomplete=true;report('農機の'+label+'復旧失敗',e);}
    report(incomplete?'農機の処理失敗（復旧要確認）':'農機の処理失敗（復旧を試行）',err);return false;
   }
  }
 }catch(err){report('農機の事前確認失敗',err);}
 return false;
}
