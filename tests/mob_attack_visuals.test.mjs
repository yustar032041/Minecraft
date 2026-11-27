import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mobContent} from '../Hakkai_v7.1.0/BehaviorPack/scripts/mob_content.js';
import {setupNativeMobStrikes,patrolCast,creatureWindup,creatureStrike} from '../Hakkai_v7.1.0/BehaviorPack/scripts/mob_attack_visuals.js';
import {patrolMagicHit} from '../Hakkai_v7.1.0/BehaviorPack/scripts/patrol_magic.js';
import fs from 'node:fs';import vm from 'node:vm';
import {setupFushiSystem,CHIEF_ATTACKS} from '../Hakkai_v7.1.0/BehaviorPack/scripts/fushi_system.js';
import {Difficulty,GameMode} from '@minecraft/server';
import {creatureVisualAnimation} from '../Hakkai_v7.1.0/BehaviorPack/scripts/mob_visual_styles.js';

test('native contacts are cosmetic, bounded and restricted to attacking mobs',()=>{
 const animations=[],particles=[],d={spawnParticle:(...x)=>particles.push(x)};
 const entity=(id,typeId)=>({id,typeId,isValid:true,dimension:d,location:{x:0,y:1,z:0},playAnimation:(...a)=>animations.push(a)});
 const mob=entity('a','hakkai:foe_0_0'),player=entity('p','minecraft:player'),hits=setupNativeMobStrikes(mobContent);
 assert.equal(hits.hit({damagingEntity:mob,hitEntity:player},100),true);
 assert.equal(animations[0][0],'animation.hakkai.foe_0_0_contact');assert.equal(particles.length,1);
 assert.equal(hits.hit({damagingEntity:mob,hitEntity:player},107),false);
 assert.equal(hits.hit({damagingEntity:mob,hitEntity:player},108),true);
 for(const type of ['minecraft:player','minecraft:zombie','hakkai:wild_0_0','hakkai:ender_0','hakkai:fushi_chief','hakkai:guardian_8'])assert.equal(hits.hit({damagingEntity:entity(type,type),hitEntity:player},200),false,type);
 assert.equal(hits.hit({damagingEntity:mob,hitEntity:{isValid:false}},200),false);
 hits.clear('a');mob.playAnimation=()=>{throw Error('unavailable')};d.spawnParticle=()=>{throw Error('unavailable')};
 assert.doesNotThrow(()=>hits.hit({damagingEntity:mob,hitEntity:player},200));
});

test('rebuilt wildlife native contacts use individual rigs without enabling passive attacks',()=>{
 const hits=setupNativeMobStrikes(mobContent),target={isValid:true};
 for(const realm of [0,1,2,3,4,5,6,7])for(let i=0;i<3;i++){
  const calls=[],id=`hakkai:wild_${realm}_${i}`;
  const mob={id,typeId:id,isValid:true,location:{x:0,y:0,z:0},dimension:{spawnParticle:()=>{}},playAnimation:a=>calls.push(a)};
  assert.equal(hits.hit({damagingEntity:mob,hitEntity:target},20),i!==0);
  assert.deepEqual(calls,i===0?[]:[`animation.hakkai.wild_${realm}_${i}_contact`]);
 }
});

test('king guardian native contacts reuse the matching guardian rig',()=>{
 const hits=setupNativeMobStrikes(mobContent),target={isValid:true};
 for(let i=0;i<8;i++){
  const calls=[],id=`hakkai:king_guardian_${i}`;
  const mob={id,typeId:id,isValid:true,location:{x:0,y:0,z:0},dimension:{spawnParticle:()=>{}},playAnimation:a=>calls.push(a)};
  assert.equal(hits.hit({damagingEntity:mob,hitEntity:target},20),true);
  assert.deepEqual(calls,[`animation.hakkai.guardian_${i}_contact`]);
 }
});

