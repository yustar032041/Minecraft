import assert from 'node:assert/strict';
import {kineticNetwork,toggleClutch} from '../Hakkai_v7.1.0/BehaviorPack/scripts/factory_network.js';
const k=p=>`${p.x},${p.y},${p.z}`;
function fixture(){const map=new Map(),d={id:'minecraft:overworld',isChunkLoaded:p=>!d.unloaded?.has(k(p)),getBlock:p=>map.get(k(p))??{typeId:'minecraft:air'},getBlockFromRay:()=>undefined};
 const put=(x,y,z,name)=>{const p={x,y,z},b={...p,location:p,typeId:`hakkai:${name}`};map.set(k(p),b);};return {d,put};}
{
 const {d,put}=fixture();put(0,80,0,'wind_rotor');put(1,80,0,'shaft');put(2,80,0,'crusher');
 let n=kineticNetwork(d,{x:2,y:80,z:0});assert.equal(n.status,'running');assert.equal(n.rpm,16);assert.equal(n.capacity,128);assert.equal(n.demand,32);
 put(1,80,0,'gear_up');n=kineticNetwork(d,{x:2,y:80,z:0});assert.equal(n.status,'running');assert.equal(n.rpm,-32);assert.equal(n.demand,64);
 put(1,80,0,'gear_down');n=kineticNetwork(d,{x:2,y:80,z:0});assert.equal(n.status,'running');assert.equal(n.rpm,-8);assert.equal(n.demand,16);
 // A gear does not accept vertical or north/south input.
 put(0,80,0,'shaft');put(1,80,1,'wind_rotor');assert.equal(kineticNetwork(d,{x:2,y:80,z:0}).status,'no_source');
}
{
 const {d,put}=fixture();put(0,80,0,'wind_rotor');put(1,80,0,'gear_up');put(2,80,0,'crusher');put(2,80,1,'press');
 let n=kineticNetwork(d,{x:2,y:80,z:0});assert.equal(n.status,'overload');assert.equal(n.rpm,0);assert.equal(n.demand,160);
 put(2,80,2,'wind_rotor');assert.equal(kineticNetwork(d,{x:2,y:80,z:0}).status,'conflict'); // different source speeds
 put(2,80,2,'shaft');put(0,80,1,'wind_rotor');n=kineticNetwork(d,{x:2,y:80,z:0});assert.equal(n.status,'running');assert.equal(n.capacity,256);
 d.unloaded=new Set(['3,80,0']);assert.equal(kineticNetwork(d,{x:2,y:80,z:0}).status,'incomplete');
}
{
 // A loop that bypasses the gearbox has inconsistent ratios and must stall.
 const {d,put}=fixture();put(0,80,0,'wind_rotor');put(1,80,0,'gear_up');put(2,80,0,'crusher');
 for(const p of [[0,80,1],[1,80,1],[2,80,1]])put(...p,'shaft');assert.equal(kineticNetwork(d,{x:2,y:80,z:0}).status,'conflict');
}
console.log('Kinetic gear ratios, direction, capacity, loops, limits and unloaded boundaries OK (simulated)');
{
 const {d,put}=fixture();put(0,80,0,'wind_rotor');put(1,80,0,'mixer');put(1,80,1,'assembler');put(0,80,1,'filter_router');
 const n=kineticNetwork(d,{x:1,y:80,z:0});assert.equal(n.status,'running');assert.equal(n.demand,104);assert.equal(n.capacity,128);
 put(1,81,0,'press');assert.equal(kineticNetwork(d,{x:1,y:80,z:0}).status,'overload');
}
{
 const {d,put}=fixture();put(0,80,0,'wind_rotor');put(1,80,0,'clutch');put(2,80,0,'crusher');
 let engaged=0;const block=d.getBlock({x:1,y:80,z:0});block.permutation={getState:()=>engaged,withState:(_k,v)=>({getState:()=>v,withState:block.permutation.withState})};block.setPermutation=p=>{block.permutation=p;engaged=p.getState();};
 assert.equal(kineticNetwork(d,{x:2,y:80,z:0}).status,'no_source');
 assert.equal(toggleClutch(block),true);assert.equal(kineticNetwork(d,{x:2,y:80,z:0}).status,'running');
 assert.equal(toggleClutch(block),false);assert.equal(kineticNetwork(d,{x:2,y:80,z:0}).status,'no_source');
}
