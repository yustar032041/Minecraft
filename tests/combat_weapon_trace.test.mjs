import assert from 'node:assert/strict';
import fs from 'node:fs';
import {catalog} from '../Hakkai_v7.1.0/BehaviorPack/scripts/data.js';
import {ULTIMATE_WEAPONS} from '../Hakkai_v7.1.0/BehaviorPack/scripts/ultimate_weapons.js';
import {setupWeaponTrace,isTraceWeapon} from '../Hakkai_v7.1.0/BehaviorPack/scripts/combat_weapon_trace.js';
const weapons=[...catalog,...ULTIMATE_WEAPONS].filter(isTraceWeapon);assert.equal(weapons.length,97);
for(const g of weapons){
 const item=JSON.parse(fs.readFileSync(`Hakkai_v7.1.0/BehaviorPack/items/${g.id}.json`));assert.equal(item['minecraft:item'].components['minecraft:damage'],g.damage,g.id);
 assert.ok(fs.existsSync(`Hakkai_v7.1.0/ResourcePack/particles/${g.visualId??g.id}.json`),g.id);
}
function fixture(g=weapons[0]){
 const hits=[],particles=[],jobs=[],s={s:50},system={currentTick:100,runTimeout:(fn,delay)=>jobs.push([fn,delay])};let held='hakkai:'+g.id;
 const d={id:'d',spawnParticle:(...x)=>particles.push(x),getEntities:()=>[],getEntitiesFromRay:()=>[],getBlockFromRay:()=>undefined,isChunkLoaded:()=>true};
 const p={id:'p',typeId:'minecraft:player',isValid:true,isSneaking:false,dimension:d,location:{x:0,y:0,z:0},selectedSlotIndex:0,getViewDirection:()=>({x:1,y:0,z:0}),getHeadLocation:()=>({x:0,y:1,z:0}),getGameMode:()=> 'survival'};
 const target=(id,x,z=0,type='minecraft:zombie')=>({id,typeId:type,isValid:true,dimension:d,location:{x,y:0,z},getHeadLocation:()=>({x,y:1,z}),getComponent:()=>({hasTypeFamily:()=>type==='minecraft:zombie'}),applyDamage:(n,source)=>hits.push([id,n,source])});
 const trace=setupWeaponTrace({system,gear:new Map([[held,g]]),selected:()=>({typeId:held}),state:()=>s,visibleFrom:(_,loc)=>loc.x!==3,report:(...x)=>assert.fail(String(x))});
 return {p,d,s,system,target,trace,hits,particles,jobs,swing:()=>trace.swing({player:p,heldItemStack:{typeId:held},swingSource:'Attack'}),run:()=>jobs.shift()?.[0](),setHeld:v=>held=v};
}
for(const g of weapons){const f=fixture(g),enemy=f.target('enemy',2);f.d.getEntities=()=>[enemy];if(g.kind==='杖')f.d.getEntitiesFromRay=()=>[{entity:enemy,distance:1}];assert.equal(f.swing(),true,g.id);f.run();assert.equal(f.hits[0][1],g.damage,g.id);assert.ok(f.particles.some(([id])=>id===`hakkai:${g.visualId??g.id}`));}
{
 const f=fixture(),direct=f.target('direct',1),side=f.target('side',2),hidden=f.target('hidden',3),friend=f.target('friend',2,.1,'minecraft:cow');f.d.getEntities=()=>[direct,side,side,hidden,friend];
 assert.equal(f.swing(),true);f.trace.record(f.p,direct);f.trace.record(f.p,direct,99);f.run();assert.deepEqual(f.hits.map(x=>x[0]),['side']);assert.equal(f.hits[0][1],weapons[0].damage);assert.equal(f.hits[0][2].cause,'magic');
}
{
 const f=fixture(),enemy=f.target('enemy',2),friend=f.target('friend',1,0,'minecraft:cow');f.d.getEntities=()=>[enemy];f.d.getEntitiesFromRay=()=>[{entity:friend,distance:1}];f.swing();f.run();assert.equal(f.hits.length,0,'friendly blocks');
}
{
 const f=fixture(),enemy=f.target('enemy',2);f.d.getEntities=()=>[enemy];f.swing();f.trace.record(f.p,f.target('friend',1,0,'minecraft:player'));f.run();assert.equal(f.hits.length,0,'direct friendly blocks');
}
{
 const f=fixture(),enemy=f.target('enemy',2);f.d.getEntities=()=>[enemy];f.s.s=0;f.swing();f.run();assert.equal(f.hits[0][1],weapons[0].damage*.55);
}
for(const change of [f=>f.setHeld('minecraft:stick'),f=>f.p.dimension={id:'other'},f=>f.p.selectedSlotIndex++,f=>f.p.isValid=false,f=>f.d.isChunkLoaded=()=>false,f=>f.d.getEntitiesFromRay=()=>{throw Error('not loaded')}]){
 const f=fixture(),enemy=f.target('enemy',2);f.d.getEntities=()=>[enemy];f.swing();change(f);f.run();assert.equal(f.hits.length,0);
}
{
 const f=fixture();assert.equal(f.trace.swing({player:f.p,heldItemStack:{typeId:'hakkai:'+weapons[0].id},swingSource:'UseItem'}),false);assert.equal(f.jobs.length,0);f.swing();assert.equal(f.swing(),false,'same swing cooldown');
}
console.log('Weapon traces: all 97 weapons, same base damage, direct-hit exclusion, safety, input (mocked)');
