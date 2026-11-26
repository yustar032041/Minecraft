import assert from 'node:assert/strict';
import {gantryStep,gantryAutoTick,gantryState,setGantryMode,armGantry} from '../Hakkai_v7.1.0/BehaviorPack/scripts/factory_gantry.js';
import {factoryTransaction} from '../Hakkai_v7.1.0/BehaviorPack/scripts/factory_transaction.js';
class Item{constructor(typeId,amount=1){Object.assign(this,{typeId,amount,maxAmount:64});}clone(){return new Item(this.typeId,this.amount)}isStackableWith(x){return this.typeId===x.typeId}}
class Container{constructor(items){this.items=items;this.size=items.length;}getItem(i){return this.items[i]?.clone()}setItem(i,v){this.items[i]=v?.clone();if(this.onWrite)this.onWrite(i,v);if(this.fail){this.fail=false;throw Error('after write')}}}
const key=p=>`${p.x},${p.y},${p.z}`,P=(x,y,z)=>({x,y,z}),perm=(typeId,states={})=>({typeId,type:{id:typeId},states,getAllStates:()=>({...states}),getState:k=>states[k],withState:(k,v)=>perm(typeId,{...states,[k]:v})});
function fixture(name='gantry'){
 const cells=new Map(),containers=new Map(),entities=[];let calls=0,failAt=0;
 const d={id:'d',isChunkLoaded:p=>!d.unloaded?.has(key(p)),getEntities:()=>entities,getBlock:p=>{const k=key(p);if(!cells.has(k))cells.set(k,perm('minecraft:air'));return {...p,location:p,dimension:d,get typeId(){return cells.get(k).typeId},get permutation(){return cells.get(k)},getComponent:()=>({container:containers.get(k)}),setType(v){calls++;cells.set(k,perm(v));if(calls===failAt)throw Error('after mutation')},setPermutation(v){calls++;cells.set(k,v);if(calls===failAt)throw Error('after mutation');d.onPermutation?.(p,v)}}}};
 const put=(p,id,states={})=>cells.set(key(p),perm(id,states)),get=p=>d.getBlock(p),ctrl=P(0,80,0),out=new Container([undefined,undefined]);put(ctrl,'hakkai:'+name,{'hakkai:offset':0,'hakkai:motion':0});put(P(0,81,0),'minecraft:barrel');containers.set(key(P(0,81,0)),out);
 const opts={kineticNetwork:()=>({status:'running',rpm:16}),ItemStack:Item,factoryTransaction},step=n=>gantryStep(get(ctrl),n,opts);
 const crop=(x,z,id='minecraft:wheat',age=7)=>{put(P(x,79,z),id,{[id.startsWith('hakkai:')?'hakkai:age':'growth']:age});put(P(x,78,z),'minecraft:farmland');};
 return {d,put,get,out,ctrl,step,opts,crop,entities,fail:n=>{calls=0;failAt=n}};
}
{
 const f=fixture();f.put(P(1,80,0),'hakkai:gantry_harvester');f.put(P(1,80,1),'hakkai:gantry_harvester');f.crop(2,0);f.crop(2,1,'hakkai:summer_corn',3);
 assert.ok(f.step(1).ok);assert.equal(f.out.getItem(0).typeId,'minecraft:wheat');assert.equal(f.out.getItem(1).amount,2);assert.equal(f.get(P(2,79,0)).permutation.getState('growth'),0);assert.equal(f.get(P(2,79,1)).permutation.getState('hakkai:age'),0);
 assert.ok(f.step(-1).ok);assert.equal(f.out.getItem(0).amount,1);
}
for(const fault of ['missing_barrel','full','blocked','entity','unloaded','move_failure','no_power']){
 const f=fixture();f.put(P(1,80,0),'hakkai:gantry_harvester');f.crop(2,0);
 if(fault==='missing_barrel')f.put(P(0,81,0),'minecraft:air');if(fault==='full')f.out.items=[new Item('minecraft:stone',64),new Item('minecraft:stone',64)];if(fault==='blocked')f.put(P(2,80,0),'minecraft:stone');if(fault==='entity')f.entities.push({typeId:'minecraft:player',location:P(2,80,0)});if(fault==='unloaded')f.d.unloaded=new Set([key(P(2,79,0))]);if(fault==='move_failure')f.fail(1);if(fault==='no_power')f.opts.kineticNetwork=()=>({status:'no_source'});
 assert.equal(f.step(1).ok,false,fault);assert.equal(gantryState(f.get(f.ctrl)).offset,0,fault);assert.equal(f.get(P(2,79,0)).permutation.getState('growth'),7,fault);
}
{
 // Output write failure happens only after motion; crop and output roll back,
 // but the gantry correctly reports its new position rather than claiming undo.
 const f=fixture();f.put(P(1,80,0),'hakkai:gantry_harvester');f.crop(2,0);f.out.fail=true;
 const r=f.step(1);assert.equal(r.reason,'farm_after_move');assert.ok(r.moved);assert.equal(gantryState(f.get(f.ctrl)).offset,1);assert.equal(f.out.getItem(0),undefined);assert.equal(f.get(P(2,79,0)).permutation.getState('growth'),7);
}
// Simulate synchronous world updates triggered by the controller's move. The
// machine has already moved but must not mint a stale crop or use a removed
// output barrel. Bedrock event timing is not established by this mock.
for(const change of ['removed','replanted','different_crop','soil','output','unloaded']){
 const f=fixture();f.put(P(1,80,0),'hakkai:gantry_harvester');f.crop(2,0);
 f.d.onPermutation=(p,v)=>{
  if(key(p)!==key(f.ctrl)||v.getState('hakkai:offset')!==1)return;
  if(change==='removed')f.put(P(2,79,0),'minecraft:air');
  if(change==='replanted')f.put(P(2,79,0),'minecraft:wheat',{growth:0});
  if(change==='different_crop')f.put(P(2,79,0),'minecraft:carrots',{growth:7});
  if(change==='soil')f.put(P(2,78,0),'minecraft:dirt');
  if(change==='output')f.put(P(0,81,0),'minecraft:air');
  if(change==='unloaded')f.d.unloaded=new Set([key(P(2,79,0))]);
 };
 const r=f.step(1);assert.equal(r.reason,'farm_after_move',change);assert.equal(r.moved,true);assert.equal(gantryState(f.get(f.ctrl)).offset,1);assert.equal(f.out.getItem(0),undefined,change);
 if(change==='removed')assert.equal(f.get(P(2,79,0)).typeId,'minecraft:air');
 if(change==='replanted')assert.equal(f.get(P(2,79,0)).permutation.getState('growth'),0);
 if(change==='different_crop')assert.equal(f.get(P(2,79,0)).typeId,'minecraft:carrots');
}
for(const change of ['removed','younger','soil','output']){
 // Simulate a change caused by the output write, after the first recheck but
 // before the crop commit. Rollback must not recreate the invalid crop.
 const f=fixture();f.put(P(1,80,0),'hakkai:gantry_harvester');f.crop(2,0);
 f.out.onWrite=()=>{
  f.out.onWrite=undefined;
  if(change==='removed')f.put(P(2,79,0),'minecraft:air');
  if(change==='younger')f.put(P(2,79,0),'minecraft:wheat',{growth:2});
  if(change==='soil')f.put(P(2,78,0),'minecraft:dirt');
  if(change==='output')f.put(P(0,81,0),'minecraft:air');
 };
 const r=f.step(1);assert.equal(r.reason,'farm_after_move',change);assert.equal(r.moved,true);assert.equal(f.out.getItem(0),undefined,change);
 if(change==='removed')assert.equal(f.get(P(2,79,0)).typeId,'minecraft:air');
 if(change==='younger')assert.equal(f.get(P(2,79,0)).permutation.getState('growth'),2);
 if(change==='soil'||change==='output')assert.equal(f.get(P(2,79,0)).permutation.getState('growth'),7);
}
{
 // Multi-head operations commit individually. If a later target becomes
 // invalid, earlier accepted harvests remain and the movement is reported.
 const f=fixture();f.put(P(1,80,0),'hakkai:gantry_harvester');f.put(P(1,80,1),'hakkai:gantry_harvester');f.crop(2,0);f.crop(2,1,'hakkai:summer_corn',3);
 f.d.onPermutation=(p,v)=>{if(key(p)===key(f.ctrl)&&v.getState('hakkai:offset')===1)f.put(P(2,79,1),'minecraft:air');};
 const r=f.step(1);assert.equal(r.reason,'farm_after_move');assert.equal(r.moved,true);
 assert.equal(f.out.getItem(0).typeId,'minecraft:wheat');assert.equal(f.out.getItem(0).amount,1);
 assert.equal(f.get(P(2,79,0)).permutation.getState('growth'),0);assert.equal(f.get(P(2,79,1)).typeId,'minecraft:air');
}
{
 // The first crop's update can remove the barrel before the next head runs.
 const f=fixture();f.put(P(1,80,0),'hakkai:gantry_harvester');f.put(P(1,80,1),'hakkai:gantry_harvester');f.crop(2,0);f.crop(2,1,'hakkai:summer_corn',3);
 f.d.onPermutation=(p,v)=>{if(key(p)===key(P(2,79,0))&&v.getState('growth')===0)f.put(P(0,81,0),'minecraft:air');};
 const r=f.step(1);assert.equal(r.reason,'farm_after_move');assert.equal(r.moved,true);
 assert.equal(f.out.getItem(0).typeId,'minecraft:wheat');assert.equal(f.out.getItem(1),undefined);
 assert.equal(f.get(P(2,79,1)).permutation.getState('hakkai:age'),3);
}
{
 // Other current block states are preserved, rather than restoring an older
 // pre-move permutation after an otherwise eligible crop is harvested.
 const f=fixture();f.put(P(1,80,0),'hakkai:gantry_harvester');f.crop(2,0);
 f.d.onPermutation=(p,v)=>{if(key(p)===key(f.ctrl)&&v.getState('hakkai:offset')===1)f.put(P(2,79,0),'minecraft:wheat',{growth:7,custom:2});};
 assert.ok(f.step(1).ok);assert.equal(f.get(P(2,79,0)).permutation.getState('growth'),0);assert.equal(f.get(P(2,79,0)).permutation.getState('custom'),2);assert.equal(f.out.getItem(0).amount,1);
}
{
 const f=fixture('gantry_up');f.put(P(0,81,0),'hakkai:gantry_harvester');assert.equal(f.step(1).reason,'farm_layout');
}
{
 const f=fixture();for(let z=0;z<9;z++)f.put(P(1,80,z),'hakkai:gantry_harvester');assert.equal(f.step(1).reason,'farm_layout');
}
{
 const f=fixture();f.put(P(1,80,0),'hakkai:gantry_harvester');f.crop(2,0,'minecraft:carrots',7);const cycles=new Map();setGantryMode(f.get(f.ctrl),3);armGantry(f.get(f.ctrl),cycles,0);
 gantryAutoTick(f.get(f.ctrl),{...f.opts,cycleAt:cycles,tick:80});assert.equal(f.out.getItem(0).amount,2);assert.equal(gantryState(f.get(f.ctrl)).offset,1);
 f.crop(3,0);f.out.items=[new Item('minecraft:stone',64),new Item('minecraft:stone',64)];gantryAutoTick(f.get(f.ctrl),{...f.opts,cycleAt:cycles,tick:120});assert.deepEqual(gantryState(f.get(f.ctrl)),{offset:1,mode:0});assert.equal(f.get(P(3,79,0)).permutation.getState('growth'),7);
}
console.log('Mobile gantry harvester: movement, crops, storage, limits, failure rollback and automatic stop OK (simulated)');
for(const [direction,v] of Object.entries({gantry:[1,0,0],gantry_west:[-1,0,0],gantry_north:[0,0,-1],gantry_south:[0,0,1]})){
 const f=fixture(direction);f.put(P(v[0],80,v[2]),'hakkai:gantry_harvester');f.crop(v[0]*2,v[2]*2,'minecraft:potatoes',7);assert.ok(f.step(1).ok,direction);assert.equal(f.out.getItem(0).typeId,'minecraft:potato');assert.equal(f.out.getItem(0).amount,2);
}
for(const [id,state,max] of [['minecraft:wheat','growth',7],['minecraft:carrots','growth',7],['minecraft:potatoes','growth',7],['minecraft:beetroot','growth',7],...['spring_tulip','summer_corn','autumn_squash','ice_blossom','summer_sunflower'].map(s=>['hakkai:'+s,'hakkai:age',3])]){
 const f=fixture();f.put(P(1,80,0),'hakkai:gantry_harvester');f.crop(2,0,id,max);assert.ok(f.step(1).ok,id);assert.equal(f.get(P(2,79,0)).permutation.getState(state),0);
}
{
 // Two heads require space for both products; dry-run must reject before moving.
 const f=fixture();f.put(P(1,80,0),'hakkai:gantry_harvester');f.put(P(1,80,1),'hakkai:gantry_harvester');f.crop(2,0);f.crop(2,1,'hakkai:summer_corn',3);f.out.items=[new Item('minecraft:wheat',63),new Item('minecraft:stone',64)];
 assert.equal(f.step(1).reason,'farm_full');assert.equal(gantryState(f.get(f.ctrl)).offset,0);assert.equal(f.out.getItem(0).amount,63);
}
{
 // A crop update throws after mutation. Its transaction reverts both sides;
 // auto mode stops because the mechanical move already happened.
 const f=fixture(),cycleAt=new Map();f.put(P(1,80,0),'hakkai:gantry_harvester');f.crop(2,0);setGantryMode(f.get(f.ctrl),3);armGantry(f.get(f.ctrl),cycleAt,0);f.fail(4);
 gantryAutoTick(f.get(f.ctrl),{...f.opts,cycleAt,tick:80});assert.deepEqual(gantryState(f.get(f.ctrl)),{offset:1,mode:0});assert.equal(f.get(P(2,79,0)).permutation.getState('growth'),7);assert.equal(f.out.getItem(0),undefined);
}
{
 const {kineticNetwork}=await import('../Hakkai_v7.1.0/BehaviorPack/scripts/factory_network.js');
 const f=fixture();f.put(P(1,80,0),'hakkai:gantry_harvester');f.put(P(0,80,-1),'hakkai:water_wheel');f.put(P(0,79,-1),'minecraft:water');f.crop(2,0);f.opts.kineticNetwork=kineticNetwork;
 assert.equal(kineticNetwork(f.d,f.ctrl).status,'running');assert.equal(kineticNetwork(f.d,f.ctrl).demand,32);assert.ok(f.step(1).ok);assert.equal(f.out.getItem(0).typeId,'minecraft:wheat');
}

