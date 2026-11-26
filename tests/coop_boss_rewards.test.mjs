import {test} from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';
import {createGuardianMultiplayer} from '../Hakkai_v7.1.0/BehaviorPack/scripts/guardian_multiplayer.js';
import {COOP_BOSS_REWARDS,awardCoopBoss} from '../Hakkai_v7.1.0/BehaviorPack/scripts/boss_rewards.js';
const source=fs.readFileSync('Hakkai_v7.1.0/BehaviorPack/scripts/main.js','utf8');
function fixture(){
 const props=new Map(),items=new Map(),messages=[],drops=[],reports=[],handlers={},system={currentTick:100};
 const dim={id:'realm',spawnItem:(item,loc)=>{if(dim.failDrop)throw Error('no drop');drops.push([item.typeId,item.amount,{...loc}])},spawnParticle:()=>{}};
 const player=(id,x=0)=>({id,isValid:true,typeId:'minecraft:player',dimension:dim,location:{x,y:0,z:0},mode:'survival',getGameMode(){return this.mode},sendMessage:s=>messages.push([id,s])});
 const ledger=createGuardianMultiplayer({spectator:'spectator',tracked:e=>Boolean(COOP_BOSS_REWARDS[e?.typeId])});
 const guardian=createGuardianMultiplayer({spectator:'spectator'});class ItemStack{constructor(id,n){this.typeId=id;this.amount=n}}
 const ctx={COOP_BOSS_REWARDS,awardCoopBoss,bossMultiplayer:ledger,guardianMultiplayer:guardian,ns:'hakkai:',system,safeSub:(_a,_b,name,fn)=>handlers[name]=fn,ItemStack,
  property:(p,k,v)=>{if(p.failProperty)throw Error('property');props.set(`${p.id}:${k}`,v)},giveStatus:(p,id,n)=>{if(p.writeFailure)return 'error';if(p.full)return 'full';const key=`${p.id}:${id}`;items.set(key,(items.get(key)??0)+n);return 'ok'},report:(...x)=>reports.push(x),vanillaDrops:{}};
 vm.createContext(ctx);const a=source.indexOf("safeSub('world','after','entityDie',({deadEntity,damageSource})=>{"),b=source.indexOf("safeSub('world','after','entityDie',e=>",a);vm.runInContext(source.slice(a,b),ctx);
 const boss=(type,id)=>({id,typeId:type,dimension:dim,location:{x:0,y:0,z:0},isValid:true});
 const hit=(boss,p)=>ledger.record(boss,{damagingEntity:p},4,system.currentTick),kill=(boss,source)=>handlers.entityDie({deadEntity:boss,damageSource:source??{}});
 return {props,items,messages,drops,reports,system,dim,player,boss,hit,kill,ledger};
}
test('both actual death routes pay each eligible fighter once per encounter and again on rematch',()=>{
 for(const [type,property,core,extra,count] of [['hakkai:time_warden','time_warden_clear','hakkai:warden_core','hakkai:crystal_7',4],['hakkai:eclipse_colossus','eclipse_colossus_clear','hakkai:eclipse_core','hakkai:drop_element_7',1]]){
  const f=fixture(),a=f.player('a'),b=f.player('b',5),late=f.player('not-attacked'),e=f.boss(type,'one');f.hit(e,a);f.hit(e,b);f.kill(e,{damagingEntity:b});f.kill(e,{damagingEntity:b});
  for(const p of [a,b]){assert.equal(f.props.get(`${p.id}:${property}`),1);assert.equal(f.items.get(`${p.id}:${core}`),1);assert.equal(f.items.get(`${p.id}:${extra}`),count)}
  assert.equal(f.props.has(`${late.id}:${property}`),false);assert.equal(f.messages.length,2,'duplicate death does not duplicate rewards');
  const again=f.boss(type,'two');f.hit(again,a);f.hit(again,b);f.kill(again,{damagingEntity:a});
  assert.equal(f.items.get(`a:${core}`),2);assert.equal(f.items.get(`b:${extra}`),count*2);
 }
});
test('full or failed delivery affects only its owner; other players receive both items',()=>{
 const f=fixture(),a=f.player('a',2),b=f.player('b',4),e=f.boss('hakkai:time_warden','one');a.full=true;f.hit(e,a);f.hit(e,b);f.kill(e,{});
 assert.deepEqual(f.drops,[['hakkai:warden_core',1,{x:2,y:0,z:0}],['hakkai:crystal_7',4,{x:2,y:0,z:0}]]);assert.equal(f.items.get('b:hakkai:warden_core'),1);assert.equal(f.items.get('b:hakkai:crystal_7'),4);assert.ok(f.messages.find(x=>x[0]==='a')[1].includes('他の人も拾えます'));
 const g=fixture(),c=g.player('c'),d=g.player('d'),e2=g.boss('hakkai:eclipse_colossus','two');c.full=true;g.dim.failDrop=true;g.hit(e2,c);g.hit(e2,d);g.kill(e2,{});
 assert.equal(g.props.get('c:eclipse_colossus_clear'),1);assert.match(g.messages.find(x=>x[0]==='c')[1],/届けられません/);assert.equal(g.items.get('d:hakkai:eclipse_core'),1);assert.equal(g.reports.length,2);
});
test('late hurt after death cannot recreate credit; environmental kills need actual contribution',()=>{
 const f=fixture(),p=f.player('a'),e=f.boss('hakkai:time_warden','id');f.hit(e,p);f.kill(e,{});f.hit(e,p);f.kill(e,{damagingEntity:p});assert.equal(f.items.get('a:hakkai:warden_core'),1);
 const nobody=f.boss('hakkai:time_warden','id2');f.kill(nobody,{damagingEntity:{typeId:'minecraft:zombie'}});assert.equal(f.items.get('a:hakkai:warden_core'),1);
});
test('bosses do not also have shared loot tables',()=>{
 for(const type of ['time_warden','eclipse_colossus']){const obj=JSON.parse(fs.readFileSync(`Hakkai_v7.1.0/BehaviorPack/entities/${type}.json`));assert.equal(obj['minecraft:entity'].components['minecraft:loot'],undefined);assert.equal(fs.existsSync(`Hakkai_v7.1.0/BehaviorPack/loot_tables/hakkai/entities/${type}.json`),false)}
});
test('colossus actual summoning blocks overlap, allows rematches and protects bystanders',async()=>{
 const {setupMobSystem}=await import('../Hakkai_v7.1.0/BehaviorPack/scripts/mob_system.js');
 const props=new Map(),spawned=[],messages=[];let now=1000,peaceful=false,blocked=false;
 const dim={id:'hakkai:realm_7',getEntities:()=>[],getPlayers:()=>blocked?[{}]:[],isChunkLoaded:()=>true,getBlock:pos=>pos.y===79?{typeId:'hakkai:clockstone',isAir:false,isLiquid:false,isWaterlogged:false}:{isAir:true},spawnParticle:()=>{},spawnEntity:(type,location)=>{const e={id:'boss'+spawned.length,isValid:true,typeId:type,dimension:dim,location};spawned.push(e);return e}};
 const p=id=>({id,isValid:true,dimension:dim,location:{x:0,y:80,z:0},getViewDirection:()=>({x:1,z:0}),getGameMode:()=> 'survival',sendMessage:m=>messages.push([id,m])}),a=p('a'),b=p('b');
 const world={getDifficulty:()=>peaceful?'peaceful':'normal',getAbsoluteTime:()=>now,getDimension:()=>dim,getAllPlayers:()=>[a,b]},c=setupMobSystem({ns:'hakkai:',world,system:{currentTick:0},num:(p,k)=>k==='guards'?255:props.get(p.id+':'+k)??0,property:(p,k,v)=>props.set(p.id+':'+k,v),report:(_m,e)=>{throw e}});
 peaceful=true;assert.equal(c.summonColossus(a),false);peaceful=false;blocked=true;assert.equal(c.summonColossus(a),false,'no spawn near a player');blocked=false;
 assert.equal(c.summonColossus(a),true);assert.equal(spawned.length,1);assert.equal(c.summonColossus(b),false,'tracked boss remains blocking even if outside the loaded scan');
 c.onDeath({deadEntity:spawned[0],damageSource:{damagingEntity:a}});spawned[0].isValid=false;assert.equal(c.summonColossus(a),false,'personal 18 second cooldown');assert.equal(c.summonColossus(b),true,'a different player can start a rematch after death');
 c.onDeath({deadEntity:spawned[1]});spawned[1].isValid=false;now+=360;assert.equal(c.summonColossus(a),true);
});
test('a record storage error still delivers that player and does not block anyone else',()=>{
 const f=fixture(),a=f.player('a'),b=f.player('b'),e=f.boss('hakkai:time_warden','error');a.failProperty=true;f.hit(e,a);f.hit(e,b);f.kill(e,{});
 assert.equal(f.items.get('a:hakkai:warden_core'),1);assert.equal(f.items.get('b:hakkai:warden_core'),1);assert.equal(f.props.get('a:time_warden_clear'),undefined);assert.match(f.messages.find(([id])=>id==='a')[1],/保存に失敗/);
});
test('actual hurt hook feeds boss ledger before actual death reward',()=>{
 const f=fixture(),p=f.player('attacker'),q=f.player('killer'),e=f.boss('hakkai:time_warden','wired');let hurt;
 const a=source.indexOf("safeSub('world','after','entityHurt',({hurtEntity:e,damageSource:source,damage})=>{"),b=source.indexOf('// Suppress newly naturally spawned vanilla hostiles',a);
 const ctx={safeSub:(_a,_b,_n,fn)=>hurt=fn,guardianMultiplayer:{record:()=>{}},bossMultiplayer:f.ledger,system:f.system,report:(_m,err)=>{throw err},EntityDamageCause:{entityAttack:'attack',projectile:'projectile'},mobSystem:null,realmEnders:null,fushiSystem:null};
 vm.createContext(ctx);vm.runInContext(source.slice(a,b),ctx);hurt({hurtEntity:e,damage:3,damageSource:{cause:'magic',damagingEntity:p}});f.kill(e,{damagingEntity:q});
 assert.equal(f.items.get('attacker:hakkai:warden_core'),1);assert.equal(f.items.get('killer:hakkai:warden_core'),1);
});
test('disconnected or distant fighters do not receive the repeatable reward',()=>{
 const f=fixture(),near=f.player('near'),far=f.player('far',65),disconnected=f.player('left'),e=f.boss('hakkai:eclipse_colossus','distance');
 f.hit(e,near);f.hit(e,far);f.hit(e,disconnected);disconnected.isValid=false;f.kill(e,{});
 assert.equal(f.items.get('near:hakkai:eclipse_core'),1);assert.equal(f.items.has('far:hakkai:eclipse_core'),false);assert.equal(f.items.has('left:hakkai:eclipse_core'),false);
});
test('chief and all eight realm enders pay their original reward to every eligible participant, including arrow owners',()=>{
 for(let i=-1;i<8;i++){
  const f=fixture(),a=f.player('a'),b=f.player('b',3),far=f.player('far',65),left=f.player('left'),spectator=f.player('spec');spectator.mode='spectator';
  const type=i<0?'hakkai:fushi_chief':`hakkai:ender_${i}`,e=f.boss(type,`rare-${i}`);
  f.hit(e,a);f.ledger.record(e,{damagingProjectile:{getComponent:()=>({owner:b})}},3,f.system.currentTick);f.hit(e,far);f.hit(e,left);f.hit(e,spectator);left.isValid=false;
  f.kill(e,{});f.kill(e,{});const reward=i<0?'hakkai:fushi_totem':`hakkai:pearl_${i}`;
  assert.equal(f.items.get(`a:${reward}`),1);assert.equal(f.items.get(`b:${reward}`),1);assert.ok(!f.items.has(`far:${reward}`)&&!f.items.has(`left:${reward}`)&&!f.items.has(`spec:${reward}`));
  if(i<0){assert.equal(f.items.get('a:hakkai:crystal_7'),2);assert.equal(f.items.get('b:hakkai:crystal_7'),2);}
  assert.equal(f.props.size,0,'rare encounters do not invent completion progression');
  const next=f.boss(type,`retry-${i}`);f.hit(next,a);f.kill(next,{});assert.equal(f.items.get(`a:${reward}`),2);
 }
});
test('chief and realm ender reward failure is isolated, and nobody involved means no reward',()=>{
 const f=fixture(),a=f.player('a'),b=f.player('b'),e=f.boss('hakkai:fushi_chief','full');a.full=true;f.dim.failDrop=true;f.hit(e,a);f.hit(e,b);f.kill(e,{});
 assert.equal(f.items.get('b:hakkai:fushi_totem'),1);assert.match(f.messages.find(([id])=>id==='a')[1],/届けられません/);
 const n=f.boss('hakkai:ender_3','nobody');f.kill(n,{damagingEntity:{typeId:'minecraft:zombie'}});assert.ok(!f.items.has('a:hakkai:pearl_3'));
});
test('progression encounters have no duplicate shared loot in entity files or generator tools',()=>{
 for(const name of ['fushi_chief',...Array.from({length:8},(_,i)=>`ender_${i}`)]){
  assert.equal(JSON.parse(fs.readFileSync(`Hakkai_v7.1.0/BehaviorPack/entities/${name}.json`))['minecraft:entity'].components['minecraft:loot'],undefined);
  assert.equal(fs.existsSync(`Hakkai_v7.1.0/BehaviorPack/loot_tables/hakkai/entities/${name}.json`),false);
 }
 for(const path of ['tools/create_fushi_content.py','tools/create_realm_endermen.py'])assert.ok(!fs.readFileSync(path,'utf8').includes("'minecraft:loot'"));
});

test('uncertain inventory failures do not trigger fallback drops or block other players',()=>{
 const f=fixture(),a=f.player('a'),b=f.player('b'),e=f.boss('hakkai:time_warden','uncertain');a.writeFailure=true;f.hit(e,a);f.hit(e,b);f.kill(e,{});
 assert.equal(f.drops.length,0);assert.equal(f.items.get('b:hakkai:warden_core'),1);assert.match(f.messages.find(([id])=>id==='a')[1],/届けられません/);
});
