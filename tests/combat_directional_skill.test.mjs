// Main cast routing under deterministic fake state. No engine or gamepad test.
import {test} from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';
const src=fs.readFileSync('Hakkai_v7.1.0/BehaviorPack/scripts/main.js','utf8');const code=src.slice(src.indexOf('function cast(p,g,charged=false){'),src.indexOf('function castElement('));
function fixture(direction){
 const effects=[],notices=[],hits=[];let radius=0,consumed=0;
 const d={id:'d',spawnParticle(){}},p={id:'p',isValid:true,dimension:d,location:{x:0,y:0,z:0},getViewDirection:()=>({x:1,y:0,z:0}),addEffect:id=>effects.push(id),playAnimation(){},playSound(){}};
 const enemies=Array.from({length:6},(_,i)=>({id:String(i),isValid:true,dimension:d,location:{x:2,y:0,z:0},getHeadLocation:()=>({x:2,y:1,z:0})}));
 const g={id:'gear_008',kind:'剣',cost:10,seconds:5,damage:10,power:10,a:0,modifier:0,rank:1,defense:0,number:8,skill:'試作'},s={s:100,m:100,cd:new Map()};
 const ctx={system:{currentTick:100,runTimeout(){}},weaponTrace:{takeLink:()=>{consumed++;return {direction,stage:2}}},isTraceWeapon:()=>true,state:()=>s,notice:(_p,text)=>notices.push(text),isCreative:()=>false,combatResonance:undefined,num:()=>0,property(){},currentPlace:()=>undefined,world:{getTimeOfDay:()=>0},home:[],aspect:()=>0,enemies:(_p,r)=>(radius=r,enemies),visibleFrom:()=>true,hit:(_p,e,n)=>(hits.push([e.id,n]),true),combatEffectAllowed:()=>true,effects:Array(20).fill('speed'),ns:'hakkai:',dist:()=>0,along(){}};
 vm.createContext(ctx);vm.runInContext(code,ctx);return {ctx,p,g,s,effects,notices,hits,get radius(){return radius},get consumed(){return consumed}};
}
test('skill movement variants change range, target cap or brief defense after a paid link',()=>{
 for(const [dir,range,count] of [['forward',5,3],['left',4,4],['right',4,4],['back',4,3]]){
  const f=fixture(dir);f.s.m=0;f.ctx.cast(f.p,f.g);assert.equal(f.consumed,0,'failed casts retain link');f.s.m=100;f.ctx.cast(f.p,f.g);
  assert.equal(f.consumed,1);assert.equal(f.radius,range);assert.equal(f.hits.length,count);assert.equal(f.s.m,90);assert.ok(f.notices.some(x=>x.includes('連携')));assert.equal(f.effects.includes('resistance'),dir==='back');
 }
});
