import assert from 'node:assert/strict';
import {WARDEN_MOVING,startMoving,advanceMoving} from '../Hakkai_v7.1.0/BehaviorPack/scripts/warden_moving_attacks.js';
import {setupWardenBoss,inWardenWarning} from '../Hakkai_v7.1.0/BehaviorPack/scripts/warden_boss.js';
import {Difficulty,GameMode} from '@minecraft/server';
assert.equal(WARDEN_MOVING.length,5);assert.ok(WARDEN_MOVING.every(a=>a.length===3));assert.equal(new Set(WARDEN_MOVING.flat().map(a=>a.attack)).size,15);
const aim={x:0,y:80,z:0};
function arena(){return {id:'hakkai:warden_arena',particles:[],isChunkLoaded:()=>true,getBlock:()=>({isAir:true}),getBlockFromRay:()=>undefined,spawnParticle(id,p){this.particles.push([id,p]);}};}
// Every variant visibly advances and strikes only its swept front, once.
for(let phase=0;phase<5;phase++)for(const attack of WARDEN_MOVING[phase]){
 const d=arena(),m=startMoving(aim,attack,phase,['inside'],10);
 const q={id:'inside',location:{x:0,y:80,z:attack.motion==='wave'?attack.radius*.5:0}},off={id:'off',location:{x:attack.motion==='barrage'?1.25:attack.width+1||10,y:80,z:0}},high={id:'high',location:{x:0,y:83,z:0}};
 // Wave off-target must be outside its final radius, rather than merely off-axis.
 if(attack.motion==='wave')off.location.x=attack.radius+1;
 let seen=0,firstPoint,lastPoint;
 for(let t=11;t<=26;t++){
  const count=d.particles.length,r=advanceMoving(d,m,t,[q,off,high]);
  const frame=d.particles.slice(count);assert.ok(frame.length>=6&&frame.length<=40);assert.equal(r.done,t===26);
  assert.ok(frame.every(([id,p])=>id.startsWith('hakkai:warden_front_')&&inWardenWarning({...p,y:aim.y},aim,attack)));
  firstPoint??=frame[0][1];lastPoint=frame[0][1];
  assert.ok(r.targets.every(p=>p.id==='inside'));for(const p of r.targets){
   const prev=(t-11)/16,next=(t-10)/16;
   if(attack.motion==='wave')assert.ok(Math.hypot(p.location.x,p.location.z)>=attack.radius*prev-.28&&Math.hypot(p.location.x,p.location.z)<=attack.radius*next+.28);
   else assert.ok(p.location.z>=-attack.radius+2*attack.radius*prev-.18&&p.location.z<=-attack.radius+2*attack.radius*next+.18);
   seen++;m.hit.add(p.id);
  }
 }
 assert.equal(seen,1,attack.attack);assert.notDeepEqual(firstPoint,lastPoint,'visual front actually moves');
}
// No leap/catch-up after an unloaded tick, and no damage without visible FX.
for(const failure of ['late','particle','ray','chunk','block']){
 const d=arena(),a=WARDEN_MOVING[0][0],m=startMoving(aim,a,0,['p'],0),p={id:'p',location:aim};
 if(failure==='particle')d.spawnParticle=()=>{throw Error('missing')};
 if(failure==='ray')d.getBlockFromRay=()=>{throw Error('ray unavailable')};
 if(failure==='chunk')d.isChunkLoaded=()=>false;
 if(failure==='block')d.getBlockFromRay=()=>({block:{}});
 const r=advanceMoving(d,m,failure==='late'?2:1,[p]);assert.equal(r.done,true,failure);assert.deepEqual(r.targets,[],failure);
}
function fixture(phase=0){
 const d=arena(),hits=[],messages=[],animations=[];let players=[];
 const p={id:'p',typeId:'minecraft:player',isValid:true,isSneaking:true,location:{...aim},dimension:d,getGameMode:()=>GameMode.Survival,sendMessage:m=>messages.push([p.id,m]),applyDamage:n=>hits.push([p.id,n]),addEffect:()=>{},playSound:()=>{}};
 players=[p];const health={currentValue:[5000,3990,2990,1990,990][phase],effectiveMax:5000,setCurrentValue(v){this.currentValue=v;}};
 const e={id:'boss',typeId:'hakkai:time_warden',isValid:true,location:{x:0,y:80,z:3},dimension:d,getComponent:()=>health,getDynamicProperty:()=>undefined,setDynamicProperty:()=>{},playAnimation:a=>animations.push(a)};
 d.getPlayers=()=>players;d.getEntities=()=>[e];const sys={currentTick:0},world={getDifficulty:()=>Difficulty.Normal,getAllPlayers:()=>players};
 const ctrl=setupWardenBoss({world,system:sys,property:()=>{},report:(_,e)=>{throw e;},spendParry:()=>true});
 const tick=t=>{sys.currentTick=t;ctrl.tick(p,t);};
 return {d,p,e,sys,world,hits,messages,animations,ctrl,tick,setPlayers:q=>players=q};
}
// The real boss loop schedules all three new attacks per phase and gives each
// player advance warning. The same sequence works when ticked every tick.
for(let phase=0;phase<5;phase++){
 const f=fixture(phase);for(let t=0;t<(phase===4?6500:1700);t++)f.tick(t);
 for(const a of WARDEN_MOVING[phase])assert.ok(f.messages.some(([,m])=>m.includes(a.attack)),`${phase}: ${a.attack}`);
 assert.ok(f.d.particles.some(([id])=>id.startsWith('hakkai:warden_front_')));
}
// Launch at the sixth pattern, with a second latecomer never warned.
{
 const f=fixture();let started=0;for(let t=0;t<1500;t++){f.tick(t);if(f.messages.some(([,m])=>m.includes(WARDEN_MOVING[0][0].attack))){started=t;break;}}
 assert.ok(started);const q={...f.p,id:'q',sendMessage:()=>{},applyDamage:n=>f.hits.push(['q',n])};f.setPlayers([f.p,q]);f.hits.length=0;
 for(let t=started+1;t<=started+56;t++)f.tick(t);
 assert.deepEqual(f.hits,[['p',10*2.4],['p',7*2.4]],'only warned player is hit by each overlapping attack');
}
// A melee counter during the moving move's warning cancels launch entirely.
{
 const f=fixture();let started=0;for(let t=0;t<1500;t++){f.tick(t);if(f.messages.some(([,m])=>m.includes(WARDEN_MOVING[0][0].attack))){started=t;break;}}
 f.sys.currentTick=started+32;assert.equal(f.ctrl.onMeleeParry({damagingEntity:f.p,hitEntity:f.e}),true);
 const count=f.d.particles.filter(([id])=>id.startsWith('hakkai:warden_front_')).length;f.hits.length=0;
 for(let t=started+33;t<=started+56;t++)f.tick(t);
 assert.equal(f.d.particles.filter(([id])=>id.startsWith('hakkai:warden_front_')).length,count);assert.deepEqual(f.hits,[]);
}
// During flight a boss stagger stops every remaining front; no queued timers.
{
 const f=fixture();let started=0;for(let t=0;t<1500;t++){f.tick(t);if(f.messages.some(([,m])=>m.includes(WARDEN_MOVING[0][0].attack))){started=t;break;}}
 for(let t=started+1;t<=started+41;t++)f.tick(t);f.ctrl.stagger(f.e,started+41);
 const count=f.d.particles.filter(([id])=>id.startsWith('hakkai:warden_front_')).length;
 for(let t=started+42;t<=started+56;t++)f.tick(t);
 assert.equal(f.d.particles.filter(([id])=>id.startsWith('hakkai:warden_front_')).length,count);
}
// Missing a tick during flight cancels without an invisible catch-up hit.
{
 const f=fixture();let started=0;for(let t=0;t<1500;t++){f.tick(t);if(f.messages.some(([,m])=>m.includes(WARDEN_MOVING[0][0].attack))){started=t;break;}}
 for(let t=started+1;t<=started+40;t++)f.tick(t);f.hits.length=0;f.tick(started+42);
 for(let t=started+43;t<=started+56;t++)f.tick(t);assert.deepEqual(f.hits,[]);
}
// A second caller in the same tick must not advance the front twice.
{
 const f=fixture();let started=0;for(let t=0;t<1500;t++){f.tick(t);if(f.messages.some(([,m])=>m.includes(WARDEN_MOVING[0][0].attack))){started=t;break;}}
 for(let t=started+1;t<=started+41;t++)f.tick(t);const n=f.d.particles.length;f.tick(started+41);assert.equal(f.d.particles.length,n);
}
// A failed refreshed marker at launch cancels the moving attack entirely.
{
 const f=fixture();let started=0;for(let t=0;t<1500;t++){f.tick(t);if(f.messages.some(([,m])=>m.includes(WARDEN_MOVING[0][0].attack))){started=t;break;}}
 const spawn=f.d.spawnParticle.bind(f.d);f.d.spawnParticle=(id,p)=>{if(id==='hakkai:warning_marker')throw Error('warning unavailable');spawn(id,p);};f.hits.length=0;
 for(let t=started+1;t<=started+56;t++)f.tick(t);
 assert.deepEqual(f.hits,[['p',10*2.4]],'independently warned companion attack still resolves');assert.ok(!f.d.particles.some(([id])=>id.startsWith('hakkai:warden_front_')));
}
// Changing to peaceful mid-flight clears the whole moving front.
{
 const f=fixture();let started=0;for(let t=0;t<1500;t++){f.tick(t);if(f.messages.some(([,m])=>m.includes(WARDEN_MOVING[0][0].attack))){started=t;break;}}
 for(let t=started+1;t<=started+41;t++)f.tick(t);f.world.getDifficulty=()=>Difficulty.Peaceful;
 const count=f.d.particles.filter(([id])=>id.startsWith('hakkai:warden_front_')).length;
 for(let t=started+42;t<=started+56;t++)f.tick(t);
 assert.equal(f.d.particles.filter(([id])=>id.startsWith('hakkai:warden_front_')).length,count);
}
// When a warned player parries, no later frame hits them or reapplies effects.
{
 const f=fixture();const hits=[],other={...f.p,id:'q',sendMessage:()=>{},applyDamage:n=>hits.push(n)};
 f.setPlayers([f.p,other]);let parries=0;
 const ctrl=setupWardenBoss({world:f.world,system:f.sys,property:()=>{},report:(_,e)=>{throw e;},tryParry:p=>{if(p.id==='p'){parries++;return true;}return false;}});
 let started=0;for(let t=0;t<1500;t++){f.sys.currentTick=t;ctrl.tick(f.p,t);if(f.messages.some(([,m])=>m.includes(WARDEN_MOVING[0][0].attack))){started=t;break;}}
 parries=0;hits.length=0;for(let t=started+1;t<=started+56;t++){f.sys.currentTick=t;ctrl.tick(f.p,t);}
 assert.equal(parries,2);assert.deepEqual(hits,[10*2.4,7*2.4]);
}
console.log('Warden moving attacks: 15 variants, visual/collision sync, bounds, walls, failures, warnings, counters and multiplayer (mocked)');
// Refused moving-front damage likewise does not apply a standalone effect.
{
 const f=fixture();let calls=0;const effects=[];f.p.applyDamage=()=>{calls++;return false};f.p.addEffect=e=>effects.push(e);
 let started=0;for(let t=0;t<1500;t++){f.tick(t);if(f.messages.some(([,m])=>m.includes(WARDEN_MOVING[0][0].attack))){started=t;break;}}
 calls=0;effects.length=0;for(let t=started+1;t<=started+56;t++)f.tick(t);
 assert.equal(calls,2);assert.deepEqual(effects,[]);
}
