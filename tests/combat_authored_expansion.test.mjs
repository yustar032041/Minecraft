import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {catalog} from '../Hakkai_v7.1.0/BehaviorPack/scripts/data.js';
import {WARDEN_BLADES} from '../Hakkai_v7.1.0/BehaviorPack/scripts/warden_blades.js';
import {ULTIMATE_WEAPONS} from '../Hakkai_v7.1.0/BehaviorPack/scripts/ultimate_weapons.js';
import {isActionWeapon} from '../Hakkai_v7.1.0/BehaviorPack/scripts/combat_action.js';
import {catalogFamily,CATALOG_FAMILY_COUNT} from '../Hakkai_v7.1.0/BehaviorPack/scripts/combat_weapon_families.js';
import {authoredMove} from '../Hakkai_v7.1.0/BehaviorPack/scripts/combat_weapon_movesets.js';
import {authoredUltimate,ultimateContains,authoredUltimateBonus,AUTHORED_ULTIMATE_IDS} from '../Hakkai_v7.1.0/BehaviorPack/scripts/combat_ultimate_authored.js';
import {ULTIMATE_FAMILY_COUNT} from '../Hakkai_v7.1.0/BehaviorPack/scripts/combat_ultimate_families.js';
import {isTraceWeapon} from '../Hakkai_v7.1.0/BehaviorPack/scripts/combat_weapon_trace.js';
import {setupCombatUltimate} from '../Hakkai_v7.1.0/BehaviorPack/scripts/combat_ultimate.js';

