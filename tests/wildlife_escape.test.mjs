import {test} from 'node:test';import assert from 'node:assert/strict';
import {safeWildlifeEscape} from '../Hakkai_v7.1.0/BehaviorPack/scripts/wildlife_escape.js';
import {setupMobSystem} from '../Hakkai_v7.1.0/BehaviorPack/scripts/mob_system.js';
import {Difficulty,GameMode} from '@minecraft/server';
function fixture(){
 const particles=[],impulses=[],effects=[],floorQueries=[];let mode='clear';
 const d={id:'realm',isChunkLoaded:()=>mode!=='unloaded',getBlock:p=>{
  if(p.y===79){floorQueries.push({x:p.x,z:p.z});const valid=mode!=='cliff'&&!(mode==='direct-cliff'&&p.x<0&&p.z===0);return valid?{typeId:'minecraft:stone',isAir:false,isLiquid:false,isWaterlogged:false}:{typeId:'minecraft:air',isAir:true,isLiquid:false,isWaterlogged:false};}
  return mode==='wall'?{typeId:'minecraft:stone',isAir:false,isLiquid:false,isWaterlogged:false}:{typeId:'minecraft:air',isAir:true,isLiquid:false,isWaterlogged:false};
 },getBlockFromRay:p=>mode==='missing-ray'?undefined:{block:{location:{x:Math.floor(p.x),y:79,z:Math.floor(p.z)}},face:'Up',faceLocation:{y:1}},spawnParticle:(...a)=>particles.push(a)};
 const p={id:'p',isValid:true,typeId:'minecraft:player',dimension:d,location:{x:2.5,y:80,z:.5},getGameMode:()=>GameMode.Survival};
 const mob={id:'m',typeId:'hakkai:wild_0_0',isValid:true,isOnGround:true,dimension:d,location:{x:.5,y:80,z:.5},applyImpulse:x=>impulses.push(x),addEffect:x=>effects.push(x)};
 d.getEntities=opts=>opts.families&&opts.maxDistance===25?[mob]:[];d.getPlayers=()=>[p];
 const world={getDifficulty:()=>Difficulty.Normal,getAllPlayers:()=>[p]},system={currentTick:0};
 const ctrl=setupMobSystem({world,system,ns:'hakkai:',num:()=>0,property:()=>{},report:()=>{}});
 const tick=t=>{system.currentTick=t;ctrl.tick(p,t)};
 return {p,mob,d,particles,impulses,effects,floorQueries,tick,setMode:x=>mode=x};
}

test('level route escapes directly or chooses a safe sideways route away from player',()=>{
 const f=fixture(),direct=safeWildlifeEscape(f.mob,f.p);assert.ok(direct.x<-.99);assert.ok(Math.abs(direct.z)<1e-9);
 f.setMode('direct-cliff');const turn=safeWildlifeEscape(f.mob,f.p);assert.ok(turn.x<0&&Math.abs(turn.z)>.8,'side route still points away');
 f.tick(0);assert.equal(f.impulses.length,1);assert.ok(f.impulses[0].x<0);assert.ok(Math.abs(f.impulses[0].z)>.4);
 assert.deepEqual(f.effects,['speed','jump_boost']);
});

test('all eight timid species stop rather than boost into holes, obstacles or unknown footing',()=>{
 for(let realm=0;realm<8;realm++)for(const mode of ['cliff','wall','unloaded','missing-ray']){
  const f=fixture();f.mob.typeId=`hakkai:wild_${realm}_0`;f.setMode(mode);f.tick(0);
  assert.equal(f.impulses.length,0,`${realm} ${mode}`);assert.equal(f.effects.length,0,`${realm} ${mode}`);
  f.setMode('clear');f.tick(40);assert.equal(f.impulses.length,0,'failed path observes cooldown, not 40-tick repeated scans');
 }
});

test('unsafe or ambiguous position and movement fail closed; candidates do not force chunks or write blocks',()=>{
 const f=fixture();f.mob.isOnGround=false;assert.equal(safeWildlifeEscape(f.mob,f.p),undefined);
 f.mob.isOnGround=true;f.mob.location.y=80.5;assert.equal(safeWildlifeEscape(f.mob,f.p),undefined);
 f.mob.location.y=80;f.p.dimension={id:'other'};assert.equal(safeWildlifeEscape(f.mob,f.p),undefined);
 f.p.dimension=f.d;f.p.location={...f.mob.location};assert.equal(safeWildlifeEscape(f.mob,f.p),undefined);
 f.p.location.x=2.5;f.setMode('direct-cliff');f.floorQueries.length=0;assert.ok(safeWildlifeEscape(f.mob,f.p));
 const unique=new Set(f.floorQueries.map(p=>`${p.x},${p.z}`));assert.equal(unique.size,f.floorQueries.length,'same column support is checked once');
 assert.ok(unique.size<=18,'three directions by six samples at most');
});
