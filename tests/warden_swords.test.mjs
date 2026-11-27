import assert from 'node:assert/strict';
import {setupWardenSwords} from '../Hakkai_v7.1.0/BehaviorPack/scripts/warden_swords.js';
function fixture(){
 const properties=new Map(),entities=[],hits=[],messages=[];let serial=0;
 const world={getDynamicProperty:k=>properties.get(k),setDynamicProperty:(k,v)=>properties.set(k,v)};
 const particles=[];
 const dim={getEntities:()=>entities.filter(e=>e.isValid),getPlayers:()=>[player],isChunkLoaded:()=>true,getBlock:()=>({isAir:true}),getBlockFromRay:()=>undefined,spawnParticle:(id,p)=>particles.push([id,p]),
  spawnEntity(typeId,location){const own=new Map();const e={id:`blade${serial++}`,typeId,location:{...location},dimension:dim,isValid:true,properties:new Map(),getDynamicProperty:k=>own.get(k),setDynamicProperty:(k,v)=>own.set(k,v),setProperty:(k,v)=>e.properties.set(k,v),teleport:p=>{e.location={...p};},remove:()=>{e.isValid=false;}};entities.push(e);return e;}};
 const player={id:'player',isValid:true,typeId:'minecraft:player',location:{x:0,y:80,z:0},sendMessage:m=>messages.push(m),applyDamage:(n,source)=>{hits.push({n,source});return true;}};
 const boss={id:'boss',isValid:true,typeId:'hakkai:time_warden',location:{x:0,y:80,z:0},dimension:dim,properties:new Map(),setProperty(k,v){this.properties.set(k,v);}};
 const make=()=>setupWardenSwords({world,validPlayer:p=>p.isValid&&p.typeId==='minecraft:player',damageCause:'entityAttack'});
 return {world,dim,player,boss,entities,hits,messages,particles,properties,ctrl:make(),make};
}
{
 const f=fixture();f.ctrl.tick(f.boss,1,0);assert.equal(f.entities.length,0);
 for(let t=1;t<41;t++)f.ctrl.tick(f.boss,2,t);
 assert.equal(f.entities.length,0,'transition warning before blades');
 f.ctrl.tick(f.boss,2,41);assert.equal(f.entities.length,8);assert.equal(f.messages.length,1);
 assert.equal(new Set(f.entities.map(e=>e.typeId)).size,8);
 assert.ok(f.entities.every(e=>e.getDynamicProperty('hakkai:warden_blade_owner')==='boss'));
 assert.equal(f.ctrl.acquire(f.boss,3),true);assert.equal(f.boss.properties.get('hakkai:held_blade'),4);
 assert.equal(f.entities[3].properties.get('hakkai:held'),true);
 f.ctrl.tick(f.boss,3,42);f.ctrl.release(f.boss);
 assert.equal(f.boss.properties.get('hakkai:held_blade'),0);assert.equal(f.entities[3].properties.get('hakkai:held'),false);
 for(let t=43;t<300;t++)f.ctrl.tick(f.boss,2,t);
 assert.ok(f.hits.length>0,'visible blades can hit on contact');
 assert.ok(f.particles.some(([id])=>id==='hakkai:mob_sand')&&f.particles.some(([id])=>id==='hakkai:mob_frost'),'sand and ice blades produce distinct moving pulses');
 assert.ok(!f.particles.some(([id])=>id==='hakkai:warning_marker'),'independent blades never put warning markers at the player');
 assert.ok(f.hits.every(hit=>hit.source.damagingEntity===f.boss));
 assert.ok(f.entities.some(e=>e.properties.has('hakkai:blade_state')));
 const reloaded=f.make();reloaded.tick(f.boss,2,300);reloaded.tick(f.boss,2,340);assert.equal(f.entities.length,8,'reload reuses owned blades');
 reloaded.onDeath(f.boss);assert.equal(f.entities.filter(e=>e.isValid).length,0);
}
{
 const f=fixture();f.ctrl.tick(f.boss,2,0);f.ctrl.tick(f.boss,2,40);
 const another={...f.boss,id:'second'};f.ctrl.tick(another,2,0);f.ctrl.tick(another,2,40);
 assert.equal(f.entities.length,16);f.ctrl.onDeath(f.boss);
 assert.equal(f.entities.filter(e=>e.isValid).length,8,'death never removes another owner');
 const leftover=f.dim.spawnEntity('hakkai:warden_sword_0',{x:1,y:81,z:1});leftover.setDynamicProperty('hakkai:warden_blade_owner','boss');
 const unknown=f.dim.spawnEntity('hakkai:warden_sword_0',{x:1,y:81,z:1});unknown.setDynamicProperty('hakkai:warden_blade_owner','unloaded');
 f.make().sweep(f.dim);assert.equal(leftover.isValid,false,'confirmed dead owner cleaned after reload');assert.equal(unknown.isValid,true,'unloaded is not necessarily dead');
}
{
 const f=fixture();f.ctrl.tick(f.boss,2,0);f.dim.isChunkLoaded=()=>false;f.ctrl.tick(f.boss,2,40);assert.equal(f.entities.length,0,'never spawn into unloaded blocks');
 f.dim.isChunkLoaded=()=>true;f.ctrl.tick(f.boss,2,41,{peaceful:true});assert.equal(f.entities.length,0,'peaceful cannot spawn or attack');
 f.ctrl.tick(f.boss,2,42);assert.equal(f.entities.length,8);
 for(let t=43;t<300;t++)f.ctrl.tick(f.boss,2,t,{paused:true});assert.equal(f.hits.length,0,'stagger pauses blades');
 f.dim.getBlockFromRay=()=>({});for(let t=300;t<600;t++)f.ctrl.tick(f.boss,2,t);assert.equal(f.hits.length,0,'walls cancel all moving hits');
}
{
 const f=fixture();f.ctrl.tick(f.boss,2,0);f.ctrl.tick(f.boss,2,40);
 for(const sword of f.entities)sword.setProperty=()=>{throw Error('sync unavailable')};
 for(let t=41;t<300;t++)f.ctrl.tick(f.boss,2,t);
 assert.equal(f.hits.length,0,'no attack when the windup pose could not be set');
}
console.log('Warden blade entity ownership, warning, lifecycle, pause and collision (mock only)');

{
 const f=fixture(),hits=[];let now=0;f.player.applyDamage=n=>{hits.push([now,n]);return true;};
 for(now=0;now<1200;now++)f.ctrl.tick(f.boss,4,now);
 assert.ok(hits.length>2);for(let i=1;i<hits.length;i++)assert.ok(hits[i][0]-hits[i-1][0]>=8,'multiple blades share a late-form hit window');
 assert.ok(hits.every(([,n])=>n<=16.2+1e-6));
}
