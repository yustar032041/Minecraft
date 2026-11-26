// Persistent tank state: one unit is a quarter bucket, capacity eight units.
// Empty/water/lava are 0/1/2. All writes change the two states together.
const DIRS=[[1,0,0],[-1,0,0],[0,0,-1],[0,0,1],[0,1,0],[0,-1,0]];
const PUMPS={fluid_pump:[1,0,0],fluid_pump_west:[-1,0,0],fluid_pump_north:[0,0,-1],fluid_pump_south:[0,0,1],fluid_pump_up:[0,1,0],fluid_pump_down:[0,-1,0]};
const at=(p,v,n=1)=>({x:p.x+v[0]*n,y:p.y+v[1]*n,z:p.z+v[2]*n});
const key=p=>`${p.x},${p.y},${p.z}`;
function loaded(d,p){if(!d.isChunkLoaded(p))throw Error('unloaded fluid network');const b=d.getBlock(p);if(!b)throw Error('unavailable fluid block');return b;}
export function tankState(b){try{if(b?.typeId!=='hakkai:fluid_tank')return undefined;const n=b.permutation.getState('hakkai:level'),kind=b.permutation.getState('hakkai:fluid');if(!Number.isInteger(n)||n<0||n>8||!Number.isInteger(kind)||kind<0||kind>2||((n===0)!==(kind===0)))return undefined;return {n,kind};}catch{return undefined;}}
export function tankAmount(b){return tankState(b)?.n;}
function writeTank(b,kind,n){if(n===0)kind=0;b.setPermutation(b.permutation.withState('hakkai:level',n).withState('hakkai:fluid',kind));}
// Re-read a particular tank immediately before a write. Undo only a write
// actually attempted by this operation; never restore a stale preflight state
// over an independently changed block. This is best effort, not crash-atomic.
export function prepareTankChange(d,pos,expected,kind,n){
 if(!pos||![pos.x,pos.y,pos.z].every(Number.isInteger)||!expected||
    !Number.isInteger(n)||n<0||n>8||![1,2].includes(kind))throw Error('invalid tank operation');
 const location={x:pos.x,y:pos.y,z:pos.z},before={...expected},after={kind:n===0?0:kind,n};
 let attempted=false,old;
 const same=(a,b)=>a&&a.kind===b.kind&&a.n===b.n;
 function current(want){const b=loaded(d,location);if(!same(tankState(b),want))throw Error('tank changed or unavailable');return b;}
 return {
  validate:()=>{current(before);},
  apply:()=>{const b=current(before);old=b.permutation;attempted=true;writeTank(b,kind,n);},
  undo:()=>{
   if(!attempted)return;
   const b=loaded(d,location),state=tankState(b);
   if(!same(state,before)&&!same(state,after))throw Error('tank changed after write; not overwriting');
   b.setPermutation(old);
  }
 };
}
export function adjacentTank(d,p,minimum=1,kind=1){
 try{for(const v of DIRS){const b=loaded(d,at(p,v)),s=tankState(b);if(s&&s.n>=minimum&&(!kind||s.kind===kind))return b;}}catch{return undefined;}
}
export function adjacentWaterTank(d,p,minimum=1){return adjacentTank(d,p,minimum,1);}
// The back is the only input, the front the only output. Pipes connect in six
// directions, tanks are endpoints (not pipes). Water sources are not removed.
// A lava source is consumed as one whole bucket, never generated infinitely.
export function fluidPumpStep(block,report=()=>{},maxPipes=64){
 const d=block.dimension,p={x:block.x,y:block.y,z:block.z},id=block.typeId,v=PUMPS[id.slice(7)];if(!v)return false;
 try{
  const source=loaded(d,at(p,v,-1)),state=tankState(source);let kind,infinite=false,lavaSource=false,units=1;
  if(state){if(state.n<1)return false;kind=state.kind;}
  else{
   if(source.typeId!=='minecraft:water'&&source.typeId!=='minecraft:lava')return false;
   let full;try{full=source.permutation.getState('liquid_depth')===0;}catch{return false;}
   if(!full)return false;
   infinite=source.typeId==='minecraft:water';lavaSource=!infinite;kind=infinite?1:2;units=lavaSource?4:1;
  }
  const sourcePos=at(p,v,-1),queue=[{pos:at(p,v),path:[]}],seen=new Set(),tanks=[];let pipes=0;
  for(let i=0;i<queue.length;i++){
   const {pos,path}=queue[i],k=key(pos);if(seen.has(k))continue;seen.add(k);
   const b=loaded(d,pos),s=tankState(b);
   if(s){if(k!==key(sourcePos)&&s.n+units<=8&&(s.kind===0||s.kind===kind))tanks.push({pos,path,s});continue;}
   if(b.typeId!=='hakkai:fluid_pipe')continue;
   if(++pipes>maxPipes)return false;
   const nextPath=[...path,pos];
   for(const delta of DIRS){const next=at(pos,delta);if(key(next)!==key(p)&&!seen.has(key(next)))queue.push({pos:next,path:nextPath});}
  }
  if(!tanks.length)return false;
  const target=tanks[0],targetChange=prepareTankChange(d,target.pos,target.s,kind,target.s.n+units);
  const sourceChange=state?prepareTankChange(d,sourcePos,state,kind,state.n-1):undefined;
  let lavaAttempted=false,lavaBefore;
  const checkPath=()=>{
   if(loaded(d,p).typeId!==id)throw Error('pump changed');
   for(const pos of target.path)if(loaded(d,pos).typeId!=='hakkai:fluid_pipe')throw Error('fluid path changed');
  };
  const checkLiquid=()=>{
   const live=loaded(d,sourcePos),id=lavaSource?'minecraft:lava':'minecraft:water';
   if(live.typeId!==id||live.permutation.getState('liquid_depth')!==0)throw Error('liquid source changed');
   return live;
  };
  try{
   checkPath();targetChange.validate();
   if(sourceChange)sourceChange.apply();
   else if(lavaSource){const live=checkLiquid();lavaBefore=live.permutation;lavaAttempted=true;live.setType('minecraft:air');}
   else checkLiquid();
   // Native writes may trigger changes to the path or destination.
   checkPath();if(infinite)checkLiquid();targetChange.apply();return true;
  }catch(e){
   let incomplete=false;
   try{targetChange.undo();}catch(r){incomplete=true;report('液体搬送の出力復旧失敗',r);}
   try{
    if(sourceChange)sourceChange.undo();
    else if(lavaAttempted){const live=loaded(d,sourcePos);
     if(live.typeId!=='minecraft:air'&&!(live.typeId==='minecraft:lava'&&live.permutation.getState('liquid_depth')===0))throw Error('lava source changed after write; not overwriting');
     live.setPermutation(lavaBefore);
    }
   }catch(r){incomplete=true;report('液体搬送の入力復旧失敗',r);}
   report(incomplete?'液体搬送失敗（復旧要確認）':'液体搬送失敗（復旧を試行）',e);return false;
  }
 }catch(e){report('液体経路未読込または無効',e);return false;}
}
// The processing menu and the machines share these exact recipe definitions.
const CONCRETE_COLORS=['white','orange','magenta','light_blue','yellow','lime','pink','gray','light_gray','cyan','purple','blue','brown','green','red','black'];
export const FLUID_BASIN_RECIPES=Object.freeze([
 {input:'minecraft:bucket',kind:1,output:'minecraft:water_bucket',units:4},
 {input:'minecraft:bucket',kind:2,output:'minecraft:lava_bucket',units:4},
 {input:'minecraft:cobblestone',kind:2,output:'minecraft:stone',units:1},
 {input:'minecraft:dirt',kind:1,output:'minecraft:mud',units:1},
 ...CONCRETE_COLORS.map(color=>({input:`minecraft:${color}_concrete_powder`,kind:1,output:`minecraft:${color}_concrete`,units:1}))
].map(Object.freeze));
export const FLUID_LOADER_RECIPES=Object.freeze([
 {input:'minecraft:water_bucket',output:'minecraft:bucket',kind:1,units:4},
 {input:'minecraft:lava_bucket',output:'minecraft:bucket',kind:2,units:4}
].map(Object.freeze));
export const FLUID_OBSIDIAN_RECIPE=Object.freeze({output:'minecraft:obsidian',lava:4,water:1});
export function fluidRecipe(id,kind){
 const recipe=FLUID_BASIN_RECIPES.find(r=>r.input===id&&r.kind===kind);
 return recipe?{output:recipe.output,units:recipe.units}:undefined;
}
export function fluidLoaderRecipe(id){return FLUID_LOADER_RECIPES.find(r=>r.input===id);}

