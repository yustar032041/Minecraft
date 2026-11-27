// Mocked warp, flight and collision checks; not Bedrock physics or rendering.
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Difficulty,GameMode,EntityDamageCause} from '@minecraft/server';
import {setupRealmEnders,ENDER_ABILITIES,ENDER_WARPS} from '../Hakkai_v7.1.0/BehaviorPack/scripts/realm_ender.js';
function fixture(realm,{unloaded=false,occupied=false,allowWarp=true}={}){
 let mob,now=0;const teleports=[],marks=[],messages=[],hits=[],effects=[],queue=[];
 const d={id:'test',isChunkLoaded:()=>!unloaded,
  getBlock:p=>p.y<80?{isSolid:true,isWaterlogged:false,typeId:'minecraft:stone'}:{isAir:true},
  getBlockFromRay:(p,dir)=>dir.y===-1?{face:'Up',block:{location:{y:Math.floor(p.y)-1}},faceLocation:{y:1}}:undefined,
  getEntitiesFromRay:(a,v,{maxDistance})=>{
   const dx=p.location.x-a.x,dy=p.location.y+.8-a.y,dz=p.location.z-a.z;
   const along=dx*v.x+dy*v.y+dz*v.z,radial=Math.hypot(dx-along*v.x,dy-along*v.y,dz-along*v.z);
   return along>=0&&radial<=.35&&Math.max(0,along-.35)<=maxDistance?[{entity:p,distance:Math.max(0,along-.35)}]:[];
  },
  getPlayers:({location,maxDistance})=>occupied||Math.hypot(p.location.x-location.x,p.location.z-location.z)<=maxDistance?[p]:[],
  getEntities:opts=>opts.families?[mob]:[],spawnParticle:(id,pos)=>marks.push([now,id,{...pos}])};
 const p={id:'p',typeId:'minecraft:player',isValid:true,dimension:d,location:{x:10,y:80,z:0},
  getGameMode:()=>GameMode.Survival,getViewDirection:()=>({x:1,y:0,z:0}),sendMessage:s=>messages.push(s),
  applyDamage:n=>{hits.push(n);return true},addEffect:(...args)=>effects.push(args)};
 mob={id:'m',typeId:`hakkai:ender_${realm}`,isValid:true,dimension:d,location:{x:0,y:80,z:0},
  teleport:(pos,options)=>{teleports.push([{...pos},options]);mob.location={...pos}},playAnimation:()=>{}};
 const system={currentTick:0,runTimeout(fn,n){queue.push({at:this.currentTick+n,fn});}},world={getDifficulty:()=>Difficulty.Normal,getAllPlayers:()=>[p]};
 const ctrl=setupRealmEnders({world,system,safe:()=>allowWarp,report:(_,e)=>{throw e}});
 function tick(t){now=system.currentTick=t;ctrl.tick(p,t)}
 function advance(to){while(now<to){now++;system.currentTick=now;while(queue.some(x=>x.at===now)){const i=queue.findIndex(x=>x.at===now);queue.splice(i,1)[0].fn();}if(now%10===0)ctrl.tick(p,now);}}
 ctrl.onHurt({hurtEntity:mob,damageSource:{damagingEntity:p,cause:EntityDamageCause.entityAttack}});
 return {p,mob,d,ctrl,system,tick,advance,teleports,marks,messages,hits,effects};
}
test('eight approaches warp safely, show windup, then fire each realm shot',()=>{
 assert.equal(new Set(ENDER_WARPS.map(p=>JSON.stringify(p))).size,8);
 for(let realm=0;realm<8;realm++){
  const f=fixture(realm);f.tick(40);assert.equal(f.teleports.length,1,`realm ${realm} approaches`);
  const [at,options]=f.teleports[0];assert.deepEqual(options,{checkForBlocks:true});assert.ok(Math.hypot(at.x-f.p.location.x,at.z-f.p.location.z)>=2.5);
  assert.equal(f.marks.filter(([,id])=>id==='minecraft:basic_portal_particle').length,2);
  const tells=f.marks.filter(([,id])=>id.startsWith('hakkai:tell_'));assert.equal(tells.length,8);
  assert.ok(tells.every(([, ,pos])=>Math.hypot(pos.x-at.x,pos.z-at.z)<=1.21));
  assert.equal(f.messages.length,0);assert.ok(!f.marks.some(([,id])=>id==='hakkai:warning_marker'));
  f.advance(80);assert.equal(f.hits.length,0);f.advance(90);
  assert.deepEqual(f.hits,[ENDER_ABILITIES[realm].damage]);assert.equal(f.effects[0][0],ENDER_ABILITIES[realm].effect);
  assert.ok(f.marks.some(([t,id])=>t>80&&id.startsWith('hakkai:shot_')));
  f.advance(80+ENDER_WARPS[realm].recovery);assert.equal(f.teleports.length,2,'next approach follows recovery');
 }
});
test('blocked or occupied approach cannot become a remote attack',()=>{
 for(const options of [{unloaded:true},{occupied:true},{allowWarp:false}]){
  const f=fixture(0,options);f.tick(40);f.advance(120);
  assert.equal(f.teleports.length,0);assert.equal(f.messages.length,0);assert.equal(f.hits.length,0);
 }
});
test('failed approach can shoot nearby when the attack path is loaded',()=>{
 const f=fixture(0,{allowWarp:false});f.mob.location.x=7;f.tick(40);f.advance(90);
 assert.equal(f.teleports.length,0);assert.equal(f.messages.length,0);assert.deepEqual(f.hits,[ENDER_ABILITIES[0].damage]);
});
test('projectile retreat cannot be followed by another teleport in the same tick',()=>{
 const f=fixture(0);f.system.currentTick=40;
 f.ctrl.onHurt({hurtEntity:f.mob,damageSource:{damagingEntity:f.p,cause:EntityDamageCause.projectile}});
 f.tick(40);assert.equal(f.teleports.length,1);assert.equal(f.messages.length,0);
});
test('all eight shots keep their launch direction when the target sidesteps',()=>{
 for(let realm=0;realm<8;realm++){
  const f=fixture(realm);f.tick(40);f.advance(80);f.p.location.y+=4;f.advance(100);
  assert.deepEqual(f.hits,[],`realm ${realm}`);
 }
});
test('missing tell or shot particle does not control gameplay',()=>{
 for(let realm=0;realm<8;realm++){
  const f=fixture(realm),spawn=f.d.spawnParticle;
  f.d.spawnParticle=(id,p)=>{if(id.startsWith('hakkai:tell_')||id.startsWith('hakkai:shot_'))throw Error('unavailable');spawn(id,p);};
  f.tick(40);f.advance(90);assert.deepEqual(f.hits,[ENDER_ABILITIES[realm].damage]);
 }
});
