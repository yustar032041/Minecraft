import assert from 'node:assert/strict';
import {WARDEN_EXTRA_PATTERNS} from '../Hakkai_v7.1.0/BehaviorPack/scripts/warden_extra_patterns.js';
import {WARDEN_ADVANCED} from '../Hakkai_v7.1.0/BehaviorPack/scripts/warden_advanced_attacks.js';
import {WARDEN_MOVING,startMoving,advanceMoving} from '../Hakkai_v7.1.0/BehaviorPack/scripts/warden_moving_attacks.js';
import {WARDEN_PHASES,WARDEN_ALTERNATES,WARDEN_EXTRA,inWardenWarning,setupWardenBoss} from '../Hakkai_v7.1.0/BehaviorPack/scripts/warden_boss.js';
import {Difficulty,GameMode} from '@minecraft/server';
const patterns=WARDEN_ADVANCED.flat();assert.equal(WARDEN_ADVANCED.length,5);assert.ok(WARDEN_ADVANCED.every(x=>x.length===12));
const all=[...WARDEN_PHASES,...WARDEN_ALTERNATES,...WARDEN_EXTRA.flat(),...WARDEN_MOVING.flat(),...patterns,...WARDEN_EXTRA_PATTERNS.flat()];
assert.equal(all.length,200);assert.equal(new Set(all.map(a=>a.attack)).size,200,'all named patterns unique');
const aim={x:0,y:80,z:0};
const arena=()=>({id:'hakkai:warden_arena',particles:[],isChunkLoaded:()=>true,getBlock:()=>({isAir:true}),getBlockFromRay:()=>undefined,spawnParticle(id,p){this.particles.push([id,p]);}});
// For 160 variants: every drawn frame and every hit remains within the
// warning, has a nearby current/previous visual, and hits at most once.
for(let phase=0;phase<5;phase++)for(const attack of [...WARDEN_ADVANCED[phase],...WARDEN_EXTRA_PATTERNS[phase]]){
 const d=arena(),m=startMoving(aim,attack,phase,['p'],0),players=[];
 for(let x=-8;x<=8;x+=1)for(let z=-8;z<=8;z+=1)players.push({id:`${x},${z}`,location:{x,y:80,z}});
 let hits=0,last=[];
 for(let t=1;t<=16;t++){
  d.particles.length=0;const r=advanceMoving(d,m,t,players),visual=d.particles.map(([,p])=>p);
  assert.equal(r.done,t===16,attack.attack);assert.ok(visual.length>0&&visual.length<=48,attack.attack);
  for(const v of visual)assert.ok(inWardenWarning({...v,y:80},aim,attack),`${attack.attack} visual outside warning: ${JSON.stringify(v)}`);
  for(const p of r.targets){
   assert.ok(inWardenWarning(p.location,aim,attack),`${attack.attack} hit outside warning: ${p.id}`);
   assert.ok([...last,...visual].some(v=>Math.hypot(v.x-p.location.x,v.z-p.location.z)<=1.3),`${attack.attack} hit far from front: ${p.id}`);
   assert.ok(!m.hit.has(p.id));m.hit.add(p.id);hits++;
  }
  last=visual;
 }
 assert.ok(hits>0,`${attack.attack} never hits`);
}
// Each variation materially changes the moving front or timing.
{
 const a=WARDEN_ADVANCED[0],sample=(attack,p)=>{
  const d=arena(),m=startMoving(aim,attack,0,['p'],0),seen=[];
  for(let t=1;t<=16;t++){d.particles.length=0;const r=advanceMoving(d,m,t,[{id:'p',location:p}]);if(r.targets.length){seen.push(t);m.hit.add('p');}}
  return seen[0];
 };
 assert.ok(sample(a[0],{x:5,y:80,z:0})<sample(WARDEN_MOVING[0][0],{x:5,y:80,z:0}),'inward ring reaches outer point first');
 assert.ok(sample(a[1],{x:0,y:80,z:5})<sample(WARDEN_MOVING[0][1],{x:0,y:80,z:5}),'reverse projectile crosses near edge first');
 assert.ok(sample(a[2],{x:5,y:80,z:0})>0,'horizontal projectile crosses x axis');
 assert.ok(sample(a[4],{x:5,y:80,z:2.5})>0,'horizontal barrage has side lanes');
 assert.ok(sample(a[5],{x:5,y:80,z:0})>sample(a[6],{x:5,y:80,z:0}),'cross reverses front direction');
 assert.notEqual(sample(a[7],{x:0,y:80,z:4}),sample(a[8],{x:0,y:80,z:4}),'sweep direction changes timing');
 assert.ok(sample(a[9],{x:-4,y:80,z:0})<sample(a[10],{x:-4,y:80,z:0}),'zone order reverses');
 assert.ok(sample(a[11],{x:-4,y:80,z:0})>0&&sample(a[11],{x:4,y:80,z:0})>0,'twin waves originate at each centre');
}
// Every new movement type stops safely on failed FX, blocked paths, unloaded
// chunks and missed ticks; no branch can leave an invisible damaging front.
for(const attack of [...WARDEN_ADVANCED[0],...WARDEN_EXTRA_PATTERNS[0]])for(const failure of ['particle','blocked','chunk','late']){
 const d=arena(),m=startMoving(aim,attack,0,['p'],0);
 if(failure==='particle')d.spawnParticle=()=>{throw Error('no particle')};
 if(failure==='blocked')d.getBlock=()=>({isAir:false});
 if(failure==='chunk')d.isChunkLoaded=()=>false;
 const r=advanceMoving(d,m,failure==='late'?2:1,[{id:'p',location:aim}]);
 assert.equal(r.done,true,`${attack.attack}: ${failure}`);assert.deepEqual(r.targets,[]);
}
// Real controller: each phase cycles its attacks, and each advanced warning
// is delivered before its first particle front. No synthetic index access.
for(let phase=0;phase<5;phase++){
 const d=arena(),warnings=new Map();let current,currentTick=-1;
 d.spawnParticle=function(id,p){if(id==='hakkai:warning_marker'){this.markers++;if(current&&system.currentTick===currentTick){const list=warnings.get(current)??[];list.push(p);warnings.set(current,list);}}else if(id.startsWith('hakkai:warden_front_'))this.fronts++;};d.markers=0;d.fronts=0;
 const messages=[],hits=[];const p={id:'p',isValid:true,typeId:'minecraft:player',location:aim,dimension:d,isSneaking:true,getGameMode:()=>GameMode.Survival,sendMessage:m=>{messages.push(m);currentTick=system.currentTick;current=WARDEN_ADVANCED[phase].find(a=>m.includes(`§c${a.attack}：`));},applyDamage:n=>hits.push(n),addEffect:()=>{},playSound:()=>{}};
 const h={currentValue:[5000,3990,2990,1990,990][phase],effectiveMax:5000,setCurrentValue(v){this.currentValue=v;}};
 const e={id:'e',isValid:true,typeId:'hakkai:time_warden',location:{x:0,y:80,z:3},dimension:d,getComponent:()=>h,getDynamicProperty:()=>undefined,setDynamicProperty:()=>{},playAnimation:()=>{}};
 d.getPlayers=()=>[p];d.getEntities=()=>[e];const system={currentTick:0},world={getDifficulty:()=>Difficulty.Normal,getAllPlayers:()=>[p]},ctrl=setupWardenBoss({world,system,property:()=>{},report:(_,e)=>{throw e;}});
 for(let t=0;t<=(phase===4?18000:3600);t++){system.currentTick=t;ctrl.tick(p,t);}
 for(const attack of WARDEN_ADVANCED[phase]){
  assert.ok(messages.some(m=>m.includes(`§c${attack.attack}：`)),`${phase}: ${attack.attack} not scheduled`);
  const markers=warnings.get(attack);assert.ok(markers?.length>=20,`${attack.attack}: missing outline`);
  assert.ok(markers.every(p=>inWardenWarning(p,aim,{...attack,radius:attack.radius+1e-6,width:(attack.width??0)+1e-6})),`${attack.attack}: outline does not match hazard`);
 }
 assert.ok(d.markers>0&&d.fronts>0&&hits.length>0);
}
// Cancel advanced warnings by the real close-range counter, including shapes
// whose danger is away from the aimed centre. No moving front may launch.
for(const index of [5,7,9,11]){
 const attack=WARDEN_ADVANCED[0][index],d=arena(),messages=[],p={id:'p',isValid:true,typeId:'minecraft:player',location:{...aim},dimension:d,isSneaking:true,getGameMode:()=>GameMode.Survival,sendMessage:m=>messages.push(m),applyDamage:()=>assert.fail('parried attack hit'),addEffect:()=>{},playSound:()=>{}};
 const h={currentValue:5000,effectiveMax:5000,setCurrentValue(v){this.currentValue=v;}},e={id:'e',isValid:true,typeId:'hakkai:time_warden',location:{x:0,y:80,z:3},dimension:d,getComponent:()=>h,getDynamicProperty:()=>undefined,setDynamicProperty:()=>{},playAnimation:()=>{}};
 d.getPlayers=()=>[p];d.getEntities=()=>[e];const system={currentTick:0},world={getDifficulty:()=>Difficulty.Normal,getAllPlayers:()=>[p]},ctrl=setupWardenBoss({world,system,property:()=>{},report:(_,err)=>{throw err;},spendParry:()=>true});
 // Ignore earlier attacks; start checking damage only once the selected warning is issued.
 p.applyDamage=()=>{};let started=-1;
 for(let t=0;t<3600;t++){system.currentTick=t;ctrl.tick(p,t);if(messages.some(m=>m.includes(`§c${attack.attack}：`))){started=t;break;}}
 assert.ok(started>=0);if(attack.shape==='twin')p.location={x:attack.offset,y:80,z:0};
 system.currentTick=started+32;assert.equal(ctrl.onMeleeParry({damagingEntity:p,hitEntity:e}),true,attack.attack);
 d.particles.length=0;p.applyDamage=()=>assert.fail('parried attack hit');
 for(let t=started+33;t<=started+56;t++){system.currentTick=t;ctrl.tick(p,t);}
 assert.ok(!d.particles.some(([id])=>id.startsWith('hakkai:warden_front_')),attack.attack);
}
console.log('Warden 200 named patterns: 160 moving variants, matching visuals, coverage, order and all phase schedules (mocked)');
