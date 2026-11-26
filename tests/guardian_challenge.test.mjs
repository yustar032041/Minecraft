import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createGuardianMultiplayer} from '../Hakkai_v7.1.0/BehaviorPack/scripts/guardian_multiplayer.js';
import {guardianChallengeHint} from '../Hakkai_v7.1.0/BehaviorPack/scripts/guardian_challenge.js';
const site={id:1,name:'始まりの草原',x:100,z:200},location={x:100,y:88,z:200};
const base={site,location,peaceful:false,remaining:0,nearby:false,name:'風の守護獣'};
test('guide displays correct next steps without claiming the ground is already safe',()=>{
 assert.match(guardianChallengeHint({...base,site:undefined}),/風見台以外/);
 assert.match(guardianChallengeHint({...base,site:{...site,id:0}}),/風見台以外/);
 assert.match(guardianChallengeHint({...base,peaceful:true}),/ピースフル/);
 assert.match(guardianChallengeHint({...base,remaining:21}),/2秒/);
 assert.match(guardianChallengeHint({...base,nearby:true}),/近くに/);
 assert.match(guardianChallengeHint({...base,nearby:undefined}),/周囲を確認できません/);
 assert.match(guardianChallengeHint({...base,location:{...location,x:126}}),/25ブロック以内/);
 const ready=guardianChallengeHint({...base,location:{...location,x:125}});assert.match(ready,/足場を確認/);assert.match(ready,/風の守護獣/);
});

test('real quest form displays current state and rechecks distance after selection',async()=>{
 const fs=await import('node:fs'),vm=await import('node:vm');const src=fs.readFileSync('Hakkai_v7.1.0/BehaviorPack/scripts/main.js','utf8');
 const a=src.indexOf('async function quest(p){'),b=src.indexOf('async function settings(p){',a);assert.ok(a>0&&b>a);
 let shown='',notices=[],spawned=[],move=false;const state={cd:new Map()},d={id:'realm',getEntities:()=>[],spawnEntity:(id,where)=>{spawned.push([id,where]);return {id:'boss',isValid:true,typeId:id}}};
 const p={isValid:true,location:{...location},dimension:d};
 const ctx={guardianChallengeHint,guardianMultiplayer:createGuardianMultiplayer({spectator:'spectator'}),num:()=>0,currentPlace:()=>site,space:()=>({}),guardians:['風の守護獣'],
  form:async(_p,_title,body)=>{shown=body;if(move)p.location.x=site.x+26;return 0},notice:(_p,msg)=>notices.push(msg),
  aspect:()=>0,coords:s=>({x:s.x,y:88,z:s.z}),world:{getDifficulty:()=>1},Difficulty:{Peaceful:0},system:{currentTick:100},state:()=>state,ns:'hakkai:',safeNear:(_d,x)=>x};
 vm.createContext(ctx);vm.runInContext(src.slice(a,b),ctx);
 move=true;await ctx.quest(p);assert.match(shown,/足場を確認/);assert.equal(spawned.length,0);assert.ok(notices.some(x=>x.includes('中心付近')));
 move=false;p.location.x=site.x;await ctx.quest(p);assert.equal(spawned.length,1);assert.equal(spawned[0][0],'hakkai:guardian_0');assert.equal(state.cd.get('guard'),460);
 await ctx.quest(p);assert.match(shown,/再挑戦まで約18秒/);assert.equal(spawned.length,1);
});

