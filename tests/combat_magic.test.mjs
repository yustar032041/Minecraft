import assert from 'node:assert/strict';
import {castNewMagic} from '../Hakkai_v7.1.0/BehaviorPack/scripts/combat_magic.js';
function fixture(){
 const hits=[],marks=[],particles=[],messages=[],queue=[],staggered=[],pushes=[],effects=[],fires=[];
 const d={id:'a',isChunkLoaded:()=>true,getBlockFromRay:()=>undefined,getEntitiesFromRay:()=>[],getEntities:()=>[],getPlayers:()=>[],spawnParticle:(...x)=>particles.push(x)};
 function person(id,x=0){const h={currentValue:10,effectiveMax:20,setCurrentValue(v){this.currentValue=v}};return {id,typeId:'minecraft:player',isValid:true,location:{x,y:0,z:0},dimension:d,getGameMode:()=> 'survival',getHeadLocation(){return {x:this.location.x,y:1,z:0}},getViewDirection:()=>({x:1,y:0,z:0}),getComponent:()=>h,playAnimation:()=>{},playSound:()=>{},h};}
 function enemy(id,x=4,typeId='minecraft:zombie'){return {id,typeId,isValid:true,dimension:d,location:{x,y:0,z:0},getHeadLocation(){return {...this.location,y:1}},getComponent:()=>({hasTypeFamily:k=>k==='monster'}),applyDamage:(n)=>{hits.push([id,n]);return true;},applyKnockback:(v,n)=>pushes.push([id,v,n]),addEffect:(...x)=>effects.push([id,...x]),setOnFire:(n)=>fires.push([id,n])};}
 const p=person('p'),s={m:50,cd:new Map()},system={currentTick:100,runTimeout:fn=>queue.push(fn)};let totems=1;
 const go=kind=>castNewMagic({p,s,system,kind,notice:(_,m)=>messages.push(m),mark:(_,__,i)=>marks.push(i),visibleFrom:(_,pos)=>pos.x!==4.5,stagger:(e,t)=>staggered.push([e.id,t]),consumeTotem:()=>totems>0&&!!totems--});
 const run=()=>{let guard=0;while(queue.length&&guard++<20)queue.shift()();};
 return {p,s,system,d,go,person,enemy,hits,marks,particles,messages,run,queue,staggered,pushes,effects,fires,get totems(){return totems}};
}
{
 const f=fixture(),e=f.enemy('z');f.d.getEntitiesFromRay=(o,dir,opt)=>o.x>=2&&o.x<4?[{entity:e,distance:1}]:[];
 assert.equal(f.go('light'),true);assert.equal(f.s.m,45);assert.equal(f.hits.length,0,'projectile does not hit instantly');f.run();assert.deepEqual(f.hits,[['z',5]]);assert.deepEqual(f.staggered,[['z',30]]);assert.deepEqual(f.marks,[13]);
 assert.equal(f.go('light'),false);assert.equal(f.s.m,45,'shared cooldown');
}
for(const block of ['friend','wall','unloaded']){
 const f=fixture(),e=f.enemy('z');let n=0;
 f.d.getEntitiesFromRay=()=>{n++;return block==='friend'&&n===2?[{entity:{id:'friend',typeId:'minecraft:player',isValid:true},distance:2}]:[{entity:e,distance:3}];};
 if(block==='wall')f.d.getBlockFromRay=(o)=>o.x>=2?{block:{location:{x:3,y:1,z:0}},faceLocation:{x:0,y:0,z:0}}:undefined;
 if(block==='unloaded')f.d.isChunkLoaded=o=>o.x<=2;
 assert.equal(f.go('light'),true);f.run();assert.equal(f.hits.length,0,block+' blocks travel');
}
{
 const f=fixture();f.d.isChunkLoaded=()=>false;assert.equal(f.go('light'),false);assert.equal(f.s.m,50);assert.equal(f.s.cd.size,0);
}
{
 const f=fixture();assert.equal(f.go('bond'),false);assert.equal(f.s.m,50);
 const ally=f.person('ally',3),z=f.enemy('z',4);f.d.getPlayers=()=>[f.p,ally];f.d.getEntities=opts=>opts.type?[]:[z];
 assert.equal(f.go('bond'),true);assert.equal(f.s.m,30);assert.equal(f.p.h.currentValue,14);assert.equal(ally.h.currentValue,14);assert.deepEqual(f.hits,[['z',5]]);assert.deepEqual(f.marks,[14]);assert.equal(f.go('light'),false);
}
for(const [kind,cost,idx] of [['wind',8,15],['water',10,16],['fire',12,17]]){
 const f=fixture(),z=f.enemy('z'),hidden=f.enemy('hidden',4.5),boss=f.enemy('boss',3,'hakkai:time_warden');
 f.d.getEntities=opts=>opts.type?[boss]:[z,hidden,boss];
 assert.equal(f.go(kind),true);assert.equal(f.s.m,50-cost);assert.deepEqual(f.marks,[idx]);assert.ok(!f.hits.some(h=>h[0]==='hidden'));assert.equal(f.hits.length,2);
 if(kind==='wind')assert.ok(f.pushes.some(x=>x[0]==='z')&&!f.pushes.some(x=>x[0]==='boss'));
 if(kind==='water')assert.ok(f.effects.some(x=>x[0]==='z'&&x[1]==='slowness'&&x[3].amplifier===4));
 if(kind==='fire')assert.ok(f.fires.some(x=>x[0]==='z'&&x[1]===3));
}
{
 const f=fixture(),z=f.enemy('z'),boss=f.enemy('boss',3,'hakkai:time_warden');f.d.getEntities=o=>o.type?[boss]:[z,boss];
 f.s.m=14;assert.equal(f.go('moon'),false);assert.equal(f.totems,1);f.s.m=50;
 assert.equal(f.go('moon'),true);assert.equal(f.totems,0);assert.equal(f.s.m,35);assert.equal(f.p.h.currentValue,18);assert.deepEqual(f.staggered,[['z',60]]);assert.ok(!f.effects.some(x=>x[0]==='boss'));assert.deepEqual(f.marks,[18]);
 f.system.currentTick=220;assert.equal(f.go('moon'),false);assert.equal(f.s.m,35,'no totem means no charge or cooldown');assert.equal(f.s.cd.get('spell'),220);
}
{
 const f=fixture();f.s.m=0;assert.equal(f.go('light'),false);f.p.getGameMode=()=> 'creative';assert.equal(f.go('light'),true);assert.equal(f.s.m,0);
}
console.log('Six spells: projectile travel, blockers, area effects, moon consumption and shared cooldown (mocked)');