export function fluidBasinStep({dimension,p,input,output,ItemStack,factoryTransaction,verify=()=>true,report=()=>{}}){
 if(!input||!output)return false;
 try{for(let i=0;i<input.size;i++){
  const item=input.getItem(i);if(!item)continue;
  for(const v of DIRS){
   const tank=loaded(dimension,at(p,v)),s=tankState(tank);if(!s||!s.kind)continue;
   const recipe=fluidRecipe(item.typeId,s.kind);if(!recipe||s.n<recipe.units)continue;
   const change=prepareTankChange(dimension,at(p,v),s,s.kind,s.n-recipe.units);
   return factoryTransaction({input,output,costs:[{id:item.typeId,count:1}],product:new ItemStack(recipe.output,1),
    commitExternal:()=>{if(!verify())throw Error('fluid machine or barrel changed');change.apply();},rollbackExternal:change.undo,report});
  }
 }
 // With no usable item recipe, combine four lava units and one water unit
 // into obsidian. Both tank states participate in the same best-effort undo.
 const {output:obsidian,lava:lavaUnits,water:waterUnits}=FLUID_OBSIDIAN_RECIPE;
 const lava=adjacentTank(dimension,p,lavaUnits,2),water=adjacentTank(dimension,p,waterUnits,1);
 if(lava&&water){const l=tankState(lava),w=tankState(water);
  const lc=prepareTankChange(dimension,lava.location,l,2,l.n-lavaUnits),wc=prepareTankChange(dimension,water.location,w,1,w.n-waterUnits);
  return factoryTransaction({input,output,costs:[],product:new ItemStack(obsidian,1),
   commitExternal:()=>{if(!verify())throw Error('fluid machine or barrel changed');lc.validate();wc.validate();lc.apply();wc.apply();},
   rollbackExternal:()=>{let error;try{wc.undo();}catch(e){error=e;}try{lc.undo();}catch(e){error=error??e;}if(error)throw error;},report});
 }
 }catch(e){report('液体加工失敗',e);}
 return false;
}
// Loader: filled bucket -> empty bucket plus four tank units. Tank contents
// and both inventories are reverted if a write throws, on a best-effort basis.
export function fluidLoaderStep({dimension,p,input,output,ItemStack,factoryTransaction,verify=()=>true,report=()=>{}}){
 if(!input||!output)return false;
 try{for(let i=0;i<input.size;i++){
  const item=input.getItem(i),recipe=fluidLoaderRecipe(item?.typeId);if(!recipe)continue;
  const {kind,units}=recipe;
  for(const v of DIRS){const pos=at(p,v),tank=loaded(dimension,pos),s=tankState(tank);if(!s||s.n+units>8||(s.kind!==0&&s.kind!==kind))continue;
   const change=prepareTankChange(dimension,pos,s,kind,s.n+units);
   return factoryTransaction({input,output,costs:[{id:item.typeId,count:1}],product:new ItemStack(recipe.output,1),commitExternal:()=>{if(!verify())throw Error('fluid machine or barrel changed');change.apply();},rollbackExternal:change.undo,report});
  }
 }}catch(e){report('液体注入失敗',e);}return false;
}
export function consumeTankWater(tank,n){const s=tankState(tank);if(!s||s.kind!==1||s.n<n)throw Error('not enough water');writeTank(tank,1,s.n-n);}
