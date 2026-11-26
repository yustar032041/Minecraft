// Real main.js handlers and real transaction planner, with a mock Bedrock API.
// Fault injection covers mutations followed by throws, not process crashes or
// native engine behavior. A failed rollback can still leave inconsistent data.
import {test} from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';
import {progressReward} from '../Hakkai_v7.1.0/BehaviorPack/scripts/inventory_exchange.js';
import {setupFushiQuest} from '../Hakkai_v7.1.0/BehaviorPack/scripts/fushi_quest.js';
const src=fs.readFileSync('Hakkai_v7.1.0/BehaviorPack/scripts/main.js','utf8');
class Item{constructor(typeId,amount=1){Object.assign(this,{typeId,amount,maxAmount:64})}clone(){return new Item(this.typeId,this.amount)}isStackableWith(x){return this.typeId===x.typeId}}
class Container{constructor(items){this.items=items;this.size=items.length;this.count=0}getItem(i){return this.items[i]?.clone()}setItem(i,x){this.items[i]=x?.clone();if(++this.count===this.failAt){this.failAt=0;throw Error('mutated inventory')}}}
function fixture(items=[undefined,undefined]){
 const inv=new Container(items),props=new Map(),notices=[],reports=[],pending=[],menus=[],messages=[];
 const p={id:'a',isValid:true,location:{x:0,y:0,z:0},dimension:{id:'realm',spawnParticle:()=>{}},playSound:()=>{},sendMessage:m=>messages.push(m),getDynamicProperty:k=>props.get(k),setDynamicProperty(k,v){if(v===undefined)props.delete(k);else props.set(k,v);if(this.failKey===k){this.failKey=undefined;throw Error('mutated property')}}};
 const num=(_p,k,d=0)=>props.get('hakkai:'+k)??d,markKey=(k,i)=>i<21?k:`${k}_v2_${Math.floor((i-21)/24)}`,markBit=i=>1<<(i<21?i:(i-21)%24);
 const ctx={ns:'hakkai:',ItemStack:Item,progressReward,setupFushiQuest,space:()=>inv,report:(...x)=>reports.push(x),notice:(_p,m)=>notices.push(m),num,markKey,markBit,
  marked:(_p,k,i)=>Boolean(num(p,markKey(k,i))&markBit(i)),mark:(_p,k,i)=>p.setDynamicProperty('hakkai:'+markKey(k,i),num(p,markKey(k,i))|markBit(i)),
  property:(_p,k,v)=>p.setDynamicProperty('hakkai:'+k,v),form:()=>new Promise(r=>pending.push(r)),menu:(_p,fn)=>menus.push(()=>fn(p)),simple:()=>{},
 };
 vm.createContext(ctx);const load=(start,end)=>{const a=src.indexOf(start),b=src.indexOf(end,a);assert.ok(a>=0&&b>a,`${start} ${end}`);vm.runInContext(src.slice(a,b),ctx)};
 load('function deliverTrial(', 'function persist(');
 return {p,ctx,props,inv,notices,reports,pending,menus,messages,load};
}
function installFushi(f){const line=src.split('\n').find(x=>x.includes('const fushiQuest=setupFushiQuest('));assert.ok(line);vm.runInContext(line.replace('const fushiQuest=', 'this.quest='),f.ctx)}
test('FUSHI reward uses real registration and rolls back inventory and claimed property',()=>{
 const f=fixture([new Item('other',64)]);installFushi(f);f.props.set('hakkai:fushi_quest_bamboo',16);f.props.set('hakkai:fushi_quest_nights',2);
 assert.equal(f.ctx.quest.claim(f.p),false);assert.equal(f.props.has('hakkai:fushi_quest_claimed'),false);
 f.inv.items[0]=undefined;f.inv.failAt=1;assert.equal(f.ctx.quest.claim(f.p),false);assert.equal(f.inv.items[0],undefined);assert.equal(f.props.has('hakkai:fushi_quest_claimed'),false);
 f.p.failKey='hakkai:fushi_quest_claimed';assert.equal(f.ctx.quest.claim(f.p),false);assert.equal(f.inv.items[0],undefined);assert.equal(f.props.has('hakkai:fushi_quest_claimed'),false);
 assert.equal(f.ctx.quest.claim(f.p),true);assert.equal(f.inv.items[0].typeId,'hakkai:fushi_totem');assert.equal(f.props.get('hakkai:fushi_quest_claimed'),1);assert.equal(f.ctx.quest.claim(f.p),false);assert.equal(f.inv.items[0].amount,1);
});
test('FUSHI restores night and day after either failed property write, and counts each night once',()=>{
 for(const key of ['hakkai:fushi_quest_day','hakkai:fushi_quest_nights']){
  const f=fixture();installFushi(f);f.props.set('hakkai:fushi_quest_day',0);f.props.set('hakkai:fushi_quest_nights',1);f.p.failKey=key;
  f.ctx.quest.progress(f.p,24000);assert.equal(f.props.get('hakkai:fushi_quest_day'),0);assert.equal(f.props.get('hakkai:fushi_quest_nights'),1);
  f.ctx.quest.progress(f.p,24000);f.ctx.quest.progress(f.p,24000);assert.equal(f.props.get('hakkai:fushi_quest_nights'),2);assert.equal(f.props.get('hakkai:fushi_quest_day'),1);
 }
});
test('linked travel pass overlapping forms, full inventory and failed save',async()=>{
 const f=fixture([new Item('other',64)]);Object.assign(f.ctx,{linkedRealms:[{id:1}],visited:()=>false,arrive:()=>{}});f.props.set('hakkai:stories',2);f.load('async function linkedMenu(', 'const eraStops=');
 let task=f.ctx.linkedMenu(f.p);f.pending.shift()(1);await task;assert.equal(f.props.has('hakkai:linked_reward'),false);
 f.inv.items[0]=undefined;f.p.failKey='hakkai:linked_reward';task=f.ctx.linkedMenu(f.p);f.pending.shift()(1);await task;assert.equal(f.inv.items[0],undefined);assert.equal(f.props.has('hakkai:linked_reward'),false);
 const a=f.ctx.linkedMenu(f.p),b=f.ctx.linkedMenu(f.p);f.pending.shift()(1);await a;f.pending.shift()(1);await b;assert.equal(f.inv.items[0].typeId,'hakkai:travel_pass');assert.equal(f.inv.items[0].amount,1);assert.equal(f.props.get('hakkai:linked_reward'),1);
});
test('field discovery keeps original extended bitset, rechecks the location and pays once',async()=>{
 const f=fixture([new Item('other',64)]);let location=23;Object.assign(f.ctx,{fieldStructure:()=>location,fieldChronicles:Array.from({length:24},()=>['title','clue','story']),relicPuzzles:{},});f.load('async function expeditionStory(', 'const relicPuzzles=');
 let task=f.ctx.expeditionStory(f.p);f.pending.shift()(0);await task;assert.equal(f.props.has('hakkai:field_story_v2_0'),false);
 f.inv.items[0]=undefined;f.p.failKey='hakkai:field_story_v2_0';task=f.ctx.expeditionStory(f.p);f.pending.shift()(0);await task;assert.equal(f.inv.items[0],undefined);assert.equal(f.props.has('hakkai:field_story_v2_0'),false);
 task=f.ctx.expeditionStory(f.p);location=22;f.pending.shift()(0);await task;assert.equal(f.inv.items[0],undefined);location=23;
 const a=f.ctx.expeditionStory(f.p),b=f.ctx.expeditionStory(f.p);f.pending.shift()(0);await a;f.pending.shift()(0);await b;assert.equal(f.inv.items[0].amount,1);assert.equal(f.props.get('hakkai:field_story_v2_0'),4);
});
function readHandler(f,site){
 let def;Object.assign(f.ctx,{blockComponentRegistry:{},safeReg:(_r,_id,x)=>def=x,currentPlace:()=>site,origin:()=>({x:0,y:0,z:0}),expandedY:80,home:[[0]],aspect:()=>0,tale:()=>'',});
 f.load(" safeReg(blockComponentRegistry,ns+'read'", '\n});\r\n\r\nconst vanillaDrops=');return def.onPlayerInteract;
}
test('story stones retry missing shards and do not lose a full-inventory discovery; extended bit preserved',()=>{
 const f=fixture([new Item('other',64)]),site={id:24,kind:'story',size:1,x:0,z:0},read=readHandler(f,site),event={player:f.p,block:{x:2,y:80,z:11}};
 f.props.set('hakkai:stories_v2_0',4);read(event);assert.equal(f.props.get('hakkai:stories_v2_0'),4);assert.equal(f.inv.items[0].typeId,'other');
 f.inv.items[0]=undefined;f.p.failKey='hakkai:stories_v2_0';read(event);assert.equal(f.props.get('hakkai:stories_v2_0'),4);assert.equal(f.inv.items[0],undefined);
 read(event);read(event);assert.equal(f.props.get('hakkai:stories_v2_0'),12);assert.equal(f.inv.items[0].typeId,'hakkai:shard_0');assert.equal(f.inv.items[0].amount,1);
});
test('library tome is given once even with overlapping forms or failed record save',async()=>{
 const f=fixture([undefined,undefined]),site={id:10,kind:'story',size:1,x:0,z:0},read=readHandler(f,site),event={player:f.p,block:{x:2,y:80,z:11}};
 read(event);let task=f.menus.shift()();f.p.failKey='hakkai:library_tome';f.pending.shift()(0);await task;assert.equal(f.props.has('hakkai:library_tome'),false);assert.equal(f.inv.items[1],undefined);
 read(event);read(event);const a=f.menus.shift()(),b=f.menus.shift()();f.pending.shift()(0);await a;f.pending.shift()(0);await b;assert.equal(f.props.get('hakkai:library_tome'),1);assert.equal(f.inv.items[1].typeId,'hakkai:element_tome');assert.equal(f.inv.items[1].amount,1);
});
function arena(f){
 Object.assign(f.ctx,{realmArenaOpponents:Array.from({length:4},()=>['test','particle',1,1,'hit',0]),realmArenaStyles:[['style','',1,0]],realmArenaDifficulties:[[],[],['hard','',1,1]],realmArenaStyle:()=>0,realmArenaDifficulty:()=>2,realmArenaEntrance:async()=>{},realmGalleryDisplayed:()=>new Set(),realmGalleryComplete:()=>false,realmRankUpdate:()=>{},realmArenaMenu:()=>{},});
 f.ctx.realmArenaRecord=()=>({matches:f.ctx.num(f.p,'realm_arena_matches'),turns:f.ctx.num(f.p,'realm_arena_turns'),best:f.ctx.num(f.p,'realm_arena_best'),streak:f.ctx.num(f.p,'realm_arena_streak'),bestStreak:f.ctx.num(f.p,'realm_arena_best_streak'),hardWins:f.ctx.num(f.p,'realm_arena_hard_wins')});
 f.load('async function realmArenaBattle(', 'async function realmMuseumGrandStory(');
}
async function win(f,stage=0){const task=f.ctx.realmArenaBattle(f.p,stage);await new Promise(setImmediate);f.pending.shift()(0);await task}
test('arena first-win reward rolls back on failed save and retries; hard bonus is separately atomic',async()=>{
 const f=fixture([undefined,undefined]);arena(f);f.p.failKey='hakkai:realm_arena_clear';await win(f);assert.equal(f.inv.items.filter(Boolean).length,0);assert.equal(f.props.has('hakkai:realm_arena_clear'),false);
 f.p.failKey='hakkai:realm_arena_hard_wins';await win(f);assert.equal(f.props.get('hakkai:realm_arena_clear'),1);assert.equal(f.inv.items[0].typeId,'hakkai:shard_0');assert.equal(f.inv.items[1],undefined);assert.equal(f.props.has('hakkai:realm_arena_hard_clear'),false);assert.equal(f.props.has('hakkai:realm_arena_hard_wins'),false);
 await win(f);await win(f);assert.equal(f.inv.items[0].amount,3);assert.equal(f.inv.items[1].typeId,'hakkai:crystal_7');assert.equal(f.inv.items[1].amount,1);assert.equal(f.props.get('hakkai:realm_arena_hard_wins'),1);
});
test('all four arena stages and gallery variation keep their original rewards, with one hard bonus',async()=>{
 for(const [stage,gallery,id,quantity] of [[0,false,'hakkai:shard_0',3],[1,false,'hakkai:shard_3',3],[2,false,'hakkai:crystal_7',3],[3,false,'hakkai:chronicle_fragment',8],[3,true,'hakkai:crystal_7',4]]){
  const f=fixture([undefined,undefined]);arena(f);f.ctx.realmGalleryComplete=()=>gallery;
  await win(f,stage);await win(f,stage);
  assert.equal(f.props.get('hakkai:realm_arena_clear'),1<<stage);assert.equal(f.props.get('hakkai:realm_arena_hard_clear'),1<<stage);
  assert.equal(f.inv.items.find(x=>x?.typeId===id).amount,quantity);assert.equal(f.props.get('hakkai:realm_arena_hard_wins'),1);
 }
});
test('arena hard bonus can be retried after first reward fills the last slot',async()=>{
 const f=fixture([undefined]);arena(f);await win(f);assert.equal(f.props.get('hakkai:realm_arena_clear'),1);assert.equal(f.props.has('hakkai:realm_arena_hard_clear'),false);assert.match(f.notices.at(-1),/再挑戦/);
 f.inv.items.push(undefined);f.inv.size++;await win(f);assert.equal(f.inv.items[0].amount,3);assert.equal(f.inv.items[1].typeId,'hakkai:crystal_7');assert.equal(f.props.get('hakkai:realm_arena_hard_wins'),1);
});
test('independent FUSHI claims do not share flags or inventories across players',()=>{
 const a=fixture(),b=fixture();for(const f of [a,b]){installFushi(f);f.props.set('hakkai:fushi_quest_bamboo',16);f.props.set('hakkai:fushi_quest_nights',2)}
 a.p.failKey='hakkai:fushi_quest_claimed';assert.equal(a.ctx.quest.claim(a.p),false);assert.equal(b.ctx.quest.claim(b.p),true);assert.equal(a.inv.items[0],undefined);assert.equal(b.inv.items[0].typeId,'hakkai:fushi_totem');assert.equal(a.ctx.quest.claim(a.p),true);
});
function chiefHandler(f){
 const a=src.indexOf(" if(e.target.typeId===ns+'fushi'||e.target.typeId===ns+'fushi_chief')"),b=src.indexOf(" if(p.isSneaking&&wildlifeById",a);assert.ok(a>=0&&b>a);
 Object.assign(f.ctx,{fushiQuest:{status:()=>({bamboo:16,nights:2,claimed:false}),claim:()=>{}},world:{getAbsoluteTime:()=>48000},dist:(a,b)=>Math.hypot(a.x-b.x,a.y-b.y,a.z-b.z)});
 vm.runInContext(`function chiefHandle(e){const p=e.player;${src.slice(a,b)} }`,f.ctx);
 return {target:{typeId:'hakkai:fushi_chief',isValid:true,dimension:f.p.dimension,location:{x:1,y:0,z:0}},handle:f.ctx.chiefHandle};
}
test('both FUSHI daily exchanges preserve ingredients, output and individual cooldown on failures',async()=>{
 for(const [choice,input,output,count,key] of [[0,8,'hakkai:shard_7',2,'fushi_gift_at'],[1,16,'hakkai:fushi_totem',1,'fushi_totem_at']]){
  const f=fixture([new Item('minecraft:bamboo',input)]),{target,handle}=chiefHandler(f),event={player:f.p,target};
  async function trade(){handle(event);const task=f.menus.shift()();f.pending.shift()(choice);await task}
  f.p.failKey='hakkai:'+key;await trade();assert.equal(f.inv.items[0].typeId,'minecraft:bamboo');assert.equal(f.inv.items[0].amount,input);assert.equal(f.props.has('hakkai:'+key),false);
  await trade();assert.equal(f.inv.items[0].typeId,output);assert.equal(f.inv.items[0].amount,count);assert.equal(f.props.get('hakkai:'+key),48000);
  await trade();assert.equal(f.inv.items[0].amount,count);assert.match(f.notices.at(-1),/次の日/);
 }
});
test('FUSHI exchanges reject full output and a moved target, and recheck stale forms',async()=>{
 const f=fixture([new Item('minecraft:bamboo',32)]),{target,handle}=chiefHandler(f),event={player:f.p,target};
 handle(event);let task=f.menus.shift()();f.pending.shift()(0);await task;assert.equal(f.inv.items[0].amount,32);assert.equal(f.props.has('hakkai:fushi_gift_at'),false);
 f.inv.items.push(undefined);f.inv.size++;
 handle(event);task=f.menus.shift()();target.location.x=20;f.pending.shift()(0);await task;assert.equal(f.inv.items[0].amount,32);target.location.x=1;
 handle(event);handle(event);const a=f.menus.shift()(),b=f.menus.shift()();f.pending.shift()(0);await a;f.pending.shift()(0);await b;assert.equal(f.inv.items[0].amount,24);assert.equal(f.inv.items[1].amount,2);assert.equal(f.props.get('hakkai:fushi_gift_at'),48000);
});
