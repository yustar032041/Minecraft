// Simulation of the actual king cycle; no Bedrock spawning, terrain or rendering.
import assert from 'node:assert/strict';
import {setupMobSystem} from '../Hakkai_v7.1.0/BehaviorPack/scripts/mob_system.js';
import {Difficulty,GameMode} from '@minecraft/server';
function fixture({failMarker=false,full=false,nearby=1,blocked=false,unloaded=false,occupied=false}={}){
 let time=0,floorType='minecraft:stone';const spawns=[],warnings=[],notices=[],searches=[];
 const d={id:'realm',getPlayers:({location,maxDistance})=>Math.hypot(player.location.x-location.x,player.location.y-location.y,player.location.z-location.z)<=maxDistance?[player]:[],
  getEntities:query=>{if(query.families){if(query.maxDistance===25)return [];searches.push({...query.location});return Array(full?6:nearby).fill({id:'existing'});}return query.closest===1?(occupied?[{id:'occupied'}]:[]):[king];},
  isChunkLoaded:()=>!unloaded,getBlock:pos=>pos.y===79?{isAir:false,isLiquid:false,isWaterlogged:false,typeId:floorType}:{isAir:!blocked},
  getBlockFromRay:pos=>({face:'Up',block:{location:{x:Math.floor(pos.x),y:79,z:Math.floor(pos.z)}},faceLocation:{x:0,y:1,z:0}}),
  spawnParticle:(id,pos)=>{if(id==='hakkai:warning_marker'){if(failMarker&&time===550)throw Error('unavailable');warnings.push([time,{...pos}]);}},
  spawnEntity:(id,pos,options)=>spawns.push({time,id,pos,options})};
 const player={id:'p',typeId:'minecraft:player',isValid:true,dimension:d,location:{x:2,y:80,z:0},getGameMode:()=>GameMode.Survival,sendMessage:msg=>notices.push([time,msg]),applyDamage:()=>true,addEffect:()=>{},applyImpulse:()=>{}};
 const king={id:'boss',typeId:'hakkai:eclipse_colossus',isValid:true,dimension:d,location:{x:0,y:80,z:0},getComponent:()=>({currentValue:100,effectiveMax:100,setCurrentValue:()=>{}}),playAnimation:()=>{}};
 const system={currentTick:0},world={getDifficulty:()=>Difficulty.Normal,getAllPlayers:()=>[player]};
 const ctrl=setupMobSystem({allowKingMelee:()=>false,ns:'hakkai:',world,system,num:()=>0,property:()=>{},report:(_,e)=>{throw e}});
 function tick(t){system.currentTick=time=t;ctrl.tick(player,t);}
 for(let t=0;t<=550;t+=10)tick(t);
 assert.ok(notices.some(([t,msg])=>t===550&&msg.includes('影兵招来')),'sixth attack is summoned after its own warning');
 return {spawns,warnings,searches,king,tick,setFloor:id=>floorType=id};
}
{
 const f=fixture();f.king.location={x:4,y:82,z:-3};f.tick(590);
 assert.deepEqual(f.spawns.map(s=>s.id),['hakkai:foe_7_11','hakkai:foe_6_8']);
 for(const s of f.spawns){assert.equal(s.time,590);assert.ok(Math.abs(Math.hypot(s.pos.x,s.pos.z)-5)<1e-8);assert.equal(s.pos.y,80);assert.deepEqual(s.options,{spawnEvent:'hakkai:wild',initialPersistence:false});}
 assert.deepEqual(f.searches,[{x:0,y:80,z:0}],'nearby cap is checked at the marked summon location');
 const marks=f.warnings.filter(([t])=>t===550);assert.equal(marks.length,24);
 for(const [,loc] of marks)assert.ok(Math.abs(Math.hypot(loc.x,loc.z)-7)<1e-8);
}
{
 const f=fixture();f.king.location.x=4;f.tick(600);assert.equal(f.spawns.length,0,'late resolution must cancel');
}
for(const options of [{failMarker:true},{full:true},{blocked:true},{unloaded:true},{occupied:true}]){
 const f=fixture(options);f.king.location.x=4;f.tick(590);assert.equal(f.spawns.length,0,'failed marker, cap, unsafe or occupied sites cancel spawning');
}
{
 const f=fixture({nearby:5});f.tick(590);assert.equal(f.spawns.length,1,'the existing six-creature cap is not exceeded');
}
{
 const f=fixture();f.setFloor('minecraft:magma');f.tick(590);
 assert.equal(f.spawns.length,0,'floor is rechecked when the warning resolves, not only when announced');
}
console.log('King existing minion summon stays inside fixed warning even if the boss moves; cap and cancellation (mocked)');
