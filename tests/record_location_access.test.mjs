import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {places} from '../Hakkai_v7.1.0/BehaviorPack/scripts/data.js';
import {setupExpeditionRecords} from '../Hakkai_v7.1.0/BehaviorPack/scripts/expedition_records.js';
import {setupFrontierWorlds} from '../Hakkai_v7.1.0/BehaviorPack/scripts/frontier_worlds.js';
const src=fs.readFileSync('Hakkai_v7.1.0/BehaviorPack/scripts/main.js','utf8');
const section=(a,b)=>src.slice(src.indexOf(a),src.indexOf(b,src.indexOf(a)));
test('each hidden route is outside currentPlace but its real tick works with the owning realm site',()=>{
 const marks=new Set(),cd=new Map(),given=[];
 const ctx={Math,Number,ns:'hakkai:',coords:s=>({x:s.x+.5,y:89,z:s.z-4.5}),marked:(_p,k,i)=>marks.has(`${k}:${i}`),mark:(_p,k,i)=>marks.add(`${k}:${i}`),state:()=>({cd}),system:{currentTick:300},claimRecordReward:(_p,products,key,i)=>{given.push(products[0]);marks.add(`${key}:${i}`);return true},notice:()=>{}};
 vm.createContext(ctx);
 vm.runInContext(section('function realmDiscoveryLocation(', 'function realmDiscoveryTick(')+section('function realmRuinLocation(', 'function realmRuinCount(')+section('const realmHiddenLore=', 'function realmSeasonEventCount(')+section('function realmHiddenRouteTick(', 'async function realmSouvenirExchange('),ctx);
 for(let i=0;i<8;i++){
  marks.clear();cd.clear();const site=places[i+1],at=ctx.realmHiddenPoint(site,i);
  assert.ok(Math.abs(at.x-site.x)>24.5||Math.abs(at.z-site.z)>24.5,`realm ${i} hidden route beyond site`);
  const p={dimension:{id:`hakkai:realm_${i}`,spawnParticle:()=>{}},location:{...at},isSneaking:true,sendMessage:()=>{},playSound:()=>{}};
  ctx.realmHiddenRouteTick(p,site);assert.equal(marks.has(`realm_hidden_routes:${i}`),false,'prerequisites remain necessary');
  marks.add(`realm_echoes:${i}`);marks.add(`realm_bonus_riddles:${i}`);
  p.dimension.id=`hakkai:realm_${(i+1)%8}`;ctx.realmHiddenRouteTick(p,site);assert.equal(marks.has(`realm_hidden_routes:${i}`),false,'different dimension rejected');
  p.dimension.id=`hakkai:realm_${i}`;p.location={x:at.x+5.5,y:at.y+16,z:at.z};ctx.realmHiddenRouteTick(p,site);assert.equal(marks.has(`realm_hidden_routes:${i}`),true);
  const n=given.length;ctx.realmHiddenRouteTick(p,site);assert.equal(given.length,n,'already marked does not pay twice');
 }
 assert.match(src,/realmHiddenRouteTick\(p,recordSite\)/);
 for(const name of ['realmDiscovery','realmTrial','realmRuin','realmMemory','realmEcho','realmSeasonalEvent'])assert.match(src,new RegExp(`${name}Tick\\(p,recordSite\\)`));
 assert.match(src,/realmHiddenPoint\(travelSites\.get\(i\+1\),i\)/);
});
test('expedition claims nearest point within widened boundary, even if target chunk was skipped',async()=>{
 const props=new Map(),awards=[];let detail='';
 const r=setupExpeditionRecords({ns:'hakkai:',places,num:(p,k)=>props.get(`${p.id}:${k}`)??0,notice:()=>{},frontierWorlds:{siteCoords:(_r,i)=>i===3?[310,25]:[700+i*20,0],isGenerated:()=>false},claimDiscovery:(p,id,k,v)=>{awards.push(id);props.set(`${p.id}:${k}`,v);return 'ok';},paged:async()=>3,simple:(_p,_title,body)=>{detail=body;}});
 const p={id:'p',dimension:{id:'hakkai:realm_0',spawnParticle:()=>{}},location:{x:294,y:152,z:25},playSound:()=>{}};
 r.tick(p,0);assert.equal(r.count(p),1);assert.equal(awards[0],'hakkai:toki_crystal');
 await r.journal(p);assert.match(detail,/X 310 \/ Z 25/);assert.match(detail,/足場が必ずあるとは限りません/);
 p.location={x:118+16.01,y:88,z:0};r.tick(p,20);assert.equal(r.count(p),1);
 p.location={x:118+16,y:153,z:0};r.tick(p,40);assert.equal(r.count(p),1);
 p.location={x:118+16,y:152,z:0};r.tick(p,60);assert.equal(r.count(p),2);
 // Near the overlap between base points 1 and 2: the nearest already-claimed
 // point blocks acquiring the other until the player moves closer to it.
 p.location={x:78,y:88,z:19};r.tick(p,80);assert.equal(r.count(p),3);
 p.location={x:77,y:88,z:6};r.tick(p,100);assert.equal(r.count(p),3);
 p.location={x:76,y:88,z:-21};r.tick(p,120);assert.equal(r.count(p),4);
});
test('memory fragments select the nearest of all three and remain distinct at overlaps',()=>{
 const marks=new Set(['realm_ruins:7']),cd=new Map(),particles=[];let claimed=[];
 const ctx={Math,Number,ns:'hakkai:',system:{currentTick:300,run:()=>{}},state:()=>({cd}),marked:(_p,k,i)=>marks.has(`${k}:${i}`),mark:(_p,k,i)=>marks.add(`${k}:${i}`),realmMemoryCount:()=>0,realmMemoryNames:Array.from({length:8},()=>['name','lore']),realmMemoryPoint:(_site,_i,j)=>[{x:-5,y:89,z:0},{x:0,y:89,z:5},{x:5,y:89,z:0}][j],claimRecordReward:(_p,_products,key,i)=>{marks.add(`${key}:${i}`);claimed.push(i);return true}};
 vm.createContext(ctx);vm.runInContext(section('function recordPointHint(', 'function realmDiscoveryTick(')+section('function realmMemoryTick(', 'async function realmMemoryBook('),ctx);
 const p={dimension:{id:'hakkai:realm_7',spawnParticle:(_id,pos)=>particles.push(pos)},location:{x:-2.5,y:105,z:2.5},isSneaking:true,sendMessage:()=>{},playSound:()=>{}};
 ctx.realmMemoryTick(p,places[8]);assert.deepEqual(claimed,[21]);assert.equal(particles[0].y,106.25);
 ctx.realmMemoryTick(p,places[8]);assert.deepEqual(claimed,[21],'recorded nearest point prevents overlap duplicate');
 p.location={x:0,y:73,z:5};ctx.realmMemoryTick(p,places[8]);assert.deepEqual(claimed,[21,22]);
 p.location={x:5,y:106,z:0};ctx.realmMemoryTick(p,places[8]);assert.deepEqual(claimed,[21,22]);
 p.location.y=105;ctx.realmMemoryTick(p,places[8]);assert.deepEqual(claimed,[21,22,23]);
});
test('seasonal events keep prerequisites, all four seasonal windows and per-realm records',()=>{
 const marks=new Set(),cd=new Map(),claims=[],points=[];let absolute=0;
 const ctx={Math,Number,ns:'hakkai:',world:{getAbsoluteTime:()=>absolute},seasonAt:day=>({index:Math.floor(day/4)%4}),system:{currentTick:300},state:()=>({cd}),marked:(_p,k,i)=>marks.has(`${k}:${i}`),mark:(_p,k,i)=>marks.add(`${k}:${i}`),realmEchoPoint:()=>({x:10,y:89,z:20}),realmSeasonStories:Array.from({length:8},()=>['story']),realmRuinData:Array.from({length:8},()=>['ruin']),realmJourneyLog:()=>{},era:()=> 'season',claimRecordReward:(_p,_products,key,i,extra)=>{claims.push(i);marks.add(`${key}:${i}`);for(const [k,n] of extra)marks.add(`${k}:${n}`);return true}};
 vm.createContext(ctx);vm.runInContext(section('function recordPointHint(', 'function realmDiscoveryTick(')+section('function realmSeasonWindow(', 'function realmHiddenRouteTick('),ctx);
 const p={dimension:{id:'',spawnParticle:(_id,at)=>points.push(at)},location:{x:14.5,y:105,z:20},isSneaking:true,sendMessage:()=>{},playSound:()=>{}};
 const starts=[0,6000,12000,18000];
 for(let season=0;season<4;season++)for(let i=0;i<8;i++){
  p.dimension.id=`hakkai:realm_${i}`;absolute=season*4*24000+starts[i%4];
  if(!marks.has(`realm_ruins:${i}`)){ctx.realmSeasonalEventTick(p,places[i+1]);assert.equal(claims.length,season*8+i,'locked without ruin');}
  marks.add(`realm_ruins:${i}`);marks.add(`realm_echoes:${i}`);
  absolute=season*4*24000+(starts[i%4]+5000)%24000;ctx.realmSeasonalEventTick(p,places[i+1]);assert.equal(claims.length,season*8+i,'wrong time is rejected');
  absolute=season*4*24000+starts[i%4];p.isSneaking=false;ctx.realmSeasonalEventTick(p,places[i+1]);assert.equal(claims.length,season*8+i,'standing does not claim');
  p.isSneaking=true;ctx.realmSeasonalEventTick(p,places[i+1]);assert.equal(claims.length,season*8+i+1);assert.equal(claims.at(-1),season*8+i);assert.ok(marks.has(`realm_season_stories:${i}`));
  ctx.realmSeasonalEventTick(p,places[i+1]);assert.equal(claims.length,season*8+i+1,'one reward per season and realm');
 }
 assert.ok(points.some(at=>at.y===106.25),'markers use player height');
});
test('all 24 real memory coordinates can be individually selected without overlap duplication',()=>{
 const marks=new Set(),cd=new Map(),claims=[];
 const ctx={Math,Number,ns:'hakkai:',coords:s=>({x:s.x+.5,y:89,z:s.z-4.5}),system:{currentTick:300,run:()=>{}},state:()=>({cd}),marked:(_p,k,i)=>marks.has(`${k}:${i}`),mark:(_p,k,i)=>marks.add(`${k}:${i}`),realmMemoryCount:()=>0,claimRecordReward:(_p,_products,key,i)=>{claims.push(i);marks.add(`${key}:${i}`);return true}};
 vm.createContext(ctx);vm.runInContext(section('function realmDiscoveryLocation(', 'function realmDiscoveryTick(')+section('function realmRuinLocation(', 'function realmRuinCount(')+section('const realmMemoryNames=', 'async function realmSanctumStory(')+section('function realmMemoryTick(', 'async function realmMemoryBook('),ctx);
 const p={dimension:{id:'',spawnParticle:()=>{}},location:{},isSneaking:true,sendMessage:()=>{},playSound:()=>{}};
 for(let i=0;i<8;i++){
  const site=places[i+1];p.dimension.id=`hakkai:realm_${i}`;marks.add(`realm_ruins:${i}`);
  for(let j=0;j<3;j++){
   const at=ctx.realmMemoryPoint(site,i,j);p.location={x:at.x,y:at.y+16,z:at.z};ctx.realmMemoryTick(p,site);
   assert.equal(claims.at(-1),i*3+j);const n=claims.length;ctx.realmMemoryTick(p,site);assert.equal(claims.length,n);
  }
 }
 assert.equal(claims.length,24);
});
test('discovery and trial accept widened boundary in each realm and reject wrong height or dimension',()=>{
 const marks=new Set(),cd=new Map(),particles=[];const ctx={Math,Number,ns:'hakkai:',coords:s=>({x:s.x+.5,y:89,z:s.z-4.5}),state:()=>({cd}),system:{currentTick:300},marked:(_p,k,i)=>marks.has(`${k}:${i}`),mark:(_p,k,i)=>marks.add(`${k}:${i}`),realmDiscoveries:Array.from({length:8},()=>['world','point']),realmDiscoveryCount:()=>0,realmTrialNames:Array(8).fill('trial'),realmTrialFinalReward:()=>{},claimRecordReward:(_p,_products,key,i)=>{marks.add(`${key}:${i}`);return true}};
 vm.createContext(ctx);vm.runInContext(section('function realmDiscoveryLocation(', 'async function eightRealmMemorialPage(')+section('function realmTrialTick(', 'async function realmTrialBook('),ctx);
 const p={dimension:{id:'',spawnParticle:(_id,at)=>particles.push(at)},location:{},isSneaking:true,sendMessage:()=>{},playSound:()=>{}};
 for(let i=0;i<8;i++){
  cd.clear();const site=places[i+1],at=ctx.realmDiscoveryLocation(site,i);p.dimension.id=`hakkai:realm_${i}`;p.location={x:at.x+7,y:at.y+17,z:at.z};
  ctx.realmDiscoveryTick(p,site);assert.equal(marks.has(`realm_discoveries:${i}`),false);
  p.location.y=at.y+16;p.dimension.id=`hakkai:realm_${(i+1)%8}`;ctx.realmDiscoveryTick(p,site);assert.equal(marks.has(`realm_discoveries:${i}`),false);
  p.dimension.id=`hakkai:realm_${i}`;ctx.realmDiscoveryTick(p,site);assert.equal(marks.has(`realm_discoveries:${i}`),true);
  assert.ok(particles.some(point=>point.y===p.location.y+1.25));ctx.realmTrialTick(p,site);assert.equal(marks.has(`realm_trials:${i}`),true);
 }
});
test('direction light uses a short local bearing and falls back if the bearing is blocked',()=>{
 const spawned=[];let blockAir=true,blockFails=false;const ctx={Math};vm.createContext(ctx);vm.runInContext(section('function recordPointHint(', 'function realmDiscoveryTick('),ctx);
 const p={location:{x:1,y:100,z:2},dimension:{getBlock:()=>{if(blockFails)throw Error('unloaded');return {isAir:blockAir}},spawnParticle:(id,at)=>spawned.push({id,...at})}};
 ctx.recordPointHint(p,3,{x:11,z:2});assert.deepEqual({...spawned.pop()},{id:'hakkai:climate_3',x:2.5,y:101.25,z:2});
 blockAir=false;ctx.recordPointHint(p,3,{x:11,z:2});assert.deepEqual({...spawned.pop()},{id:'hakkai:climate_3',x:1,y:101.25,z:2});
 blockFails=true;ctx.recordPointHint(p,3,{x:11,z:2});assert.deepEqual({...spawned.pop()},{id:'hakkai:climate_3',x:1,y:101.25,z:2});
});
test('all 72 expedition targets use their real coordinates and independent existing save bits',()=>{
 const props=new Map(),awards=[],num=(_p,k)=>props.get(k)??0;
 const frontierWorlds=setupFrontierWorlds({ns:'hakkai:',world:{},num:()=>0,property:()=>{},report:()=>{}});
 const records=setupExpeditionRecords({ns:'hakkai:',places,num,notice:()=>{},frontierWorlds,claimDiscovery:(_p,id,k,v)=>{awards.push(id);props.set(k,v);return 'ok'},paged:()=>{},simple:()=>{}});
 const p={id:'one',dimension:{id:'',spawnParticle:()=>{}},location:{},playSound:()=>{}};let tick=0;
 for(let realm=0;realm<8;realm++){
  p.dimension.id=`hakkai:realm_${realm}`;
  for(let i=0;i<9;i++){
   const [x,z]=i<3?[[places[realm+1].x+22,places[realm+1].z],[places[realm+1].x-18,places[realm+1].z+19],[places[realm+1].x-20,places[realm+1].z-21]][i]:frontierWorlds.siteCoords(realm,i);
   p.location={x,y:88,z};records.tick(p,tick);tick+=20;assert.equal(records.count(p),realm*9+i+1,`${realm}:${i}`);
  }
 }
 assert.equal(awards.filter(x=>x==='hakkai:bandage').length,8);
 assert.equal(awards.filter(x=>x==='hakkai:mana_tonic').length,8);
 assert.equal(awards.filter(x=>x==='hakkai:toki_crystal').length,56);
 assert.equal(props.get('discoveries'),(1<<24)-1);assert.equal(props.get('frontier_discoveries'),(1<<24)-1);assert.equal(props.get('deep_discoveries'),(1<<24)-1);
 records.tick(p,tick);assert.equal(awards.length,72);
});


