// Candidate-level cap decisions exercised with deterministic query mocks.
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {spawnWildlife} from '../Hakkai_v7.1.0/BehaviorPack/scripts/wildlife_spawn.js';
function fixture(){
 const checked=[],spawned=[];
 const d={isChunkLoaded:()=>true,getPlayers:()=>[],spawnEntity:(id,pos)=>spawned.push({id,pos})};
 const args={player:{dimension:d,location:{x:0,y:80,z:0}},type:'hakkai:foe_0_0',tick:0,safe:()=>true,
  capacity:(_d,pos)=>{checked.push({...pos});return checked.length>1;}};
 return {args,d,checked,spawned};
}
test('a full candidate does not block an uncrowded direction',()=>{
 const f=fixture();assert.equal(spawnWildlife(f.args),true);assert.equal(f.checked.length,2);
 assert.notDeepEqual([f.checked[0].x,f.checked[0].z],[f.checked[1].x,f.checked[1].z]);
 assert.deepEqual(f.spawned[0].pos,f.checked[1]);
});
test('full regions are checked at most four times and never spawn',()=>{
 const f=fixture();f.args.capacity=(_d,pos)=>{f.checked.push({...pos});return false;};
 assert.equal(spawnWildlife(f.args),false);assert.equal(f.checked.length,4);assert.equal(f.spawned.length,0);
 assert.equal(new Set(f.checked.map(p=>`${p.x},${p.z}`)).size,4);
});
test('an unavailable capacity check aborts rather than bypassing the limit',()=>{
 const f=fixture();f.args.capacity=()=>{throw Error('unloaded')};
 assert.equal(spawnWildlife(f.args),false);assert.equal(f.spawned.length,0);
});
test('a crowded biome fallback can try another column only after preference search',()=>{
 const f=fixture();let preferences=0;f.args.preferred=()=>{preferences++;return false};f.args.allowNearbyBiome=true;
 assert.equal(spawnWildlife(f.args),true);assert.equal(preferences,396);assert.equal(f.checked.length,2);
 assert.notDeepEqual([f.checked[0].x,f.checked[0].z],[f.checked[1].x,f.checked[1].z]);
 assert.deepEqual(f.spawned[0].pos,f.checked[1]);
});
test('fallbacks are rechecked and an invalidated position is skipped',()=>{
 const f=fixture();let calls=0;f.args.allowNearbyBiome=true;f.args.preferred=()=>false;
 // The first 396 checks are the bounded scan; invalidate its first fallback
 // before use, then allow the second previously collected position.
 f.args.safe=()=>++calls!==397;
 assert.equal(spawnWildlife(f.args),true);assert.equal(f.checked.length,2);
 assert.notEqual(f.checked[0].x,8.5);assert.deepEqual(f.spawned[0].pos,f.checked[1]);
});
test('spawn API failures do not permit unbounded density queries',()=>{
 const f=fixture();f.args.capacity=(_d,pos)=>{f.checked.push({...pos});return true};f.d.spawnEntity=()=>{throw Error('spawn failed')};
 assert.equal(spawnWildlife(f.args),false);assert.equal(f.checked.length,4);
});
test('preferred biome still wins over an uncrowded fallback',()=>{
 const f=fixture();f.args.allowNearbyBiome=true;
 f.args.preferred=pos=>pos.x!==8.5;
 assert.equal(spawnWildlife(f.args),true);assert.equal(f.checked.length,2);
 assert.notEqual(f.spawned[0].pos.x,8.5);
});
