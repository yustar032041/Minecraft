import {test} from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';
import {createGuardianMultiplayer} from '../Hakkai_v7.1.0/BehaviorPack/scripts/guardian_multiplayer.js';
import {guardianChallengeHint} from '../Hakkai_v7.1.0/BehaviorPack/scripts/guardian_challenge.js';
import {playerAttacker} from '../Hakkai_v7.1.0/BehaviorPack/scripts/friendly_fire.js';
const src=fs.readFileSync('Hakkai_v7.1.0/BehaviorPack/scripts/main.js','utf8');
function fixture(){
 const m=createGuardianMultiplayer({spectator:'spectator',resolveAttacker:playerAttacker}),props=new Map(),items=new Map(),drops=[],messages=[],handlers={},system={currentTick:100};
 const dim={id:'realm',spawnItem:(stack,loc)=>drops.push([stack.typeId,{...loc}]),spawnParticle:()=>{}};
 function player(id,x=0){return {id,typeId:'minecraft:player',isValid:true,dimension:dim,location:{x,y:0,z:0},mode:'survival',getGameMode(){return this.mode},sendMessage:s=>messages.push([id,s]),playSound:()=>{}}}
 const a=src.indexOf("safeSub('world','after','entityDie',({deadEntity,damageSource})=>{"),b=src.indexOf("safeSub('world','after','entityDie',e=>",a);
 const ctx={guardianMultiplayer:m,COOP_BOSS_REWARDS:{},system,ns:'hakkai:',safeSub:(_w,_t,k,fn)=>handlers[k]=fn,guardians:Array.from({length:8},(_,i)=>`guardian ${i}`),vanillaDrops:{},
 num:(p,k)=>props.get(p.id+':'+k)??0,property:(p,k,v)=>{if(p.failProperty===k)throw Error('write failed');props.set(p.id+':'+k,v)},giveStatus:(p,id,n)=>{if(p.writeFailure)return 'error';if(p.full)return 'full';const k=p.id+':'+id;items.set(k,(items.get(k)??0)+n);return 'ok'},ItemStack:class{constructor(id,n){this.typeId=id;this.amount=n}},report:()=>{}};
 vm.createContext(ctx);vm.runInContext(src.slice(a,b),ctx);
 const boss=(id='b',realm=0)=>({id,typeId:`hakkai:guardian_${realm}`,dimension:dim,location:{x:0,y:0,z:0},isValid:true});
 const hit=(e,p,damage=3)=>m.record(e,{damagingEntity:p},damage,system.currentTick);
 const kill=(e,source={})=>handlers.entityDie({deadEntity:e,damageSource:source});
 return {m,props,items,drops,messages,system,dim,player,boss,hit,kill};
}
test('cooperative hits give each eligible player independent credit and renewable cores',()=>{
 const f=fixture(),a=f.player('a'),b=f.player('b',10),watch=f.player('watch',1),e=f.boss();
 f.hit(e,a);f.hit(e,b);f.kill(e,{damagingEntity:b});
 for(const p of [a,b]){assert.equal(f.props.get(p.id+':guards'),1);assert.equal(f.props.get(p.id+':guardian_core_claims'),1);assert.equal(f.items.get(p.id+':hakkai:guardian_core_0'),1)}
 assert.equal(f.props.get(watch.id+':guards'),undefined);assert.equal(f.messages.length,2);
 const next=f.boss('next');f.hit(next,a);f.hit(next,b);f.kill(next,{damagingEntity:a});
 assert.equal(f.items.get('a:hakkai:guardian_core_0'),2);assert.equal(f.items.get('b:hakkai:guardian_core_0'),2);assert.ok(f.messages.slice(2).every(([,s])=>s.includes('再討伐')));
});
test('all eight guardians can award a new core even if the earlier core was spent',()=>{
 const f=fixture(),p=f.player('solo');
 for(let realm=0;realm<8;realm++){
  const item=`solo:hakkai:guardian_core_${realm}`,first=f.boss(`first-${realm}`,realm);
  f.hit(first,p);f.kill(first);assert.equal(f.items.get(item),1);
  f.items.set(item,0); // crafting spent the last core; progress record remains
  const next=f.boss(`repeat-${realm}`,realm);f.hit(next,p);f.kill(next);
  assert.equal(f.items.get(item),1,`realm ${realm+1} core is renewable`);
 }
 assert.equal(f.props.get('solo:guards'),255);
});
test('projectile owner, lethal-only, environmental death, expiry, distance, mode and disconnect',()=>{
 const f=fixture(),a=f.player('arrow'),last=f.player('last'),far=f.player('far',65),old=f.player('old'),gone=f.player('gone'),spectator=f.player('spec'),other=f.player('other'),e=f.boss();
 f.hit(e,old);f.system.currentTick+=6001;f.hit(e,far);f.hit(e,gone);gone.isValid=false;f.hit(e,spectator);spectator.mode='spectator';f.hit(e,other);other.dimension={id:'other'};
 f.m.record(e,{damagingProjectile:{getComponent:()=>({owner:a})}},2,f.system.currentTick);f.kill(e,{damagingEntity:last});
 for(const p of [a,last])assert.equal(f.items.get(p.id+':hakkai:guardian_core_0'),1,p.id);
 for(const p of [far,old,gone,spectator,other])assert.equal(f.items.get(p.id+':hakkai:guardian_core_0'),undefined,p.id);
 const env=f.boss('environment');f.hit(env,a);f.kill(env,{damagingEntity:{typeId:'minecraft:zombie'}});assert.equal(f.items.get('arrow:hakkai:guardian_core_0'),2,'recent credited participant survives non-player final blow');
 f.kill(f.boss('no-contribution'),{});assert.equal(f.items.size,2);
});
test('full inventory fallback is at participant feet and one failure does not block other players',()=>{
 const f=fixture(),a=f.player('a',3),b=f.player('b',5),e=f.boss();a.full=true;f.hit(e,a);f.hit(e,b);f.kill(e,{});
 assert.deepEqual(f.drops,[['hakkai:guardian_core_0',{x:3,y:0,z:0}]]);assert.equal(f.items.get('b:hakkai:guardian_core_0'),1);assert.equal(f.props.get('a:guards'),1);assert.ok(f.messages[0][1].includes('他の人も拾えます'));
});
test('record write errors are isolated from the other record, player and delivered core',()=>{
 for(const failure of ['guards','guardian_core_claims']){
  const f=fixture(),a=f.player('a'),b=f.player('b'),e=f.boss('error-'+failure);a.failProperty=failure;f.hit(e,a);f.hit(e,b);f.kill(e,{});
  assert.equal(f.items.get('a:hakkai:guardian_core_0'),1);assert.equal(f.items.get('b:hakkai:guardian_core_0'),1);
  assert.equal(f.props.get('a:'+failure),undefined);assert.equal(f.props.get('a:'+(failure==='guards'?'guardian_core_claims':'guards')),1);
  assert.equal(f.props.get('b:guards'),1);assert.equal(f.props.get('b:guardian_core_claims'),1);
  assert.match(f.messages.find(([id])=>id==='a')[1],/記録の保存に失敗/);
 }
});
test('two players cannot summon the same live encounter, and can retry after death',async()=>{
 const m=createGuardianMultiplayer({spectator:'spectator'}),site={id:1,name:'草原',x:0,z:0},notes=[],states=new Map(),spawned=[];
 const dim={id:'realm',getEntities:()=>[],spawnEntity:(id,loc)=>{const b={id:'b'+spawned.length,typeId:id,isValid:true,dimension:dim,location:loc};spawned.push(b);return b}};
 const p=id=>({id,isValid:true,location:{x:0,y:0,z:0},dimension:dim}),a=p('a'),b=p('b');const system={currentTick:100};
 const ctx={guardianMultiplayer:m,guardianChallengeHint,num:()=>0,currentPlace:()=>site,space:()=>({}),guardians:['風獣'],form:async()=>0,notice:(_p,x)=>notes.push(x),aspect:()=>0,coords:()=>({x:0,y:0,z:0}),world:{getDifficulty:()=>1},Difficulty:{Peaceful:0},system,state:p=>{if(!states.has(p.id))states.set(p.id,{cd:new Map()});return states.get(p.id)},ns:'hakkai:',safeNear:(_d,pos)=>pos};
 const start=src.indexOf('async function quest(p){'),end=src.indexOf('async function settings(p){',start);vm.createContext(ctx);vm.runInContext(src.slice(start,end),ctx);
 await Promise.all([ctx.quest(a),ctx.quest(b)]);assert.equal(spawned.length,1);assert.ok(notes.some(x=>x.includes('戦闘中')));
 spawned[0].location.x=500;await ctx.quest(b);assert.equal(spawned.length,1,'tracked boss blocks duplicate even when it leaves the center scan');
 m.clear(spawned[0]);spawned[0].isValid=false;await ctx.quest(b);assert.equal(spawned.length,2,'another player can start a rematch');
 m.clear(spawned[1]);spawned[1].isValid=false;await ctx.quest(a);assert.equal(spawned.length,2,'summoner cooldown remains personal');
 system.currentTick+=360;await ctx.quest(a);assert.equal(spawned.length,3);
});
test('production hurt subscriber records credited damage, not zero damage or unrelated targets',()=>{
 const f=fixture(),p=f.player('a'),e=f.boss();let onHurt;
 const a=src.indexOf("safeSub('world','after','entityHurt',({hurtEntity:e,damageSource:source,damage})=>{"),b=src.indexOf('// Suppress newly naturally spawned vanilla hostiles',a);assert.ok(a>0&&b>a);
 const ctx={safeSub:(_a,_b,_c,fn)=>onHurt=fn,guardianMultiplayer:f.m,bossMultiplayer:{record:()=>{}},system:f.system,report:()=>{},EntityDamageCause:{entityAttack:'attack',projectile:'projectile'},mobSystem:null,realmEnders:null,fushiSystem:null};
 vm.createContext(ctx);vm.runInContext(src.slice(a,b),ctx);
 onHurt({hurtEntity:e,damageSource:{cause:'magic',damagingEntity:p},damage:0});f.kill(e,{});assert.equal(f.items.size,0);
 const boss=f.boss('magic');onHurt({hurtEntity:boss,damageSource:{cause:'magic',damagingEntity:p},damage:2});f.kill(boss,{});assert.equal(f.items.get('a:hakkai:guardian_core_0'),1);
});
test('archive rechecks current claim after overlapping forms resolve',async()=>{
 const pending=[],props=new Map([['guards',1]]),given=[];const p={isValid:true,dimension:{spawnItem:()=>assert.fail()},location:{x:0,y:0,z:0}};
 const a=src.indexOf('const guardianCoreNames='),b=src.indexOf('// --- v4.7.0',a);assert.ok(a>0&&b>a);
 const ctx={num:(_p,k)=>props.get(k)??0,property:(_p,k,v)=>props.set(k,v),guardians:Array.from({length:8},(_,i)=>'guardian '+i),ns:'hakkai:',form:()=>new Promise(resolve=>pending.push(resolve)),simple:()=>{},notice:()=>{},deliverTrial:(_p,_c,products,updates)=>{given.push(products[0][0]);for(const [key,v] of Object.entries(updates))props.set(key,v);return true}};
 vm.createContext(ctx);vm.runInContext(src.slice(a,b)+';this.open=guardianCoreArchive;',ctx);
 const first=ctx.open(p),second=ctx.open(p);pending[0](0);await first;pending[1](0);await second;assert.deepEqual(given,['hakkai:guardian_core_0']);assert.equal(props.get('guardian_core_claims'),1);
});
test('guardian participation credits projectile owner if damagingEntity is the projectile',async()=>{
 const {playerAttacker}=await import('../Hakkai_v7.1.0/BehaviorPack/scripts/friendly_fire.js');
 const m=createGuardianMultiplayer({spectator:'spectator',resolveAttacker:playerAttacker}),dim={id:'realm'},p={id:'archer',typeId:'minecraft:player',isValid:true,dimension:dim,location:{x:0,y:0,z:0},getGameMode:()=> 'survival'},boss={id:'guard-projectile',typeId:'hakkai:guardian_1',dimension:dim,location:{x:0,y:0,z:0}},arrow={typeId:'minecraft:arrow',getComponent:()=>({owner:p})};
 m.record(boss,{damagingEntity:arrow},3,1);assert.deepEqual(m.participants(boss,{},2),[p]);
});
test('guardian shooter attribution isolates broken source fields and does not credit non-player owners',async()=>{
 const {playerAttacker}=await import('../Hakkai_v7.1.0/BehaviorPack/scripts/friendly_fire.js');const m=createGuardianMultiplayer({spectator:'spectator',resolveAttacker:playerAttacker}),dim={id:'realm'},p={id:'archer',typeId:'minecraft:player',isValid:true,dimension:dim,location:{x:0,y:0,z:0},getGameMode:()=> 'survival'};
 const boss={id:'guard-owner',typeId:'hakkai:guardian_0',dimension:dim,location:{x:0,y:0,z:0}},source={get damagingEntity(){throw Error('unavailable')},damagingProjectile:{getComponent:()=>({owner:p})}};m.record(boss,source,2,1);assert.deepEqual(m.participants(boss,{},2),[p]);
 const other={...boss,id:'other-owner'};m.record(other,{damagingEntity:{getComponent:()=>({owner:{typeId:'minecraft:skeleton',isValid:true}})}},2,1);assert.deepEqual(m.participants(other,{},2),[]);
});

