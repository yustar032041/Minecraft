import {test} from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';
import {villageTransaction} from '../Hakkai_v7.1.0/BehaviorPack/scripts/village_transaction.js';
class Item{constructor(typeId,amount=1){Object.assign(this,{typeId,amount,maxAmount:64})}clone(){return new Item(this.typeId,this.amount)}isStackableWith(other){return this.typeId===other.typeId}}
class Inv{constructor(){this.items=[new Item('crop',5)];this.size=1}getItem(i){return this.items[i]?.clone()}setItem(i,v){this.items[i]=v?.clone()}}
function fixture(){const props=new Map([['n:order_day',1]]),inv=new Inv(),town={data:{goods:5}},errors=[];let fail=false;const player={getDynamicProperty:k=>props.get(k),setDynamicProperty(k,v){v===undefined?props.delete(k):props.set(k,v);if(fail){fail=false;throw Error('after mutation')}}};
 const args={player,town,next:{goods:8},playerUpdates:{order_day:2,trust:1},costs:[['crop',5]],products:[['emerald',1]],space:()=>inv,ItemStack:Item,ns:'n:',townRecord:t=>({...t.data}),townSave:(t,v)=>{t.data=v},report:(...x)=>errors.push(x)};
 return {args,props,inv,town,errors,setFail(){fail=true}};}
test('village transaction updates stock, reward and player limits together',()=>{const f=fixture();assert.equal(villageTransaction(f.args),'ok');assert.equal(f.town.data.goods,8);assert.equal(f.props.get('n:trust'),1);assert.equal(f.inv.items[0].typeId,'emerald')});
test('village transaction restores state after partial record failure',()=>{const f=fixture();f.setFail();assert.equal(villageTransaction(f.args),'error');assert.equal(f.town.data.goods,5);assert.equal(f.props.get('n:order_day'),1);assert.equal(f.props.has('n:trust'),false);assert.equal(f.inv.items[0].typeId,'crop');assert.ok(f.errors.length)});
test('cached village refresh and saves keep old and new form references in sync',()=>{
 const src=fs.readFileSync('Hakkai_v7.1.0/BehaviorPack/scripts/main.js','utf8'),a=src.indexOf('function townRecord('),b=src.indexOf('function townGet(',a);const map=new Map(),world={};let stored,fail=false;const ctx={townCache:map,world,seasonDay:()=>0,property:(_e,_k,v)=>{if(fail)throw Error('failed');stored=v},townGet:()=>map.get('key')};vm.createContext(ctx);vm.runInContext(src.slice(a,b),ctx);
 const old={key:'key',d:{},l:{},data:{goods:1}},fresh={key:'key',data:{goods:7}};map.set('key',fresh);assert.equal(ctx.refreshTown(old),true);assert.equal(ctx.townRecord(old).goods,7);ctx.townSave(old,{goods:8});assert.equal(fresh.data.goods,8);assert.equal(JSON.parse(stored).goods,8);fail=true;assert.throws(()=>ctx.townSave(old,{goods:10}));assert.equal(old.data.goods,8);assert.equal(fresh.data.goods,8);
});
test('two players with stale development forms cannot pay twice for the same village stage',async()=>{
 const src=fs.readFileSync('Hakkai_v7.1.0/BehaviorPack/scripts/main.js','utf8'),a=src.indexOf('const townDevelopmentPlans='),b=src.indexOf('function cultureTownForSite(',a),pending=[],notes=[],trades=[];
 assert.ok(a>0&&b>a);const current={data:{goods:1,level:0}},old={d:{id:'overworld',getBlock:()=>({typeId:'minecraft:bell'}),spawnParticle:()=>{}},l:{x:0,y:0,z:0},data:{goods:1,level:0}};
 const p={isValid:true,dimension:old.d,location:old.l,playSound:()=>{}};
 const ctx={ns:'hakkai:',dist:()=>0,townRecord:t=>({...t.data}),refreshTown:t=>{t.data=current.data;return true},space:()=>({}),isCreative:()=>false,form:()=>new Promise(r=>pending.push(r)),num:()=>0,world:{getAbsoluteTime:()=>123},notice:(_p,x)=>notes.push(x),simple:()=>{},townTrade:(_p,t,costs,products,next)=>{trades.push(costs);t.data=next;current.data=next;return true}};
 vm.createContext(ctx);vm.runInContext(src.slice(a,b)+'\nthis.open=townDevelopment;',ctx);
 const first=ctx.open(p,old),second=ctx.open(p,old);pending.shift()(0);await first;pending.shift()(0);await second;
 assert.equal(trades.length,1);assert.equal(current.data.level,1);assert.ok(notes.some(n=>n.includes('更新されました')));
});
