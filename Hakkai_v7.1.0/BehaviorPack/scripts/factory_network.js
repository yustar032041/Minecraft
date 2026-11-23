import { recycleProduct } from './factory_lines.js';
// Small bounded mechanical graph, computed synchronously from loaded blocks.
// Gearboxes are fixed west->east two-port devices, not omnidirectional shafts.
const DIRS=[[1,0,0],[-1,0,0],[0,1,0],[0,-1,0],[0,0,1],[0,0,-1]];
const at=(p,d)=>({x:p.x+d[0],y:p.y+d[1],z:p.z+d[2]});
const key=p=>`${p.x},${p.y},${p.z}`;
function get(d,p){try{if(!d.isChunkLoaded(p))return undefined;return d.getBlock(p);}catch{return undefined;}}
export function hasAdjacentWater(d,p){return DIRS.some(v=>get(d,at(p,v))?.typeId==='minecraft:water');}
function generatorWorks(d,b){
 if(b.typeId==='hakkai:water_wheel')return hasAdjacentWater(d,b.location);
 if(b.typeId!=='hakkai:wind_rotor'||b.y<64)return false;
 try{return !d.getBlockFromRay({x:b.x+.5,y:b.y+1.01,z:b.z+.5},{x:0,y:1,z:0},{maxDistance:32});}catch{return false;}
}
const LOAD={mill:32,miner:64,kiln:32,crusher:32,washer:24,press:48,saw:24,compressor:32,sorter:16,mixer:48,assembler:40,filter_router:16};
const GEN={wind_rotor:128,water_wheel:192};
const CONDUCTORS=new Set(['shaft',...Object.keys(LOAD),...Object.keys(GEN)]);
const GEARS={gear_up:1,gear_down:-1};
const id=b=>b?.typeId?.startsWith('hakkai:')?b.typeId.slice(7):'';
// Return status and total capacity / reserved demand. All attached machines
// reserve capacity even if their barrels are empty. Inconsistent loops,
// unloaded boundaries and graph limits fail closed, never partially power.
export function kineticNetwork(d,origin,maxNodes=96){
 const first=get(d,origin);if(!first)return {status:'unloaded',rpm:0,capacity:0,demand:0};
 const start=id(first),initial=GEARS[start]!==undefined?'w':'';
 const queue=[{p:origin,port:initial,exp:0,sign:1}],seen=new Map(),blocks=new Map();
 let incomplete=false,conflict=false;
 function enqueue(p,port,exp,sign){
  const k=key(p)+':'+port,old=seen.get(k);
  if(old){if(old.exp!==exp||old.sign!==sign)conflict=true;return;}
  if(queue.length>=maxNodes){incomplete=true;return;}
  const n={p,port,exp,sign};seen.set(k,n);queue.push(n);
 }
 seen.set(key(origin)+':'+initial,queue[0]);
 for(let i=0;i<queue.length;i++){
  const n=queue[i],b=get(d,n.p);if(!b){incomplete=true;continue;}
  const name=id(b);blocks.set(key(n.p),{block:b,name,node:n});
  if(GEARS[name]!==undefined){
   const east=n.port==='w',ratio=GEARS[name]*(east?1:-1);
   enqueue(n.p,east?'e':'w',n.exp+ratio,-n.sign);
  }
  const directions=GEARS[name]!==undefined?[[n.port==='w'?-1:1,0,0]]:DIRS;
  for(const delta of directions){
   const p=at(n.p,delta),nb=get(d,p);if(!nb){incomplete=true;continue;}
   const other=id(nb);if(!CONDUCTORS.has(other)&&GEARS[other]===undefined)continue;
   // Gear side ports face only west/east; shafts attach to either end.
   let port='';if(GEARS[other]!==undefined){if(delta[1]||delta[2])continue;port=delta[0]===1?'w':'e';}
   enqueue(p,port,n.exp,n.sign);
  }
 }
 if(incomplete)return {status:'incomplete',rpm:0,capacity:0,demand:0};
 if(conflict)return {status:'conflict',rpm:0,capacity:0,demand:0};
 const generators=[...blocks.values()].filter(v=>GEN[v.name]&&generatorWorks(d,v.block));
 if(!generators.length)return {status:'no_source',rpm:0,capacity:0,demand:0};
 const g=generators[0].node,rootExp=-g.exp,rootSign=g.sign;
 if(generators.some(({node:n})=>n.exp+rootExp!==0||n.sign*rootSign!==1))return {status:'conflict',rpm:0,capacity:0,demand:0};
 const speed=n=>16*Math.pow(2,n.exp+rootExp)*n.sign*rootSign;
 if([...seen.values()].some(n=>Math.abs(speed(n))<4||Math.abs(speed(n))>128))return {status:'speed_limit',rpm:0,capacity:0,demand:0};
 const capacity=generators.reduce((n,v)=>n+GEN[v.name],0);
 const demand=[...blocks.values()].reduce((n,v)=>n+(LOAD[v.name]||0)*Math.abs(speed(v.node))/16,0);
 const rpm=speed(seen.get(key(origin)+':'+initial));
 return {status:demand>capacity?'overload':'running',rpm:demand>capacity?0:rpm,capacity,demand};
}
export function kineticPower(d,origin){return kineticNetwork(d,origin).status==='running';}
// Each operation is a fixed recipe. Products are vanilla and no inventory
// metadata is transformed unless the input is an ordinary named item type.
export function factoryRecipe(kind,id){
 if(kind==='crusher'&&recycleProduct(id))return [recycleProduct(id),1,2];
 if(kind==='crusher'&&/^hakkai:crystal_(?:[0-9]|1[0-9])$/.test(id))return [id.replace('crystal_','shard_'),1,2];
 const recipes={
  crusher:{'minecraft:cobblestone':['minecraft:gravel',1,1],'minecraft:gravel':['minecraft:sand',1,1],'minecraft:bone':['minecraft:bone_meal',1,3]},
  washer:{'minecraft:gravel':['minecraft:flint',1,1],'minecraft:sand':['minecraft:clay_ball',1,1]},
  press:{'minecraft:clay_ball':['minecraft:clay',4,1],'minecraft:sand':['minecraft:sandstone',4,1],'minecraft:iron_ingot':['minecraft:iron_nugget',1,9],'minecraft:gold_ingot':['minecraft:gold_nugget',1,9]},
  saw:{'minecraft:oak_log':['minecraft:oak_planks',1,4],'minecraft:spruce_log':['minecraft:spruce_planks',1,4],'minecraft:birch_log':['minecraft:birch_planks',1,4],'minecraft:jungle_log':['minecraft:jungle_planks',1,4],'minecraft:acacia_log':['minecraft:acacia_planks',1,4],'minecraft:dark_oak_log':['minecraft:dark_oak_planks',1,4],'minecraft:mangrove_log':['minecraft:mangrove_planks',1,4],'minecraft:cherry_log':['minecraft:cherry_planks',1,4]}
 };
 return recipes[kind]?.[id];
}
