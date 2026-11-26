import {test} from 'node:test';
import assert from 'node:assert/strict';
import {setupFushiTotem} from '../Hakkai_v7.1.0/BehaviorPack/scripts/combat_totem.js';
function fixture(hand){
 const mk=()=>({typeId:'hakkai:fushi_totem',tag:'original',clone(){return {...this}}});
 let held=mk(),writes=0,mode='throw-on-first';const queue=[],damage=[],reports=[],effects=[];
 const health={currentValue:8,setCurrentValue(v){this.currentValue=v}};
 function write(item){held=item;writes++;if(mode==='throw-on-first'&&writes===1)throw Error('after mutation');if(mode==='throw-always')throw Error('restore failed');if(mode==='false-on-first'&&writes===1)return false;return true}
 const inventory={getItem:()=>hand==='main'?held:undefined,setItem:(_i,v)=>{write(v)}};
 const equipment={getEquipment:s=>s===(hand==='main'?'Mainhand':'Offhand')?held:undefined,setEquipment:(_s,v)=>write(v)};
 const p={id:'a',typeId:'minecraft:player',isValid:true,selectedSlotIndex:1,getGameMode:()=> 'survival',getComponent:c=>c==='minecraft:health'?health:c==='minecraft:equippable'?equipment:c==='minecraft:inventory'?{container:inventory}:undefined,
  getEffects:()=>[],addEffect:(...a)=>effects.push(a),dimension:{spawnParticle:()=>{}},location:{x:0,y:0,z:0},playSound:()=>{},applyDamage:(...a)=>damage.push(a)};
 const controller=setupFushiTotem({system:{run:fn=>queue.push(fn)},notice:()=>{},report:(...a)=>reports.push(a)});
 const event={hurtEntity:p,damage:10,cancel:false,damageSource:{cause:'entityAttack'}};
 return {p,health,controller,event,queue,damage,reports,effects,get held(){return held},setMode:v=>mode=v,run:()=>queue.shift()()};
}
for(const hand of ['main','off'])test(`${hand}: post-write exception restores held totem and replays damage`,()=>{
 const f=fixture(hand);assert.equal(f.controller.before(f.event),true);assert.equal(f.event.cancel,true);f.run();assert.equal(f.held.tag,'original');assert.equal(f.damage.length,1);assert.equal(f.damage[0][0],10);assert.equal(f.health.currentValue,8);assert.equal(f.effects.length,0);assert.ok(f.reports.some(([label])=>label.includes('消費失敗')));
});
test('offhand failed setEquipment return attempts restoration before replay',()=>{
 const f=fixture('off');f.setMode('false-on-first');f.controller.before(f.event);f.run();assert.equal(f.held.tag,'original');assert.equal(f.damage.length,1);assert.equal(f.effects.length,0);
});
test('restoration failure is logged while damage replay is still attempted',()=>{
 const f=fixture('main');f.setMode('throw-always');f.controller.before(f.event);f.run();assert.equal(f.damage.length,1);assert.ok(f.reports.some(([label])=>label.includes('復旧失敗')));assert.equal(f.effects.length,0);
});
