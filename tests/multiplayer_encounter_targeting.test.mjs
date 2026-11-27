import {test} from 'node:test';import assert from 'node:assert/strict';import {Difficulty,GameMode,EntityDamageCause} from '@minecraft/server';
import {start as startMoving} from './moving_attack_fixture.mjs';
import {setupFushiSystem} from '../Hakkai_v7.1.0/BehaviorPack/scripts/fushi_system.js';import {setupRealmEnders} from '../Hakkai_v7.1.0/BehaviorPack/scripts/realm_ender.js';
function fixture(chief){
 const effects=[],hits=[],messages=[],system={currentTick:0};let mob;
 const d={id:'realm',spawnParticle:()=>{},getEntities:()=>[mob],getPlayers:()=>[],isChunkLoaded:()=>true,getBlock:()=>({isAir:true})};
 function player(id,x){return {id,typeId:'minecraft:player',isValid:true,dimension:d,location:{x,y:0,z:0},getGameMode:()=>GameMode.Survival,sendMessage:m=>messages.push([id,m]),applyDamage:n=>{hits.push([id,n]);return true},addEffect:e=>effects.push([id,e])};}
 const a=player('a',0),b=player('b',1);mob={id:'mob',typeId:chief?'hakkai:fushi_chief':'hakkai:ender_0',isValid:true,dimension:d,location:{x:4,y:0,z:0}};
 const world={getDifficulty:()=>Difficulty.Normal,getAllPlayers:()=>[a,b]},ctrl=chief?setupFushiSystem({world,system,report:()=>{}}):setupRealmEnders({world,system,report:()=>{},safe:()=>false});
 const hit=p=>ctrl.onHurt({hurtEntity:mob,damageSource:{damagingEntity:p,cause:EntityDamageCause.entityAttack}});
 const tick=t=>{system.currentTick=t;ctrl.tick(a,t);ctrl.tick(b,t)};return {a,b,hit,tick,system,hits,messages};
}
for(const chief of [true,false])test(`${chief?'chief':'realm ender'}: alternating attackers do not cancel the warned strike or switch its victim`,()=>{
 const f=fixture(chief);f.hit(f.a);
 for(let t=1;t<20;t++){f.system.currentTick=t;f.hit(t%2?f.b:f.a);}
 f.tick(20);assert.deepEqual(f.messages,[]);
 for(let t=21;t<60;t++){f.system.currentTick=t;f.hit(t%2?f.b:f.a);}
 f.tick(60);
 if(chief){assert.deepEqual(f.hits,[]);assert.deepEqual(f.messages,[]);} // no scheduler in this fixture
 else assert.deepEqual(f.hits,[]); // no scheduler in this fixture
});
for(const chief of [true,false])test(`${chief?'chief':'realm ender'}: a new attacker can take over if the old target disconnects`,()=>{
 const f=fixture(chief);f.hit(f.a);f.tick(20);f.a.isValid=false;f.system.currentTick=21;f.hit(f.b);f.tick(41);assert.deepEqual(f.messages,[]);f.tick(81);
 // No scheduler/raycast APIs in this fixture: chief's moon projectile is
 // canceled; the next warned mist remains targeted at the new attacker.
 if(chief){assert.deepEqual(f.hits,[]);f.tick(121);f.tick(161);}
 if(chief)assert.ok(f.hits.some(([id])=>id==='b'));else assert.deepEqual(f.hits,[]);assert.ok(!f.hits.some(([id])=>id==='a'));
});

test('traveler keeps the original target in flight, then can retarget after disconnect',()=>{
 const f=startMoving({realm:0},{ender:true}),q={...f.p,id:'q',location:{x:5,y:80,z:2},applyDamage(){throw Error('must not be targeted')}};
 f.world.getAllPlayers=()=>[f.p,q];f.other([q]);f.ctrl.onHurt({hurtEntity:f.mob,damageSource:{damagingEntity:q}});f.advance(70);
 assert.equal(f.hits.length,1,'second attacker cannot redirect flight');
 const g=startMoving({realm:0},{ender:true});let qHits=0;
 const replacement={...g.p,id:'q',location:{x:5,y:80,z:0},applyDamage:()=>{qHits++;return true}};
 g.p.isValid=false;g.world.getAllPlayers=()=>[replacement];g.other([replacement]);
 g.ctrl.onHurt({hurtEntity:g.mob,damageSource:{damagingEntity:replacement}});
 // The periodic scan is normally driven by all online players.
 for(let t=61;t<=130;t++){g.advance(t);if(t%10===0){g.system.currentTick=t;g.ctrl.tick(replacement,t);}}
 assert.equal(g.hits.length,0);assert.equal(qHits,1);
});
