// Scripted paths and controller mocks; not Bedrock physics or rendering QA.
import {test} from 'node:test';import assert from 'node:assert/strict';
import {mobContentList} from '../Hakkai_v7.1.0/BehaviorPack/scripts/mob_content.js';
import {TWIN_CREATURES,SHOT_SPEED,hasTwinShot} from '../Hakkai_v7.1.0/BehaviorPack/scripts/mob_shot_styles.js';
import {startMobProjectile,advanceMobProjectile} from '../Hakkai_v7.1.0/BehaviorPack/scripts/mob_projectile.js';
import {start} from './moving_attack_fixture.mjs';
assert.equal(TWIN_CREATURES.length,30);assert.equal(new Set(TWIN_CREATURES).size,30);
for(const id of TWIN_CREATURES)test(`${id}: two separate visible trajectories share one damage opportunity`,()=>{
 const profile=mobContentList.find(p=>p.id===id);assert.ok(profile&&hasTwinShot(profile));
 const d={isChunkLoaded:()=>true,getBlock:()=>({isAir:true}),getBlockFromRay:()=>undefined,getEntitiesFromRay:()=>[],spawnParticle:()=>{}};
 const a=startMobProjectile({x:0,y:80,z:0},{x:5,y:80,z:0},0,12,profile,-1);
 const b=startMobProjectile({x:0,y:80,z:0},{x:5,y:80,z:0},0,12,profile,1);
 for(const t of [1,2]){assert.equal(advanceMobProjectile(d,a,t,'m','p',profile).done,false);assert.equal(advanceMobProjectile(d,b,t,'m','p',profile).done,false);}
 assert.ok(Math.abs(a.position.z-b.position.z)>.1,'strands genuinely diverge');
 const f=start(profile);f.advance(190);assert.equal(f.hits.length,1,'one cast cannot double-hit');
 assert.match(f.ctrl.fieldGuide(f.p,mobContentList.indexOf(profile)),/二筋/);
});
test('independent strands can be blocked separately without passing through a wall',()=>{
 const profile=mobContentList.find(p=>p.id==='foe_1_6');
 const free=start(profile);free.advance(180);
 const one=start(profile);one.other([{id:'b',isValid:true,location:{x:2.5,y:80,z:.55}}]);one.advance(180);
 assert.equal(one.hits.length,1);assert.ok(one.particles.filter(([t,id])=>t>160&&id.startsWith('hakkai:shot_')).length<free.particles.filter(([t,id])=>t>160&&id.startsWith('hakkai:shot_')).length);
 const wall=start(profile);wall.wall(2);wall.advance(180);assert.deepEqual(wall.hits,[]);
});
test('twin parry or callback relocation cannot allow a second stale hit',()=>{
 const profile=mobContentList.find(p=>p.id==='foe_1_6');let calls=0;
 const parried=start(profile,{onParry:()=>{calls++;return true;}});parried.advance(180);assert.equal(calls,1);assert.deepEqual(parried.hits,[]);
 const moved=start(profile,{onParry:p=>{p.location.z=9;return false;}});moved.advance(180);assert.deepEqual(moved.hits,[]);
});
test('attack material speeds differ and unsupported talent or strand fails closed',()=>{
 assert.ok(SHOT_SPEED.shock>SHOT_SPEED.spore);assert.ok(SHOT_SPEED.thorns>SHOT_SPEED.time);
 const p=mobContentList.find(p=>p.id==='foe_1_6'),a={x:0,y:0,z:0},b={x:5,y:0,z:0};
 assert.equal(startMobProjectile(a,b,0,12,p,2),undefined);
 assert.equal(startMobProjectile(a,b,0,12,{...p,talent:'unknown'}),undefined);
});
