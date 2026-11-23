// Bounded, loaded-chunk-only kinetic network. Shafts transmit in all six
// directions; generators must touch a shaft or machine. No persistent energy,
// no force-loading, and no block mutations while checking a network.
const DIRS=[[1,0,0],[-1,0,0],[0,1,0],[0,-1,0],[0,0,1],[0,0,-1]];
const at=(p,d)=>({x:p.x+d[0],y:p.y+d[1],z:p.z+d[2]});
function get(d,p){try{if(!d.isChunkLoaded(p))return undefined;return d.getBlock(p);}catch{return undefined;}}
export function hasAdjacentWater(d,p){return DIRS.some(v=>get(d,at(p,v))?.typeId==='minecraft:water');}
function generatorWorks(d,b){
 if(b.typeId==='hakkai:water_wheel')return hasAdjacentWater(d,b.location);
 if(b.typeId!=='hakkai:wind_rotor'||b.y<64)return false;
 try{return !d.getBlockFromRay({x:b.x+.5,y:b.y+1.01,z:b.z+.5},{x:0,y:1,z:0},{maxDistance:32});}catch{return false;}
}
export function kineticPower(d,origin,maxShafts=32){
 const seen=new Set([`${origin.x},${origin.y},${origin.z}`]),queue=[origin];let shafts=0;
 for(let i=0;i<queue.length;i++)for(const delta of DIRS){
  const p=at(queue[i],delta),key=`${p.x},${p.y},${p.z}`;if(seen.has(key))continue;seen.add(key);
  const b=get(d,p);if(!b)continue;
  if(generatorWorks(d,b))return true;
  if(b.typeId==='hakkai:shaft'&&shafts<maxShafts){shafts++;queue.push(p);}
 }
 return false;
}
// Each operation is a fixed recipe. Products are vanilla and no inventory
// metadata is transformed unless the input is an ordinary named item type.
export function factoryRecipe(kind,id){
 const recipes={
  crusher:{'minecraft:cobblestone':['minecraft:gravel',1,1],'minecraft:gravel':['minecraft:sand',1,1],'minecraft:bone':['minecraft:bone_meal',1,3]},
  washer:{'minecraft:gravel':['minecraft:flint',1,1],'minecraft:sand':['minecraft:clay_ball',1,1]},
  press:{'minecraft:clay_ball':['minecraft:clay',4,1],'minecraft:sand':['minecraft:sandstone',4,1],'minecraft:iron_ingot':['minecraft:iron_nugget',1,9],'minecraft:gold_ingot':['minecraft:gold_nugget',1,9]},
  saw:{'minecraft:oak_log':['minecraft:oak_planks',1,4],'minecraft:spruce_log':['minecraft:spruce_planks',1,4],'minecraft:birch_log':['minecraft:birch_planks',1,4],'minecraft:jungle_log':['minecraft:jungle_planks',1,4],'minecraft:acacia_log':['minecraft:acacia_planks',1,4],'minecraft:dark_oak_log':['minecraft:dark_oak_planks',1,4],'minecraft:mangrove_log':['minecraft:mangrove_planks',1,4],'minecraft:cherry_log':['minecraft:cherry_planks',1,4]}
 };
 return recipes[kind]?.[id];
}
export function animateKinetic(block){
 try{
  const current=block.permutation.getState('hakkai:spin');
  if(!Number.isInteger(current))return;
  const running=block.typeId==='hakkai:shaft'?kineticPower(block.dimension,block.location):generatorWorks(block.dimension,block);
  if(running)block.setPermutation(block.permutation.withState('hakkai:spin',(current+1)%4));
 }catch{}
}
