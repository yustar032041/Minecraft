import assert from 'node:assert/strict';
import fs from 'node:fs';import vm from 'node:vm';
const src=fs.readFileSync('Hakkai_v7.1.0/BehaviorPack/scripts/main.js','utf8');
const helper=src.slice(src.indexOf('function castMagic(p,kind){'),src.indexOf('async function spells(p){'));
const prefix=src.slice(src.indexOf('function use(e){'),src.indexOf(" if(id===ns+'return_stone')menu(p,returnMenu);"))+'\n}';
let selected='hakkai:fushi_totem',selection=1,change=()=>{},calls=[],notices=[],unlocked=new Set([1,2,3,7]);
const p={id:'p',typeId:'minecraft:player',isValid:true,isSneaking:false,selectedSlotIndex:0,dimension:{id:'d'},getGameMode:()=> 'survival'};
const state={s:50,m:50,cd:new Map(),useTick:-10};const system={currentTick:50};
const c={state:()=>state,system,ns:'hakkai:',notice:(_,s)=>notices.push(s),mark:()=>{},visibleFrom:()=>true,combatParry:undefined,mobSystem:undefined,realmEnders:undefined,selected:()=>({typeId:selected}),space:()=>({}),debit:()=>true,castNewMagic:({kind})=>{calls.push(kind);return true;},form:async()=>{change();return selection},GameMode:{Spectator:'spectator'},gear:new Map(),menu:(_,fn)=>fn(p),guide:()=>{},wardenArena:undefined,isCreative:()=>false,home:[[0],[1],[2],[3],[4],[6],[5],[7]],visited:(_,i)=>unlocked.has(i)};
vm.createContext(c);vm.runInContext(helper+prefix,c);
await c.totemMagicMenu(p);assert.deepEqual(calls,[],'cancel no spend');selection=0;change=()=>{selected='minecraft:book'};await c.totemMagicMenu(p);assert.deepEqual(calls,[],'held item change invalidates');
selected='hakkai:fushi_totem';change=()=>{};await c.totemMagicMenu(p);assert.deepEqual(calls,['moon']);
for(const [name,kind] of [['magic_hikari','light'],['magic_kaze','wind'],['magic_mizu','water'],['magic_homura','fire'],['magic_kizuna','bond']]){
 state.useTick=-10;system.currentTick+=10;c.use({source:p,itemStack:{typeId:'hakkai:'+name}});assert.equal(calls.at(-1),kind,name);
}
unlocked.clear();const count=calls.length;state.useTick=-10;c.use({source:p,itemStack:{typeId:'hakkai:magic_kaze'}});assert.equal(calls.length,count,'unvisited item locked');
console.log('Actual item routing and totem confirmation: unlock, cancel and held item checks (mocked)');
