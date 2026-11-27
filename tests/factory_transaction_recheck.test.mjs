import test from 'node:test';
import assert from 'node:assert/strict';
import {factoryTransaction} from '../Hakkai_v7.1.0/BehaviorPack/scripts/factory_transaction.js';

class Item {
 constructor(typeId,amount=1,meta='',maxAmount=64){Object.assign(this,{typeId,amount,meta,maxAmount});}
 clone(){return new Item(this.typeId,this.amount,this.meta,this.maxAmount);}
 isStackableWith(other){return this.maxAmount>1&&other.maxAmount>1&&this.typeId===other.typeId&&this.meta===other.meta;}
}
class Container {
 constructor(items){this.slots=items.map(x=>x?.clone());this.size=items.length;this.onWrite=undefined;this.failRead=false;}
 getItem(i){if(this.failRead)throw Error('container unavailable');return this.slots[i]?.clone();}
 setItem(i,value){this.slots[i]=value?.clone();if(this.onWrite){const f=this.onWrite;this.onWrite=undefined;f(i,value);}}
}
const it=(id,n=1,meta='',max=64)=>new Item(id,n,meta,max);
const slot=(c,i=0)=>{const x=c.slots[i];return x&&[x.typeId,x.amount,x.meta,x.maxAmount];};
const make=(inputItems=[it('raw',2)],outputItems=[undefined])=>{
 const input=new Container(inputItems),output=new Container(outputItems),logs=[];
 return {input,output,logs,run:(extra={})=>factoryTransaction({input,output,costs:[{id:'raw',count:1}],product:it('ingot'),report:(...args)=>logs.push(args),...extra})};
};

test('output changed before its write aborts without overwriting it',()=>{
 const f=make();f.input.onWrite=()=>{f.output.slots[0]=it('other',3);};
 assert.equal(f.run(),false);assert.deepEqual(slot(f.output),['other',3,'',64]);assert.deepEqual(slot(f.input),['raw',2,'',64]);
});
test('a changed input after output write is not overwritten during rollback',()=>{
 const f=make();f.output.onWrite=()=>{f.input.slots[0]=it('other',7);};
 assert.equal(f.run(),false);assert.deepEqual(slot(f.input),['other',7,'',64]);assert.equal(slot(f.output),undefined);assert.ok(f.logs.some(x=>x[0].includes('復旧要確認')));
});
test('equal type and amount with changed metadata is detected before overwriting',()=>{
 const f=make([it('raw',2)],[it('ingot',1,'old')]);
 f.input.onWrite=()=>{f.output.slots[0]=it('ingot',1,'other');};
 assert.equal(f.run({product:it('ingot',1,'old')}),false);assert.deepEqual(slot(f.output),['ingot',1,'other',64]);assert.deepEqual(slot(f.input),['raw',2,'',64]);
});
test('uncertain output after external failure is preserved and input is not restored',()=>{
 const f=make();assert.equal(f.run({commitExternal:()=>{f.output.slots[0]=it('other',7);throw Error('external failure');}}),false);
 assert.deepEqual(slot(f.output),['other',7,'',64]);assert.deepEqual(slot(f.input),['raw',1,'',64]);assert.ok(f.logs.some(x=>x[0].includes('復旧要確認')));
});
test('unreadable output after a failure leaves input consumed rather than duplicating',()=>{
 const f=make();assert.equal(f.run({commitExternal:()=>{f.output.failRead=true;throw Error('failure');}}),false);
 assert.deepEqual(slot(f.output),['ingot',1,'',64]);assert.deepEqual(slot(f.input),['raw',1,'',64]);
});
test('external rollback failure does not restore materials',()=>{
 const f=make();assert.equal(f.run({commitExternal:()=>{throw Error('failure');},rollbackExternal:()=>{throw Error('block unknown');}}),false);
 assert.equal(slot(f.output),undefined);assert.deepEqual(slot(f.input),['raw',1,'',64]);assert.ok(f.logs.some(x=>x[0].includes('ブロック復旧失敗')));
});
test('unstackable items can still transfer in an ordinary successful operation',()=>{
 const f=make([it('raw',1,'enchanted',1)]);assert.equal(f.run({product:it('raw',1,'enchanted',1)}),true);
 assert.equal(slot(f.input),undefined);assert.deepEqual(slot(f.output),['raw',1,'enchanted',1]);
});
test('unstackable output cannot be compared on rollback, so input is not restored',()=>{
 const f=make([it('raw',1,'enchanted',1)]);assert.equal(f.run({product:it('raw',1,'enchanted',1),commitExternal:()=>{throw Error('failure');}}),false);
 assert.equal(slot(f.input),undefined);assert.deepEqual(slot(f.output),['raw',1,'enchanted',1]);assert.ok(f.logs.some(x=>x[0].includes('復旧要確認')));
});
test('a slot changed during a successful external callback is detected and external rollback is attempted',()=>{
 const f=make();let rolled=false;
 assert.equal(f.run({commitExternal:()=>{f.input.slots[0]=it('other',1);},rollbackExternal:()=>{rolled=true;}}),false);
 assert.equal(rolled,true);assert.deepEqual(slot(f.input),['other',1,'',64]);assert.equal(slot(f.output),undefined);
});
test('failure before mutation restores prior writes when the current slot is unchanged',()=>{
 const f=make();f.output.setItem=()=>{throw Error('no mutation');};
 assert.equal(f.run(),false);assert.deepEqual(slot(f.input),['raw',2,'',64]);assert.equal(slot(f.output),undefined);
});
test('rollback continues across output slots but does not refund inputs when one is uncertain',()=>{
 const f=make([it('raw',2)],[undefined,undefined]);
 assert.equal(f.run({product:it('ingot',65),commitExternal:()=>{f.output.slots[0]=it('other');throw Error('failure');}}),false);
 assert.deepEqual(slot(f.output,0),['other',1,'',64]);assert.equal(slot(f.output,1),undefined);assert.deepEqual(slot(f.input),['raw',1,'',64]);
});
