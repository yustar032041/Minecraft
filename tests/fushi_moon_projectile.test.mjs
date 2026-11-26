// Simulated physics / callbacks only: this does not verify Bedrock raycast,
// particle visibility, collision geometry, rendering, or network timing.
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {GameMode,Difficulty} from '@minecraft/server';
import {setupFushiSystem} from '../Hakkai_v7.1.0/BehaviorPack/scripts/fushi_system.js';
import {startChiefMoon,advanceChiefMoon} from '../Hakkai_v7.1.0/BehaviorPack/scripts/fushi_moon_projectile.js';

function fixture(){
 let tick=0,wall=Infinity,loaded=true,air=true,particleFail=false,rayFail=false,entities=[],difficulty=Difficulty.Normal;
 const hits=[],effects=[],messages=[],particles=[],queue=[];
 // Suppress the first (charge) action to isolate the moon trajectory; the
 // charge has its own scheduler/terrain integration suite.
 const system={currentTick:0,runTimeout(fn,delay){if(this.currentTick===60)throw Error('skip charge');queue.push({at:this.currentTick+delay,fn});}};
 const d={id:'realm',getEntities:()=>[chief],isChunkLoaded:()=>loaded,getBlock:()=>({isAir:air}),
  getBlockFromRay:(from,dir,{maxDistance})=>{
   if(rayFail)throw Error('ray unavailable');
   const n=(wall-from.x)/dir.x;
   return Number.isFinite(n)&&n>=0&&n<=maxDistance?{block:{location:{x:wall,y:from.y,z:from.z}},faceLocation:{x:0,y:0,z:0}}:undefined;
  },
  getEntitiesFromRay:(from,dir,{maxDistance})=>entities.filter(v=>v.isValid).map(entity=>{
   const centre={x:entity.location.x,y:entity.location.y+.8,z:entity.location.z};
   const delta={x:centre.x-from.x,y:centre.y-from.y,z:centre.z-from.z};
   const along=delta.x*dir.x+delta.y*dir.y+delta.z*dir.z;
   const radial=Math.hypot(delta.x-dir.x*along,delta.y-dir.y*along,delta.z-dir.z*along);
   return {entity,distance:Math.max(0,along-.35),along,radial};
  }).filter(h=>h.radial<=.35&&h.along>=0&&h.distance<=maxDistance),
  spawnParticle:(id,pos)=>{if(particleFail&&id==='hakkai:mob_time')throw Error('particle unavailable');particles.push({tick,id,pos:{...pos}});}};
 const player=(id,x,z=0)=>({id,typeId:'minecraft:player',isValid:true,dimension:d,location:{x,y:80,z},getGameMode:()=>GameMode.Survival,
  sendMessage:m=>messages.push({tick,id,m}),applyDamage:n=>{hits.push({tick,id,n});return true;},addEffect:(id,duration)=>effects.push({tick,id,duration})});
 const p=player('p',6),q=player('q',8,3),chief={id:'chief',typeId:'hakkai:fushi_chief',isValid:true,dimension:d,location:{x:0,y:80,z:0},playAnimation:()=>{}};
 entities=[chief,p,q];const world={getDifficulty:()=>difficulty,getAllPlayers:()=>[p,q].filter(x=>x.isValid)};
 let evade=false,parry=false;
 const c=setupFushiSystem({world,system,report:(_,e)=>{throw e},isEvading:()=>evade,tryParry:()=>parry});
 c.onHurt({hurtEntity:chief,damageSource:{damagingEntity:p}});
 function advance(to){while(tick<to){tick++;system.currentTick=tick;
  while(queue.some(x=>x.at===tick)){const i=queue.findIndex(x=>x.at===tick);queue.splice(i,1)[0].fn();}
  if(tick%10===0){c.tickChiefs(p,tick);c.tickChiefs(q,tick);}
 }}
 return {p,q,chief,c,system,world,d,advance,hits,effects,messages,particles,queue,
  wall:v=>wall=v,loaded:v=>loaded=v,air:v=>air=v,particleFail:v=>particleFail=v,rayFail:v=>rayFail=v,
  entities:v=>entities=v,difficulty:v=>difficulty=v,evade:v=>evade=v,parry:v=>parry=v};
}
function ready(){const f=fixture();f.advance(100);assert.match(f.messages.at(-1).m,/月光の弾/);f.hits.length=0;f.effects.length=0;return f;}
test('moon shot flies after its fixed warning, strikes only the notified target and refreshes the ring',()=>{
 const f=ready();f.advance(140);assert.deepEqual(f.hits,[]);
 assert.equal(f.particles.filter(x=>x.tick===100&&x.id==='hakkai:warning_marker').length,16);
 assert.equal(f.particles.filter(x=>x.tick===140&&x.id==='hakkai:warning_marker').length,16);
 f.advance(145);assert.deepEqual(f.hits.map(h=>[h.tick,h.id,h.n]),[[144,'p',11]]);
 assert.deepEqual(f.effects.map(e=>[e.id,e.duration]),[['weakness',70]]);
 const moving=f.particles.filter(x=>x.id==='hakkai:mob_time'&&x.tick>140);
 assert.ok(moving.length>4);assert.ok(moving.every(x=>x.tick<=144));
 assert.ok(moving.some(x=>x.pos.x<2)&&moving.some(x=>x.pos.x>5));
 f.advance(170);assert.equal(f.hits.length,1);
});
test('launch uses the chief position at release and the original fixed target mark',()=>{
 const f=ready();f.chief.location.x=2;f.advance(140);
 // Target sidesteps after the warning: the projectile must not home in.
 f.p.location.z=1;f.advance(150);assert.deepEqual(f.hits,[]);
 const trail=f.particles.filter(x=>x.id==='hakkai:mob_time'&&x.tick>140);
 assert.ok(trail.length);assert.ok(trail.every(x=>Math.abs(x.pos.z)<1e-9&&x.pos.x>=2));
});
test('an entity in front of a wall can be hit but the wall blocks entities behind it',()=>{
 const f=ready();f.wall(6.2);f.advance(145);assert.deepEqual(f.hits.map(x=>x.id),['p']);
 const g=ready();g.wall(5.4);g.advance(145);assert.deepEqual(g.hits,[]);
});
for(const condition of ['wall','unloaded','solid-origin','particle','raycast','other-entity','outside-ring','sidestep','evade','parry','peaceful','disconnected','other-dimension','chief-dimension','dead-chief','stagger'])test(`moon shot cancels or misses for ${condition}`,()=>{
 const f=ready();f.advance(140);
 if(condition==='wall')f.wall(2);
 if(condition==='unloaded')f.loaded(false);
 if(condition==='solid-origin')f.air(false);
 if(condition==='particle')f.particleFail(true);
 if(condition==='raycast')f.rayFail(true);
 if(condition==='other-entity'){f.q.location={x:3,y:80,z:0};f.entities([f.chief,f.q,f.p]);}
 if(condition==='outside-ring')f.p.location.x=2;
 if(condition==='sidestep')f.p.location.z=2;
 if(condition==='evade')f.evade(true);
 if(condition==='parry')f.parry(true);
 if(condition==='peaceful')f.difficulty(Difficulty.Peaceful);
 if(condition==='disconnected')f.p.isValid=false;
 if(condition==='other-dimension')f.p.dimension={id:'elsewhere'};
 if(condition==='chief-dimension')f.chief.dimension={id:'elsewhere'};
 if(condition==='dead-chief'){f.chief.isValid=false;f.c.onDeath({deadEntity:f.chief});}
 if(condition==='stagger')f.c.stagger(f.chief,140);
 f.advance(150);assert.deepEqual(f.hits,[]);assert.deepEqual(f.effects,[]);
});
test('retarget during flight cancels it; never silently transfers a projectile',()=>{
 const f=ready();f.advance(141);f.p.isValid=false;f.system.currentTick=141;
 f.c.onHurt({hurtEntity:f.chief,damageSource:{damagingEntity:f.q}});f.advance(150);
 assert.deepEqual(f.hits,[]);
});
test('failed refresh or unavailable scheduler cannot cause unmarked damage',()=>{
 const f=ready();f.advance(139);const spawn=f.d.spawnParticle;
 f.d.spawnParticle=(id,pos)=>{if(id==='hakkai:warning_marker')throw Error('marker');spawn(id,pos);};
 f.advance(150);assert.deepEqual(f.hits,[]);assert.equal(f.queue.length,0);
 const g=ready();g.advance(139);g.system.runTimeout=()=>{throw Error('scheduler unavailable');};
 g.advance(150);assert.deepEqual(g.hits,[]);assert.equal(g.queue.length,0);
});
test('refused damage has no status effect and a delayed callback never catches up',()=>{
 const f=ready();f.p.applyDamage=()=>false;f.advance(145);assert.deepEqual(f.effects,[]);
 const g=ready();g.advance(140);assert.equal(g.queue.length,1);
 const callback=g.queue.shift().fn;g.system.currentTick=145;callback();
 assert.deepEqual(g.hits,[]);assert.equal(g.queue.length,0);
});
test('overlapping entity bounds shield target on a distance tie regardless of ray result order',()=>{
 for(const order of ['target-first','blocker-first','behind','in-front']){
  const f=fixture(),origin={x:0,y:80,z:0},aim={x:6,y:80,z:0},flight=startChiefMoon(origin,aim,10);
  f.d.getEntitiesFromRay=()=>{
   const target={entity:f.p,distance:1},blocker={entity:f.q,distance:order==='behind'?1.1:order==='in-front'?.9:1};
   return order==='blocker-first'?[blocker,target]:[target,blocker];
  };
  const result=advanceChiefMoon(f.d,flight,11,'chief','p');assert.equal(result.done,true,order);
  assert.equal(result.hit?.id,order==='behind'?'p':undefined,order);
 }
});
test('late frames, malformed rays and invalid starts fail closed',()=>{
 const aim={x:6,y:80,z:0},origin={x:0,y:80,z:0};
 assert.equal(startChiefMoon(origin,origin,10),undefined);
 assert.equal(startChiefMoon(origin,{x:40,y:80,z:0},10),undefined);
 const f=fixture(),missed=startChiefMoon(origin,aim,10);
 assert.deepEqual(advanceChiefMoon(f.d,missed,12,'chief','p'),{done:true});
 const malformed=startChiefMoon(origin,aim,10);
 f.d.getEntitiesFromRay=()=>[{entity:f.p,distance:NaN}];
 assert.deepEqual(advanceChiefMoon(f.d,malformed,11,'chief','p'),{done:true});
});
test('stale online player entry cannot hide the warned projectile target during flight',()=>{
 const f=ready();f.advance(140);f.world.getAllPlayers=()=>[{get id(){throw Error('disconnected')}},f.p,f.q];
 f.advance(145);assert.deepEqual(f.hits.map(x=>x.id),['p']);
});
