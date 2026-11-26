// Combat functions exercised with synchronous mock entities. These tests do
// not prove Bedrock event ordering, immunity, particle visibility or balance.
import {test} from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';
import {applyCombatHit,combatEffectAllowed} from '../Hakkai_v7.1.0/BehaviorPack/scripts/combat_resonance.js';
import {configureFriendlyFire,setFriendlyFire} from '../Hakkai_v7.1.0/BehaviorPack/scripts/friendly_fire.js';
import {castNewMagic} from '../Hakkai_v7.1.0/BehaviorPack/scripts/combat_magic.js';
import {setupCombatUltimate} from '../Hakkai_v7.1.0/BehaviorPack/scripts/combat_ultimate.js';
const source=fs.readFileSync('Hakkai_v7.1.0/BehaviorPack/scripts/main.js','utf8');
function fixture(){
 const hits=[],effects=[],pushes=[],fires=[],particles=[],queue=[],marks=[];
 const d={id:'hakkai:realm_0',isChunkLoaded:()=>true,getBlockFromRay:()=>undefined,getEntitiesFromRay:()=>[],getEntities:()=>[],getPlayers:()=>[],spawnParticle:(...x)=>particles.push(x)};
 const h={currentValue:10,effectiveMax:20,setCurrentValue(v){this.currentValue=v}};
 const p={id:'p',typeId:'minecraft:player',isValid:true,dimension:d,location:{x:0,y:0,z:0},getHeadLocation:()=>({x:0,y:1,z:0}),getViewDirection:()=>({x:1,y:0,z:0}),getGameMode:()=> 'survival',getComponent:()=>h,addEffect:()=>{},removeEffect:()=>{},playAnimation:()=>{},playSound:()=>{}};
 function enemy(id='z',result=true){return {id,typeId:'minecraft:zombie',isValid:true,dimension:d,location:{x:2,y:0,z:0},getHeadLocation(){return {x:this.location.x,y:1,z:this.location.z}},getComponent:()=>({hasTypeFamily:k=>k==='monster'}),
  applyDamage:n=>{hits.push([id,n]);if(result==='throw')throw Error('rejected');return result},addEffect:(...a)=>effects.push([id,...a]),setOnFire:(...a)=>fires.push([id,...a]),applyKnockback:(...a)=>pushes.push([id,...a])};}
 const s={m:100,s:100,cd:new Map()},system={currentTick:100,runTimeout:f=>queue.push(f)};
 const magic=kind=>castNewMagic({p,s,system,kind,notice:()=>{},mark:(_,__,i)=>marks.push(i),visibleFrom:()=>true,stagger:(e,n)=>effects.push([e.id,'stagger',n]),consumeTotem:()=>true});
 const run=()=>{while(queue.length)queue.shift()()};
 return {p,h,d,s,system,enemy,hits,effects,pushes,fires,particles,queue,marks,magic,run};
}
test('common hit gates fire, slow and knockback on actual damage acceptance',()=>{
 for(const value of [false,'throw']){
  const f=fixture(),e=f.enemy('reject',value);assert.equal(applyCombatHit(f.p,e,8,2,7,1),false);
  assert.equal(f.hits.length,1);assert.deepEqual(f.effects,[]);assert.deepEqual(f.fires,[]);assert.deepEqual(f.pushes,[]);
 }
 const f=fixture(),e=f.enemy();assert.equal(applyCombatHit(f.p,e,8,2,7,1),true);
 assert.equal(f.hits.length,1);assert.equal(f.fires.length,1);assert.equal(f.effects[0][1],'slowness');assert.equal(f.pushes.length,1);
});
test('accepted damage survives optional effect errors, missing location and post-damage invalidation',()=>{
 const f=fixture(),e=f.enemy();e.setOnFire=()=>{throw Error('fire')};e.addEffect=()=>{throw Error('effect')};e.applyKnockback=()=>{throw Error('push')};assert.equal(applyCombatHit(f.p,e,8,2,7,1),true);
 const noPos=f.enemy('no-pos');Object.defineProperty(noPos,'location',{get(){throw Error('location')}});assert.equal(applyCombatHit(f.p,noPos,8,2,7,1),true,'location failure must not prevent damage');
 const gone=f.enemy('gone');gone.applyDamage=()=>{gone.isValid=false;return true};assert.equal(applyCombatHit(f.p,gone,8,2,7,1),true);assert.equal(combatEffectAllowed(f.p,gone),false);
 const moved=f.enemy('moved');moved.applyDamage=()=>{moved.dimension={id:'hakkai:realm_1'};return true};
 const before=[f.effects.length,f.fires.length,f.pushes.length];assert.equal(applyCombatHit(f.p,moved,8,2,7,1),true);assert.deepEqual([f.effects.length,f.fires.length,f.pushes.length],before);
});
test('knockback direction is captured before damage callbacks move the victim',()=>{
 const f=fixture(),e=f.enemy();e.applyDamage=()=>{e.location.x=-50;return true};
 assert.equal(applyCombatHit(f.p,e,8,0,0,1),true);assert.ok(f.pushes[0][1].x>0);
});
test('switching player protection on during damage blocks post-hit effects',()=>{
 let flag=1;configureFriendlyFire({getDynamicProperty:()=>flag,setDynamicProperty:(_k,v)=>flag=v});assert.equal(setFriendlyFire(true),true);
 const f=fixture(),e=f.enemy();e.typeId='minecraft:player';e.getGameMode=()=> 'survival';e.applyDamage=()=>{flag=0;return true};
 assert.equal(applyCombatHit(f.p,e,8,2,7,1),true);assert.deepEqual(f.effects,[]);assert.deepEqual(f.fires,[]);assert.deepEqual(f.pushes,[]);assert.equal(combatEffectAllowed(f.p,e),false);
});
for(const kind of ['light','water','fire','wind'])for(const outcome of [false,'throw',true])test(`${kind}: ${outcome} damage controls enemy effects`,()=>{
 const f=fixture(),e=f.enemy('z',outcome);
 f.d.getEntities=o=>o.type?[]:[e];f.d.getEntitiesFromRay=()=>[{entity:e,distance:1}];
 assert.equal(f.magic(kind),true);f.run();assert.equal(f.hits.length,1);
 if(outcome!==true){assert.deepEqual(f.effects,[]);assert.deepEqual(f.fires,[]);assert.deepEqual(f.pushes,[]);}
 else if(kind==='light'){assert.ok(f.effects.some(x=>x[1]==='stagger'));assert.ok(f.effects.some(x=>x[1]==='slowness'));}
 else if(kind==='water')assert.ok(f.effects.some(x=>x[1]==='slowness'&&x[3].amplifier===4));
 else if(kind==='fire')assert.equal(f.fires.length,1);
 else assert.equal(f.pushes.length,1);
});
test('light projectile stops at a friendly at the same distance, in either ray result order',()=>{
 for(const reverse of [false,true]){
  const f=fixture(),e=f.enemy(),friend={id:'friend',typeId:'minecraft:villager',isValid:true,getComponent:()=>({hasTypeFamily:()=>false})};
  const hits=[{entity:e,distance:1},{entity:friend,distance:1}];f.d.getEntitiesFromRay=()=>reverse?[...hits].reverse():hits;
  assert.equal(f.magic('light'),true);f.run();assert.deepEqual(f.hits,[]);assert.deepEqual(f.effects,[]);
 }
});
for(const outcome of [false,'throw',true])test(`ultimate: ${outcome} damage gates slow, burn and push`,()=>{
 const f=fixture(),e=f.enemy('z',outcome);f.d.getEntities=o=>o.type?[]:[e];
 const ultimate=setupCombatUltimate({system:f.system,notice:()=>{},visibleFrom:()=>true});f.s.s=15;f.s.m=15;
 assert.equal(ultimate.cast(f.p,f.s,undefined),true);assert.equal(f.hits.length,1);
 if(outcome===true){assert.equal(f.fires.length,1);assert.ok(f.effects.some(x=>x[1]==='slowness'));assert.equal(f.pushes.length,1);}
 else{assert.deepEqual(f.fires,[]);assert.deepEqual(f.effects,[]);assert.deepEqual(f.pushes,[]);}
});
function element(f,targets,a,b=-1){
 const code=source.slice(source.indexOf('function castElement('),source.indexOf('\nasync function form(',source.indexOf('function castElement(')));assert.ok(code.startsWith('function castElement('));
 const c={state:()=>f.s,system:f.system,isCreative:()=>false,notice:()=>{},effects:Array(20).fill('speed'),world:{getTimeOfDay:()=>6000},currentPlace:()=>undefined,home:[],aspect:()=>0,enemies:()=>targets,visibleFrom:()=>true,hit:applyCombatHit,combatEffectAllowed,pairs:[],mark:()=>{},attrs:Array(8).fill('element')};
 vm.createContext(c);vm.runInContext(code,c);c.castElement(f.p,a,b,'test');
}
for(const [a,b] of [[0,-1],[1,-1],[2,-1],[3,-1],[4,-1],[5,-1],[6,-1],[7,-1],[0,1],[2,3],[4,1],[5,6],[7,0]])test(`element ${a}/${b}: rejection applies no enemy status or push`,()=>{
 const f=fixture(),e=f.enemy('z',false);element(f,[e],a,b);
 assert.deepEqual(f.effects,[]);assert.deepEqual(f.pushes,[]);assert.deepEqual(f.fires,[]);
 if(a===6)assert.equal(f.h.currentValue,10,'no healing without a landed hit');
});
test('dark magic heals only per accepted hit, including a lethal hit, capped at five',()=>{
 const f=fixture(),a=f.enemy('a',true),b=f.enemy('b',false),c=f.enemy('c','throw');
 a.applyDamage=()=>{a.isValid=false;return true};element(f,[a,b,c],6);assert.equal(f.h.currentValue,12);
 const g=fixture();element(g,[g.enemy('a'),g.enemy('b'),g.enemy('c')],6);assert.equal(g.h.currentValue,15);
});
for(const [a,b,status] of [[7,-1,'slowness'],[4,-1,'weakness'],[0,1,'blindness']])test(`element ${a}/${b}: accepted hit retains ${status}`,()=>{
 const f=fixture();element(f,[f.enemy()],a,b);assert.ok(f.effects.some(x=>x[1]===status));
});

test('attribute spell effect completes even if learned-spell history cannot be written',()=>{
 const f=fixture(),messages=[];const code=source.slice(source.indexOf('function castElement('),source.indexOf('\nasync function form(',source.indexOf('function castElement(')));
 const c={state:()=>f.s,system:f.system,isCreative:()=>false,notice:(_p,msg)=>messages.push(msg),effects:Array(20).fill('speed'),world:{getTimeOfDay:()=>6000},currentPlace:()=>undefined,home:[],aspect:()=>0,enemies:()=>[],visibleFrom:()=>true,hit:applyCombatHit,combatEffectAllowed,pairs:[],mark:()=>{throw Error('history unavailable')},attrs:Array(8).fill('element')};
 vm.createContext(c);vm.runInContext(code,c);assert.doesNotThrow(()=>c.castElement(f.p,0,-1,'wind'));assert.ok(messages.some(m=>m.includes('wind')));assert.equal(f.s.m,88);
});
