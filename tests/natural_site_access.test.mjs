import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';
import {places} from '../Hakkai_v7.1.0/BehaviorPack/scripts/data.js';
import {isNaturalSite} from '../Hakkai_v7.1.0/BehaviorPack/scripts/natural_sites.js';
const main=fs.readFileSync('Hakkai_v7.1.0/BehaviorPack/scripts/main.js','utf8');
// Visits are recorded only for already built locations; placement is driven
// by the seeded chunk scanner rather than a separate proximity loop.
const records=main.slice(main.indexOf('function naturalSiteTick('),main.indexOf('// Only untouched chunks'));
for(const site of places.filter(isNaturalSite)){
 let recorded=0,built=false;
 const ctx={isNaturalSite,world:{},num:()=>built?1:0,visited:()=>false,recordEntry:()=>recorded++};
 vm.createContext(ctx);vm.runInContext(records,ctx);ctx.naturalSiteTick({},site);assert.equal(recorded,0);built=true;ctx.naturalSiteTick({},site);assert.equal(recorded,1);
}
// A site intersecting any completed or skipped terrain chunk is not placed.
{
 const code=main.slice(main.indexOf('async function buildSeededSite('),main.indexOf('async function arrive('));
 const marks=new Set();let builds=0;
 const ctx={siteBounds:(s)=>({x0:s.x-22,x1:s.x+22,z0:s.z-22,z1:s.z+22}),width:45,world:{},num:(_w,k)=>marks.has(k)?1:0,build:async()=>builds++};
 vm.createContext(ctx);vm.runInContext(code,ctx);
 const site={id:29,dim:0,x:200,z:168};
 await ctx.buildSeededSite(site);assert.equal(builds,1);
 marks.add('seed_land_0_12_10_v1');await assert.rejects(ctx.buildSeededSite(site),/既存地形/);assert.equal(builds,1);
 marks.clear();marks.add('seed_land_0_12_10_skip_v1');await assert.rejects(ctx.buildSeededSite(site),/既存地形/);
}
// The central teleport function rejects all site IDs before creating any task.
{
 const code=main.slice(main.indexOf('async function arrive(p,site){'),main.indexOf('async function returnNatural('));let notices=0;
 const ctx={isNaturalSite,notice:()=>notices++,state:()=>{throw Error('must not initialize teleport') }};vm.createContext(ctx);vm.runInContext(code,ctx);
 for(const site of places.filter(isNaturalSite))assert.equal(await ctx.arrive({},site),false);
 assert.equal(notices,40);
}
// The actual guide-accessible menus must not list or teleport to any of the
// 40 former destinations (including the previously overlooked rank/rail/port).
{
 const calls=[],ctx={places,isNaturalSite,realmRankUpdate:()=>1,realmRanks:[[0,'one'],[1,'two']],simple:(_p,title,body)=>calls.push({title,body}),form:async(_p,title,body,rows)=>{calls.push({title,body,rows});return undefined;},docks:places.filter(s=>s.landmark==='port'||s.kind==='island'&&s.landmark==='lagoon'),currentPlace:()=>places[9],yard:places[28],eraStops:places.filter(s=>s.kind==='era'),rideTrain:()=>assert.fail('no destination chosen'),exchange:()=>false,notice:()=>{},fishing:()=>{}};
 vm.createContext(ctx);vm.runInContext(main.slice(main.indexOf('async function harbor(p){'),main.indexOf('async function help(p){')),ctx);vm.runInContext(main.slice(main.indexOf('async function realmRankDestinationBoard(p){'),main.indexOf('async function realmSeasonStoryArchive')),ctx);
 const p={isValid:true};await ctx.harbor(p);await ctx.realmRankDestinationBoard(p);ctx.currentPlace=()=>places[8];await ctx.railOffice(p);ctx.currentPlace=()=>places[28];await ctx.railOffice(p);ctx.currentPlace=()=>places[49];await ctx.railOffice(p);
 const rendered=JSON.stringify(calls);for(const s of places.filter(isNaturalSite))assert.ok(!rendered.includes(s.name),`${s.name} leaked into menu`);
}
assert.ok(main.includes('if(isNaturalSite(site))return notice(p,'),'relic UI does not show a natural destination');
assert.ok(main.includes('destination=isNaturalSite(last)?places[last.dim+1]'),'fall rescue avoids removed teleport destinations');
assert.ok(main.includes('if(onlyIfVacant&&isNaturalSite(site))property(world,`natural_join_${site.id}_v1`,1)'),'only newly placed sites get a terrain join');
console.log('Seeded site visit records, 40 blocked direct destinations, rank/rail/port/relic menus, rescue compatibility (mocked/static)');
