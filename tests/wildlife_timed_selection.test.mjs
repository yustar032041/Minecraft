import {test} from 'node:test';
import assert from 'node:assert/strict';
import {wildlife} from '../Hakkai_v7.1.0/BehaviorPack/scripts/data.js';
import {pickTimedRealmWildlife as pick} from '../Hakkai_v7.1.0/BehaviorPack/scripts/wildlife_selection.js';
function rng(seed){return ()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/2**32;};}
test('every realm species is reachable, despite biome favourites',()=>{
 for(let realm=0;realm<8;realm++){
  const seen=new Set(),random=rng(100+realm),expected=wildlife.filter(x=>x.dim===realm);
  for(let i=0;i<500&&seen.size<expected.length;i++){
   const m=pick(wildlife,realm,x=>seen.has(x.id),false,i%2===0,[expected[0].id],random);
   assert.ok(m);seen.add(m.id);
  }
  assert.deepEqual([...seen].sort(),expected.map(x=>x.id).sort());
 }
});
test('day favors non-hostile and night favors hostile without excluding either',()=>{
 for(let realm=0;realm<8;realm++)for(const night of [false,true]){
  const random=rng(30+realm),counts={hostile:0,other:0};
  for(let i=0;i<10000;i++){const m=pick(wildlife,realm,()=>true,false,night,[],random);counts[m.temper==='hostile'?'hostile':'other']++;}
  const fraction=counts.hostile/10000;
  assert.ok(fraction>(night?.68:.24)&&fraction<(night?.76:.32),`${realm} night ${night}: ${fraction}`);
 }
});
test('peaceful and empty groups are handled safely',()=>{
 const random=rng(4);
 for(let i=0;i<500;i++)assert.notEqual(pick(wildlife,0,()=>false,true,i%2===0,[],random).temper,'hostile');
 assert.equal(pick([],0,()=>false,false,false,[],random),undefined);
});
