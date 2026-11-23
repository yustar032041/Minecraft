import assert from 'node:assert/strict';
import {placeMoonShrine} from '../Hakkai_v7.1.0/BehaviorPack/scripts/moon_shrine.js';
function fixture(){
 const blocks=new Map(),writes=[],spawns=[],errors=[];let player=false,existing=false,loaded=true,failed=false;
 const key=p=>`${p.x},${p.y},${p.z}`;
 const d={isChunkLoaded:()=>loaded,getBlock:p=>{const id=blocks.get(key(p))??(p.y===80?'minecraft:grass_block':'minecraft:air');return {typeId:id,isSolid:id!=='minecraft:air',isAir:id==='minecraft:air',isLiquid:false};},
 setBlockType(p,id){if(failed&&writes.length===2)throw Error('partial write');writes.push([p,id]);blocks.set(key(p),id);},getEntities:()=>existing?[{}]:[],spawnEntity:(id,at,opts)=>spawns.push([id,at,opts])};
 const args={dimension:d,cx:3,cz:-2,hash:()=>0,heightFor:()=>80,isGrove:()=>true,playersNear:()=>player,report:(_,e)=>errors.push(e)};
 return {args,d,blocks,writes,spawns,errors,setPlayer:x=>player=x,setExisting:x=>existing=x,setLoaded:x=>loaded=x,setFailed:x=>failed=x,key};
}
{
 const f=fixture(),r=placeMoonShrine(f.args);assert.deepEqual(r,{x:56,z:-24});assert.equal(f.spawns.length,1);assert.equal(f.spawns[0][0],'hakkai:fushi_chief');assert.deepEqual(f.spawns[0][2],{initialPersistence:true});
 assert.ok(f.writes.length>20);assert.ok(f.writes.every(([p])=>p.x>=48&&p.x<=63&&p.z>=-32&&p.z<=-17&&p.y>80));
}
for(const change of [f=>f.setPlayer(true),f=>f.setLoaded(false),f=>f.args.hash=()=>.1,f=>f.args.isGrove=()=>false,f=>f.args.heightFor=(r,x)=>x===56?80:90,f=>f.blocks.set(f.key({x:53,y:81,z:-27}),'minecraft:diamond_block')]){
 const f=fixture();change(f);assert.equal(placeMoonShrine(f.args),false);assert.equal(f.writes.length,0);assert.equal(f.spawns.length,0);
}
{
 const f=fixture();f.setExisting(true);assert.ok(placeMoonShrine(f.args));assert.equal(f.spawns.length,0,'no duplicate local chief');
}
{
 const f=fixture();f.setFailed(true);assert.equal(placeMoonShrine(f.args).partial,true);assert.equal(f.writes.length,2);assert.equal(f.spawns.length,0);assert.equal(f.errors.length,1);
}
console.log('Moon shrine: bounded placement, ground and space preflight, chief cap and partial failure (mocked)');

{const f=fixture();f.args.spawnChief=false;assert.ok(placeMoonShrine(f.args));assert.equal(f.spawns.length,0,'mob spawning gamerule is respected');}
{
 const f=fixture(),registered=[];f.args.onChief=(e,h)=>registered.push([e,h]);
 assert.ok(placeMoonShrine(f.args));assert.equal(registered.length,1);assert.deepEqual(registered[0][1],{cx:3,cz:-2,y:80});
}
