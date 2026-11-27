// Exercise actual map, arrival and visit-record code together with mock Bedrock APIs.
// This does not simulate structure placement, chunk loading or real teleportation.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {places} from '../Hakkai_v7.1.0/BehaviorPack/scripts/data.js';
const source=fs.readFileSync('Hakkai_v7.1.0/BehaviorPack/scripts/main.js','utf8');
const section=(a,b)=>{let i=source.indexOf(a),j=source.indexOf(b,i);assert.ok(i>=0&&j>i);return source.slice(i,j);};

test('eight destinations unlock through actual map selections and successful arrival records',async()=>{
 const states={},properties=new Map(),teleports=[],prompts=[],notices=[];
 const player={isValid:true,location:{x:0,y:70,z:0},dimension:{id:'minecraft:overworld'},sendMessage:()=>{},tryTeleport(at,opt){teleports.push({at,dimension:opt.dimension.id});this.dimension=opt.dimension;this.location=at;return true;}};
 let choice=0;const dimensions=new Map(Array.from({length:8},(_,i)=>[`hakkai:realm_${i}`,{id:`hakkai:realm_${i}`} ]));
 const ctx={places,ns:'hakkai:',system:{currentTick:100},world:{getDimension:id=>dimensions.get(id)},state:()=>states,
  form:async(_p,title)=>{prompts.push(title);return title==='風見の地図'?1:choice;},
  simple:(_p,title,body)=>notices.push([title,body]),notice:(_p,text)=>notices.push(text),report:()=>assert.fail('arrival failed'),
  isNaturalSite:()=>false,isCreative:()=>false,overworld:()=>false,point:()=>({}),safe:()=>true,
  build:async()=>{},coords:site=>({x:site.x,y:89,z:site.z}),dimID:dim=>`hakkai:realm_${dim}`,
  loaded:async(_d,_a,_b,fn)=>fn(),safeNear:(_d,l)=>l,timed:async()=>{},updateWeather:()=>{},restore:()=>true,
  mark:(_p,key,i)=>properties.set(`${key}:${i}`,true),marked:(_p,key,i)=>properties.has(`${key}:${i}`),
  property:(_p,key,value)=>properties.set(key,value),total:()=>0,space:()=>({}),realmDiscoveryCount:()=>0,
  itemTexture:()=>'',railOffice:()=>{},trailMap:()=>{},atlasMenu:()=>{},linkedMenu:()=>{}};
 ctx.visited=(p,i)=>ctx.marked(p,'visits',i);
 vm.createContext(ctx);vm.runInContext(section('function checkEightRealmMemory(p){','// 記録は旧IDを維持')+section('async function arrive(p,site){','async function returnNatural(')+section('function unlocked(p,site){','async function quest(p){'),ctx);
 choice=1;await ctx.map(player);assert.equal(teleports.length,0,'cannot skip the first realm');
 for(let i=0;i<8;i++){
  choice=i;ctx.system.currentTick+=100;await ctx.map(player);
  assert.equal(teleports.length,i+1);assert.equal(teleports[i].dimension,`hakkai:realm_${i}`);
  assert.equal(ctx.visited(player,i+1),true);assert.equal(properties.get('last_site'),i+1);
 }
 assert.equal(properties.get('eight_realms_memory:0'),true);
 assert.equal(prompts.length,18);
});

test('a blocked arrival neither records a visit nor unlocks the next realm',async()=>{
 const marks=new Set(),state={},notices=[];
 const player={isValid:true,sendMessage:()=>{},tryTeleport:()=>{throw Error('should not teleport without safe spot')}};
 const ctx={isNaturalSite:()=>false,state:()=>state,system:{currentTick:100},overworld:()=>false,build:async()=>{},world:{getDimension:()=>({})},dimID:()=>'',coords:()=>({x:0,y:1,z:0}),loaded:async(_d,_a,_b,fn)=>fn(),safeNear:()=>undefined,notice:(_p,s)=>notices.push(s),report:()=>{},recordEntry:()=>marks.add('visit'),visited:()=>marks.has('visit'),isCreative:()=>false};
 vm.createContext(ctx);vm.runInContext(section('async function arrive(p,site){','async function returnNatural(')+section('function unlocked(p,site){','async function map(p){'),ctx);
 assert.equal(await ctx.arrive(player,{id:1,kind:'realm',name:'first'}),false);
 assert.equal(marks.size,0);assert.equal(ctx.unlocked(player,{id:2,kind:'realm'}),false);assert.equal(state.busy,false);
});
