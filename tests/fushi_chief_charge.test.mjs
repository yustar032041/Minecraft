// Mocked terrain, entity positions, tick scheduler and teleport only. Does not
// establish Bedrock collision, scale, pathfinding, animation or network behavior.
import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {GameMode,Difficulty} from '@minecraft/server';
import {setupFushiSystem,CHIEF_ATTACKS} from '../Hakkai_v7.1.0/BehaviorPack/scripts/fushi_system.js';
import {CHIEF_CHARGE_BOUNDS,startChiefCharge,advanceChiefCharge} from '../Hakkai_v7.1.0/BehaviorPack/scripts/fushi_chief_charge.js';
function fixture(){
 let tick=0,loaded=true,waterlogged=false,ground=true,wall=Infinity,ceiling=false,particlesFail=false,rayFail=false,unsupported=false,teleportOk=true,peaceful=false,evade=false,parry=false;
 const hits=[],effects=[],notices=[],particles=[],moves=[],queue=[];
 const system={currentTick:0,runTimeout(fn,n){queue.push({at:this.currentTick+n,fn});}};
 const d={id:'realm',isChunkLoaded:()=>loaded,
  getBlock:pos=>{if(pos.y===79)return ground?{isAir:false,isLiquid:false,isWaterlogged:waterlogged,typeId:'minecraft:stone'}:{isAir:true};
   return pos.x>=wall||ceiling&&pos.y>=82?{isAir:false,isSolid:true}:{isAir:true};},
  getBlockFromRay:(from,dir,{maxDistance})=>{
   if(rayFail)throw Error('ray');
   if(dir.y===-1)return unsupported?undefined:{face:'Up',block:{location:{x:Math.floor(from.x),y:79,z:Math.floor(from.z)}},faceLocation:{x:0,y:1,z:0}};
   if(dir.x>0&&wall>=from.x&&wall-from.x<=maxDistance)return {block:{location:{x:wall,y:from.y,z:from.z}},faceLocation:{x:0,y:0,z:0}};
   return undefined;
  },
  getEntities:opts=>opts?.type||opts?.families?[chief]:entities.filter(e=>e.isValid&&Math.hypot(e.location.x-opts.location.x,e.location.y-opts.location.y,e.location.z-opts.location.z)<=opts.maxDistance),
  spawnParticle:(id,pos)=>{if(particlesFail&&id==='hakkai:mob_impact')throw Error('particle');particles.push([tick,id,{...pos}]);}};
 const player=(id,x,z)=>({id,typeId:'minecraft:player',isValid:true,dimension:d,location:{x,y:80,z},getGameMode:()=>GameMode.Survival,sendMessage:m=>notices.push([tick,id,m]),
  applyDamage:n=>{hits.push([tick,id,n]);return true;},addEffect:(id,duration,options)=>effects.push([tick,id,duration,options.amplifier])});
 const p=player('p',5,0),q=player('q',8,3),chief={id:'chief',typeId:'hakkai:fushi_chief',isValid:true,isOnGround:true,dimension:d,location:{x:0,y:80,z:0},playAnimation:()=>{},clearVelocity:()=>{},tryTeleport:(pos,opts)=>{if(!teleportOk)return false;assert.deepEqual(opts,{checkForBlocks:true});moves.push([tick,{...pos}]);chief.location={...pos};return true;}};
 let entities=[chief,p,q];const world={getDifficulty:()=>peaceful?Difficulty.Peaceful:Difficulty.Normal,getAllPlayers:()=>[p,q].filter(v=>v.isValid)};
 const ctrl=setupFushiSystem({world,system,report:(_,e)=>{throw e},isEvading:()=>evade,tryParry:()=>parry});
 ctrl.onHurt({hurtEntity:chief,damageSource:{damagingEntity:p}});
 function advance(to){while(tick<to){tick++;system.currentTick=tick;
  while(queue.some(x=>x.at===tick)){const i=queue.findIndex(x=>x.at===tick);queue.splice(i,1)[0].fn();}
  if(tick%10===0){ctrl.tickChiefs(p,tick);ctrl.tickChiefs(q,tick);}
 }}
 return {p,q,chief,ctrl,system,world,d,advance,hits,effects,notices,particles,moves,queue,
  loaded:v=>loaded=v,waterlogged:v=>waterlogged=v,ground:v=>ground=v,wall:v=>wall=v,ceiling:v=>ceiling=v,particlesFail:v=>particlesFail=v,rayFail:v=>rayFail=v,unsupported:v=>unsupported=v,teleportOk:v=>teleportOk=v,peaceful:v=>peaceful=v,evade:v=>evade=v,parry:v=>parry=v,entities:v=>entities=v};
}
function ready(){const f=fixture();f.advance(20);assert.equal(f.notices.length,0);return f;}
test('fixed warned charge advances on checked ground and touches only warned target',()=>{
 const f=ready();f.advance(60);assert.deepEqual(f.hits,[]);assert.equal(f.particles.filter(x=>x[1]==='hakkai:warning_marker').length,0);
 f.advance(85);assert.equal(f.hits.length,1);assert.equal(f.hits[0][1],'p');assert.equal(f.hits[0][2],CHIEF_ATTACKS[0].damage);
 assert.ok(f.hits[0][0]>60&&f.hits[0][0]<=81);assert.deepEqual(f.effects.map(x=>x.slice(1)),[['slowness',45,0]]);
 assert.ok(f.moves.length>1);assert.ok(f.moves.every(([,p])=>p.x>=0&&p.x<3.45&&p.y===80&&p.z===0));
 assert.ok(f.particles.some(x=>x[1]==='hakkai:mob_impact'&&x[0]>60));
});
for(const mode of ['unloaded','waterlogged','ledge','wall','ceiling','support','ray','teleport','other','sidestep','evade','parry','peaceful','disconnect','dimension','airborne','death','stagger'])test(`charge does not hit when ${mode}`,()=>{
 const f=ready();f.advance(60);
 if(mode==='unloaded')f.loaded(false);
 if(mode==='waterlogged')f.waterlogged(true);
 if(mode==='ledge')f.ground(false);
 if(mode==='wall')f.wall(2);
 if(mode==='ceiling')f.ceiling(true);
 if(mode==='support')f.unsupported(true);
 if(mode==='ray')f.rayFail(true);
 if(mode==='particle')f.particlesFail(true);
 if(mode==='teleport')f.teleportOk(false);
 if(mode==='other')f.q.location={x:1.9,y:80,z:0};
 if(mode==='outside')f.p.location.x=1;
 if(mode==='sidestep')f.p.location.z=4;
 if(mode==='evade')f.evade(true);
 if(mode==='parry')f.parry(true);
 if(mode==='peaceful')f.peaceful(true);
 if(mode==='disconnect')f.p.isValid=false;
 if(mode==='dimension')f.p.dimension={id:'elsewhere'};
 if(mode==='airborne')f.chief.isOnGround=false;
 if(mode==='death'){f.chief.isValid=false;f.ctrl.onDeath({deadEntity:f.chief});}
 if(mode==='stagger')f.ctrl.stagger(f.chief,60);
 f.advance(85);assert.deepEqual(f.hits,[]);assert.deepEqual(f.effects,[]);
});
test('charge distance is capped and an off-axis bystander also stops it',()=>{
 const f=fixture();f.p.location.x=12;f.advance(85);assert.deepEqual(f.hits,[]);
 assert.ok(f.moves.length&&f.chief.location.x<=6+1e-6);
 const g=ready();g.advance(60);g.q.location={x:1.8,y:80,z:1.8};g.advance(85);
 assert.deepEqual(g.hits,[]);assert.deepEqual(g.moves,[]);
});
test('a new ledge or stagger during movement cancels the remaining charge',()=>{
 const f=ready();f.advance(62);const count=f.moves.length;assert.ok(count>0);f.ground(false);f.advance(85);
 assert.equal(f.moves.length,count);assert.deepEqual(f.hits,[]);
 const g=ready();g.advance(62);const before=g.moves.length;g.ctrl.stagger(g.chief,62);g.advance(85);
 assert.equal(g.moves.length,before);assert.deepEqual(g.hits,[]);
});
test('other attackers cannot silently replace the warned target',()=>{
 const f=ready();f.advance(21);f.ctrl.onHurt({hurtEntity:f.chief,damageSource:{damagingEntity:f.q}});
 f.advance(85);assert.deepEqual(f.hits.map(x=>x[1]),['p']);assert.equal(f.notices.length,0);
});
test('cosmetic animation errors do not suppress an otherwise verified charge',()=>{
 const f=ready();f.chief.playAnimation=()=>{throw Error('no animation')};f.advance(85);
 assert.deepEqual(f.hits.map(x=>x[1]),['p']);
});
test('failed warning refresh or scheduler suppresses the whole charge',()=>{
 const f=ready();f.advance(59);const spawn=f.d.spawnParticle;
 f.d.spawnParticle=(id,pos)=>{if(id==='hakkai:warning_marker')throw Error('unavailable');spawn(id,pos);};
 f.advance(85);assert.deepEqual(f.hits.map(x=>x[1]),['p']);assert.ok(f.moves.length);
 const g=ready();g.advance(59);g.system.runTimeout=()=>{throw Error('scheduler')};g.advance(85);
 assert.deepEqual(g.hits,[]);assert.deepEqual(g.moves,[]);
});
test('retarget and an unexpected displacement cancel the in-flight charge',()=>{
 const f=ready();f.advance(61);f.p.isValid=false;f.system.currentTick=61;
 f.ctrl.onHurt({hurtEntity:f.chief,damageSource:{damagingEntity:f.q}});f.advance(70);assert.deepEqual(f.hits,[]);
 const g=ready();g.advance(61);g.chief.location.x+=.4;g.advance(80);assert.deepEqual(g.hits,[]);assert.equal(g.moves.length,1);
});
test('a refused hit adds no effect; delayed frames never catch up',()=>{
 const f=ready();f.p.applyDamage=()=>false;f.advance(85);assert.deepEqual(f.effects,[]);
 const g=ready();g.advance(60);const fn=g.queue.shift().fn;g.system.currentTick=65;fn();assert.deepEqual(g.hits,[]);assert.equal(g.moves.length,0);assert.equal(g.queue.length,0);
});
test('collision constants conservatively cover the authored collision and scale',()=>{
 const e=JSON.parse(fs.readFileSync('Hakkai_v7.1.0/BehaviorPack/entities/fushi_chief.json'))['minecraft:entity'].components;
 assert.ok(CHIEF_CHARGE_BOUNDS.width>=e['minecraft:collision_box'].width*e['minecraft:scale'].value);
 assert.ok(CHIEF_CHARGE_BOUNDS.height>=e['minecraft:collision_box'].height*e['minecraft:scale'].value);
 assert.equal(startChiefCharge({x:0,y:0,z:0},{x:1,y:2,z:0},0),undefined);
 const charge=startChiefCharge({x:0,y:80,z:0},{x:5,y:80,z:0},0),f=fixture();
 assert.deepEqual(advanceChiefCharge(f.chief,f.p,charge,2),{done:true});
});
test('stale online player entry cannot hide the warned charge target during flight',()=>{
 const f=ready();f.advance(60);f.world.getAllPlayers=()=>[{get id(){throw Error('disconnected')}},f.p,f.q];
 f.advance(85);assert.deepEqual(f.hits.map(x=>x[1]),['p']);
});

test('charge uses contact rather than the former hidden circle; particle failure is cosmetic',()=>{
 const f=ready();f.advance(60);f.p.location.x=1;f.particlesFail(true);f.advance(85);assert.deepEqual(f.hits.map(x=>x[1]),['p']);
});
test('charge contact is invalidated if a visual callback relocates the target',()=>{
 const f=ready();f.advance(60);const spawn=f.d.spawnParticle;let moved=false;
 f.d.spawnParticle=(id,pos)=>{spawn(id,pos);if(id==='hakkai:mob_impact'&&pos.x>2&&!moved){moved=true;f.p.location.z=5;}};
 f.advance(85);assert.ok(moved);assert.deepEqual(f.hits,[]);
});
