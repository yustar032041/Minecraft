import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {configureFriendlyFire,friendlyFireEnabled,setFriendlyFire,protectsPlayer,isPlayerOpponent} from '../Hakkai_v7.1.0/BehaviorPack/scripts/friendly_fire.js';
import {combatEnemies,applyCombatHit} from '../Hakkai_v7.1.0/BehaviorPack/scripts/combat_resonance.js';
import {prepareWindRay} from '../Hakkai_v7.1.0/BehaviorPack/scripts/combat_wind_ray.js';
import {setupWeaponTrace} from '../Hakkai_v7.1.0/BehaviorPack/scripts/combat_weapon_trace.js';
import {setupCombatUltimate} from '../Hakkai_v7.1.0/BehaviorPack/scripts/combat_ultimate.js';
import {castNewMagic} from '../Hakkai_v7.1.0/BehaviorPack/scripts/combat_magic.js';
const properties=new Map(),world={getDynamicProperty:k=>properties.get(k),setDynamicProperty:(k,v)=>properties.set(k,v)};
configureFriendlyFire(world);assert.equal(friendlyFireEnabled(),false);
const hits=[],effects=[],jobs=[];
const dim={id:'realm',getEntities:()=>[],getPlayers:()=>[p,q],getEntitiesFromRay:()=>[{entity:q,distance:1}],getBlockFromRay:()=>undefined,isChunkLoaded:()=>true,spawnParticle:()=>{}};
const player=(id,x)=>({id,name:id,typeId:'minecraft:player',isValid:true,dimension:dim,location:{x,y:0,z:0},selectedSlotIndex:0,isSneaking:false,getGameMode:()=> 'survival',getHeadLocation(){return {...this.location,y:1}},getViewDirection:()=>({x:1,y:0,z:0}),getComponent:()=>undefined,applyDamage:n=>hits.push([id,n]),addEffect:e=>effects.push([id,e]),setOnFire:()=>effects.push([id,'fire']),applyKnockback:()=>effects.push([id,'knockback']),playAnimation:()=>{},playSound:()=>{},sendMessage:()=>{}});
const p=player('p',0),q=player('q',2);
const arrow={getComponent:()=>({owner:p})};
assert.equal(protectsPlayer(q,{cause:'entityAttack',damagingEntity:p}),true);
assert.equal(protectsPlayer(q,{cause:'projectile',damagingProjectile:arrow}),true);
assert.equal(protectsPlayer(q,{cause:'projectile',damagingEntity:arrow}),true);
assert.equal(protectsPlayer(p,{damagingEntity:p}),false,'self damage unchanged');
assert.equal(protectsPlayer(q,{damagingEntity:{typeId:'minecraft:zombie',id:'z'}}),false,'hostile mobs unaffected');
assert.equal(isPlayerOpponent(p,q),false);assert.deepEqual(combatEnemies(p,5),[]);
applyCombatHit(p,q,5,2,-1,1);assert.deepEqual(hits,[]);assert.deepEqual(effects,[],'no knockback, fire or debuffs on allies');
assert.equal(prepareWindRay(p,{kind:'剣'}).target,undefined,'protected players stop the ray');
const system={currentTick:1,runTimeout:fn=>jobs.push(fn)},g={id:'g',kind:'剣',damage:8},state={s:50,m:50,cd:new Map()};
const trace=setupWeaponTrace({system,gear:new Map([['hakkai:g',g]]),selected:()=>({typeId:'hakkai:g'}),state:()=>state,visibleFrom:()=>true});
dim.getEntities=()=>[q];assert.equal(trace.swing({player:p,heldItemStack:{typeId:'hakkai:g'},swingSource:'Attack'}),true);jobs.shift()();assert.deepEqual(hits,[],'trace does not hit protected player');
assert.equal(setFriendlyFire(true),true);assert.equal(friendlyFireEnabled(),true);assert.equal(protectsPlayer(q,{damagingEntity:p}),false);assert.deepEqual(combatEnemies(p,5).map(x=>x.id),['q']);assert.equal(prepareWindRay(p,{kind:'剣'}).target,q);
applyCombatHit(p,q,5,2,-1,1);assert.deepEqual(hits,[['q',5]]);assert.ok(effects.some(x=>x[1]==='fire'));
hits.length=0;effects.length=0;system.currentTick=10;assert.equal(trace.swing({player:p,heldItemStack:{typeId:'hakkai:g'},swingSource:'Attack'}),true);jobs.shift()();assert.deepEqual(hits,[['q',8]],'trace can hit when enabled');
hits.length=0;effects.length=0;system.currentTick=20;assert.equal(trace.swing({player:p,heldItemStack:{typeId:'hakkai:g'},swingSource:'Attack'}),true);assert.equal(setFriendlyFire(false),true);jobs.shift()();assert.deepEqual(hits,[],'in-flight effect observes the current switch');
// An area magic checks selection and secondary effects, not just HP damage.
state.cd.clear();state.m=50;assert.equal(castNewMagic({p,s:state,system,kind:'fire',notice:()=>{},mark:()=>{},visibleFrom:()=>true}),true);assert.deepEqual(hits,[]);assert.deepEqual(effects,[]);
assert.equal(setFriendlyFire(true),true);state.cd.clear();assert.equal(castNewMagic({p,s:state,system,kind:'fire',notice:()=>{},mark:()=>{},visibleFrom:()=>true}),true);assert.deepEqual(hits,[['q',4]]);assert.ok(effects.some(x=>x[1]==='fire'));
// A light shot launched while PvP is enabled cannot hit after it is disabled.
hits.length=0;effects.length=0;state.cd.clear();system.currentTick=40;
assert.equal(castNewMagic({p,s:state,system,kind:'light',notice:()=>{},mark:()=>{},visibleFrom:()=>true}),true);
setFriendlyFire(false);while(jobs.length)jobs.shift()();assert.deepEqual(hits,[]);assert.deepEqual(effects,[]);
// The weapon ultimate includes players only when enabled.
const ultimate=setupCombatUltimate({system,notice:()=>{},visibleFrom:()=>true}),u={s:50,m:50};
assert.equal(ultimate.cast(p,u,g),false);assert.equal(u.s,50);setFriendlyFire(true);
assert.equal(ultimate.cast(p,u,g),true);assert.deepEqual(hits,[['q',20]]);
q.getGameMode=()=> 'creative';assert.equal(isPlayerOpponent(p,q),false);q.getGameMode=()=> 'survival';
// Read failures fail closed; write failures are reported to the caller.
configureFriendlyFire({getDynamicProperty(){throw Error('read');},setDynamicProperty(){throw Error('write');}});assert.equal(friendlyFireEnabled(),false);assert.equal(protectsPlayer(q,{damagingEntity:p}),true);assert.equal(setFriendlyFire(true),false);configureFriendlyFire(world);setFriendlyFire(false);
// Execute the actual before-hurt handler: an incoming allied hit is cancelled
// before guard, totem, knockback-affecting handlers or damage scaling.
const src=fs.readFileSync('Hakkai_v7.1.0/BehaviorPack/scripts/main.js','utf8');
const before=src.slice(src.indexOf("safeSub('world','before','entityHurt'"),src.indexOf('const _melee='));
let handler;const ctx={protectsPlayer,safeSub:(_a,_b,_c,fn)=>handler=fn};vm.createContext(ctx);vm.runInContext(before,ctx);
const event={hurtEntity:q,damage:10,cancel:false,damageSource:{damagingEntity:p,cause:'entityAttack'}};handler(event);assert.equal(event.cancel,true);
// Run the real guide settings route and verify confirmation, persistence,
// cancellation and notification of the other player.
const code=src.slice(src.indexOf('async function settings(p){'),src.indexOf('function castMagic(p,kind)'));
let selections=[9,0],sent=[];p.sendMessage=m=>sent.push(m);q.sendMessage=m=>sent.push(m);world.getAllPlayers=()=>[p,q];
const ui={form:async()=>selections.shift(),num:()=>0,property:()=>{},friendlyFireEnabled,setFriendlyFire,world,notice:()=>assert.fail('unexpected failure')};
vm.createContext(ui);vm.runInContext(code,ui);await ui.settings(p);assert.equal(friendlyFireEnabled(),true);assert.equal(sent.length,2);assert.ok(sent[1].includes('ON'));
selections=[9,1];await ui.settings(p);assert.equal(friendlyFireEnabled(),true,'confirmation cancel preserves state');
selections=[9,0];await ui.settings(p);assert.equal(friendlyFireEnabled(),false);assert.equal(sent.length,4);
console.log('Friendly fire: global default, guide confirmation, native damage, arrows, skill targeting, delayed traces and status safety (mocked)');
