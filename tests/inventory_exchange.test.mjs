import {test} from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';
import {inventoryExchange} from '../Hakkai_v7.1.0/BehaviorPack/scripts/inventory_exchange.js';
class Item{constructor(typeId,amount=1,tag='',maxAmount=64){Object.assign(this,{typeId,amount,tag,maxAmount})}clone(){return new Item(this.typeId,this.amount,this.tag,this.maxAmount)}isStackableWith(other){return this.typeId===other.typeId&&this.tag===other.tag&&this.maxAmount>1}}
class Inventory{constructor(items){this.items=items;this.size=items.length;this.writes=0;this.failAt=0;}getItem(i){return this.items[i]?.clone()}setItem(i,v){this.writes++;this.items[i]=v?.clone();if(this.writes===this.failAt)throw Error('mutated then failed')}}
const snap=c=>c.items.map(i=>i&&[i.typeId,i.amount,i.tag]);
test('can use slots freed by payment in an otherwise full inventory',()=>{
 const c=new Inventory([new Item('fish'),new Item('stone',64)]);assert.equal(inventoryExchange(c,'fish',1,new Item('crystal')), 'ok');assert.deepEqual(snap(c),[['crystal',1,''],['stone',64,'']]);
});
test('multiple stacks and metadata are preserved; shortage/full leave all slots untouched',()=>{
 const c=new Inventory([new Item('fish',2,'a'),new Item('fish',3,'b'),new Item('out',63),undefined,new Item('other',1,'named',1)]);
 assert.equal(inventoryExchange(c,'fish',3,new Item('out',3)),'ok');assert.deepEqual(snap(c),[['out',2,''],['fish',2,'b'],['out',64,''],undefined,['other',1,'named']]);
 const n=new Inventory([new Item('fish',2),new Item('stone',64)]),before=snap(n);assert.equal(inventoryExchange(n,'fish',3,new Item('out')),'missing');assert.deepEqual(snap(n),before);assert.equal(n.writes,0);
 assert.equal(inventoryExchange(n,'fish',1,new Item('out')),'full');assert.deepEqual(snap(n),before);assert.equal(n.writes,0);
});
test('write failures after mutation are rolled back, with errors reported',()=>{
 for(const failAt of [1,2,3]){
  const c=new Inventory([new Item('fish',2),new Item('fish',3),new Item('out',63),undefined]),before=snap(c),reports=[];c.failAt=failAt;
  assert.equal(inventoryExchange(c,'fish',3,new Item('out',3),(...args)=>reports.push(args)),'error');assert.deepEqual(snap(c),before);assert.ok(reports.length);
 }
});
test('real exchange wrapper shows missing/full/error and returns true only on success',()=>{
 const src=fs.readFileSync('Hakkai_v7.1.0/BehaviorPack/scripts/main.js','utf8'),a=src.indexOf('function exchange(p,input,n,output,k=1){'),b=src.indexOf('function persist(',a),notices=[];assert.ok(a>0&&b>a);
 class ItemStack extends Item{}const ctx={inventoryExchange,ItemStack,space:p=>p.inventory,report:()=>{},notice:(_p,m)=>notices.push(m)};vm.createContext(ctx);vm.runInContext(src.slice(a,b),ctx);
 const p={inventory:new Inventory([new Item('fish')])};assert.equal(ctx.exchange(p,'fish',1,'out'),true);assert.deepEqual(snap(p.inventory),[['out',1,'']]);
 assert.equal(ctx.exchange(p,'fish',1,'out'),false);assert.match(notices.pop(),/足りない/);
 p.inventory=new Inventory([new Item('fish',2)]);assert.equal(ctx.exchange(p,'fish',1,'out'),false);assert.match(notices.pop(),/空き/);
 p.inventory=new Inventory([new Item('fish')]);p.inventory.failAt=1;assert.equal(ctx.exchange(p,'fish',1,'out'),false);assert.match(notices.pop(),/失敗/);assert.deepEqual(snap(p.inventory),[['fish',1,'']]);
});

