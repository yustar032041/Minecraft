import assert from 'node:assert/strict';
import {setupWardenBoss} from '../Hakkai_v7.1.0/BehaviorPack/scripts/warden_boss.js';
import {Difficulty,GameMode} from '@minecraft/server';
function fixture(decision){
 let seq=0;const entities=[],messages=[],props=[],poses=[],parts=[],damage=[],worldProps=new Map(),entityProps=new Map(),dynamic=new Map();
 const d={id:'hakkai:warden_arena',isChunkLoaded:()=>true,getBlock:p=>Math.floor(p.y)<80?{typeId:'hakkai:warden_arena_stone',isAir:false,isLiquid:false,isWaterlogged:false}:{isAir:true},getBlockFromRay:()=>undefined,
  getPlayers:()=>[p],getEntities:opts=>opts?.type==='hakkai:time_warden'?[boss]:entities.filter(x=>x.isValid),spawnParticle:(id,pos)=>parts.push([id,pos]),
  spawnEntity(typeId,at){const dyn=new Map(),ps=new Map();const s={typeId,id:`blade-${seq++}`,isValid:true,location:{...at},dimension:d,setDynamicProperty:(k,v)=>dyn.set(k,v),getDynamicProperty:k=>dyn.get(k),setProperty:(k,v)=>ps.set(k,v),getProperty:k=>ps.get(k),teleport(at){this.location={...at}},remove(){this.isValid=false}};entities.push(s);return s;}};
 const p={id:'p',typeId:'minecraft:player',dimension:d,isValid:true,location:{x:0,y:80,z:0},getGameMode:()=>GameMode.Survival,sendMessage:m=>messages.push([sys.currentTick,m]),playSound:()=>{},applyDamage:n=>{damage.push([sys.currentTick,n]);return true;},addEffect:()=>{},setOnFire:()=>{}};
 const health={currentValue:1990,effectiveMax:5000,setCurrentValue(v){this.currentValue=v;}};
 const boss={id:'boss',typeId:'hakkai:time_warden',isValid:true,dimension:d,location:{x:-6,y:80,z:-6},get isOnGround(){return this.location.y<=80.01},getComponent:()=>health,getDynamicProperty:k=>dynamic.get(k),setDynamicProperty:(k,v)=>dynamic.set(k,v),getProperty:k=>entityProps.get(k),
  setProperty(k,v){entityProps.set(k,v);props.push([sys.currentTick,k,v]);},clearVelocity:()=>{},tryTeleport(at){this.location={...at};return true;},getVelocity:()=>({x:0,y:0,z:0}),applyImpulse:()=>{},addEffect:()=>{},removeEffect:()=>{},playAnimation:id=>poses.push([sys.currentTick,id])};
 const world={getDifficulty:()=>Difficulty.Normal,getAllPlayers:()=>[p],getDynamicProperty:k=>worldProps.get(k),setDynamicProperty:(k,v)=>worldProps.set(k,v)};
 const sys={currentTick:0};const ctrl=setupWardenBoss({world,system:sys,decision,report:(_,err)=>{throw err;}});
 return {ctrl,sys,boss,p,health,entities,messages,props,poses,parts,damage,tick(t){sys.currentTick=t;ctrl.tick(p,t);}};
}
{
 const f=fixture();for(let t=0;t<1000;t++)f.tick(t);
 assert.equal(f.entities.filter(x=>x.isValid).length,8,'phase four has eight separate blades');
 assert.ok(f.messages.some(([,m])=>m.includes('管理者が八界の剣に手を伸ばした')),'new mode scheduled via real boss');
 assert.ok(f.messages.some(([,m])=>m.includes('（約2秒）')),'traditional mode remains scheduled');
 assert.ok(f.props.some(([,k,v])=>k==='hakkai:held_blade'&&v>0),'boss holds an actual owned sword');
 assert.ok(f.props.some(([,k,v])=>k==='hakkai:held_blade'&&v===0),'held sword released back to independent attacks');
 const start=f.messages.find(([t,m])=>m.includes('管理者が八界の剣に手を伸ばした'))[0];
 assert.ok(!f.messages.some(([t,m])=>t>start&&t<start+240&&m.includes('（約2秒）')),'legacy attacks do not start during sword mode');
 f.ctrl.stagger(f.boss,1000);const before=f.damage.length;for(let t=1001;t<1040;t++)f.tick(t);assert.equal(f.damage.length,before,'stagger immediately cancels both blade and boss attacks');
 f.ctrl.onDeath({deadEntity:f.boss});assert.equal(f.entities.filter(x=>x.isValid).length,0,'boss death removes eight owned entities');
}
{
 // Force each physical aerial mode separately; the actual policy is tested
 // with changing player behaviour in warden_ai.test.mjs.
 for(const mode of ['flight','flight_sword']){
  const decision={mode:(_b,_phase,_s,opts)=>opts.current==='traditional'?mode:opts.current};
  const f=fixture(decision);f.health.currentValue=990;
  for(let t=0;t<1100;t++)f.tick(t);
  assert.ok(f.messages.some(([,m])=>m.includes('翼を広げ')),`${mode}: flight started`);
  if(mode==='flight')assert.ok(f.parts.some(([id])=>id==='hakkai:warden_hellfire'),'lightning leaves a visible fire zone');
  else {assert.ok(f.props.some(([,k,v])=>k==='hakkai:held_blade'&&v>0),'aerial mode holds a blade');assert.ok(f.parts.some(([id])=>id==='hakkai:warden_front_moon'),'aerial slashes emitted');}
  assert.equal(f.entities.filter(x=>x.isValid).length,8);
 }
}
console.log('Enhanced mode wired through real boss scheduling, held blade, interruption and death (mocked)');
