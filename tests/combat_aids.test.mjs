import {isRecoveryFood} from '../Hakkai_v7.1.0/BehaviorPack/scripts/food_recovery.js';
import {test} from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';
import {useDefenseScroll,useWarHorn} from '../Hakkai_v7.1.0/BehaviorPack/scripts/combat_aids.js';
function fixture(id,count=2){
 const stack=(id,n)=>({typeId:id,get amount(){return n},set amount(v){if(v<1)throw Error();n=v},clone(){return stack(this.typeId,this.amount)}});
 let item=stack(id,count),effect,fail=false,restoreFail=false;const applied=[];
 const c={getItem:i=>i===2?item:undefined,setItem:(i,v)=>{assert.equal(i,2);if(restoreFail&&v)throw Error();item=v}};
 const p={isValid:true,typeId:'minecraft:player',selectedSlotIndex:2,getGameMode:()=>0,getComponent:()=>({container:c}),getEffect:()=>effect,addEffect:(...args)=>{applied.push(args);if(fail)throw Error();return {}},playSound:()=>{}};
 return {p,applied,get item(){return item},setEffect:e=>effect=e,fail:()=>fail=true,restoreFail:()=>restoreFail=true};
}
test('defense scroll consumes only selected stack and gives resistance I for eight seconds',()=>{
 const f=fixture('hakkai:taunt_scroll');assert.equal(useDefenseScroll(f.p),'used');assert.equal(f.item.amount,1);assert.deepEqual(f.applied,[['resistance',160,{amplifier:0,showParticles:true}]]);assert.equal(useDefenseScroll(f.p),'used');assert.equal(f.item,undefined);
});
test('scroll blocks waste, handles changed slots and restores failed uses',()=>{
 const f=fixture('hakkai:taunt_scroll');for(const e of [{amplifier:1,duration:1},{amplifier:0,duration:160}]){f.setEffect(e);assert.equal(useDefenseScroll(f.p),'already');assert.equal(f.item.amount,2)}
 f.setEffect({amplifier:0,duration:159});assert.equal(useDefenseScroll(f.p,true),'used');assert.equal(f.item.amount,2);f.fail();assert.equal(useDefenseScroll(f.p),'failed');assert.equal(f.item.amount,2);f.p.selectedSlotIndex=1;assert.equal(useDefenseScroll(f.p),'changed');f.p.isValid=false;assert.equal(useDefenseScroll(f.p),'invalid');
 const g=fixture('hakkai:taunt_scroll',1);g.fail();g.restoreFail();assert.equal(useDefenseScroll(g.p),'restore_failed');
 const h=fixture('hakkai:taunt_scroll',1);h.p.addEffect=()=>undefined;assert.equal(useDefenseScroll(h.p),'used');assert.equal(h.item,undefined);
});
test('horn is reusable, personal, and has a 20-second cooldown only after success',()=>{
 const f=fixture('hakkai:war_horn',1),cd=new Map(),other=new Map();
 for(const effect of [{amplifier:1,duration:1},{amplifier:0,duration:200}]){f.setEffect(effect);assert.equal(useWarHorn(f.p,cd,10),'already');assert.equal(cd.size,0)}
 f.setEffect({amplifier:0,duration:199});assert.equal(useWarHorn(f.p,cd,10),'used');assert.equal(f.item.amount,1);assert.deepEqual(f.applied[0],['strength',200,{amplifier:0,showParticles:true}]);assert.equal(useWarHorn(f.p,cd,409),'cooldown');
 assert.equal(useWarHorn(f.p,other,11),'used');assert.equal(useWarHorn(f.p,cd,410),'used');
 const bad=fixture('hakkai:war_horn',1),newCd=new Map();bad.fail();assert.equal(useWarHorn(bad.p,newCd,50),'failed');assert.equal(newCd.size,0);assert.equal(bad.item.amount,1);
 bad.p.selectedSlotIndex=1;assert.equal(useWarHorn(bad.p,newCd,50),'changed');bad.p.isValid=false;assert.equal(useWarHorn(bad.p,newCd,50),'invalid');
});
test('real item use handler dispatches both aids and respects spectator, repeat debounce and session cooldown',()=>{
 const src=fs.readFileSync('Hakkai_v7.1.0/BehaviorPack/scripts/main.js','utf8');const a=src.indexOf('function use(e){'),b=src.indexOf('system.runInterval(()=>{',a);assert.ok(a>0&&b>a);
 const st={useTick:-10,cd:new Map()},notices=[],system={currentTick:10},ctx={ns:'hakkai:',gear:new Map(),GameMode:{Spectator:9},state:()=>st,system,useDefenseScroll,useWarHorn,isCreative:()=>false,notice:(_p,text)=>notices.push(text),report:()=>{}};ctx.isRecoveryFood=isRecoveryFood;vm.createContext(ctx);vm.runInContext(src.slice(a,b)+';this.use=use;',ctx);
 const f=fixture('hakkai:taunt_scroll');ctx.use({source:f.p,itemStack:{typeId:'hakkai:taunt_scroll'}});assert.equal(f.item.amount,1);assert.ok(notices.at(-1).includes('耐性I'));ctx.use({source:f.p,itemStack:{typeId:'hakkai:taunt_scroll'}});assert.equal(f.item.amount,1);
 const h=fixture('hakkai:war_horn',1);system.currentTick=20;ctx.use({source:h.p,itemStack:{typeId:'hakkai:war_horn'}});assert.ok(notices.at(-1).includes('攻撃力上昇I'));system.currentTick=28;ctx.use({source:h.p,itemStack:{typeId:'hakkai:war_horn'}});assert.ok(notices.at(-1).includes('再使用'));h.p.getGameMode=()=>9;system.currentTick=500;ctx.use({source:h.p,itemStack:{typeId:'hakkai:war_horn'}});assert.equal(h.applied.length,1);
 assert.ok(src.includes("safeReg(itemComponentRegistry,ns+'use',{onUse:use,onUseOn:use"));
});
test('defense scroll restores a slot that mutates before the write throws',()=>{
 const f=fixture('hakkai:taunt_scroll',1),container=f.p.getComponent().container,write=container.setItem;let fail=true;
 container.setItem=(i,v)=>{write(i,v);if(fail){fail=false;throw Error('failed after mutation')}};
 f.p.getComponent=()=>({container});assert.equal(useDefenseScroll(f.p),'failed');assert.equal(f.item.typeId,'hakkai:taunt_scroll');assert.equal(f.item.amount,1);assert.equal(f.applied.length,0);
});
test('horn starts cooldown for a non-throwing undefined-return effect call',()=>{
 const f=fixture('hakkai:war_horn',1),cd=new Map();f.p.addEffect=()=>undefined;
 assert.equal(useWarHorn(f.p,cd,10),'used');assert.equal(cd.get('war_horn'),410);assert.equal(useWarHorn(f.p,cd,11),'cooldown');
});
