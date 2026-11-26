import {test} from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';
import {recordTomeRealm,hasTomeRealm,clearTomePending} from '../Hakkai_v7.1.0/BehaviorPack/scripts/spell_tome.js';
const source=fs.readFileSync('Hakkai_v7.1.0/BehaviorPack/scripts/main.js','utf8');
const player=()=>{const props=new Map();return {id:'p',isValid:true,dimension:{id:'minecraft:overworld'},getDynamicProperty:k=>props.get(k),setDynamicProperty:(k,v)=>props.set(k,v)}};
test('actual dimension event records destination even if player moved on before callback',()=>{
 let callback;const a=source.indexOf('try{world.afterEvents.playerDimensionChange?.subscribe('),b=source.indexOf('\n',a);assert.ok(a>0&&b>a);
 const ctx={world:{afterEvents:{playerDimensionChange:{subscribe:fn=>callback=fn}}},recordTomeRealm,combatResonance:null,combatGuard:null,combatRoll:null,combatParry:null,airDash:null,airStrike:null,combatUltimate:null,combatCharge:null,weaponTrace:null,bowTrail:null};vm.createContext(ctx);vm.runInContext(source.slice(a,b),ctx);
 const p=player();callback({player:p,toDimension:{id:'hakkai:realm_6'}});assert.ok(hasTomeRealm(p,6));assert.ok(!hasTomeRealm(p,0));callback({player:p,toDimension:{id:'hakkai:warden_arena'}});assert.ok(!hasTomeRealm(p,7));
});
test('actual player spawn records a current realm without waiting for delayed onboarding',()=>{
 let callback;const a=source.indexOf("safeSub('world','after','playerSpawn'"),b=source.indexOf("safeSub('world','after','playerLeave'",a);assert.ok(a>0&&b>a);
 const ctx={safeSub:(_a,_b,_c,fn)=>callback=fn,system:{runTimeout:()=>{}},recordTomeRealm};vm.createContext(ctx);vm.runInContext(source.slice(a,b),ctx);const p=player();p.dimension.id='hakkai:realm_3';callback({player:p,initialSpawn:true});p.dimension.id='minecraft:overworld';assert.equal(hasTomeRealm(p,3),true);
});

test('actual dimension event, periodic retry outside the realm, and leave hook',()=>{
 let onChange,onLeave;const start=source.indexOf('try{world.afterEvents.playerDimensionChange?.subscribe('),end=source.indexOf('\n',start);
 const noop={clear(){},clearMarks(){},clearPlayer(){},clearMusic(){},invalidate(){}};
 const props=new Map(),p={id:'hook-pending',dimension:{id:'minecraft:overworld'},getDynamicProperty:k=>props.get(k),setDynamicProperty:(k,v)=>{if(p.fail)throw Error('unavailable');props.set(k,v)},fail:true};
 const ctx={world:{afterEvents:{playerDimensionChange:{subscribe:fn=>onChange=fn}},getAllPlayers:()=>[p]},safeSub:(_a,_b,_c,fn)=>onLeave=fn,recordTomeRealm,clearTomePending,sessions:new Map(),TOME_SELECTIONS:new Map(),mobSystem:noop,customShield:noop,shrineChiefs:noop,expeditionRecords:noop,wardenArena:noop,wardenBoss:noop,combatResonance:noop,combatGuard:noop,combatRoll:noop,combatParry:noop,airDash:noop,airStrike:noop,combatUltimate:noop,combatCharge:noop,weaponTrace:noop,bowTrail:noop};
 vm.createContext(ctx);vm.runInContext(source.slice(start,end),ctx);onChange({player:p,toDimension:{id:'hakkai:realm_2'}});assert.equal(hasTomeRealm(p,2),true);
 // Run the actual loop prefix up to state initialization. No realm is active.
 const interval=source.indexOf('let cooldownSweep=0;'),a=source.indexOf('for(const p of world.getAllPlayers()){',interval),b=source.indexOf('const s=state(p);',a);assert.ok(interval>0&&a>interval&&b>a);
 p.fail=false;vm.runInContext(source.slice(a,b)+'}catch{}}',ctx);assert.equal(props.get('hakkai:tome_realms_v1'),4);
 p.fail=true;onChange({player:p,toDimension:{id:'hakkai:realm_3'}});assert.equal(hasTomeRealm(p,3),true);
 const leave=source.indexOf("safeSub('world','after','playerLeave'"),leaveEnd=source.indexOf('\n',leave);vm.runInContext(source.slice(leave,leaveEnd),ctx);onLeave({playerId:p.id});
 assert.equal(hasTomeRealm(p,3),false);assert.equal(hasTomeRealm(p,2),true);
});
test('actual loop warns each player at most every 600 ticks until saving succeeds',async()=>{
 const {hasPendingTomeVisits}=await import('../Hakkai_v7.1.0/BehaviorPack/scripts/spell_tome.js');
 const data=new Map(),p={id:'warning-player',dimension:{id:'minecraft:overworld'},getDynamicProperty:k=>data.get(k),setDynamicProperty:(k,v)=>{if(p.fail)throw Error('unavailable');data.set(k,v)},fail:true};
 recordTomeRealm(p,'hakkai:realm_3');let t=10;const notices=[],session={};
 const ctx={world:{getAllPlayers:()=>[p]},recordTomeRealm,hasPendingTomeVisits,state:()=>session,notice:(_p,msg)=>notices.push(msg),t};vm.createContext(ctx);
 const start=source.indexOf('let cooldownSweep=0;'),a=source.indexOf('for(const p of world.getAllPlayers()){',start),b=source.indexOf('// Run before the spectator/arena exits',a);assert.ok(a>start&&b>a);
 const tick=()=>{ctx.t=t;vm.runInContext(source.slice(a,b)+'}catch{}}',ctx);};
 tick();assert.equal(notices.length,1);assert.match(notices[0],/再試行/);t=609;tick();assert.equal(notices.length,1);t=610;tick();assert.equal(notices.length,2);
 p.fail=false;t=611;tick();assert.equal(data.get('hakkai:tome_realms_v1'),8);t=1210;tick();assert.equal(notices.length,2);clearTomePending(p.id);
});
