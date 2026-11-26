// Mocked checks for separate traveler/chief paths; not a Bedrock render test.
import assert from 'node:assert/strict';
import {setupRealmEnders,ENDER_ABILITIES} from '../Hakkai_v7.1.0/BehaviorPack/scripts/realm_ender.js';
import {setupFushiSystem,CHIEF_ATTACKS} from '../Hakkai_v7.1.0/BehaviorPack/scripts/fushi_system.js';
import {GameMode,Difficulty} from '@minecraft/server';
function fixture(type){
 let now=0;const hits=[],effects=[],markers=[],messages=[];
 const d={id:'realm',getEntities:()=>[mob],spawnParticle:(id,pos)=>{if(id==='hakkai:warning_marker')markers.push({...pos});}};
 const make=(id,x)=>({id,typeId:'minecraft:player',isValid:true,dimension:d,location:{x,y:80,z:0},getGameMode:()=>GameMode.Survival,sendMessage:s=>messages.push([now,id,s]),applyDamage:n=>{hits.push([now,id,n]);return true;},addEffect:(...e)=>effects.push([id,...e])});
 const p=make('primary',2),q=make('second',2);const mob={id:'m',typeId:type,isValid:true,dimension:d,location:{x:0,y:80,z:0},playAnimation:()=>{}};
 const system={currentTick:0},world={getDifficulty:()=>Difficulty.Normal,getAllPlayers:()=>[p,q]};
 const ctrl=type==='hakkai:fushi_chief'?setupFushiSystem({world,system,report:(_,e)=>{throw e}}):setupRealmEnders({world,system,report:(_,e)=>{throw e}});
 ctrl.onHurt({hurtEntity:mob,damageSource:{damagingEntity:p}});
 const tick=(t,viewer=p)=>{now=system.currentTick=t;ctrl.tick(viewer,t);};
 return {p,q,mob,ctrl,tick,hits,effects,markers,messages,system};
}
// Moon and charge now move over time: their geometry and timing are tested
// in their own collision suites, not this instant-hit fixture.
const paths=[...ENDER_ABILITIES.map((ability,i)=>({type:`hakkai:ender_${i}`,ability,index:0})),...CHIEF_ATTACKS.map((ability,index)=>({type:'hakkai:fushi_chief',ability,index})).filter(x=>x.index===2)];
for(const {type,ability,index} of paths)for(const placement of ['inside','boundary','outside','above','below','upperEdge','lowerEdge']){
 const f=fixture(type);
 for(let i=0;i<index;i++){f.tick(20+i*80);f.tick(60+i*80);}
 f.hits.length=0;f.effects.length=0;f.markers.length=0;f.messages.length=0;
 const start=20+index*80;f.tick(start);
 assert.equal(f.markers.length,16,`${type}/${index}`);
 assert.equal(f.messages.length,1);assert.equal(f.messages[0][1],'primary');assert.match(f.messages[0][2],/輪から離れよう/);assert.match(f.messages[0][2],/上下3ブロック/);assert.match(f.messages[0][2],/あなたのみ対象/);
 for(const marker of f.markers){assert.ok(Math.abs(Math.hypot(marker.x-2,marker.z)-ability.radius)<1e-9);assert.ok(Math.abs(marker.y-80.15)<1e-9);}
 // A second player's hit cannot silently retarget an already announced move.
 f.system.currentTick=start+1;f.ctrl.onHurt({hurtEntity:f.mob,damageSource:{damagingEntity:f.q}});
 if(placement==='boundary')f.p.location.x=2+ability.radius;
 if(placement==='outside')f.p.location.x=2+ability.radius+.01;
 if(placement==='above')f.p.location.y=83.01;
 if(placement==='below')f.p.location.y=76.99;
 if(placement==='upperEdge')f.p.location.y=83;
 if(placement==='lowerEdge')f.p.location.y=77;
 f.tick(start+39,f.q);assert.deepEqual(f.hits,[],'not before forty ticks');f.tick(start+40,f.q);
 if(['inside','boundary','upperEdge','lowerEdge'].includes(placement)){
  assert.deepEqual(f.hits,[[start+40,'primary',ability.damage]]);assert.equal(f.effects[0][0],'primary');assert.equal(f.effects[0][1],ability.effect);
 }else assert.deepEqual(f.hits,[],`${type}/${index}/${placement}`);
}
console.log('8 traveler and chief mist: warning radius, fixed aim, 40-tick windup, height and warned target (mocked)');