test('forest foe native hits select the matching individual animation',()=>{
 const hits=setupNativeMobStrikes(mobContent),target={isValid:true};
 for(let i=0;i<12;i++){
  const calls=[],id=`hakkai:foe_1_${i}`;
  const mob={id,typeId:id,isValid:true,location:{x:0,y:0,z:0},dimension:{spawnParticle:()=>{}},playAnimation:a=>calls.push(a)};
  assert.equal(hits.hit({damagingEntity:mob,hitEntity:target},20),true);
  assert.deepEqual(calls,[`animation.hakkai.foe_1_${i}_contact`]);
 }
});

test('desert foe native hits select individual animations',()=>{
 const hits=setupNativeMobStrikes(mobContent),target={isValid:true};
 for(let i=0;i<12;i++){
  const calls=[],id=`hakkai:foe_2_${i}`;
  const mob={id,typeId:id,isValid:true,location:{x:0,y:0,z:0},dimension:{spawnParticle:()=>{}},playAnimation:a=>calls.push(a)};
  assert.equal(hits.hit({damagingEntity:mob,hitEntity:target},20),true);
  assert.deepEqual(calls,[`animation.hakkai.foe_2_${i}_contact`]);
 }
});

test('ice foe native hits select individual animations',()=>{
 const hits=setupNativeMobStrikes(mobContent),target={isValid:true};
 for(let i=0;i<12;i++){
  const calls=[],id=`hakkai:foe_3_${i}`;
  const mob={id,typeId:id,isValid:true,location:{x:0,y:0,z:0},dimension:{spawnParticle:()=>{}},playAnimation:a=>calls.push(a)};
  assert.equal(hits.hit({damagingEntity:mob,hitEntity:target},20),true);
  assert.deepEqual(calls,[`animation.hakkai.foe_3_${i}_contact`]);
 }
});

test('storm foe native hits select individual animations',()=>{
 const hits=setupNativeMobStrikes(mobContent),target={isValid:true};
 for(let i=0;i<12;i++){
  const calls=[],id=`hakkai:foe_4_${i}`;
  const mob={id,typeId:id,isValid:true,location:{x:0,y:0,z:0},dimension:{spawnParticle:()=>{}},playAnimation:a=>calls.push(a)};
  assert.equal(hits.hit({damagingEntity:mob,hitEntity:target},20),true);
  assert.deepEqual(calls,[`animation.hakkai.foe_4_${i}_contact`]);
 }
});

test('underworld foe native hits select individual animations',()=>{
 const hits=setupNativeMobStrikes(mobContent),target={isValid:true};
 for(let i=0;i<12;i++){
  const calls=[],id=`hakkai:foe_5_${i}`;
  const mob={id,typeId:id,isValid:true,location:{x:0,y:0,z:0},dimension:{spawnParticle:()=>{}},playAnimation:a=>calls.push(a)};
  assert.equal(hits.hit({damagingEntity:mob,hitEntity:target},20),true);
  assert.deepEqual(calls,[`animation.hakkai.foe_5_${i}_contact`]);
 }
});

test('sky foe native hits select individual animations',()=>{
 const hits=setupNativeMobStrikes(mobContent),target={isValid:true};
 for(let i=0;i<12;i++){
  const calls=[],id=`hakkai:foe_6_${i}`;
  const mob={id,typeId:id,isValid:true,location:{x:0,y:0,z:0},dimension:{spawnParticle:()=>{}},playAnimation:a=>calls.push(a)};
  assert.equal(hits.hit({damagingEntity:mob,hitEntity:target},20),true);
  assert.deepEqual(calls,[`animation.hakkai.foe_6_${i}_contact`]);
 }
});

test('terminus foe native hits select individual animations',()=>{
 const hits=setupNativeMobStrikes(mobContent),target={isValid:true};
 for(let i=0;i<12;i++){
  const calls=[],id=`hakkai:foe_7_${i}`;
  const mob={id,typeId:id,isValid:true,location:{x:0,y:0,z:0},dimension:{spawnParticle:()=>{}},playAnimation:a=>calls.push(a)};
  assert.equal(hits.hit({damagingEntity:mob,hitEntity:target},20),true);
  assert.deepEqual(calls,[`animation.hakkai.foe_7_${i}_contact`]);
 }
});

