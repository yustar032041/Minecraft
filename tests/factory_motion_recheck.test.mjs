import {test} from 'node:test';
import assert from 'node:assert/strict';
import {moveStructure} from '../Hakkai_v7.1.0/BehaviorPack/scripts/factory_motion.js';
const P=(x,y=20,z=0)=>({x,y,z}),key=p=>`${p.x},${p.y},${p.z}`;
const perm=(id,states={})=>({type:{id},typeId:id,getAllStates:()=>({...states}),getState:k=>states[k],withState:(k,v)=>perm(id,{...states,[k]:v})});
function fixture(){
 const cells=new Map(),events=[],unloaded=new Set();let writes=0,hook=()=>{},entityHook=()=>{};
 const put=(p,id,states={})=>cells.set(key(p),perm(id,states));
 const current=p=>cells.get(key(p))??perm('minecraft:air');
 const d={isChunkLoaded:p=>!unloaded.has(key(p)),getEntities:()=>{entityHook();return [];},getBlock:p=>({
  get typeId(){return current(p).typeId;},get permutation(){return current(p);},
  setType:id=>apply(p,perm(id)),setPermutation:next=>apply(p,next)
 })};
 function apply(p,next){writes++;events.push([key(p),next.typeId]);hook({p,next,number:writes,when:'before'});cells.set(key(p),next);hook({p,next,number:writes,when:'after'});}
 const ctrl=P(0),a=P(1),b=P(2),c=P(3);put(ctrl,'hakkai:gantry',{'hakkai:offset':0,'hakkai:motion':0});put(a,'hakkai:gantry_frame');put(b,'hakkai:fluid_tank',{'hakkai:level':3,'hakkai:fluid':1});
 const parts=[a,b].map(p=>({p,id:current(p).typeId,permutation:current(p)})),dest=[{p:b,permutation:current(a)},{p:c,permutation:current(b)}],old=current(ctrl);
 const run=()=>moveStructure({d,parts,dest,control:{p:ctrl,id:'hakkai:gantry',old,next:old.withState('hakkai:offset',1)},report:(...e)=>events.push(e)});
 return {run,put,current,events,unloaded,ctrl,a,b,c,setHook:f=>hook=f,setEntityHook:f=>entityHook=f};
}
test('source state or controller changed during preflight rejects without writing',()=>{
 for(const target of ['source','controller']){
  const f=fixture();f.setEntityHook(()=>target==='source'?f.put(f.b,'hakkai:fluid_tank',{'hakkai:level':7,'hakkai:fluid':1}):f.put(f.ctrl,'hakkai:gantry',{'hakkai:offset':0,'hakkai:motion':3}));
  assert.equal(f.run().reason,'changed',target);assert.equal(f.events.length,0);assert.equal(f.current(f.a).typeId,'hakkai:gantry_frame');
  assert.equal(target==='source'?f.current(f.b).getState('hakkai:level'):f.current(f.ctrl).getState('hakkai:motion'),target==='source'?7:3);
 }
});
test('movement preserves externally changed unwritten cells and rolls back its own writes',()=>{
 for(const target of ['source','destination','controller']){
  const f=fixture();let once=false;
  f.setHook(({p,when})=>{if(!once&&key(p)===key(f.a)&&when==='after'){once=true;
   if(target==='source')f.put(f.b,'hakkai:fluid_tank',{'hakkai:level':7,'hakkai:fluid':1});
   if(target==='destination')f.put(f.c,'minecraft:diamond_block');
   if(target==='controller')f.put(f.ctrl,'minecraft:stone');
  }});
  const r=f.run();assert.equal(r.ok,false,target);assert.equal(f.current(f.a).typeId,'hakkai:gantry_frame');
  if(target==='source')assert.equal(f.current(f.b).getState('hakkai:level'),7);
  if(target==='destination')assert.equal(f.current(f.c).typeId,'minecraft:diamond_block');
  if(target==='controller')assert.equal(f.current(f.ctrl).typeId,'minecraft:stone');
 }
});
test('already written position changed by native update is not overwritten during rollback',()=>{
 const f=fixture();let once=false;
 f.setHook(({p,when,next})=>{if(!once&&key(p)===key(f.c)&&next.typeId==='hakkai:fluid_tank'&&when==='after'){once=true;f.put(f.a,'minecraft:diamond_block');}});
 assert.equal(f.run().reason,'rollback');assert.equal(f.current(f.a).typeId,'minecraft:diamond_block');
 assert.equal(f.current(f.b).typeId,'hakkai:fluid_tank');assert.equal(f.current(f.b).getState('hakkai:level'),3);assert.equal(f.current(f.c).typeId,'minecraft:air');assert.equal(f.current(f.ctrl).getState('hakkai:offset'),0);
});
test('changes after controller commit trigger rollback but do not restore over changes',()=>{
 const f=fixture();let once=false;
 f.setHook(({p,when,next})=>{if(!once&&key(p)===key(f.ctrl)&&next.getState('hakkai:offset')===1&&when==='after'){once=true;f.put(f.c,'hakkai:fluid_tank',{'hakkai:level':7,'hakkai:fluid':1});}});
 assert.equal(f.run().reason,'rollback');assert.equal(f.current(f.c).getState('hakkai:level'),7);assert.equal(f.current(f.ctrl).getState('hakkai:offset'),0);
});
test('throws before and after every write recover only actual mutations',()=>{
 for(const when of ['before','after'])for(let fail=1;fail<=5;fail++){
  const f=fixture();let once=false;f.setHook(e=>{if(!once&&e.number===fail&&e.when===when){once=true;throw Error('fault');}});
  assert.equal(f.run().reason,'failed',`${when} ${fail}`);assert.equal(f.current(f.a).typeId,'hakkai:gantry_frame');
  assert.equal(f.current(f.b).typeId,'hakkai:fluid_tank');assert.equal(f.current(f.b).getState('hakkai:level'),3);assert.equal(f.current(f.c).typeId,'minecraft:air');assert.equal(f.current(f.ctrl).getState('hakkai:offset'),0);
 }
});
test('unloaded and failed rollback are reported without blind restoration',()=>{
 const f=fixture();let once=false;
 f.setHook(({p,when})=>{if(!once&&key(p)===key(f.a)&&when==='after'){once=true;f.unloaded.add(key(f.a));f.unloaded.add(key(f.b));}});
 assert.equal(f.run().reason,'rollback');assert.equal(f.current(f.a).typeId,'minecraft:air');assert.equal(f.current(f.b).typeId,'hakkai:fluid_tank');assert.equal(f.current(f.c).typeId,'minecraft:air');assert.ok(f.events.some(e=>String(e[0]).includes('復旧失敗')));
});
test('rollback write exception reports incomplete rather than claiming recovery',()=>{
 const f=fixture();let failure=false;
 f.setHook(({number,when})=>{
  if(!failure&&number===2&&when==='after'){failure=true;throw Error('write fails after mutation');}
  if(failure&&number===3&&when==='before')throw Error('rollback unavailable');
 });
 assert.equal(f.run().reason,'rollback');assert.ok(f.events.some(e=>String(e[0]).includes('復旧失敗')));
});
