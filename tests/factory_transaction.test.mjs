// Simulated containers; no promise of rollback after native invalidation.
import assert from 'node:assert/strict';
import {factoryTransaction} from '../Hakkai_v7.1.0/BehaviorPack/scripts/factory_transaction.js';
class Item {
 constructor(typeId,amount=1,meta='',maxAmount=64){Object.assign(this,{typeId,amount,meta,maxAmount});}
 clone(){return new Item(this.typeId,this.amount,this.meta,this.maxAmount);}
 isStackableWith(other){return this.maxAmount>1&&this.typeId===other.typeId&&this.meta===other.meta;}
}
class Container {
 constructor(items){this.items=items;this.size=items.length;this.writes=[];}
 getItem(i){return this.items[i]?.clone();}
 setItem(i,item){this.writes.push(i);this.items[i]=item?.clone();if(this.failOnce){this.failOnce=false;throw Error('write failed after mutation');}}
}
const item=(id,n=1,meta='',max=64)=>new Item(id,n,meta,max);
const snapshot=c=>c.items.map(x=>x&&[x.typeId,x.amount,x.meta,x.maxAmount]);
{
 const input=new Container([item('raw',4,'tag'),item('fuel',2),item('special',1,'unique',1)]);
 const output=new Container([item('ingot',63),undefined]);
 assert.equal(factoryTransaction({input,output,costs:[{id:'raw',count:3},{id:'fuel',count:1}],product:item('ingot',3)}),true);
 assert.deepEqual(snapshot(input),[['raw',1,'tag',64],['fuel',1,'',64],['special',1,'unique',1]]);
 assert.deepEqual(snapshot(output),[['ingot',64,'',64],['ingot',2,'',64]]);assert.ok(!input.writes.includes(2),'untouched nonstackable remains untouched');
}
{
 const input=new Container([item('fuel',2)]),output=new Container([undefined]);
 assert.equal(factoryTransaction({input,output,costs:[{id:'fuel',count:2},{id:'fuel',count:1}],product:item('ingot')}),false,'combined costs cannot overspend');
 assert.deepEqual(input.writes,[]);assert.deepEqual(output.writes,[]);
}
{
 const input=new Container([item('raw',1)]),output=new Container([item('different',64)]);
 assert.equal(factoryTransaction({input,output,costs:[{id:'raw',count:1}],product:item('ingot')}),false,'full output');assert.deepEqual(input.writes,[]);
}
for(const failure of ['input','output','block']){
 const input=new Container([item('fuel',2),item('raw',2)]),output=new Container([item('ingot',63),undefined]),beforeIn=snapshot(input),beforeOut=snapshot(output),reports=[];
 let ore='ore';if(failure==='input')input.failOnce=true;if(failure==='output')output.failOnce=true;
 const ok=factoryTransaction({input,output,costs:[{id:'fuel',count:1},{id:'raw',count:2}],product:item('ingot',2),
  commitExternal:()=>{ore='air';if(failure==='block')throw Error('block write failed after mutation');},rollbackExternal:()=>{ore='ore';},report:(...x)=>reports.push(x)});
 assert.equal(ok,false);assert.deepEqual(snapshot(input),beforeIn,failure);assert.deepEqual(snapshot(output),beforeOut,failure);assert.equal(ore,'ore');assert.ok(reports.length);
}
{
 const input=new Container([item('fuel')]),output=new Container([undefined]);let ore='ore';
 assert.equal(factoryTransaction({input,output,costs:[{id:'fuel',count:1}],product:item('crystal'),commitExternal:()=>{ore='air';}}),true);
 assert.equal(ore,'air');assert.deepEqual(snapshot(output),[['crystal',1,'',64]]);
}
{
 const input=new Container([item('x')]);assert.equal(factoryTransaction({input,output:input,costs:[{id:'x',count:1}],product:item('y')}),false);
}
console.log('Factory transactions: planning, metadata, capacity, duplicate costs and rollback after inventory/block failures OK (simulated)');