const melee=catalog.filter(isActionWeapon);
test('every catalog weapon of the five action classes resolves to a deliberate family',()=>{
 assert.equal(melee.length,59);assert.equal(CATALOG_FAMILY_COUNT,25);
 const families=new Set();
 for(const g of melee){
  assert.ok(catalogFamily(g),g.id);families.add(`${g.kind}:${g.a}`);
  for(let stage=1;stage<=3;stage++){
   const m=authoredMove(g,stage);assert.ok(m?.name,g.id);assert.ok(['thrust','cleave','cross','ring','spin'].includes(m.shape),g.id);
   assert.ok(m.reach>=2&&m.reach<=7,g.id);assert.ok((m.pulses??[0]).every(n=>Number.isInteger(n)&&n>=0&&n<=12));
  }
 }
 assert.equal(families.size,25);
 for(const g of melee.filter(x=>x.rank>=2))assert.notDeepEqual(authoredMove(g,3),authoredMove({...g,rank:1},3),g.id);
 assert.equal(isActionWeapon({id:'gear_002',kind:'弓'}),false);
});
test('ordinary melee families select distinct geometry and improved tiers',()=>{
 const find=id=>melee.find(g=>g.id===id);
 assert.equal(authoredMove(find('gear_080'),3).shape,'spin');
 assert.equal(authoredMove(find('gear_016'),3).shape,'cross');
 assert.equal(authoredMove(find('gear_037'),3).shape,'thrust');
 assert.deepEqual(authoredMove(find('gear_160'),3).pulses,[0,7]);
 assert.equal(authoredMove(find('gear_181'),3).effect,'slowness');
});
test('always-on action integration retains event-registration fail-safe and has no toggle',()=>{
 const s=fs.readFileSync('Hakkai_v7.1.0/BehaviorPack/scripts/main.js','utf8');
 assert.match(s,/enabled:\(\)=>weaponSwingAvailable&&actionHurtAvailable/);
 assert.doesNotMatch(s,/action_prototype/);
 assert.match(s,/if\(actionCombat\?\.controls\(e.player\)\)actionCombat.swing\(e\);else\{weaponTrace\?\.swing/);
});
test('all 95 catalog weapons resolve to 40 ultimate families with progression reach',()=>{
 const weapons=catalog.filter(isTraceWeapon);assert.equal(weapons.length,95);assert.equal(ULTIMATE_FAMILY_COUNT,40);
 const families=new Set();for(const g of weapons){
  const m=authoredUltimate(g);assert.ok(m,g.id);assert.ok(m.name.startsWith('極式'));families.add(`${g.kind}:${g.a}`);
  assert.ok(m.range>=5&&m.range<=15);assert.ok(ultimateContains(m,{x:0,y:0,z:0},{x:1,z:0},{x:2,y:0,z:0}),g.id);
  if(g.rank>1)assert.ok(m.range>authoredUltimate({...g,rank:1}).range,g.id);
 }
 assert.equal(families.size,40);
});
test('ten authored ultimates have bounded and meaningfully different sectors',()=>{
 assert.equal(AUTHORED_ULTIMATE_IDS.length,10);
 for(const g of [...WARDEN_BLADES,...ULTIMATE_WEAPONS])assert.ok(authoredUltimate(g),g.id);
 const o={x:0,y:0,z:0},v={x:1,z:0},p=(x,z,y=0)=>({x,y,z});
 const wind=authoredUltimate(WARDEN_BLADES[0]),ice=authoredUltimate(WARDEN_BLADES[3]),cloud=authoredUltimate(WARDEN_BLADES[6]);
 assert.equal(ultimateContains(wind,o,v,p(4,2)),true);assert.equal(ultimateContains(ice,o,v,p(4,2)),false);
 assert.equal(ultimateContains(cloud,o,v,p(.8,0)),false);assert.equal(ultimateContains(cloud,o,v,p(-3,0)),true);
 assert.equal(ultimateContains(cloud,o,v,p(2,0,4)),false);assert.equal(ultimateContains(cloud,o,{x:0,z:0},p(2,0)),false);
 const shadow=authoredUltimate(WARDEN_BLADES[5]);
 assert.equal(authoredUltimateBonus(shadow,o,{location:p(2,0),getViewDirection:()=>({x:1,z:0})}),6);
 assert.equal(authoredUltimateBonus(shadow,o,{location:p(2,0),getViewDirection:()=>({x:-1,z:0})}),0);
 assert.equal(authoredUltimateBonus(shadow,o,{location:p(2,0)}),0);
});
function combatFixture(g){
 let item=`hakkai:${g.id}`,visible=true,block=false;const hits=[],effects=[],anim=[];
 const d={id:'realm',isChunkLoaded:()=>true,getEntitiesFromRay:()=>block?[{entity:{id:'cow',typeId:'minecraft:cow',isValid:true,getComponent:()=>({hasTypeFamily:()=>false})},distance:1}]:[],spawnParticle(){}};
 const p={id:'p',typeId:'minecraft:player',isValid:true,dimension:d,selectedSlotIndex:0,location:{x:0,y:0,z:0},getHeadLocation:()=>({x:0,y:1,z:0}),getViewDirection:()=>({x:1,y:0,z:0}),getGameMode:()=> 'survival',getEffect:()=>undefined,addEffect(){},playAnimation:id=>anim.push(id),playSound(){}};
 const enemy=(id,x,z,type='minecraft:zombie')=>({id,typeId:type,isValid:true,dimension:d,location:{x,y:0,z},getHeadLocation(){return {...this.location,y:1};},getComponent:()=>({hasTypeFamily:()=>true}),getEffect:()=>undefined,addEffect:id=>effects.push(id),applyDamage:n=>(hits.push([id,n]),true),applyKnockback(){}});
 const s={s:20,m:10};const ctrl=setupCombatUltimate({system:{currentTick:10},notice(){},visibleFrom:()=>visible,selected:()=>({typeId:item})});
 return {p,d,s,ctrl,enemy,hits,effects,anim,setItem:x=>item=x,setVisible:x=>visible=x,setBlock:x=>block=x};
}
test('authored ultimate performs the selected actual shape with costs and boss protections',()=>{
 const g=WARDEN_BLADES[3],f=combatFixture(g),front=f.enemy('front',4,0),side=f.enemy('side',4,2),boss=f.enemy('boss',3,0,'hakkai:king_guardian_0');let pushes=0;boss.applyKnockback=()=>pushes++;
 f.d.getEntities=()=>[front,side,boss];assert.equal(f.ctrl.cast(f.p,f.s,g),true);
 assert.deepEqual(f.hits.map(x=>x[0]),['front','boss']);assert.deepEqual(f.s,{s:0,m:0});assert.deepEqual(f.effects,['slowness']);assert.equal(pushes,0);assert.equal(f.anim[0],'animation.hakkai.action_finisher_warden_3');
});
test('authored ultimate checks equipment, walls, and synchronous swap before applying extra effects or other hits',()=>{
 const g=WARDEN_BLADES[1],f=combatFixture(g),a=f.enemy('one',2,0),b=f.enemy('two',3,0);f.d.getEntities=()=>[a,b];
 f.setBlock(true);assert.equal(f.ctrl.cast(f.p,f.s,g),false);assert.deepEqual(f.s,{s:20,m:10});
 f.setBlock(false);a.applyDamage=()=>{f.hits.push(['one']);f.setItem('minecraft:stone');return true;};
 assert.equal(f.ctrl.cast(f.p,f.s,g),true);assert.deepEqual(f.hits,[['one']]);assert.deepEqual(f.effects,[]);
 const h=combatFixture(g);h.d.getEntities=()=>[h.enemy('x',2,0)];h.setItem('minecraft:stone');assert.equal(h.ctrl.cast(h.p,h.s,g),false);assert.deepEqual(h.s,{s:20,m:10});
});
