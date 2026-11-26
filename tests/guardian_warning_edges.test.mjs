import assert from 'node:assert/strict';
import {Difficulty,GameMode} from '@minecraft/server';
import {setupGuardianBoss,GUARDIAN_TECHNIQUES} from '../Hakkai_v7.1.0/BehaviorPack/scripts/guardian_boss.js';

// Server/API mocks: these cannot establish client particle visibility or animation blending.
function fixture({failMessage=false,failParticleAt=0,damageAccepted=true,evade=false,parry=false}={}){
 let t=0,count=0;const hits=[],effects=[],markers=[],animations=[],players=[];
 const dim={id:'realm',getEntities:()=>[guardian],getPlayers:({location,maxDistance})=>players.filter(p=>Math.hypot(p.location.x-location.x,p.location.y-location.y,p.location.z-location.z)<=maxDistance),spawnParticle(id,pos){if(id==='hakkai:warning_marker'){if(++count===failParticleAt)throw Error('marker');markers.push({...pos});}}};
 const make=(id,x=1,y=80,z=0)=>({id,typeId:'minecraft:player',isValid:true,dimension:dim,location:{x,y,z},getGameMode:()=>GameMode.Survival,sendMessage(){if(failMessage&&id==='primary')throw Error('message');},applyDamage(n){hits.push([t,id,n]);return damageAccepted;},addEffect(...e){effects.push([id,...e]);}});
 const p=make('primary');players.push(p);const guardian={id:'guardian',typeId:'hakkai:guardian_0',isValid:true,dimension:dim,location:{x:0,y:80,z:0},playAnimation:id=>animations.push([t,id])};
 const c=setupGuardianBoss({world:{getDifficulty:()=>Difficulty.Normal},isEvading:()=>evade,tryParry:()=>parry});
 const tick=n=>{t=n;c.tick(p,n);};tick(0);
 return {p,players,make,tick,hits,effects,markers,animations};
}
for(const options of [{failMessage:true},{failParticleAt:9}]){
 const f=fixture(options);f.tick(30);assert.equal(f.animations.length,0,'failed warning cannot start a windup');f.tick(70);assert.equal(f.hits.length,0,'failed warning must not deal damage');
}
{
 const f=fixture();f.tick(30);f.tick(71);assert.equal(f.hits.length,0,'missed tick cancels rather than hitting after the warning');
}
{
 const f=fixture();f.tick(30);f.p.location.x=20;f.tick(70);assert.equal(f.hits.length,0,'aim remains fixed when target leaves the warning');
 const center={x:1,y:80,z:0};assert.equal(f.markers.length,16);
 for(const m of f.markers)assert.ok(Math.abs(Math.hypot(m.x-center.x,m.z-center.z)-GUARDIAN_TECHNIQUES[0].radius)<1e-9);
}
for(const options of [{evade:true},{parry:true},{damageAccepted:false}]){
 const f=fixture(options);f.tick(30);f.tick(70);assert.equal(f.effects.length,0,'evaded, parried or rejected damage cannot apply a status');
 if(options.damageAccepted===false)assert.equal(f.hits.length,1);else assert.equal(f.hits.length,0);
}
{
 const f=fixture();const high=f.make('high',1,83.1);f.players.push(high);f.tick(30);high.location.y=83.1;f.tick(70);
 assert.deepEqual(f.hits.map(h=>h[1]),['primary'],'players outside the height limit are unaffected');
}
console.log('Guardian warnings: fixed aim, failures, late tick, height, evade/parry and rejected damage (mocked)');
