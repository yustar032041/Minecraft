import assert from 'node:assert/strict';
import {kineticPower,hasAdjacentWater,animateKinetic,factoryRecipe} from '../Hakkai_v7.1.0/BehaviorPack/scripts/factory_network.js';
const key=p=>`${p.x},${p.y},${p.z}`;const origin={x:0,y:80,z:0};
function fixture(){
 const blocks=new Map();const d={isChunkLoaded:p=>!d.unloaded?.has(key(p)),getBlock:p=>blocks.get(key(p))??{typeId:'minecraft:air'},getBlockFromRay:()=>d.roof?{}:undefined};
 const put=(x,y,z,id)=>{const location={x,y,z},b={typeId:id,location,x,y,z,dimension:d};blocks.set(key(location),b);return b;};return {d,put};
}
{
 const {d,put}=fixture();for(let x=1;x<=32;x++)put(x,80,0,'hakkai:shaft');
 put(33,80,0,'hakkai:wind_rotor');assert.ok(kineticPower(d,origin));
 d.roof=true;assert.equal(kineticPower(d,origin),false);d.roof=false;
 d.unloaded=new Set(['16,80,0']);assert.equal(kineticPower(d,origin),false);d.unloaded.clear();
 put(33,80,0,'hakkai:shaft');put(34,80,0,'hakkai:wind_rotor');assert.equal(kineticPower(d,origin),false);
}
{
 const {d,put}=fixture();const gen=put(1,80,0,'hakkai:water_wheel');
 assert.equal(kineticPower(d,origin),false);put(1,80,1,'minecraft:water');assert.ok(hasAdjacentWater(d,gen.location));assert.ok(kineticPower(d,origin));
 let frame=0;gen.permutation={getState:()=>frame,withState:(_,n)=>n};gen.setPermutation=n=>frame=n;
 animateKinetic(gen);assert.equal(frame,1);put(1,80,1,'minecraft:air');animateKinetic(gen);assert.equal(frame,1);
}
{
 const {d,put}=fixture();put(0,62,0,'hakkai:wind_rotor');assert.equal(kineticPower(d,{x:0,y:63,z:0}),false);
}
assert.deepEqual(factoryRecipe('crusher','minecraft:bone'),['minecraft:bone_meal',1,3]);
assert.deepEqual(factoryRecipe('press','minecraft:clay_ball'),['minecraft:clay',4,1]);
assert.deepEqual(factoryRecipe('saw','minecraft:cherry_log'),['minecraft:cherry_planks',1,4]);
assert.equal(factoryRecipe('washer','minecraft:stone'),undefined);
console.log('Kinetic networks, bounded shafts, unloaded/covered/low generators, water and recipes OK (simulated)');