test('native guardian hits use each guardian specific rig animation',()=>{
 const controller=setupNativeMobStrikes(mobContent),target={isValid:true};
 for(let i=0;i<8;i++){
  const calls=[],entity={id:`guardian${i}`,typeId:`hakkai:guardian_${i}`,isValid:true,location:{x:0,y:0,z:0},dimension:{spawnParticle:()=>{}},playAnimation:id=>calls.push(id)};
  assert.equal(controller.hit({damagingEntity:entity,hitEntity:target},20),true);
  assert.deepEqual(calls,[`animation.hakkai.guardian_${i}_contact`]);
 }
});

test('FUSHI windup and strike follow warning; missing charge scheduler fails closed',()=>{
 const animations=[],particles=[],damage=[];let tick=0,broken=false;
 const d={id:'r',getEntities:()=>[mob],spawnParticle:(id)=>{if(id==='hakkai:wind_burst'&&broken)throw Error('no particle');particles.push(id)}};
 const p={id:'p',typeId:'minecraft:player',isValid:true,dimension:d,location:{x:1,y:0,z:0},getGameMode:()=>GameMode.Survival,sendMessage:()=>{},applyDamage:n=>{damage.push(n);return true},addEffect:()=>{}};
 const mob={id:'m',typeId:'hakkai:fushi_chief',isValid:true,dimension:d,location:{x:0,y:0,z:0},playAnimation:id=>{animations.push([tick,id]);if(broken)throw Error('no animation')}};
 const system={get currentTick(){return tick}},world={getDifficulty:()=>Difficulty.Normal,getAllPlayers:()=>[p]};
 const ctrl=setupFushiSystem({world,system,report:()=>assert.fail()});ctrl.onHurt({hurtEntity:mob,damageSource:{damagingEntity:p}});
 tick=40;ctrl.tick(p,tick);assert.equal(particles.filter(x=>x==='hakkai:warning_marker').length,0);assert.deepEqual(animations,[[40,'animation.hakkai.fushi_chief_impact_windup']]);
 broken=true;tick=80;ctrl.tick(p,tick);assert.equal(animations[1][1],'animation.hakkai.fushi_chief_impact_strike');assert.deepEqual(damage,[]);
});

test('melee patrol strikes are cosmetic on actual contact and do not cover ranged or vanilla entities',()=>{
 const animations=[],particles=[],hits=setupNativeMobStrikes(mobContent);
 const player={id:'victim',isValid:true,location:{x:1,y:0,z:0}};
 const entity=(id,typeId)=>({id,typeId,isValid:true,location:{x:0,y:0,z:0},dimension:{spawnParticle:()=>particles.push(1)},playAnimation:id=>animations.push(id)});
 for(const id of ['hakkai:village_watch','hakkai:village_mage']){
  const mob=entity(id,id);assert.equal(hits.hit({damagingEntity:mob,hitEntity:player},20),true);
  assert.equal(hits.hit({damagingEntity:mob,hitEntity:player},27),false);
  assert.equal(hits.hit({damagingEntity:mob,hitEntity:player},28),true);
 }
 assert.deepEqual(animations,Array(4).fill('animation.hakkai.patrol_strike'));assert.equal(particles.length,4);
 for(const type of ['hakkai:village_archer','minecraft:villager_v2','minecraft:iron_golem'])assert.equal(hits.hit({damagingEntity:entity(type,type),hitEntity:player},40),false);
 const broken=entity('broken','hakkai:village_watch');broken.playAnimation=()=>{throw Error('not loaded')};assert.doesNotThrow(()=>hits.hit({damagingEntity:broken,hitEntity:player},50));
});

