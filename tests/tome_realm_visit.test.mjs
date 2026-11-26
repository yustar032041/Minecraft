import assert from 'node:assert/strict';
import {tomeRealm,recordTomeRealm,hasTomeRealm,tomeSpells,tomeUnlocked} from '../Hakkai_v7.1.0/BehaviorPack/scripts/spell_tome.js';
import {attrs,home,pairs} from '../Hakkai_v7.1.0/BehaviorPack/scripts/data.js';
const props=new Map(),p={dimension:{id:'minecraft:overworld'},getDynamicProperty:k=>props.get(k),setDynamicProperty:(k,v)=>props.set(k,v)};
assert.equal(tomeRealm('hakkai:warden_arena'),-1);assert.equal(tomeRealm('hakkai:realm_8'),-1);assert.equal(recordTomeRealm(p),false);
for(let r=0;r<8;r++){
 p.dimension.id=`hakkai:realm_${r}`;assert.equal(recordTomeRealm(p),true);assert.equal(recordTomeRealm(p),false);
 assert.ok(hasTomeRealm(p,r));assert.equal(props.get('hakkai:tome_realms_v1'),(1<<(r+1))-1);
}
assert.equal(hasTomeRealm(p,-1),false);assert.equal(hasTomeRealm(p,8),false);
const spells=tomeSpells(attrs,pairs);assert.ok(spells.every(s=>tomeUnlocked(s,a=>hasTomeRealm(p,home.findIndex(x=>x.includes(a))))));
props.set('hakkai:tome_realms_v1',1);assert.ok(tomeUnlocked(spells[0],a=>hasTomeRealm(p,home.findIndex(x=>x.includes(a)))));
assert.equal(tomeUnlocked(spells[8],a=>hasTomeRealm(p,home.findIndex(x=>x.includes(a)))),false);
console.log('Tome: separate persisted visits, realm bounds, all attributes and combined spell gating (mocked)');
// An event can report a realm already left again before our handler runs.
props.clear();p.dimension.id='minecraft:overworld';assert.equal(recordTomeRealm(p,'hakkai:realm_2'),true);assert.equal(hasTomeRealm(p,2),true);
p.dimension.id='hakkai:realm_5';const readFail={dimension:p.dimension,getDynamicProperty:()=>{throw Error('not ready')},setDynamicProperty:()=>{throw Error('not ready')}};
assert.equal(hasTomeRealm(readFail,5),true,'current dimension works even before persistence is available');assert.equal(recordTomeRealm(readFail),false);