test('actual guardian hurt and death subscribers deliver the projectile-owner reward',()=>{
 const f=fixture(),p=f.player('proj-owner'),boss=f.boss('hit-by-projectile');let onHurt;
 const a=src.indexOf("safeSub('world','after','entityHurt',({hurtEntity:e,damageSource:source,damage})=>{"),b=src.indexOf('// Suppress newly naturally spawned vanilla hostiles',a);
 const c={safeSub:(_a,_b,_c,fn)=>onHurt=fn,guardianMultiplayer:f.m,bossMultiplayer:{record:()=>{}},system:f.system,report:()=>{},EntityDamageCause:{entityAttack:'attack',projectile:'projectile'},mobSystem:null,realmEnders:null,fushiSystem:null};
 vm.createContext(c);vm.runInContext(src.slice(a,b),c);const arrow={typeId:'minecraft:arrow',getComponent:()=>({owner:p})};
 onHurt({hurtEntity:boss,damageSource:{cause:'projectile',damagingEntity:arrow},damage:4});f.kill(boss,{});
 assert.equal(f.items.get('proj-owner:hakkai:guardian_core_0'),1);assert.equal(f.props.get('proj-owner:guards'),1);
 assert.match(src,/guardianMultiplayer=createGuardianMultiplayer\(\{spectator:GameMode\.Spectator,resolveAttacker:playerAttacker\}\)/);
});
test('other boss tracking keeps its previous default source resolver',()=>{
 const m=createGuardianMultiplayer({spectator:'spectator',tracked:e=>e.typeId==='boss'}),dim={id:'realm'},p={id:'p',typeId:'minecraft:player',isValid:true,dimension:dim,location:{x:0,y:0,z:0},getGameMode:()=> 'survival'},boss={id:'boss-default',typeId:'boss',dimension:dim,location:{x:0,y:0,z:0}},arrow={getComponent:()=>({owner:p})};
 m.record(boss,{damagingEntity:arrow},3,1);assert.deepEqual(m.participants(boss,{},2),[]);
});
