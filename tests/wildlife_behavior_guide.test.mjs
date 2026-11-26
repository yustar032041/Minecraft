import {test} from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {mobContent} from '../Hakkai_v7.1.0/BehaviorPack/scripts/mob_content.js';
import {setupMobSystem} from '../Hakkai_v7.1.0/BehaviorPack/scripts/mob_system.js';
import {Difficulty,GameMode} from '@minecraft/server';
function fixture(realm,index){
 const effects=[],impulses=[],hits=[],markers=[];
 const mob={id:'wild',typeId:`hakkai:wild_${realm}_${index}`,isValid:true,location:{x:0,y:4,z:0},addEffect:(...a)=>effects.push(['wild',...a]),applyImpulse:v=>impulses.push(v)};
 const ally={id:'ally',typeId:`hakkai:wild_${realm}_1`,isValid:true,location:{x:1,y:4,z:0},addEffect:(...a)=>effects.push(['ally',...a])};
 const other={id:'other',typeId:`hakkai:wild_${(realm+1)%8}_1`,isValid:true,location:{x:1,y:4,z:0},addEffect:(...a)=>effects.push(['other',...a])};
 const dim={id:`hakkai:realm_${realm}`,getEntities:query=>query.type?[]:query.families?(query.maxDistance===25?[mob]:[mob,ally,other]):[mob],spawnParticle:(...a)=>markers.push(a),isChunkLoaded:()=>true,getBlock:pos=>pos.y===3?{typeId:'minecraft:stone',isAir:false,isLiquid:false,isWaterlogged:false}:{typeId:'minecraft:air',isAir:true,isLiquid:false,isWaterlogged:false},getBlockFromRay:pos=>({block:{location:{x:Math.floor(pos.x),y:3,z:Math.floor(pos.z)}},face:'Up',faceLocation:{y:1}})};
 mob.dimension=dim;ally.dimension=dim;other.dimension=dim;
 const p={id:'p',typeId:'minecraft:player',isValid:true,location:{x:2,y:4,z:0},dimension:dim,getGameMode:()=>GameMode.Survival,applyDamage:n=>{hits.push(n);return true},addEffect:()=>assert.fail('no player effect')};
 const world={getDifficulty:()=>Difficulty.Normal,getAllPlayers:()=>[p]},system={currentTick:0};
 const c=setupMobSystem({ns:'hakkai:',world,system,num:()=>0,property:()=>{},report:()=>assert.fail('unexpected report')});
 return {p,mob,ally,other,effects,impulses,hits,markers,c};
}
test('all passive wildlife flee and apply their actual guide-described self effect',()=>{
 for(let realm=0;realm<8;realm++){
  const f=fixture(realm,0),profile=mobContent.get(f.mob.typeId);f.c.tick(f.p,0);
  assert.equal(profile.temper,'passive');assert.equal(profile.talent,'shy');assert.equal(profile.signatureId%3,0);
  assert.match(profile.actionDetail,/離れる方向/);assert.match(profile.actionDetail,/安全な候補がなければ/);assert.match(profile.signatureDetail,/跳躍力上昇/);
  assert.ok(f.impulses[0].x<0,'moves away from the nearby player');
  assert.ok(f.effects.some(([id,e])=>id==='wild'&&e==='speed'));
  assert.ok(f.effects.some(([id,e])=>id==='wild'&&e==='jump_boost'));
  assert.ok(f.effects.every(([id])=>id==='wild'));assert.deepEqual(f.hits,[]);
 }
});
test('all neutral wildlife support same-realm mobs and retain retaliatory speed',()=>{
 for(let realm=0;realm<8;realm++){
  const f=fixture(realm,1),profile=mobContent.get(f.mob.typeId);f.c.tick(f.p,0);
  assert.equal(profile.temper,'neutral');assert.equal(profile.talent,'defend');assert.equal(profile.signatureId%3,1);
  assert.match(profile.actionDetail,/同界生物/);assert.match(profile.signatureDetail,/跳躍力上昇/);
  for(const id of ['wild','ally']){
   assert.ok(f.effects.some(([who,e])=>who===id&&e==='resistance'));
   assert.ok(f.effects.some(([who,e])=>who===id&&e==='jump_boost'));
  }
  assert.ok(!f.effects.some(([who])=>who==='other'));assert.deepEqual(f.hits,[]);assert.deepEqual(f.impulses,[]);
  f.c.onHurt({hurtEntity:f.mob,damageSource:{damagingEntity:f.p}});
  assert.ok(f.effects.some(([who,e])=>who==='wild'&&e==='speed'),'speed after player damage');
 }
});
test('wildlife guide synchronization is reproducible and coexists with hostile signature guides',()=>{
 for(const tool of ['sync_wildlife_descriptions.py','sync_mob_signature_descriptions.py','sync_mob_thematic_profiles.py'])
  execFileSync('python3',[`tools/${tool}`,'--check'],{stdio:'pipe'});
});
