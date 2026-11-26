import {isRecoveryFood} from '../Hakkai_v7.1.0/BehaviorPack/scripts/food_recovery.js';
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
assert.ok(INDUSTRY_CHAPTERS.find(([title])=>title==='混合と組立')[1].includes('完成するのは魔力の薬'));
const orePage=INDUSTRY_CHAPTERS.find(([title])=>title==='鉱石を2倍にする')[1];assert.ok(orePage.includes('88／128 SU'));assert.ok(orePage.includes('実機未検証'));assert.ok(orePage.includes('樽・破砕機・樽・洗浄機・樽・風力加工機・樽'));
const materials=INDUSTRY_CHAPTERS.find(([title])=>title==='加工機と生き物素材')[1];
assert.ok(materials.includes('20属性の生体核片→同属性の欠片2'));assert.ok(!materials.includes('素材120種'));
const src=fs.readFileSync('Hakkai_v7.1.0/BehaviorPack/scripts/main.js','utf8');const a=src.indexOf('async function industrialGuide('),z=src.indexOf('async function dispatchGuide(',a);assert.ok(a>=0&&z>a);
let choices=[],display=[],routes=[];
const c={INDUSTRY_CHAPTERS,claimIndustryGuide,space:deps.space,getItem:deps.getItem,give:deps.give,notice:deps.notice,ns:'hakkai:',
 checkEightRealmMemory:()=>0,realmRankUpdate:()=>0,realmRanks:[['','new']],era:()=>'',realmEchoCount:()=>0,places:[],visited:()=>false,currentPlace:()=>undefined,
 GUIDE_SECTIONS:[{title:'T',hint:'H',icon:'guide',ids:[12]}],GUIDE_ENTRIES:{12:'entry'},GUIDE_ICONS:{12:'guide'},itemTexture:id=>id,
 form:async(_,title,body,rows)=>{display.push({title,body,rows});return choices.shift();},dispatchGuide:(_,route)=>routes.push(route)};
c.guideSelect=(p,title,body,rows)=>selectGuidePage(p,title,body,rows,c.form);
c.isRecoveryFood=isRecoveryFood;vm.createContext(c);vm.runInContext(src.slice(a,z),c);
has=false;full=false;choices=[2];await c.guide(player);assert.equal(given,2);assert.ok(display[0].rows[2][0].includes('工業ガイド本を受け取る'));
choices=[5,0];await c.guide(player);assert.deepEqual(routes,[12],'ordinary guide section indices still route correctly');
choices=[1,0,7];await c.industrialGuide(player);assert.ok(display.some(x=>x.title.includes('鉱石を2倍にする')));
const use=src.slice(src.indexOf('function use(e){'),src.indexOf(" if(id===ns+'warden_sigil')",src.indexOf('function use(e){')))+'\n}';
let used=false;const useCtx={ns:'hakkai:',GameMode:{Spectator:'spectator'},state:()=>({useTick:-10}),system:{currentTick:100},gear:new Map(),menu:(_,fn)=>{used=fn===useCtx.industrialGuide;},guide:()=>{},industrialGuide:()=>{}};
useCtx.isRecoveryFood=isRecoveryFood;vm.createContext(useCtx);vm.runInContext(use,useCtx);useCtx.use({source:player,itemStack:{typeId:'hakkai:industrial_guide'}});assert.ok(used);
assert.deepEqual(pipeEndpoints('factory_pipe_up',{x:3,y:4,z:5}),{from:{x:3,y:3,z:5},to:{x:3,y:5,z:5}});
assert.equal(pipeEndpoints('unknown',{x:0,y:0,z:0}),undefined);
console.log('Actual guide selection, reissue/full inventory, independent book use and page navigation OK (mocked)');
// The real top-level entry reaches a generated recipe detail and returns.
c.RECIPE_INDEX=[[0,'試験の装備','作成場所：作業台\n素材：鉄'],[1,'試験の機械','作成場所：作業台']];
c.simple=async(_p,title,body)=>{display.push({title,body});};
choices=[4,0,0,1,4];await c.guide(player);
assert.ok(display.some(x=>x.title==='試験の装備'&&x.body.includes('素材：鉄')),'recipe detail is reachable from guide');

c.RECIPE_USES=[['hakkai:test','試験の素材',[0]]];
choices=[4,3,0,0,1,1,4];await c.guide(player);
assert.ok(display.some(x=>x.title==='試験の素材'),'reverse recipe usage is reachable');
// Exercise real search menu, input, literal filtering, result details and back.
{
 const {searchGuideEntries}=await import('../Hakkai_v7.1.0/BehaviorPack/scripts/guide_navigation.js');
 let prompts=[],shown=[],nextChoices=[5,0,1,6,0,0,1,1,4],inputs=['試験','diamond'];
 class ModalFormData{title(v){this.t=v;return this}textField(){return this}async show(){prompts.push(this.t);return {canceled:false,formValues:[inputs.shift()]};}}
 const c2={RECIPE_INDEX:[[0,'試験装備（hakkai:gear_010）','鉄を使う'],[1,'別の機械','材料']],RECIPE_USES:[['minecraft:diamond','ダイヤモンド（minecraft:diamond）',[0]]],
  ModalFormData,FormCancelationReason:{UserBusy:'busy'},searchGuideEntries,notice:()=>{},report:()=>{},timed:async()=>{},simple:async(_p,title,body)=>shown.push([title,body]),
  form:async(_p,title,body,rows)=>{shown.push([title,body]);return nextChoices.shift();}};
 c2.guideSelect=(p,title,body,rows,start)=>selectGuidePage(p,title,body,rows,c2.form,start);
 vm.createContext(c2);vm.runInContext(src.slice(src.indexOf('async function recipeQuery('),src.indexOf('async function guide(p){')),c2);
 await c2.openRecipeCatalog(player);assert.equal(prompts.length,2);assert.ok(shown.some(([title,body])=>title.includes('試験装備')&&body==='鉄を使う'));assert.ok(shown.some(([title])=>title.includes('ダイヤモンド')));
}