test('village mage selects visible permitted hostile and starts its scheduled bolt',()=>{
 const src=fs.readFileSync('Hakkai_v7.1.0/BehaviorPack/scripts/main.js','utf8');
 const begin=src.indexOf(" for(const mage of d.getEntities({type:ns+'village_mage'");const end=src.indexOf(' const dutyStart=',begin);assert.ok(begin>0&&end>begin);
 const source=src.slice(begin,end),calls=[];let allowed=true,visible=true;
 const d={getEntities:()=>[mage]},system={},world={};
 const mage={isValid:true,typeId:'hakkai:village_mage',location:{x:0,y:0,z:0}};
 const foe={isValid:true,location:{x:5,y:0,z:0},getHeadLocation:()=>({x:5,y:1,z:0})};
 const ctx={d,system,world,ns:'hakkai:',l:{x:0,y:0,z:0},hostile:[foe],dist:(a,b)=>Math.hypot(a.x-b.x,a.z-b.z),visibleFrom:()=>visible,permit:()=>allowed,patrolMagicHit:(...args)=>calls.push(args)};
 vm.runInNewContext(source,ctx);assert.equal(calls.length,1);assert.deepEqual(calls[0],[mage,foe,system,world]);
 calls.length=0;allowed=false;vm.runInNewContext(source,ctx);assert.equal(calls.length,0);
 allowed=true;visible=false;vm.runInNewContext(source,ctx);assert.equal(calls.length,0);
 const other={typeId:'minecraft:villager_v2',playAnimation:()=>assert.fail('vanilla not affected')};patrolCast(other);
});


