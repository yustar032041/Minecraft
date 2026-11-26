import test from 'node:test';import assert from 'node:assert/strict';
import {recordTomeRealm,hasTomeRealm,clearTomePending} from '../Hakkai_v7.1.0/BehaviorPack/scripts/spell_tome.js';
function player(id){
 let data=0,mode='normal',writes=0,reads=0;
 const p={id,dimension:{id:'minecraft:overworld'},getDynamicProperty(){reads++;if(mode==='read')throw Error('read unavailable');return data;},setDynamicProperty(_k,v){writes++;if(mode==='write')throw Error('write unavailable');data=v;if(mode==='after')throw Error('after write');}};
 return {p,get data(){return data},get writes(){return writes},get reads(){return reads},set mode(v){mode=v},set data(v){data=v}};
}
test('short visits survive a transient write failure and merge on recovery outside all realms',()=>{
 const f=player('short'),p=f.p;f.data=1<<7;f.mode='write';assert.equal(recordTomeRealm(p,'hakkai:realm_0'),false);assert.equal(recordTomeRealm(p,'hakkai:realm_3'),false);
 assert.equal(hasTomeRealm(p,0),true);assert.equal(hasTomeRealm(p,3),true);assert.equal(hasTomeRealm(p,2),false);
 f.mode='normal';assert.equal(recordTomeRealm(p),true);assert.equal(f.data,(1<<7)|(1<<3)|1);assert.equal(recordTomeRealm(p),false);
});
test('read failures retain separate player queues and pending visits can be read without persistence',()=>{
 const a=player('pending-a'),b=player('pending-b');a.mode=b.mode='read';recordTomeRealm(a.p,'hakkai:realm_1');recordTomeRealm(b.p,'hakkai:realm_5');
 assert.equal(hasTomeRealm(a.p,1),true);assert.equal(hasTomeRealm(a.p,5),false);assert.equal(hasTomeRealm(b.p,5),true);
 a.mode='normal';recordTomeRealm(a.p);assert.equal(a.data,2);assert.equal(b.data,0);b.mode='normal';recordTomeRealm(b.p);assert.equal(b.data,32);
});
test('write-after-commit exceptions do not duplicate or remove unrelated visits',()=>{
 const f=player('after'),p=f.p;f.data=1<<4;f.mode='after';recordTomeRealm(p,'hakkai:realm_2');assert.equal(f.data,20);f.mode='normal';const writes=f.writes;
 recordTomeRealm(p);assert.equal(f.data,20);assert.equal(f.writes,writes,'already persisted bits are not re-written');assert.equal(hasTomeRealm(p,2),true);
});
test('pending state follows a stable player ID across event wrappers',()=>{
 const f=player('wrapper');f.mode='write';recordTomeRealm(f.p,'hakkai:realm_6');const later={...f.p,dimension:{id:'minecraft:overworld'}};
 assert.equal(hasTomeRealm(later,6),true);f.mode='normal';recordTomeRealm(later);assert.equal(f.data,64);
});

test('disconnect drops only that player’s unsaved bits, not persisted history',()=>{
 const a=player('leave-a'),b=player('leave-b');a.data=1<<4;a.mode=b.mode='write';recordTomeRealm(a.p,'hakkai:realm_1');recordTomeRealm(b.p,'hakkai:realm_5');
 clearTomePending(a.p.id);a.mode='normal';assert.equal(hasTomeRealm(a.p,1),false);assert.equal(hasTomeRealm(a.p,4),true);assert.equal(hasTomeRealm(b.p,5),true);
 b.mode='normal';recordTomeRealm(b.p);assert.equal(b.data,32);
});
test('all eight pending bits merge with independent stored changes',()=>{
 for(let mask=0;mask<256;mask++){
  const f=player(`mask-${mask}`);f.mode='write';for(let i=0;i<8;i++)if(mask&(1<<i))recordTomeRealm(f.p,`hakkai:realm_${i}`);
  f.data=128;f.mode='normal';recordTomeRealm(f.p);assert.equal(f.data,mask|128,`mask ${mask}`);
  for(let i=0;i<8;i++)assert.equal(hasTomeRealm(f.p,i),Boolean((mask|128)&(1<<i)));
  clearTomePending(f.p.id);
 }
});
test('invalid destination does not create a visit, and failures do not escape',()=>{
 const f=player('invalid');for(const name of ['hakkai:realm_8','minecraft:overworld','hakkai:warden_arena','hakkai:realm_-1'])assert.equal(recordTomeRealm(f.p,name),false);
 assert.equal(f.data,0);assert.equal(f.reads,0);const broken={get id(){throw Error('bad id')},get dimension(){throw Error('bad dimension')},getDynamicProperty(){throw Error('broken')}};
 assert.doesNotThrow(()=>recordTomeRealm(broken));assert.doesNotThrow(()=>hasTomeRealm(broken,0));assert.equal(hasTomeRealm(broken,8),false);
});
