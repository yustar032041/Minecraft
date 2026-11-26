// Stable API-shaped terrain only. Minecraft's real spawning, collisions and
// player synchronization still need to be checked in Bedrock.
import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {clearColossusSpawnGround as clear} from '../Hakkai_v7.1.0/BehaviorPack/scripts/colossus_spawn_ground.js';
const floor={typeId:'hakkai:clockstone',isAir:false,isLiquid:false,isWaterlogged:false};
function dimension(){return {isChunkLoaded:()=>true,getBlock:p=>p.y===79?floor:{isAir:true}};}
test('known full floor and all 5x5x10 body cells work without isSolid',()=>{
 const calls=[],d=dimension(),get=d.getBlock;d.getBlock=p=>{calls.push(p);return get(p)};
 assert.equal(clear(d,0,80,0),true);assert.equal(calls.length,25*11);
 const entity=JSON.parse(fs.readFileSync('Hakkai_v7.1.0/BehaviorPack/entities/eclipse_colossus.json'))['minecraft:entity'].components['minecraft:collision_box'];
 assert.ok(entity.width<=5&&entity.height<=10);
 for(const id of ['clockstone','brasswork','timeglass','ruin_clockstone']){
  const block=JSON.parse(fs.readFileSync(`Hakkai_v7.1.0/BehaviorPack/blocks/${id}.json`))['minecraft:block'].components;
  assert.equal(block['minecraft:geometry'],'minecraft:geometry.full_block');assert.equal(block['minecraft:collision_box'],undefined);
 }
});
test('missing, partial, liquid, waterlogged, blocked or unloaded terrain is refused',()=>{
 for(const patch of [
  {typeId:'minecraft:stone_slab'}, {typeId:'minecraft:lava',isLiquid:true}, {isWaterlogged:true},
  {isWaterlogged:undefined}, {isAir:true}, {isLiquid:undefined}
 ]){const d=dimension();d.getBlock=p=>p.y===79?{...floor,...patch}:{isAir:true};assert.equal(clear(d,0,80,0),false);}
 const d=dimension();d.isChunkLoaded=p=>p.x!==2||p.z!==2;assert.equal(clear(d,0,80,0),false);
 const blocked=dimension();blocked.getBlock=p=>p.y===79?floor:p.x===2&&p.z===2&&p.y===89?{isAir:false}:{isAir:true};assert.equal(clear(blocked,0,80,0),false);
 const missing=dimension();missing.getBlock=()=>undefined;assert.equal(clear(missing,0,80,0),false);
 const throws=dimension();throws.getBlock=()=>{throw Error('unloaded')};assert.equal(clear(throws,0,80,0),false);
 assert.equal(clear(d,0,NaN,0),false);
});
