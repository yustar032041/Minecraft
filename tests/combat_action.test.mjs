import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {setupActionCombat} from '../Hakkai_v7.1.0/BehaviorPack/scripts/combat_action.js';
import {EntityDamageCause,GameMode} from '@minecraft/server';
import {AUTHORED_WEAPONS,authoredMove} from '../Hakkai_v7.1.0/BehaviorPack/scripts/combat_weapon_movesets.js';
import {WARDEN_BLADES} from '../Hakkai_v7.1.0/BehaviorPack/scripts/warden_blades.js';
import {ULTIMATE_WEAPONS} from '../Hakkai_v7.1.0/BehaviorPack/scripts/ultimate_weapons.js';

function fixture(kind='剣',counter={hasCounter:()=>false,consumeCounter:()=>false}){
 const hits=[],animations=[],impulses=[],jobs=[],onHits=[];let enabled=true,item='hakkai:gear_008',input={x:0,y:0},visible=true,ray=[];
 const system={currentTick:0,runTimeout:(fn,delay)=>jobs.push({fn,at:system.currentTick+delay})};
 const d={id:'d',isChunkLoaded:()=>true,getBlock:()=>({isAir:true}),getBlockFromRay:({x,z})=>({block:{location:{x:Math.floor(x),y:79,z:Math.floor(z)}},face:'Up',faceLocation:{y:1}}),getEntitiesFromRay:()=>ray,spawnParticle(){}};
 const p={id:'p',typeId:'minecraft:player',isValid:true,isOnGround:true,dimension:d,location:{x:.5,y:80,z:.5},selectedSlotIndex:0,
  getGameMode:()=>GameMode.Survival,getComponent:()=>undefined,getHeadLocation(){return {...this.location,y:this.location.y+1};},getViewDirection:()=>({x:1,y:0,z:0}),inputInfo:{getMovementVector:()=>input},playSound(){},playAnimation:id=>animations.push(id),applyImpulse:v=>impulses.push(v)};
 const makeEnemy=(id,x,z)=>({id,typeId:'minecraft:zombie',isValid:true,dimension:d,location:{x,y:80,z},getHeadLocation(){return {...this.location,y:this.location.y+1};},getComponent:()=>({hasTypeFamily:()=>true}),applyDamage:n=>(hits.push([id,n]),true)});
 const front=makeEnemy('front',2.5,.5),back=makeEnemy('back',-1.5,.5);d.getEntities=()=>[front,back];
 const g={id:'gear_008',kind,rank:1,damage:99},s={s:100};const gear=new Map([[item,g]]);
 const ctrl=setupActionCombat({system,gear,selected:()=>({typeId:item}),state:()=>s,enabled:()=>enabled,visibleFrom:()=>visible,onHit:(...args)=>onHits.push(args),...counter});
 return {p,d,g,s,front,back,ctrl,system,hits,animations,impulses,onHits,
  setEnabled:x=>enabled=x,setItem:x=>item=x,setInput:(x,y)=>input={x,y},setRay:x=>ray=x,setVisible:x=>visible=x,
  swing(){return ctrl.swing({player:p,heldItemStack:{typeId:item},swingSource:'Attack'});},
  advance(t){while(true){jobs.sort((a,b)=>a.at-b.at);if(!jobs.length||jobs[0].at>t)break;const j=jobs.shift();system.currentTick=j.at;j.fn();}system.currentTick=t;}
 };
}
test('replaces only opted-in survival melee damage on hostile targets',()=>{
 const f=fixture(),event={hurtEntity:f.front,damageSource:{cause:EntityDamageCause.entityAttack,damagingEntity:f.p},cancel:false};
 assert.equal(f.ctrl.cancelNative(event),true);assert.equal(event.cancel,true);
 f.setEnabled(false);event.cancel=false;assert.equal(f.ctrl.cancelNative(event),false);assert.equal(event.cancel,false);
 f.setEnabled(true);f.g.kind='弓';assert.equal(f.ctrl.cancelNative(event),false);
 f.g.kind='剣';f.front.getComponent=()=>({hasTypeFamily:()=>false});assert.equal(f.ctrl.cancelNative(event),false);
 f.front.getComponent=()=>({hasTypeFamily:()=>true});f.p.getGameMode=()=>GameMode.Creative;assert.equal(f.ctrl.cancelNative(event),false);
});
test('timed combo has windup, stamina, spacing and a real 360 degree third attack',()=>{
 const f=fixture();assert.equal(f.swing(),true);assert.equal(f.s.s,94);assert.deepEqual(f.hits,[]);
 f.advance(3);assert.deepEqual(f.hits,[]);f.advance(4);assert.deepEqual(f.hits,[['front',19]],'sword sweet spot bonus, not native 99');
 f.advance(11);assert.equal(f.swing(),true);assert.equal(f.s.s,86);f.advance(15);assert.deepEqual(f.hits,[['front',19],['front',23]]);
 f.advance(22);assert.equal(f.swing(),true);assert.equal(f.s.s,74);assert.equal(f.animations.at(-1),'animation.hakkai.action_spin');
 f.advance(26);assert.deepEqual(f.hits,[['front',19],['front',23],['front',27],['back',27]]);assert.equal(f.onHits.length,4);
});
test('button mashing during recovery blocks combos and never creates a hit',()=>{
 const f=fixture();assert.equal(f.swing(),true);f.advance(3);assert.equal(f.swing(),false);assert.equal(f.s.s,94);
 f.advance(4);assert.equal(f.hits.length,1);f.advance(11);assert.equal(f.swing(),true);assert.equal(f.animations.at(-1),'animation.hakkai.action_cut_a');
 f.advance(15);assert.deepEqual(f.hits,[['front',19],['front',19]],'new sequence rather than free combo');
});
test('failed input, insufficient stamina and non-attack events cost nothing',()=>{
 const f=fixture();f.s.s=5;assert.equal(f.swing(),false);assert.equal(f.s.s,5);
 f.s.s=100;assert.equal(f.ctrl.swing({player:f.p,heldItemStack:{typeId:'hakkai:gear_008'},swingSource:'Mine'}),false);assert.equal(f.s.s,100);
 f.setEnabled(false);assert.equal(f.swing(),false);assert.equal(f.s.s,100);
});
test('delayed attacks stop on a swap, teleport, mode disable or new wall',()=>{
 for(const change of [f=>f.setItem('minecraft:stone'),f=>{f.p.location.x=10;},f=>f.setEnabled(false),f=>f.setVisible(false)]){
  const f=fixture();f.swing();change(f);f.advance(4);assert.deepEqual(f.hits,[]);
 }
});
test('swapping away and back cancels windup without resetting recovery',()=>{
 const f=fixture();f.swing();f.ctrl.invalidate(f.p.id);f.advance(4);assert.deepEqual(f.hits,[]);
 assert.equal(f.swing(),false);assert.equal(f.s.s,94);
 f.advance(11);assert.equal(f.swing(),true);assert.equal(f.animations.at(-1),'animation.hakkai.action_cut_a');
});
test('a friendly blocker and revalidation during synchronous hit callbacks prevent later damage',()=>{
 const f=fixture();f.setRay([{entity:{id:'cow',typeId:'minecraft:cow',isValid:true,getComponent:()=>({hasTypeFamily:()=>false})},distance:1}]);f.swing();f.advance(4);assert.deepEqual(f.hits,[]);
 const x=fixture();const extra={...x.front,id:'other',location:{x:3,y:80,z:.5},getHeadLocation(){return {...this.location,y:81};}};x.d.getEntities=()=>[x.front,extra];
 x.front.applyDamage=n=>{x.hits.push(['front',n]);x.p.selectedSlotIndex=1;return true;};x.swing();x.advance(4);assert.deepEqual(x.hits,[['front',19]]);
});
test('directional attacks try a checked step; only forward adds a hop',()=>{
 for(const [x,y,dx,dz,hop] of [[0,1,1,0,true],[0,-1,-1,0,false],[-1,0,0,-1,false],[1,0,0,1,false]]){
  const f=fixture();f.setInput(x,y);f.swing();assert.equal(f.impulses.length,1);const v=f.impulses[0];
  assert.ok(Math.abs(v.x-dx*.36)<1e-9);assert.ok(Math.abs(v.z-dz*.36)<1e-9);assert.equal(v.y>0,hop);
 }
 const blocked=fixture();blocked.setInput(0,1);blocked.d.isChunkLoaded=()=>false;blocked.swing();assert.deepEqual(blocked.impulses,[]);
});
test('roll counter augments the actual strike once and is retained after rejected damage',()=>{
 let ready=true,spent=0;const f=fixture('剣',{hasCounter:()=>ready,consumeCounter:()=>{ready=false;spent++;return true;}});
 f.front.applyDamage=()=>false;f.swing();f.advance(4);assert.equal(spent,0);
 f.front.applyDamage=n=>(f.hits.push(['front',n]),true);f.advance(11);f.swing();f.advance(15);
 assert.deepEqual(f.hits,[['front',31]]);assert.equal(spent,1);
 f.advance(22);f.swing();f.advance(26);assert.equal(spent,1);
});
test('weapon class changes range and sweet spot',()=>{
 const f=fixture('槍');f.front.location.x=4.5;f.swing();f.advance(5);assert.deepEqual(f.hits,[['front',20]]);
});
test('seven action animation names and body-spin keyframes exist',()=>{
 const a=JSON.parse(fs.readFileSync('Hakkai_v7.1.0/ResourcePack/animations/action_combat.animation.json','utf8')).animations;
 for(const name of ['cut_a','cut_b','lunge','retreat','sidestep_left','sidestep_right','spin'])assert.ok(a[`animation.hakkai.action_${name}`]);
 assert.deepEqual(a['animation.hakkai.action_spin'].bones.root.rotation['0.50'],[0,360,0]);
});

