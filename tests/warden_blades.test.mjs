import {test} from 'node:test';
import assert from 'node:assert/strict';
import {WARDEN_BLADES,wardenBladeOnCast,wardenBladeOnHit} from '../Hakkai_v7.1.0/BehaviorPack/scripts/warden_blades.js';

test('eight blades have distinct skills and self effects; unrelated gear is untouched',()=>{
 assert.equal(WARDEN_BLADES.length,8);assert.equal(new Set(WARDEN_BLADES.map(x=>x.skill)).size,8);
 const effects=[];const p={addEffect:(...a)=>effects.push(a)};
 for(const g of WARDEN_BLADES)wardenBladeOnCast(p,g);
 assert.equal(new Set(effects.map(x=>x[0])).size,8);wardenBladeOnCast(p,{id:'ult_sword'});assert.equal(effects.length,8);
});
test('secondary effects need an accepted hit, valid target, same dimension and skip bosses',()=>{
 let effects=[];const d={id:'realm'};const p={dimension:d};const target={isValid:true,typeId:'minecraft:zombie',dimension:d,addEffect:id=>effects.push(id)};
 wardenBladeOnHit(p,target,WARDEN_BLADES[3],false);assert.equal(effects.length,0);
 wardenBladeOnHit(p,target,WARDEN_BLADES[3],true);assert.deepEqual(effects,['slowness']);
 target.typeId='hakkai:time_warden';wardenBladeOnHit(p,target,WARDEN_BLADES[3],true);assert.equal(effects.length,1);
 target.typeId='minecraft:zombie';target.dimension={id:'other'};wardenBladeOnHit(p,target,WARDEN_BLADES[3],true);assert.equal(effects.length,1);
});
