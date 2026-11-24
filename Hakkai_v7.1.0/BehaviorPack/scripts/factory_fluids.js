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
export function adjacentTank(d,p,minimum=1,kind=1){
 try{for(const v of DIRS){const b=loaded(d,at(p,v)),s=tankState(b);if(s&&s.n>=minimum&&(!kind||s.kind===kind))return b;}}catch{return undefined;}
}
export function adjacentWaterTank(d,p,minimum=1){return adjacentTank(d,p,minimum,1);}
// The back is the only input, the front the only output. Pipes connect in six
// directions, tanks are endpoints (not pipes). Water sources are not removed.
// A lava source is consumed as one whole bucket, never generated infinitely.
export function fluidPumpStep(block,report=()=>{},maxPipes=64){
 const d=block.dimension,p={x:block.x,y:block.y,z:block.z},v=PUMPS[block.typeId.slice(7)];if(!v)return false;
 try{
  const source=loaded(d,at(p,v,-1)),state=tankState(source);let kind,infinite=false,lavaSource=false,units=1;
  if(state){if(state.n<1)return false;kind=state.kind;}
  else{
   if(source.typeId!=='minecraft:water'&&source.typeId!=='minecraft:lava')return false;
   let full;try{full=source.permutation.getState('liquid_depth')===0;}catch{return false;}
   if(!full)return false;
   infinite=source.typeId==='minecraft:water';lavaSource=!infinite;kind=infinite?1:2;units=lavaSource?4:1;
  }
  const queue=[at(p,v)],seen=new Set(),tanks=[];let pipes=0;
  for(let i=0;i<queue.length;i++){
   const pos=queue[i],k=key(pos);if(seen.has(k))continue;seen.add(k);
   const b=loaded(d,pos),s=tankState(b);
   if(s){if(k!==key(at(p,v,-1))&&s.n+units<=8&&(s.kind===0||s.kind===kind))tanks.push({b,s});continue;}
   if(b.typeId!=='hakkai:fluid_pipe')continue;
   if(++pipes>maxPipes)return false;
   for(const delta of DIRS){const next=at(pos,delta);if(key(next)!==key(p)&&!seen.has(key(next)))queue.push(next);}
  }
  if(!tanks.length)return false;
  const target=tanks[0],oldSource=source.permutation,oldTarget=target.b.permutation;
  try{if(lavaSource)source.setType('minecraft:air');else if(!infinite)writeTank(source,kind,state.n-1);writeTank(target.b,kind,target.s.n+units);return true;}
  catch(e){try{target.b.setPermutation(oldTarget);}catch(r){report('液体搬送の出力復旧失敗',r);}if(!infinite)try{source.setPermutation(oldSource);}catch(r){report('液体搬送の入力復旧失敗',r);}report('液体搬送失敗（復旧を試行）',e);return false;}
 }catch(e){report('液体経路未読込または無効',e);return false;}
}
export function fluidRecipe(id,kind){
 if(id==='minecraft:bucket'&&(kind===1||kind===2))return {output:kind===1?'minecraft:water_bucket':'minecraft:lava_bucket',units:4};
 if(kind===2&&id==='minecraft:cobblestone')return {output:'minecraft:stone',units:1};
 if(kind!==1)return undefined;
 if(id==='minecraft:dirt')return {output:'minecraft:mud',units:1};
 const m=id.match(/^minecraft:(white|orange|magenta|light_blue|yellow|lime|pink|gray|light_gray|cyan|purple|blue|brown|green|red|black)_concrete_powder$/);
 if(m)return {output:`minecraft:${m[1]}_concrete`,units:1};
}
export function fluidBasinStep({dimension,p,input,output,ItemStack,factoryTransaction,report=()=>{}}){
 if(!input||!output)return false;
 try{for(let i=0;i<input.size;i++){
  const item=input.getItem(i);if(!item)continue;
  for(const v of DIRS){
   const tank=loaded(dimension,at(p,v)),s=tankState(tank);if(!s||!s.kind)continue;
   const recipe=fluidRecipe(item.typeId,s.kind);if(!recipe||s.n<recipe.units)continue;
   const old=tank.permutation;
   return factoryTransaction({input,output,costs:[{id:item.typeId,count:1}],product:new ItemStack(recipe.output,1),
    commitExternal:()=>writeTank(tank,s.kind,s.n-recipe.units),rollbackExternal:()=>tank.setPermutation(old),report});
  }
 }}catch(e){report('液体加工失敗',e);}
 return false;
}
// Loader: filled bucket -> empty bucket plus four tank units. Tank contents
// and both inventories are reverted if a write throws, on a best-effort basis.
export function fluidLoaderStep({dimension,p,input,output,ItemStack,factoryTransaction,report=()=>{}}){
 if(!input||!output)return false;
 try{for(let i=0;i<input.size;i++){
  const item=input.getItem(i),kind=item?.typeId==='minecraft:water_bucket'?1:item?.typeId==='minecraft:lava_bucket'?2:0;if(!kind)continue;
  for(const v of DIRS){const tank=loaded(dimension,at(p,v)),s=tankState(tank);if(!s||s.n>4||(s.kind!==0&&s.kind!==kind))continue;const old=tank.permutation;
   return factoryTransaction({input,output,costs:[{id:item.typeId,count:1}],product:new ItemStack('minecraft:bucket',1),commitExternal:()=>writeTank(tank,kind,s.n+4),rollbackExternal:()=>tank.setPermutation(old),report});
  }
 }}catch(e){report('液体注入失敗',e);}return false;
}
export function consumeTankWater(tank,n){const s=tankState(tank);if(!s||s.kind!==1||s.n<n)throw Error('not enough water');writeTank(tank,1,s.n-n);}