test('talent-related visual variants are cosmetic and retain fallbacks',()=>{
 assert.equal(creatureVisualAnimation({id:'unknown',temper:'hostile',talent:'charge'},'strike'),'animation.hakkai.creature_lunge_strike');
 assert.equal(creatureVisualAnimation(undefined,'windup'),'animation.hakkai.creature_windup');
 for(let i=0;i<8;i++){const calls=[],entity={typeId:`hakkai:guardian_${i}`,playAnimation:id=>calls.push(id),location:{x:0,y:0,z:0},dimension:{spawnParticle:()=>{}}};creatureWindup(entity);creatureStrike(entity);assert.deepEqual(calls,[`animation.hakkai.guardian_${i}_windup`,`animation.hakkai.guardian_${i}_strike`]);}
 for(let i=0;i<8;i++){const calls=[],entity={typeId:`hakkai:ender_${i}`,playAnimation:id=>calls.push(id),location:{x:0,y:0,z:0},dimension:{spawnParticle:()=>{}}};creatureWindup(entity);creatureStrike(entity);assert.deepEqual(calls,[`animation.hakkai.ender_${i}_windup`,`animation.hakkai.ender_${i}_strike`]);}
 for(let i=0;i<12;i++){const calls=[],entity={typeId:`hakkai:foe_0_${i}`,playAnimation:id=>calls.push(id),location:{x:0,y:0,z:0},dimension:{spawnParticle:()=>{}}};creatureWindup(entity);creatureStrike(entity);assert.deepEqual(calls,[`animation.hakkai.foe_0_${i}_windup`,`animation.hakkai.foe_0_${i}_strike`]);}
 for(let i=0;i<12;i++){const calls=[],entity={typeId:`hakkai:foe_1_${i}`,playAnimation:id=>calls.push(id),location:{x:0,y:0,z:0},dimension:{spawnParticle:()=>{}}};creatureWindup(entity);creatureStrike(entity);assert.deepEqual(calls,[`animation.hakkai.foe_1_${i}_windup`,`animation.hakkai.foe_1_${i}_strike`]);}
 for(let i=0;i<12;i++){const calls=[],entity={typeId:`hakkai:foe_2_${i}`,playAnimation:id=>calls.push(id),location:{x:0,y:0,z:0},dimension:{spawnParticle:()=>{}}};creatureWindup(entity);creatureStrike(entity);assert.deepEqual(calls,[`animation.hakkai.foe_2_${i}_windup`,`animation.hakkai.foe_2_${i}_strike`]);}
 for(let i=0;i<12;i++){const calls=[],entity={typeId:`hakkai:foe_3_${i}`,playAnimation:id=>calls.push(id),location:{x:0,y:0,z:0},dimension:{spawnParticle:()=>{}}};creatureWindup(entity);creatureStrike(entity);assert.deepEqual(calls,[`animation.hakkai.foe_3_${i}_windup`,`animation.hakkai.foe_3_${i}_strike`]);}
 for(let i=0;i<12;i++){const calls=[],entity={typeId:`hakkai:foe_4_${i}`,playAnimation:id=>calls.push(id),location:{x:0,y:0,z:0},dimension:{spawnParticle:()=>{}}};creatureWindup(entity);creatureStrike(entity);assert.deepEqual(calls,[`animation.hakkai.foe_4_${i}_windup`,`animation.hakkai.foe_4_${i}_strike`]);}
 for(let i=0;i<12;i++){const calls=[],entity={typeId:`hakkai:foe_5_${i}`,playAnimation:id=>calls.push(id),location:{x:0,y:0,z:0},dimension:{spawnParticle:()=>{}}};creatureWindup(entity);creatureStrike(entity);assert.deepEqual(calls,[`animation.hakkai.foe_5_${i}_windup`,`animation.hakkai.foe_5_${i}_strike`]);}
 for(let i=0;i<12;i++){const calls=[],entity={typeId:`hakkai:foe_6_${i}`,playAnimation:id=>calls.push(id),location:{x:0,y:0,z:0},dimension:{spawnParticle:()=>{}}};creatureWindup(entity);creatureStrike(entity);assert.deepEqual(calls,[`animation.hakkai.foe_6_${i}_windup`,`animation.hakkai.foe_6_${i}_strike`]);}
 for(let i=0;i<12;i++){const calls=[],entity={typeId:`hakkai:foe_7_${i}`,playAnimation:id=>calls.push(id),location:{x:0,y:0,z:0},dimension:{spawnParticle:()=>{}}};creatureWindup(entity);creatureStrike(entity);assert.deepEqual(calls,[`animation.hakkai.foe_7_${i}_windup`,`animation.hakkai.foe_7_${i}_strike`]);}
 for(const r of [0,1,2,3,4,5,6,7])for(let i=0;i<3;i++){const calls=[],entity={typeId:`hakkai:wild_${r}_${i}`,playAnimation:id=>calls.push(id),location:{x:0,y:0,z:0},dimension:{spawnParticle:()=>{}}};creatureWindup(entity);creatureStrike(entity);assert.deepEqual(calls,[`animation.hakkai.wild_${r}_${i}_windup`,`animation.hakkai.wild_${r}_${i}_strike`]);}
 for(const [id,style] of [['hakkai:fushi_chief',undefined]]){
  const calls=[],entity={typeId:id,playAnimation:id=>calls.push(id),location:{x:0,y:0,z:0},dimension:{spawnParticle:()=>{}}};
  creatureWindup(entity);creatureStrike(entity);
  assert.deepEqual(calls,['animation.hakkai.creature_'+(style?style+'_':'')+'windup','animation.hakkai.creature_'+(style?style+'_':'')+'strike']);
 }
});