test('actual quest fails safely on state changes, unknown scans and uncertain spawn',async()=>{
 const fs=await import('node:fs'),vm=await import('node:vm');const src=fs.readFileSync('Hakkai_v7.1.0/BehaviorPack/scripts/main.js','utf8'),a=src.indexOf('async function quest(p){'),b=src.indexOf('async function settings(p){',a);
 for(const mode of ['dimension','invalid','scan','spawn']){
  const notes=[],reports=[],spawned=[],cooldown={cd:new Map()},world={getDifficulty:()=>1};let inForm=false;
  const d={id:'realm',getEntities:()=>{if(mode==='scan'&&!inForm)throw Error('scan unavailable');return [];},spawnEntity:()=>{spawned.push(1);if(mode==='spawn')throw Error('unknown outcome');return {id:'boss',typeId:'hakkai:guardian_0',isValid:true}}};
  const p={id:'p',isValid:true,dimension:d,location:{...location}},m=createGuardianMultiplayer({spectator:'spectator'});
  const ctx={guardianChallengeHint,guardianMultiplayer:m,num:()=>0,currentPlace:()=>{if(!p.isValid)throw Error('invalid player');return site},space:()=>({}),guardians:['風獣'],form:async()=>{inForm=false;if(mode==='dimension')p.dimension={...d,id:'other'};if(mode==='invalid')p.isValid=false;return 0},notice:(_p,x)=>notes.push(x),report:(...x)=>reports.push(x),aspect:()=>0,coords:s=>({x:s.x,y:88,z:s.z}),world,Difficulty:{Peaceful:0},system:{currentTick:100},state:()=>cooldown,ns:'hakkai:',safeNear:(_d,pos)=>pos};
  // Preview scans may succeed; only the after-form scan is made unavailable.
  inForm=true;vm.createContext(ctx);vm.runInContext(src.slice(a,b),ctx);await assert.doesNotReject(ctx.quest(p),mode);
  if(mode==='spawn'){assert.equal(spawned.length,1);assert.match(notes.at(-1),/確認/);assert.equal(cooldown.cd.get('guard'),460);}
  else {assert.equal(spawned.length,0,mode);if(mode==='scan')assert.match(notes.at(-1),/確認/);}
 }
});

test('actual quest rechecks site, difficulty, cooldown, nearby and floor after a form waits',async()=>{
 const fs=await import('node:fs'),vm=await import('node:vm');const src=fs.readFileSync('Hakkai_v7.1.0/BehaviorPack/scripts/main.js','utf8'),a=src.indexOf('async function quest(p){'),b=src.indexOf('async function settings(p){',a);
 for(const mode of ['site','peaceful','cooldown','nearby','floor','invalid-coordinates','invalid-result','tracking-error']){
  let phase='preview',shown='',spawns=0,activeSite=site;const notes=[],cd={cd:new Map()},world={difficulty:1,getDifficulty(){return this.difficulty}},dim={id:'realm',getEntities:()=>phase==='after'&&mode==='nearby'?[{}]:[],spawnEntity:()=>{spawns++;return mode==='invalid-result'?undefined:{id:'boss',isValid:true,typeId:'hakkai:guardian_0'}}};
  const p={id:'p',isValid:true,dimension:dim,location:{...location}},m=createGuardianMultiplayer({spectator:'spectator'});if(mode==='tracking-error')m.track=()=>{throw Error('unavailable')};
  const ctx={guardianChallengeHint,guardianMultiplayer:m,num:()=>0,currentPlace:()=>activeSite,space:()=>({}),guardians:['風獣'],form:async(_p,_t,body)=>{shown=body;phase='after';if(mode==='site')activeSite={...site,id:2};if(mode==='peaceful')world.difficulty=0;if(mode==='cooldown')cd.cd.set('guard',200);if(mode==='invalid-coordinates')p.location.x=NaN;return 0;},notice:(_p,x)=>notes.push(x),report:()=>{},aspect:()=>0,coords:s=>({x:s.x,y:88,z:s.z}),world,Difficulty:{Peaceful:0},system:{currentTick:100},state:()=>cd,ns:'hakkai:',safeNear:(_d,pos)=>mode==='floor'?undefined:pos};
  vm.createContext(ctx);vm.runInContext(src.slice(a,b),ctx);await ctx.quest(p);assert.match(shown,/足場/);
  if(['invalid-result','tracking-error'].includes(mode)){assert.equal(spawns,1,mode);assert.equal(cd.cd.get('guard'),460);assert.match(notes.at(-1),/確認/);}
  else {assert.equal(spawns,0,mode);assert.ok(notes.length,mode);}
 }
});
