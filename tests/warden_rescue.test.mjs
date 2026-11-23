import assert from 'node:assert/strict';import {rescueWarden} from '../Hakkai_v7.1.0/BehaviorPack/scripts/warden_rescue.js';
function fixture(){let nearby=false,loaded=true,blocked=false,teleportOK=true;const dest=[];
 const d={getPlayers:()=>nearby?[{}]:[],isChunkLoaded:()=>loaded,getBlock:p=>({typeId:p.y===79?'minecraft:stone':'minecraft:air',isSolid:p.y===79,isLiquid:false,isAir:p.y!==79&&!blocked})};
 const e={dimension:d,location:{x:0,y:60,z:0},tryTeleport:(p,opts)=>{dest.push([p,opts]);return teleportOK;}};
 return {e,d,dest,setNearby:v=>nearby=v,setLoaded:v=>loaded=v,setBlocked:v=>blocked=v,setTeleport:v=>teleportOK=v};
}
{
 const f=fixture();assert.equal(rescueWarden(f.e),true);assert.deepEqual(f.dest[0],[{x:.5,y:80,z:-6.5},{checkForBlocks:true}]);
}
for(const modify of [f=>f.setNearby(true),f=>f.setLoaded(false),f=>f.setBlocked(true),f=>{f.d.getBlock=p=>({typeId:'minecraft:lava',isLiquid:true,isSolid:false,isAir:false})},f=>f.e.location.y=80]){
 const f=fixture();modify(f);assert.equal(rescueWarden(f.e),false);assert.equal(f.dest.length,0);
}
{
 const f=fixture();f.setTeleport(false);assert.equal(rescueWarden(f.e),false);assert.equal(f.dest.length,1);
}
console.log('Warden rescue: out-of-bounds only, safe loaded landing, players, obstruction and teleport failure (mocked)');
// The real boss controller also cancels its pending attack when rescue is
// unsafe, and resumes only after the entity has returned to the arena.
{
 const {setupWardenBoss}=await import('../Hakkai_v7.1.0/BehaviorPack/scripts/warden_boss.js');
 const {GameMode,Difficulty}=await import('@minecraft/server');
 const f=fixture(),hits=[],messages=[];f.d.id='hakkai:warden_arena';f.d.spawnParticle=()=>{};f.e.id='boss';f.e.isValid=true;f.e.typeId='hakkai:time_warden';f.e.location={x:0,y:80,z:0};
 const hp={currentValue:5000,effectiveMax:5000,setCurrentValue(v){this.currentValue=v;}};f.e.getComponent=()=>hp;f.e.getDynamicProperty=()=>undefined;f.e.setDynamicProperty=()=>{};
 const p={id:'p',isValid:true,typeId:'minecraft:player',dimension:f.d,location:{x:0,y:80,z:3},getGameMode:()=>GameMode.Survival,sendMessage:m=>messages.push(m),applyDamage:d=>hits.push(d),addEffect:()=>{}};
 f.d.getPlayers=()=>[p];f.d.getEntities=()=>[f.e];const world={getDifficulty:()=>Difficulty.Normal,getAllPlayers:()=>[p]};const sys={currentTick:0};
 const ctrl=setupWardenBoss({world,system:sys,property:()=>{},report:(_,err)=>{throw err;}});
 ctrl.tick(p,0);ctrl.tick(p,80);assert.ok(messages.some(m=>m.includes('（約2秒）')));
 f.e.location.y=60;ctrl.tick(p,81);ctrl.tick(p,120);assert.deepEqual(hits,[],'no stale attack when safe return is occupied');
 f.e.location.y=80;ctrl.tick(p,121);ctrl.tick(p,220);assert.ok(messages.filter(m=>m.includes('（約2秒）')).length>=2);
}
