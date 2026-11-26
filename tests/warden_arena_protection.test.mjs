import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {WARDEN_DIMENSION} from '../Hakkai_v7.1.0/BehaviorPack/scripts/warden_arena.js';
import {isWardenStructure,protectWardenBreak,protectWardenExplosion} from '../Hakkai_v7.1.0/BehaviorPack/scripts/warden_arena_protection.js';
import {validWardenArenaFloor} from '../Hakkai_v7.1.0/BehaviorPack/scripts/warden_arena_floor.js';
const arena={id:WARDEN_DIMENSION},other={id:'hakkai:realm_7'};
const block=(dimension,x,y,z)=>({dimension,location:{x,y,z}});

test('exact shell and lamps protected at all phases without covering interior or other dimensions',()=>{
 for(let x=-17;x<=17;x++)for(let z=-17;z<=17;z++)for(let y=78;y<=97;y++){
  const shell=Math.abs(x)<=16&&Math.abs(z)<=16&&
   (y===79||y===96||y>=80&&y<=95&&(Math.abs(x)===16||Math.abs(z)===16)||y===95&&Math.abs(x)===12&&Math.abs(z)===12);
  const e={block:block(arena,x,y,z),cancel:false};protectWardenBreak(e);
  assert.equal(e.cancel,shell,`${x} ${y} ${z}`);
  assert.equal(isWardenStructure(other,{x,y,z}),false);
 }
 assert.equal(isWardenStructure(arena,{x:0.5,y:79,z:0}),false);
 assert.equal(validWardenArenaFloor({typeId:'hakkai:warden_arena_stone',isAir:false,isLiquid:false,isWaterlogged:false}),true);
 assert.equal(validWardenArenaFloor({typeId:'hakkai:warden_arena_light',isAir:false,isLiquid:false,isWaterlogged:false}),false);
});

test('explosion removes only arena structure from impact list, including lights',()=>{
 const b=[block(arena,0,79,0),block(arena,16,85,0),block(arena,12,95,-12),block(arena,0,80,0)];
 let selected;const e={dimension:arena,cancel:false,getImpactedBlocks:()=>b,setImpactedBlocks:v=>{selected=v;}};
 protectWardenExplosion(e);assert.deepEqual(selected,[b[3]]);assert.equal(e.cancel,false);
 let called=false;protectWardenExplosion({dimension:other,getImpactedBlocks:()=>{called=true;return b;}});assert.equal(called,false);
 selected=undefined;protectWardenExplosion({dimension:arena,getImpactedBlocks:()=>[b[3]],setImpactedBlocks:v=>{selected=v}});assert.equal(selected,undefined);
 for(const method of ['get','set']){
  const fail={dimension:arena,cancel:false,getImpactedBlocks:()=>{if(method==='get')throw Error('invalid');return b},setImpactedBlocks:()=>{throw Error('invalid')}};
  protectWardenExplosion(fail);assert.equal(fail.cancel,true);
 }
});

test('before-event callbacks are registered through real main entry point',()=>{
 const main=fs.readFileSync('Hakkai_v7.1.0/BehaviorPack/scripts/main.js','utf8');
 assert.match(main,/safeSub\('world','before','playerBreakBlock',protectWardenBreak\)/);
 assert.match(main,/safeSub\('world','before','explosion',protectWardenExplosion\)/);
});

test('new structural definitions resist mining and explosions and cannot be moved by pistons',()=>{
 const bp='Hakkai_v7.1.0/BehaviorPack/blocks/';
 for(const [id,texture,light] of [['warden_arena_stone','hakkai_clockstone',4],['warden_arena_light','sea_lantern',15]]){
  const block=JSON.parse(fs.readFileSync(bp+id+'.json'))['minecraft:block'];
  assert.equal(block.description.identifier,'hakkai:'+id);
  assert.equal(block.components['minecraft:destructible_by_mining'],false);
  assert.equal(block.components['minecraft:destructible_by_explosion'],false);
  assert.equal(block.components['minecraft:movable'].movement_type,'immovable');
  assert.equal(block.components['minecraft:material_instances']['*'].texture,texture);
  assert.equal(block.components['minecraft:light_emission'],light);
 }
 const original=JSON.parse(fs.readFileSync(bp+'clockstone.json'))['minecraft:block'].components;
 assert.equal(original['minecraft:destructible_by_mining'].seconds_to_destroy,1.2);
});
