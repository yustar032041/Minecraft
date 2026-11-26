import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const source=fs.readFileSync('Hakkai_v7.1.0/BehaviorPack/scripts/main.js','utf8');
function fixture(){
 const a=source.indexOf('async function fishing(p){'),b=source.indexOf('const seasonDay=',a);assert.ok(a>0&&b>a);
 let formResolvers=[],timerResolve,rod=1,water=true,site={name:'grass',style:'grass'},biome;
 const awards=[],notices=[],clock={currentTick:100},state={cd:new Map()};
 const p={isValid:true,dimension:{id:'realm'},location:{x:0,y:80,z:0}};
 const ctx={currentPlace:()=>site,state:()=>state,total:()=>rod,space:()=>({}),shore:()=>water,
  form:()=>new Promise(r=>formResolvers.push(r)),era:()=> '夏',notice:(_p,m)=>notices.push(m),system:clock,
  point:p=>({...p.location,id:p.dimension.id}),timed:()=>new Promise(r=>timerResolve=r),biomeAt:()=>biome,
  world:{getTimeOfDay:()=>1000},seasonAt:()=>({dayInSeason:1}),seasonDay:()=>0,seasons:['春','夏','秋','冬'],
  raining:()=>false,ns:'hakkai:',give:(_p,id)=>{awards.push(id);return true},Math:Object.assign(Object.create(Math),{random:()=>.8})};
 vm.createContext(ctx);vm.runInContext(source.slice(a,b),ctx);
 return {p,ctx,awards,notices,state,clock,open:()=>ctx.fishing(p),choose:n=>formResolvers.shift()(n),finish:()=>timerResolve?.(),
  rod:n=>rod=n,water:v=>water=v,site:v=>site=v,biome:v=>biome=v,hasTimer:()=>!!timerResolve};
}
const turn=()=>new Promise(resolve=>setImmediate(resolve));
test('rod and water are checked again after an open form before starting the cooldown',async()=>{
 for(const change of [f=>f.rod(0),f=>f.water(false)]){
  const f=fixture(),work=f.open();change(f);f.choose(0);await work;
  assert.equal(f.state.cd.has('fish'),false);assert.equal(f.hasTimer(),false);assert.deepEqual(f.awards,[]);assert.match(f.notices.at(-1),/釣り竿/);
 }
});
test('rod, water, vertical travel, dimension and player validity are rechecked after waiting',async()=>{
 for(const change of [f=>f.rod(0),f=>f.water(false),f=>f.p.location.y+=7,f=>f.p.dimension={id:'other'},f=>f.p.isValid=false]){
  const f=fixture(),work=f.open();f.choose(0);await turn();assert.equal(f.hasTimer(),true);change(f);f.finish();await work;
  assert.deepEqual(f.awards,[]);assert.equal(f.state.cd.get('fish'),520,'cooldown remains once started');
 }
});
test('valid catch uses current site rather than the stale pre-form location',async()=>{
 const f=fixture(),work=f.open();f.choose(0);await turn();f.site({name:'snow',style:'snow'});f.biome({key:'ocean'});f.finish();await work;
 assert.deepEqual(f.awards,['minecraft:cod']);
 const g=fixture(),other=g.open();g.choose(0);await turn();g.site({name:'snow',style:'snow'});g.finish();await other;
 assert.deepEqual(g.awards,['minecraft:salmon']);
});
test('cancel and overlapping forms cannot grant twice in one cooldown',async()=>{
 const f=fixture(),cancel=f.open();f.choose(1);await cancel;assert.equal(f.state.cd.size,0);
 const one=f.open(),two=f.open();f.choose(0);await turn();f.choose(0);await two;
 assert.equal(f.state.cd.get('fish'),520);assert.match(f.notices.at(-1),/待って/);f.finish();await one;assert.equal(f.awards.length,1);
});
