import {test} from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';
import {progressReward} from '../Hakkai_v7.1.0/BehaviorPack/scripts/inventory_exchange.js';
const src=fs.readFileSync('Hakkai_v7.1.0/BehaviorPack/scripts/main.js','utf8');
class Item{constructor(typeId,amount=1){Object.assign(this,{typeId,amount,maxAmount:typeId.includes('gear_')?1:64})}clone(){return new Item(this.typeId,this.amount)}isStackableWith(x){return this.typeId===x.typeId&&this.maxAmount>1}}
class Container{constructor(items){this.items=items;this.size=items.length;this.writes=0;this.failAt=0}getItem(i){return this.items[i]?.clone()}setItem(i,x){this.items[i]=x?.clone();if(++this.writes===this.failAt)throw Error('failed after mutation')}}
function fixture(items=[undefined,undefined,undefined]){
 const props=new Map(),notices=[],reports=[],pending=[],inv=new Container(items),p={isValid:true,location:{x:0,y:0,z:0},dimension:{id:'test',getBlock:()=>({typeId:'minecraft:enchanting_table'}),spawnParticle:()=>{}},playSound:()=>{},sendMessage:()=>{},getGameMode:()=> 'survival',getDynamicProperty:k=>props.get(k),setDynamicProperty(k,v){if(v===undefined)props.delete(k);else props.set(k,v);if(this.failKey===k){this.failKey=undefined;throw Error('failed after save')}}};
 const ctx={ns:'hakkai:',ItemStack:Item,progressReward,space:()=>inv,report:(...x)=>reports.push(x),notice:(_p,x)=>notices.push(x),num:(_p,k,f=0)=>props.get('hakkai:'+k)??f,markKey:(k,i)=>i<21?k:`${k}_v2_${Math.floor((i-21)/24)}`,markBit:i=>1<<(i<21?i:(i-21)%24),form:()=>new Promise(r=>pending.push(r)),simple:()=>{},marked:(_p,k,i)=>Boolean((props.get('hakkai:'+k)??0)&(1<<i))};
 vm.createContext(ctx);const a=src.indexOf('function deliverTrial('),b=src.indexOf('function persist(',a);vm.runInContext(src.slice(a,b),ctx);
 const load=(start,end)=>{const a=src.indexOf(start),b=src.indexOf(end,a);assert.ok(a>0&&b>a);vm.runInContext(src.slice(a,b),ctx)};
 return {p,ctx,props,notices,reports,pending,inv,load};
}
test('guardian archive requires space, retries after failed property write and allows only one overlapping claim',async()=>{
 const f=fixture([new Item('other',64)]);Object.assign(f.ctx,{guardians:Array(8).fill('守護者')});f.load('const guardianCoreNames=','// --- v4.7.0');f.props.set('hakkai:guards',1);
 let first=f.ctx.guardianCoreArchive(f.p);f.pending.shift()(0);await first;assert.equal(f.props.has('hakkai:guardian_core_claims'),false);assert.match(f.notices.at(-1),/空き/);
 f.inv.items[0]=undefined;f.p.failKey='hakkai:guardian_core_claims';first=f.ctx.guardianCoreArchive(f.p);f.pending.shift()(0);await first;assert.equal(f.inv.items[0],undefined);assert.equal(f.props.has('hakkai:guardian_core_claims'),false);
 const a=f.ctx.guardianCoreArchive(f.p),b=f.ctx.guardianCoreArchive(f.p);f.pending.shift()(0);await a;f.pending.shift()(0);await b;assert.equal(f.inv.items[0].typeId,'hakkai:guardian_core_0');assert.equal(f.props.get('hakkai:guardian_core_claims'),1);
});
test('adventure event rejects stale forms and plans all three rewards together',async()=>{
 const f=fixture([undefined,undefined]);Object.assign(f.ctx,{realmJourneyEvents:[['草原','story',['right'],0,'solution']],realmRankUpdate:()=>5,realmJourneyLog:()=>{},});f.load('async function realmAdventureEvent(', 'const realmRankRequests=');f.props.set('hakkai:realm_discoveries',1);
 let one=f.ctx.realmAdventureEvent(f.p,0);f.pending.shift()(0);await one;assert.equal(f.inv.items[0],undefined);assert.equal(f.props.has('hakkai:realm_journey_events'),false,'two slots cannot contain three reward types');
 f.inv.items.push(undefined);f.inv.size=3;one=f.ctx.realmAdventureEvent(f.p,0);let two=f.ctx.realmAdventureEvent(f.p,0);f.pending.shift()(0);await one;f.pending.shift()(0);await two;
 assert.equal(f.props.get('hakkai:realm_journey_events'),1);assert.deepEqual(f.inv.items.map(x=>x.typeId),['hakkai:shard_0','hakkai:chronicle_fragment','hakkai:crystal_7']);assert.match(f.notices.at(-1),/記録が変わりました/);
});
test('ruin question rechecks record while a second window is open',async()=>{
 const f=fixture();Object.assign(f.ctx,{realmRuinData:[['ruin','q',['a'],0,'a']],realmRuinCount:()=>0,travelSites:new Map(),realmRuinLocation:()=>({x:0,y:0,z:0})});f.load('async function realmRuinPuzzle(', 'function realmRuinFinalReward(');f.ctx.realmRuinFinalReward=()=>{};f.props.set('hakkai:realm_trials',1);
 const a=f.ctx.realmRuinPuzzle(f.p,0),b=f.ctx.realmRuinPuzzle(f.p,0);f.pending.shift()(0);await a;f.pending.shift()(0);await b;
 assert.equal(f.inv.items[0].amount,1);assert.equal(f.props.get('hakkai:realm_ruins'),1);assert.match(f.notices.at(-1),/変わりました/);
});
test('crop trade rechecks the day and restores both reward and daily record if persistence fails',async()=>{
 const f=fixture([new Item('minecraft:wheat',4)]);let day=1;Object.assign(f.ctx,{villagerNear:()=>true,era:()=> '春',seasonDay:()=>day,seasonAt:()=>({dayInSeason:1}),total:(c,id)=>c.items.reduce((n,x)=>n+(x?.typeId===id?x.amount:0),0),exchange:()=>{},});f.load('async function harvestMarket(', 'const runes=');
 let task=f.ctx.harvestMarket(f.p);day=2;f.pending.shift()(0);await task;assert.equal(f.inv.items[0].typeId,'minecraft:wheat');assert.match(f.notices.at(-1),/日が変わりました/);
 f.p.failKey='hakkai:trust';task=f.ctx.harvestMarket(f.p);f.pending.shift()(0);await task;assert.equal(f.inv.items[0].typeId,'minecraft:wheat');assert.equal(f.props.has('hakkai:harvest_day'),false);
 task=f.ctx.harvestMarket(f.p);f.pending.shift()(0);await task;assert.equal(f.inv.items[0].typeId,'hakkai:crystal_0');assert.equal(f.props.get('hakkai:harvest_day'),2);
});
test('inscription combines book and crystal payment and can use consumed slots',async()=>{
 const f=fixture([new Item('hakkai:crystal_0',2),new Item('minecraft:book')]);Object.assign(f.ctx,{runes:[{name:'風',a:0,desc:'x'}],GameMode:{Spectator:'spectator'},dist:()=>0,isCreative:()=>false});f.load('async function inscribeBooks(', 'async function transferRuneBook(');
 const task=f.ctx.inscribeBooks(f.p,{dim:'test'});f.pending.shift()(0);await task;assert.equal(f.inv.items[0].typeId,'hakkai:rune_book_0');assert.equal(f.inv.items[1],undefined);
});
test('brewing uses one active job per player and stops without spending if the stand vanishes',async()=>{
 const f=fixture([new Item('minecraft:glass_bottle'),new Item('minecraft:glow_berries'),new Item('hakkai:crystal_1'),new Item('minecraft:blaze_powder')]);let block='minecraft:brewing_stand';f.p.dimension.getBlock=()=>({typeId:block});let states={},timers=[];Object.assign(f.ctx,{dist:()=>0,GameMode:{Spectator:'spectator'},isCreative:()=>false,total:(c,id)=>c.items.filter(x=>x?.typeId===id).reduce((s,x)=>s+x.amount,0),state:()=>states,timed:()=>new Promise(r=>timers.push(r))});f.load('async function brewWork(',"safeSub('world','before','playerInteractWithBlock'");
 const first=f.ctx.brewWork(f.p,{dim:'test'});f.pending.shift()(0);await Promise.resolve();const second=f.ctx.brewWork(f.p,{dim:'test'});f.pending.shift()(0);await second;assert.match(f.notices.at(-1),/醸造中/);assert.equal(timers.length,1);
 block='minecraft:air';timers.shift()();await first;assert.equal(states.brewing,undefined);assert.equal(f.inv.items.filter(Boolean).length,4);
});
test('NPC quest updates both records and does not repeat a stale stage',async()=>{
 const f=fixture(),goals=[()=>true,()=>true,()=>true];Object.assign(f.ctx,{realmGuideDialogues:[['guide','hi','hint']],realmNpcFriend:()=>f.props.get('hakkai:realm_npc_friend_0')??0,realmNpcQuestStage:()=>f.props.get('hakkai:realm_npc_quest_0')??0,realmNpcQuestNames:['a','b','c'],realmNpcQuestHints:['a','b','c'],realmNpcQuestNeeds:goals,realmJourneyLog:()=>{},realmRankUpdate:()=>{}});f.load('async function realmNpcConversation(', 'async function realmNpcRoster(');
 const a=f.ctx.realmNpcConversation(f.p,0),b=f.ctx.realmNpcConversation(f.p,0);f.pending.shift()(0);await a;f.pending.shift()(0);await b;
 assert.equal(f.props.get('hakkai:realm_npc_quest_0'),1);assert.equal(f.props.get('hakkai:realm_npc_friend_0'),1);assert.equal(f.inv.items[0].amount,2);assert.match(f.notices.at(-1),/進行が変わりました/);
 const third=f.ctx.realmNpcConversation(f.p,0);f.p.failKey='hakkai:realm_npc_friend_0';f.pending.shift()(0);await third;assert.equal(f.props.get('hakkai:realm_npc_quest_0'),1);assert.equal(f.props.get('hakkai:realm_npc_friend_0'),1);assert.equal(f.inv.items[1],undefined);
});
test('completed brewing consumes all ingredients once and returns the freed inventory slot',async()=>{
 const f=fixture([new Item('minecraft:glass_bottle'),new Item('minecraft:glow_berries'),new Item('hakkai:crystal_1'),new Item('minecraft:blaze_powder')]);f.p.dimension.getBlock=()=>({typeId:'minecraft:brewing_stand'});const state={};Object.assign(f.ctx,{dist:()=>0,GameMode:{Spectator:'spectator'},isCreative:()=>false,total:(c,id)=>c.items.filter(x=>x?.typeId===id).reduce((s,x)=>s+x.amount,0),state:()=>state,timed:async()=>{}});f.load('async function brewWork(',"safeSub('world','before','playerInteractWithBlock'");
 const work=f.ctx.brewWork(f.p,{dim:'test'});f.pending.shift()(0);await work;assert.equal(f.inv.items[0].typeId,'hakkai:mana_tonic');assert.equal(f.inv.items.filter(Boolean).length,1);assert.equal(state.brewing,undefined);
});
test('extended bitset rewards use the correct property and preserve other bits',()=>{
 const f=fixture();f.props.set('hakkai:atlas_v2_0',4);assert.equal(f.ctx.deliverMarked(f.p,[['hakkai:crystal_0',1]],'atlas',24),true);assert.equal(f.props.get('hakkai:atlas_v2_0'),12);assert.equal(f.inv.items[0].typeId,'hakkai:crystal_0');
});
test('final ruin reward announces full inventory and retries after space is available',()=>{
 const f=fixture([new Item('other',64)]);Object.assign(f.ctx,{realmRuinCount:()=>8});const messages=[];f.p.sendMessage=s=>messages.push(s);f.load('function realmRuinFinalReward(', 'function realmRuinTick(');
 f.ctx.realmRuinFinalReward(f.p,true);assert.match(messages.at(-1),/空き/);assert.equal(f.props.has('hakkai:realm_ruins_complete'),false);
 f.inv.items[0]=undefined;f.ctx.realmRuinFinalReward(f.p);assert.equal(f.inv.items[0].amount,4);assert.equal(f.props.get('hakkai:realm_ruins_complete'),1);f.ctx.realmRuinFinalReward(f.p);assert.equal(f.inv.items[0].amount,4);
});
test('armor trial charges new materials atomically, keeps one-time claim on failure and rejects stale forms',async()=>{
 const f=fixture([new Item('minecraft:diamond'),undefined,undefined]);
 Object.assign(f.ctx,{armorSetDefs:[['series','a','b','c','d']],ownsArmorPiece:()=>true});
 f.load('async function armorSetTrial(', '// --- v4.9.0');
 let task=f.ctx.armorSetTrial(f.p);f.pending.shift()(0);await task;
 assert.equal(f.props.has('hakkai:armor_set_trial_claimed'),false);assert.equal(f.inv.items[0].typeId,'minecraft:diamond');
 f.inv.items[1]=new Item('minecraft:netherite_scrap');f.p.failKey='hakkai:armor_set_trial_claimed';
 task=f.ctx.armorSetTrial(f.p);f.pending.shift()(0);await task;
 assert.deepEqual(f.inv.items.filter(Boolean).map(x=>x.typeId),['minecraft:diamond','minecraft:netherite_scrap']);assert.equal(f.props.has('hakkai:armor_set_trial_claimed'),false);
 const a=f.ctx.armorSetTrial(f.p),b=f.ctx.armorSetTrial(f.p);f.pending.shift()(0);await a;f.pending.shift()(0);await b;
 assert.equal(f.props.get('hakkai:armor_set_trial_claimed'),1);assert.deepEqual(f.inv.items.filter(Boolean).map(x=>x.typeId),['hakkai:gear_186','minecraft:emerald']);
});
test('point rewards retry with backoff and restore inventory and extended record bits after failure',()=>{
 const f=fixture([new Item('other',64)]),cd=new Map();f.ctx.state=()=>({cd});f.ctx.system={currentTick:0};
 f.ctx.marked=(_p,k,i)=>Boolean((f.props.get('hakkai:'+f.ctx.markKey(k,i))??0)&f.ctx.markBit(i));
 f.load('function claimRecordReward(', 'function realmTrialFinalReward(');
 const claim=()=>f.ctx.claimRecordReward(f.p,[['hakkai:chronicle_fragment',1]],'realm_relics',23);
 assert.equal(claim(),false);assert.match(f.notices.at(-1),/空き/);f.inv.items[0]=undefined;
 f.ctx.system.currentTick=99;assert.equal(claim(),false);assert.equal(f.inv.items[0],undefined);
 f.ctx.system.currentTick=100;f.p.failKey='hakkai:realm_relics_v2_0';assert.equal(claim(),false);assert.equal(f.inv.items[0],undefined);assert.equal(f.props.has('hakkai:realm_relics_v2_0'),false);
 f.ctx.system.currentTick=200;assert.equal(claim(),true);assert.equal(f.inv.items[0].amount,1);assert.equal(f.props.get('hakkai:realm_relics_v2_0'),4);
 f.ctx.system.currentTick=300;assert.equal(claim(),false);assert.equal(f.inv.items[0].amount,1);
});
test('bonus puzzle rechecks record after answering two overlapping windows',async()=>{
 const f=fixture();Object.assign(f.ctx,{realmBonusRiddles:[['q',['a'],0,'a']],realmRuinData:[['ruin']]});f.load('async function realmBonusPuzzle(', 'function realmEchoTick(');f.props.set('hakkai:realm_ruins',1);
 const a=f.ctx.realmBonusPuzzle(f.p,0),b=f.ctx.realmBonusPuzzle(f.p,0);f.pending.shift()(0);await a;f.pending.shift()(0);await b;
 assert.equal(f.props.get('hakkai:realm_bonus_riddles'),1);assert.equal(f.inv.items[0].amount,1);assert.match(f.notices.at(-1),/記録が変わりました/);
});
test('sanctum does not grant reward when the form is cancelled, and restores failed record',async()=>{
 const f=fixture();let finish;Object.assign(f.ctx,{realmMemoryCount:()=>24,simple:()=>new Promise(r=>finish=r)});f.load('async function realmSanctumStory(', 'function realmMemoryTick(');
 let task=f.ctx.realmSanctumStory(f.p);finish(undefined);await task;assert.equal(f.inv.items[0],undefined);assert.equal(f.props.has('hakkai:realm_sanctum'),false);
 f.p.failKey='hakkai:realm_sanctum';task=f.ctx.realmSanctumStory(f.p);finish(0);await task;assert.equal(f.inv.items[0],undefined);assert.equal(f.props.has('hakkai:realm_sanctum'),false);
 task=f.ctx.realmSanctumStory(f.p);finish(0);await task;assert.equal(f.inv.items[0].typeId,'hakkai:relic_key');assert.equal(f.props.get('hakkai:realm_sanctum'),1);
});
test('seasonal reward and story flags roll back together if either property write fails',()=>{
 const f=fixture(),cd=new Map();Object.assign(f.ctx,{state:()=>({cd}),system:{currentTick:10}});
 f.ctx.marked=(_p,k,i)=>Boolean((f.props.get('hakkai:'+f.ctx.markKey(k,i))??0)&f.ctx.markBit(i));
 f.load('function claimRecordReward(', 'function realmTrialFinalReward(');
 f.p.failKey='hakkai:realm_season_stories';
 const claim=()=>f.ctx.claimRecordReward(f.p,[['hakkai:shard_0',1]],'realm_seasonal_events',24,[['realm_season_stories',0]]);
 assert.equal(claim(),false);assert.equal(f.inv.items[0],undefined);assert.equal(f.props.size,0);
 f.ctx.system.currentTick=110;assert.equal(claim(),true);assert.equal(f.props.get('hakkai:realm_seasonal_events_v2_0'),8);assert.equal(f.props.get('hakkai:realm_season_stories'),1);assert.equal(f.inv.items[0].typeId,'hakkai:shard_0');
});