test('native contact is marked at the actual victim, and the king uses its rebuilt rig',()=>{
 const particles=[],animations=[],d={spawnParticle:(...args)=>particles.push(args)};
 const hits=setupNativeMobStrikes(mobContent),victim={isValid:true,location:{x:4,y:8,z:-2}};
 for(const [type,expected] of [['hakkai:eclipse_colossus','animation.hakkai.eclipse_cleave_contact'],['hakkai:guardian_3','animation.hakkai.guardian_3_contact'],['hakkai:foe_4_6','animation.hakkai.foe_4_6_contact']]){
  const e={id:type,typeId:type,isValid:true,dimension:d,location:{x:0,y:0,z:0},playAnimation:id=>animations.push(id)};
  assert.equal(hits.hit({damagingEntity:e,hitEntity:victim},20),true);assert.equal(animations.at(-1),expected);
  assert.deepEqual(particles.at(-1),['hakkai:mob_impact',{x:4,y:8.6,z:-2}]);
 }
 // Broken/missing positions and particles are isolated from the contact event.
 const broken={id:'broken',typeId:'hakkai:eclipse_colossus',isValid:true,dimension:{spawnParticle:()=>{throw Error('unavailable')}},playAnimation:()=>{throw Error('unavailable')}};
 assert.doesNotThrow(()=>hits.hit({damagingEntity:broken,hitEntity:{isValid:true}},50));
});

test('FUSHI mist uses bounded marks; moving attacks fail closed without scheduler',()=>{
 const marks=[],damage=[],animations=[];let tick=0;
 const d={id:'r',getEntities:()=>[mob],spawnParticle:(id,loc)=>marks.push({tick,id,loc})};
 const p={id:'p',typeId:'minecraft:player',isValid:true,dimension:d,location:{x:1,y:4,z:0},getGameMode:()=>GameMode.Survival,sendMessage:()=>{},applyDamage:n=>{damage.push(n);return true},addEffect:()=>{}};
 const mob={id:'m',typeId:'hakkai:fushi_chief',isValid:true,dimension:d,location:{x:0,y:4,z:0},playAnimation:id=>animations.push([tick,id])};
 const system={get currentTick(){return tick}},world={getDifficulty:()=>Difficulty.Normal,getAllPlayers:()=>[p]};
 const ctrl=setupFushiSystem({world,system,report:()=>assert.fail()});ctrl.onHurt({hurtEntity:mob,damageSource:{damagingEntity:p}});
 for(const [start,kind] of [[40,'impact'],[120,'time'],[200,'shadow']]){
  p.location.x=1;tick=start;ctrl.tick(p,tick);p.location.x=1.5;tick=start+40;ctrl.tick(p,tick);
  const effect=marks.filter(x=>x.tick===tick&&x.id===`hakkai:mob_${kind}`);assert.equal(effect.length,kind==='shadow'?20:0,kind);
  for(const x of effect.slice(0,3))assert.ok(Math.abs(x.loc.x)<=.45+1e-9,'impact marks anchored to chief');
  if(kind==='shadow')assert.equal(effect.at(-1).loc.x,1.5,'accepted mist hit has a separate mark on the victim');
 }
 assert.deepEqual(damage,[CHIEF_ATTACKS[2].damage]);
 assert.deepEqual(animations,[[40,'animation.hakkai.fushi_chief_impact_windup'],[80,'animation.hakkai.fushi_chief_impact_strike'],[120,'animation.hakkai.fushi_chief_moon_windup'],[160,'animation.hakkai.fushi_chief_moon_strike'],[200,'animation.hakkai.fushi_chief_mist_windup'],[240,'animation.hakkai.fushi_chief_mist_strike']]);
});

test('all 96 rebuilt foes use their own native contact track, independent of warned strike',()=>{
 const handler=setupNativeMobStrikes(mobContent);
 for(let realm=0;realm<8;realm++)for(let index=0;index<12;index++){
  const played=[],id=`foe_${realm}_${index}`;
  const mob={id,typeId:`hakkai:${id}`,isValid:true,dimension:{spawnParticle:()=>{}},playAnimation:name=>played.push(name)};
  const victim={id:'v',isValid:true,location:{x:1,y:0,z:0}};
  assert.equal(handler.hit({damagingEntity:mob,hitEntity:victim},10),true,id);
  assert.deepEqual(played,[`animation.hakkai.${id}_contact`],id);
 }
});