test('ten real weapons have three authored moves and referenced finishers',()=>{
 const finish=JSON.parse(fs.readFileSync('Hakkai_v7.1.0/ResourcePack/animations/action_finishers.animation.json','utf8')).animations;
 const all=[...WARDEN_BLADES,...ULTIMATE_WEAPONS];
 assert.equal(AUTHORED_WEAPONS.length,10);
 for(const id of AUTHORED_WEAPONS){
  const g=all.find(x=>x.id===id);assert.ok(g,id);
  for(let stage=1;stage<=3;stage++){const m=authoredMove(g,stage);assert.ok(m?.name);if(m.animation)assert.ok(finish[`animation.hakkai.action_finisher_${m.animation}`]);}
 }
 assert.equal(authoredMove({id:'gear_008'},1),undefined);
});
function startThird(f,id){f.g.id=id;assert.equal(f.swing(),true);f.advance(11);assert.equal(f.swing(),true);f.advance(22);assert.equal(f.swing(),true);}
test('mist cross sweeps opposite sides in separate pulses and revalidates',()=>{
 const f=fixture();f.g.id='warden_blade_1';f.d.getEntities=()=>[];startThird(f,'warden_blade_1');
 const r=2,a=1.35;f.front.location={x:.5+r*Math.cos(a),y:80,z:.5+r*Math.sin(a)};f.back.location={x:.5+r*Math.cos(a),y:80,z:.5-r*Math.sin(a)};
 f.d.getEntities=()=>[f.front,f.front,f.back];f.advance(26);assert.deepEqual(f.hits.map(x=>x[0]),['front']);
 f.advance(33);assert.deepEqual(f.hits.map(x=>x[0]),['front','back']);assert.equal(f.animations.at(-1),'animation.hakkai.action_finisher_warden_1');
 const x=fixture();x.d.getEntities=()=>[];startThird(x,'warden_blade_1');x.d.getEntities=()=>[x.front];x.advance(26);x.setVisible(false);x.advance(33);assert.equal(x.hits.length,1);
});
test('last pulse is included in recovery; swapping cancels all remaining hits',()=>{
 const f=fixture();f.d.getEntities=()=>[];startThird(f,'warden_blade_7');f.d.getEntities=()=>[f.front];f.advance(27);assert.equal(f.hits.length,1);
 f.advance(35);assert.equal(f.swing(),false);f.ctrl.invalidate(f.p.id);f.advance(36);assert.equal(f.hits.length,1);
 f.advance(43);assert.equal(f.swing(),true);assert.equal(f.animations.at(-1),'animation.hakkai.action_cut_a');
});
test('ring has an inner dead zone and shadow rewards attacking from behind',()=>{
 const f=fixture();f.d.getEntities=()=>[];startThird(f,'warden_blade_6');f.front.location.x=1;f.back.location.x=2.5;f.d.getEntities=()=>[f.front,f.back];f.advance(26);
 assert.deepEqual(f.hits.map(x=>x[0]),['back']);
 const damage=view=>{const x=fixture();x.g.id='warden_blade_5';x.front.getViewDirection=()=>view;x.swing();x.advance(4);return x.hits[0][1];};
 assert.equal(damage({x:1,z:0})-damage({x:-1,z:0}),5);
});
test('authored effects spare major bosses and preserve stronger effects',()=>{
 const f=fixture();f.g.id='warden_blade_1';f.d.getEntities=()=>[];startThird(f,'warden_blade_1');let effects=0;
 f.front.typeId='minecraft:wither';f.front.getEffect=()=>undefined;f.front.addEffect=()=>effects++;f.d.getEntities=()=>[f.front];f.advance(26);assert.equal(f.hits.length,1);assert.equal(effects,0);
 const x=fixture();x.d.getEntities=()=>[];startThird(x,'warden_blade_1');x.front.getEffect=()=>({amplifier:1,duration:100});x.front.addEffect=()=>effects++;x.d.getEntities=()=>[x.front];x.advance(26);assert.equal(effects,0);
});
