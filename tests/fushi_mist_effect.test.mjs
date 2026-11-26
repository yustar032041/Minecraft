// Controller and effects mocked; no Bedrock status/visual/network validation.
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {GameMode,Difficulty} from '@minecraft/server';
import {setupFushiSystem,CHIEF_ATTACKS} from '../Hakkai_v7.1.0/BehaviorPack/scripts/fushi_system.js';
function fixture({evade=false,parry=false,accepted=true,failEffect='',failParticle=false}={}){
 let now=0;const effects=[],damage=[],messages=[],particles=[];
 const d={id:'realm',getEntities:()=>[mob],spawnParticle(id,pos){if(failParticle&&id==='hakkai:mob_shadow')throw Error('visual');particles.push([now,id,pos]);}};
 const p={id:'p',typeId:'minecraft:player',isValid:true,dimension:d,location:{x:2,y:80,z:0},getGameMode:()=>GameMode.Survival,
  sendMessage:text=>messages.push([now,text]),applyDamage:n=>{damage.push(n);if(accepted==='throw')throw Error('damage');return accepted;},
  addEffect:(id,duration,opts)=>{effects.push([id,duration,opts]);if(id===failEffect)throw Error('effect');}};
 const mob={id:'chief',typeId:'hakkai:fushi_chief',isValid:true,dimension:d,location:{x:0,y:80,z:0},playAnimation:()=>{}};
 const system={currentTick:0},world={getDifficulty:()=>Difficulty.Normal,getAllPlayers:()=>[p]};
 const c=setupFushiSystem({world,system,report:(_,err)=>{throw err},isEvading:()=>evade,tryParry:()=>parry});
 c.onHurt({hurtEntity:mob,damageSource:{damagingEntity:p}});
 const tick=t=>{now=system.currentTick=t;c.tick(p,t);};
 // The fixture intentionally lacks moon's timer/raycast. Moon cancels safely.
 for(const t of [20,60,100,140,180])tick(t);
 effects.length=damage.length=particles.length=0;
 return {p,mob,c,tick,effects,damage,particles,messages};
}
test('mist announces drowsiness, and accepted damage adds brief blindness independently',()=>{
 const f=fixture();assert.match(f.messages.at(-1)[1],/鈍足と短い視界低下の霧（睡眠なし）/);f.tick(220);
 assert.deepEqual(f.damage,[7]);assert.deepEqual(f.effects,[['slowness',100,{amplifier:1,showParticles:false}],['blindness',30,{amplifier:0,showParticles:false}]]);
 assert.equal(f.particles.filter(([t,id])=>t===220&&id==='hakkai:mob_shadow').length,4,'three fixed impact points and one on the target');
 assert.deepEqual(CHIEF_ATTACKS[2].drowsiness,{effect:'blindness',duration:30,amplifier:0});
});
for(const options of [{accepted:false},{accepted:'throw'},{evade:true},{parry:true}])test(`no drowsiness after refused, failed, evaded or parried hit: ${JSON.stringify(options)}`,()=>{
 const f=fixture(options);f.tick(220);assert.deepEqual(f.effects,[]);
});
for(const failEffect of ['slowness','blindness'])test(`${failEffect} API failure does not suppress the other effect`,()=>{
 const f=fixture({failEffect,failParticle:true});f.tick(220);
 assert.deepEqual(f.effects.map(x=>x[0]),['slowness','blindness']);assert.deepEqual(f.damage,[7]);
});
test('outside the marked circle or a late tick cannot cause either effect',()=>{
 const f=fixture();f.p.location.x=7;f.tick(220);assert.deepEqual(f.damage,[]);assert.deepEqual(f.effects,[]);
 const g=fixture();g.tick(221);assert.deepEqual(g.damage,[]);assert.deepEqual(g.effects,[]);
});
