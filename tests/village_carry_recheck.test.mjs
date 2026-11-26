import test from 'node:test';import assert from 'node:assert/strict';
import {moveOne,vanillaCarryStep} from '../Hakkai_v7.1.0/BehaviorPack/scripts/village_projects.js';
class Item{constructor(typeId,amount=1,tag='',stackable=true){Object.assign(this,{typeId,amount,tag,maxAmount:64,stackable});}clone(){return new Item(this.typeId,this.amount,this.tag,this.stackable)}isStackableWith(x){return this.stackable&&x.stackable&&this.typeId===x.typeId&&this.tag===x.tag}}
const item=(id,n=1,tag='',stack=true)=>new Item(id,n,tag,stack);
function inv(values){return {items:values,size:values.length,getItem(i){return this.items[i]?.clone()},setItem(i,v){this.items[i]=v?.clone()}};}
test('a changed destination is not overwritten after input is written',()=>{
 const a=inv([item('minecraft:wheat',2)]),b=inv([undefined]),reports=[];let once=true;
 a.setItem=(i,v)=>{a.items[i]=v?.clone();if(once){once=false;b.items[0]=item('minecraft:diamond',5)}};
 assert.equal(moveOne(a,b,(...r)=>reports.push(r)),false);assert.equal(a.items[0].amount,2);assert.equal(b.items[0].typeId,'minecraft:diamond');assert.ok(reports.length);
});
test('a changed source is not overwritten during rollback after destination write error',()=>{
 const a=inv([item('minecraft:wheat',2)]),b=inv([undefined]),reports=[];
 b.setItem=(i,v)=>{b.items[i]=v?.clone();a.items[0]=item('minecraft:diamond',7);throw Error('after output');};
 assert.equal(moveOne(a,b,(...r)=>reports.push(r)),false);assert.equal(a.items[0].typeId,'minecraft:diamond');assert.ok(reports.length);
});
test('non-stackable special metadata is not assumed equal and later normal input can be used',()=>{
 const a=inv([item('minecraft:wheat',1,'custom',false),item('minecraft:wheat',2)]),b=inv([undefined]);
 assert.equal(moveOne(a,b),true);assert.equal(a.items[0].tag,'custom');assert.equal(a.items[1].amount,1);assert.equal(b.items[0].amount,1);
});
function delivery(){
 const props=new Map(),input=inv([item('minecraft:wheat',3)]),output=inv([undefined]),a={x:0,y:88,z:0},b={x:8,y:88,z:0};let alive=true,loaded=true,clearFailure=false,clearAfter=false;
 const d={id:'hakkai:realm_0',isChunkLoaded:()=>loaded,getEntities:()=>[],getBlock:p=>({typeId:alive?'minecraft:barrel':'minecraft:stone',getComponent:()=>({container:p.x===0?input:output})})};
 const w={isValid:true,dimension:d,location:{...b},getDynamicProperty:k=>props.get(k),setDynamicProperty(k,v){if(v===undefined&&clearFailure){if(clearAfter)props.delete(k);throw Error('clear failed');}v===undefined?props.delete(k):props.set(k,v)}};
 const town={d,l:a,key:'town'},route={input:a,output:b},reports=[];props.set('hakkai:carry_job_v1',JSON.stringify({input:a,output:b,dimension:d.id,townKey:'town',phase:'deliver',mode:'barrel_transfer'}));
 return {w,town,route,input,output,reports,props,options:{town,along:()=>{},report:(...r)=>reports.push(r)},set broken(v){alive=!v},set unloaded(v){loaded=!v},set clearFailure(v){clearFailure=v},set clearAfter(v){clearAfter=v}};
}
test('replaced barrel after input write stops delivery and does not write removed containers',()=>{
 const f=delivery();let first=true;f.input.setItem=(i,v)=>{f.input.items[i]=v?.clone();if(first){first=false;f.broken=true}};
 assert.notEqual(vanillaCarryStep(f.w,f.route,f.options),'delivered');assert.equal(f.output.items[0],undefined);assert.ok(f.reports.length);
});
test('clearing worker job failure cannot transfer and repeatedly deliver on next tick',()=>{
 for(const after of [false,true]){const f=delivery();f.clearFailure=true;f.clearAfter=after;assert.equal(vanillaCarryStep(f.w,f.route,f.options),'error');assert.equal(f.input.items[0].amount,3);assert.equal(f.output.items[0],undefined);}
});
test('a full destination keeps job for a later attempt, then delivers exactly one',()=>{
 const f=delivery();f.output.items[0]=item('minecraft:stone',64);assert.equal(vanillaCarryStep(f.w,f.route,f.options),'waiting');assert.ok(f.props.get('hakkai:carry_job_v1'));assert.equal(f.input.items[0].amount,3);
 f.output.items[0]=undefined;assert.equal(vanillaCarryStep(f.w,f.route,f.options),'delivered');assert.equal(f.input.items[0].amount,2);assert.equal(f.output.items[0].amount,1);assert.equal(f.props.has('hakkai:carry_job_v1'),false);
});
test('failure before output write never attempts to restore an untouched destination',()=>{
 const a=inv([item('minecraft:wheat',2)]),b=inv([undefined]);let writes=0;
 a.setItem=()=>{throw Error('failed before input change')};b.setItem=()=>{writes++};
 assert.equal(moveOne(a,b),false);assert.equal(writes,0);assert.equal(a.items[0].amount,2);
});
test('same type but changed metadata is not mistaken for the expected stack',()=>{
 const a=inv([item('minecraft:wheat',2,'old')]),b=inv([undefined]);let once=true;
 a.setItem=(i,v)=>{a.items[i]=v?.clone();if(once){once=false;a.items[i]=item('minecraft:wheat',1,'new')}};
 const reports=[];assert.equal(moveOne(a,b,(...r)=>reports.push(r)),false);assert.equal(a.items[0].tag,'new');assert.equal(a.items[0].amount,1);assert.equal(b.items[0],undefined);assert.ok(reports.some(([label])=>label.includes('復旧失敗')));
});
test('route change after source write aborts and restores the unchanged reachable barrel',()=>{
 const f=delivery(),newRoute={input:{...f.route.input},output:{...f.route.output,x:9}};let route=f.route,once=true;
 f.options.currentRoute=()=>route;f.input.setItem=(i,v)=>{f.input.items[i]=v?.clone();if(once){once=false;route=newRoute}};
 assert.equal(vanillaCarryStep(f.w,f.route,f.options),'error');assert.equal(f.input.items[0].amount,3);assert.equal(f.output.items[0],undefined);assert.equal(f.props.has('hakkai:carry_job_v1'),false);assert.ok(f.reports.length);
});
test('player-written job after item write is not erased or replaced with a stale job',()=>{
 const f=delivery();let once=true;const key='hakkai:carry_job_v1',replacement=JSON.stringify({mode:'barrel_transfer',phase:'pickup',dimension:f.w.dimension.id,townKey:'new',input:f.route.input,output:f.route.output});
 f.input.setItem=(i,v)=>{f.input.items[i]=v?.clone();if(once){once=false;f.props.set(key,replacement)}};
 assert.equal(vanillaCarryStep(f.w,f.route,f.options),'error');assert.equal(f.input.items[0].amount,3);assert.equal(f.output.items[0],undefined);assert.equal(f.props.get(key),replacement);
});
test('checks stop delivery if the destination is changed just after it is written',()=>{
 const f=delivery();let once=true;f.output.setItem=(i,v)=>{f.output.items[i]=v?.clone();if(once){once=false;f.output.items[i]=item('minecraft:diamond',2)}};
 assert.equal(vanillaCarryStep(f.w,f.route,f.options),'error');assert.equal(f.output.items[0].typeId,'minecraft:diamond');assert.equal(f.input.items[0].amount,2,'uncertain output must not be duplicated by restoring source');assert.ok(f.reports.some(([label])=>label.includes('復旧失敗')));
});
test('pickup does not leave for an inventory containing only non-comparable items',()=>{
 const f=delivery(),key='hakkai:carry_job_v1',job=JSON.parse(f.props.get(key));job.phase='pickup';f.props.set(key,JSON.stringify(job));f.w.location={...f.route.input};f.input.items[0]=item('minecraft:wheat',1,'custom',false);
 assert.equal(vanillaCarryStep(f.w,f.route,f.options),'empty');assert.equal(JSON.parse(f.props.get(key)).phase,'pickup');assert.equal(f.input.items[0].tag,'custom');
});

test('failed output restoration does not restore source while delivery may still exist',()=>{
 const a=inv([item('minecraft:wheat',2)]),b=inv([undefined]),reports=[];let count=0;
 b.setItem=(i,v)=>{if(count++===0){b.items[i]=v?.clone();throw Error('after output write')}throw Error('cannot restore output')};
 assert.equal(moveOne(a,b,(...r)=>reports.push(r)),false);assert.equal(a.items[0].amount,1);assert.equal(b.items[0].amount,1);assert.ok(reports.some(([label])=>label.includes('復旧失敗')));
});