// After movement and again after the inventory write, require the same kind
// of controller with the expected offset/mode and the head at its new place.
for(const stage of ['after_move','after_output'])for(const change of ['controller','controller_unloaded','offset','mode','head','head_unloaded']){
 const f=fixture();f.put(P(1,80,0),'hakkai:gantry_harvester');f.crop(2,0);let once=false;
 const mutate=()=>{
  if(once)return;once=true;
  if(change==='controller')f.put(f.ctrl,'minecraft:stone');
  if(change==='controller_unloaded')f.d.unloaded=new Set([key(f.ctrl)]);
  if(change==='offset')f.put(f.ctrl,'hakkai:gantry',{'hakkai:offset':2,'hakkai:motion':0});
  if(change==='mode')f.put(f.ctrl,'hakkai:gantry',{'hakkai:offset':1,'hakkai:motion':1});
  if(change==='head')f.put(P(2,80,0),'minecraft:stone');
  if(change==='head_unloaded')f.d.unloaded=new Set([key(P(2,80,0))]);
 };
 if(stage==='after_move')f.d.onPermutation=(p,v)=>{if(key(p)===key(f.ctrl)&&v.getState('hakkai:offset')===1)mutate();};
 else f.out.onWrite=()=>{f.out.onWrite=undefined;mutate();};
 const result=f.step(1);
 // Changes while committing the controller are now caught by movement
 // itself; changes after an output write are handled by harvest rollback.
 if(stage==='after_move')assert.equal(result.reason,'rollback',stage+' '+change);
 else {assert.equal(result.reason,'farm_after_move',stage+' '+change);assert.equal(result.moved,true);}
 assert.equal(f.out.getItem(0),undefined,stage+' '+change);assert.equal(f.get(P(2,79,0)).permutation.getState('growth'),7,stage+' '+change);
 if(change==='controller')assert.equal(f.get(f.ctrl).typeId,'minecraft:stone');
 if(change==='head')assert.equal(f.get(P(2,80,0)).typeId,'minecraft:stone');
}