test('expedition guide computes local bearing after selection, without claiming an accessible route',async()=>{
 let detail='',duringForm=()=>{};
 const r=setupExpeditionRecords({ns:'hakkai:',places,num:()=>0,notice:()=>{},frontierWorlds:{siteCoords:()=>[310,25],isGenerated:()=>false},claimDiscovery:()=>assert.fail('journal must not grant rewards'),paged:async()=>{duringForm();return 3},simple:(_p,_title,body)=>{detail=body;}});
 const p={id:'p',dimension:{id:'hakkai:realm_0'},location:{x:300,y:77,z:0}};
 duringForm=()=>{p.location.x=290};await r.journal(p);assert.match(detail,/南東へ水平約32ブロック/);assert.match(detail,/記録範囲まで約17ブロック/);assert.match(detail,/高さY 77/);assert.match(detail,/安全な経路の案内ではありません/);
 duringForm=()=>{p.dimension.id='hakkai:realm_1'};await r.journal(p);assert.match(detail,/対応する界に入ると/);assert.doesNotMatch(detail,/南東へ水平/);
});


test('expedition journal rejects a stale or invalid menu result',async()=>{
 for(const index of [undefined,-1,72,1.5]){
  const r=setupExpeditionRecords({ns:'hakkai:',places,num:()=>0,notice:()=>{},frontierWorlds:{},claimDiscovery:()=>{},paged:async()=>index,simple:()=>assert.fail('invalid result must not open detail')});
  await r.journal({id:'p',isValid:true,dimension:{id:'hakkai:realm_0'}});
 }
 const r=setupExpeditionRecords({ns:'hakkai:',places,num:()=>0,notice:()=>{},frontierWorlds:{},claimDiscovery:()=>{},paged:async()=>0,simple:()=>assert.fail('disconnected player')});
 await r.journal({id:'p',isValid:false,dimension:{id:'hakkai:realm_0'}});
});