test('multi-material and multiple rewards reuse consumed slots, merge same ID and preserve metadata',async()=>{
 const {inventoryTransaction}=await import('../Hakkai_v7.1.0/BehaviorPack/scripts/inventory_exchange.js');
 const c=new Inventory([new Item('a',2,'named'),new Item('b'),new Item('stone',64)]);
 assert.equal(inventoryTransaction({container:c,costs:[{id:'a',count:2},{id:'b',count:1}],products:[new Item('a',1),new Item('reward',1)]}),'ok');
 assert.deepEqual(snap(c),[['a',1,''],['reward',1,''],['stone',64,'']]);
 const d=new Inventory([new Item('a',2,'named'),new Item('x',64)]),before=snap(d);
 assert.equal(inventoryTransaction({container:d,costs:[{id:'a',count:1}],products:[new Item('a',1)]}),'full');assert.deepEqual(snap(d),before);
 assert.equal(inventoryTransaction({container:d,costs:[{id:'a',count:2},{id:'a',count:1}],products:[new Item('x')]}),'missing');assert.deepEqual(snap(d),before);
});
test('progress transaction restores multiple properties and inventory after partial property failure',async()=>{
 const {progressReward}=await import('../Hakkai_v7.1.0/BehaviorPack/scripts/inventory_exchange.js');
 const props=new Map([['n:first',4]]),inv=new Inventory([new Item('a'),new Item('b')]);let fail=true;const reports=[];
 const player={getDynamicProperty:k=>props.get(k),setDynamicProperty(k,v){if(v===undefined)props.delete(k);else props.set(k,v);if(k==='n:second'&&fail){fail=false;throw Error('mutated')}}};
 const args={space:()=>inv,ItemStack:Item,ns:'n:',report:(...x)=>reports.push(x)};
 assert.equal(progressReward(player,[['a',1]],[['out',1]],{first:5,second:1},args),'error');
 assert.deepEqual(snap(inv),[['a',1,''],['b',1,'']]);assert.deepEqual([...props],[['n:first',4]]);assert.ok(reports.length);
 assert.equal(progressReward(player,[['a',1]],[['out',1]],{first:5,second:1},args),'ok');assert.equal(props.get('n:second'),1);
});
test('in-place transforms cannot silently change item identity or amount',async()=>{
 const {inventoryTransaction}=await import('../Hakkai_v7.1.0/BehaviorPack/scripts/inventory_exchange.js');
 for(const transform of [item=>{item.amount=2;return item},item=>{item.typeId='other';return item},item=>new Item(item.typeId,2)]){
  const c=new Inventory([new Item('sword',1,'named',64),new Item('cost')]),before=snap(c);
  assert.equal(inventoryTransaction({container:c,costs:[{id:'cost',count:1}],products:[],changes:[{slot:0,transform}]}),'error');
  assert.deepEqual(snap(c),before);assert.equal(c.writes,0,'reject before any inventory write');
 }
 const c=new Inventory([new Item('sword',1,'named',64),new Item('cost')]);
 assert.equal(inventoryTransaction({container:c,costs:[{id:'cost',count:1}],products:[],changes:[{slot:0,transform:item=>{item.tag='enchanted';return item}}]}),'ok');
 assert.deepEqual(snap(c),[['sword',1,'enchanted'],undefined]);
});
test('recovery failures are reported instead of claiming atomicity',async()=>{
 const {inventoryTransaction}=await import('../Hakkai_v7.1.0/BehaviorPack/scripts/inventory_exchange.js');
 const c=new Inventory([new Item('a')]),reports=[];c.setItem=function(i,v){this.items[i]=v;throw Error('unavailable')};
 assert.equal(inventoryTransaction({container:c,costs:[{id:'a',count:1}],products:[new Item('b')],report:(...x)=>reports.push(x)}),'error');
 assert.ok(reports.some(([x])=>x.includes('復旧失敗')));
});
