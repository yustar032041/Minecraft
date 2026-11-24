import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';
import {INDUSTRY_CHAPTERS,claimIndustryGuide} from '../Hakkai_v7.1.0/BehaviorPack/scripts/industry_guide.js';
import {selectGuidePage} from '../Hakkai_v7.1.0/BehaviorPack/scripts/guide_navigation.js';
import {pipeEndpoints} from '../Hakkai_v7.1.0/BehaviorPack/scripts/factory_transport.js';
const player={isValid:true,typeId:'minecraft:player',getGameMode:()=> 'survival'},messages=[];
let has=false,full=false,given=0;
const deps={ns:'hakkai:',space:()=>({}),getItem:()=>has?0:-1,give:(_,id)=>{assert.equal(id,'hakkai:industrial_guide');if(full)return false;given++;has=true;return true;},notice:(_,m)=>messages.push(m)};
assert.equal(claimIndustryGuide(player,deps),'given');assert.equal(given,1);assert.equal(claimIndustryGuide(player,deps),'owned');assert.equal(given,1);
has=false;full=true;assert.equal(claimIndustryGuide(player,deps),'full');assert.equal(given,1);
assert.ok(INDUSTRY_CHAPTERS.length>=7);for(const [title,text] of INDUSTRY_CHAPTERS)assert.ok(title&&text.length>50);
const src=fs.readFileSync('Hakkai_v7.1.0/BehaviorPack/scripts/main.js','utf8');const a=src.indexOf('async function industrialGuide('),z=src.indexOf('async function dispatchGuide(',a);assert.ok(a>=0&&z>a);
let choices=[],display=[],routes=[];
const c={INDUSTRY_CHAPTERS,claimIndustryGuide,space:deps.space,getItem:deps.getItem,give:deps.give,notice:deps.notice,ns:'hakkai:',
 checkEightRealmMemory:()=>0,realmRankUpdate:()=>0,realmRanks:[['','new']],era:()=>'',realmEchoCount:()=>0,places:[],visited:()=>false,currentPlace:()=>undefined,
 GUIDE_SECTIONS:[{title:'T',hint:'H',icon:'guide',ids:[12]}],GUIDE_ENTRIES:{12:'entry'},GUIDE_ICONS:{12:'guide'},itemTexture:id=>id,
 form:async(_,title,body,rows)=>{display.push({title,body,rows});return choices.shift();},dispatchGuide:(_,route)=>routes.push(route)};
c.guideSelect=(p,title,body,rows)=>selectGuidePage(p,title,body,rows,c.form);
vm.createContext(c);vm.runInContext(src.slice(a,z),c);
has=false;full=false;choices=[2];await c.guide(player);assert.equal(given,2);assert.ok(display[0].rows[2][0].includes('工業ガイド本を受け取る'));
choices=[3,0];await c.guide(player);assert.deepEqual(routes,[12],'ordinary guide section indices still route correctly');
choices=[1,0,7];await c.industrialGuide(player);assert.ok(display.some(x=>x.title.includes('鉱石を2倍にする')));
const use=src.slice(src.indexOf('function use(e){'),src.indexOf(" if(id===ns+'warden_sigil')",src.indexOf('function use(e){')))+'\n}';
let used=false;const useCtx={ns:'hakkai:',GameMode:{Spectator:'spectator'},state:()=>({useTick:-10}),system:{currentTick:100},gear:new Map(),menu:(_,fn)=>{used=fn===useCtx.industrialGuide;},guide:()=>{},industrialGuide:()=>{}};
vm.createContext(useCtx);vm.runInContext(use,useCtx);useCtx.use({source:player,itemStack:{typeId:'hakkai:industrial_guide'}});assert.ok(used);
assert.deepEqual(pipeEndpoints('factory_pipe_up',{x:3,y:4,z:5}),{from:{x:3,y:3,z:5},to:{x:3,y:5,z:5}});
assert.equal(pipeEndpoints('unknown',{x:0,y:0,z:0}),undefined);
console.log('Actual guide selection, reissue/full inventory, independent book use and page navigation OK (mocked)');
