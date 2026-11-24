import assert from 'node:assert/strict';
import {setupWardenBoss,wardenPatterns} from '../Hakkai_v7.1.0/BehaviorPack/scripts/warden_boss.js';
import {WARDEN_EXTRA_PATTERNS} from '../Hakkai_v7.1.0/BehaviorPack/scripts/warden_extra_patterns.js';
import {steerWarden} from '../Hakkai_v7.1.0/BehaviorPack/scripts/warden_movement.js';
import {Difficulty,GameMode} from '@minecraft/server';
for(let phase=0;phase<5;phase++){
 assert.equal(WARDEN_EXTRA_PATTERNS[phase].length,20);
 assert.equal(wardenPatterns(phase).length,phase===4?200:40);
}
function fixture(phase=0){
 const messages=[],hits=[],parts=[];let players=[];
 const dim={id:'hakkai:warden_arena',getPlayers:()=>players,getEntities:()=>[boss],spawnParticle:(id,p)=>parts.push([id,p]),isChunkLoaded:()=>true,getBlock:()=>({isAir:true}),getBlockFromRay:()=>undefined};
 function player(id,x=0){return {id,isValid:true,typeId:'minecraft:player',location:{x,y:80,z:0},isSneaking:true,dimension:dim,getGameMode:()=>GameMode.Survival,sendMessage:m=>messages.push([id,m]),applyDamage:n=>{hits.push([id,n]);return true;},addEffect:()=>{},playSound:()=>{}};}
 const p=player('p'),q=player('q',10);players=[p,q];
 const h={currentValue:[5000,3990,2990,1990,990][phase],effectiveMax:5000,setCurrentValue(v){this.currentValue=v;}};
 const boss={id:'boss',isValid:true,typeId:'hakkai:time_warden',location:{x:0,y:80,z:1},dimension:dim,getComponent:()=>h,getDynamicProperty:()=>undefined,setDynamicProperty:()=>{},playAnimation:()=>{}};
 const system={currentTick:0},world={getDifficulty:()=>Difficulty.Normal,getAllPlayers:()=>players};
 const ctrl=setupWardenBoss({world,system,property:()=>{},report:(_,e)=>{throw e;},spendParry:()=>true});
 const tick=t=>{system.currentTick=t;ctrl.tick(p,t);};
 return {p,q,dim,boss,system,world,ctrl,tick,messages,hits,parts,player,setPlayers:v=>players=v};
}
{
 const f=fixture();f.tick(0);f.tick(80);
 assert.equal(f.messages.filter(([id,m])=>id==='p'&&m.includes('（約2秒）')).length,2,'both attacks explicitly announced');
 assert.ok(f.parts.filter(([id])=>id==='hakkai:warning_marker').length>40);
 const late=f.player('late');f.setPlayers([f.p,f.q,late]);f.tick(120);
 assert.deepEqual(f.hits.map(x=>x[0]),['p','q'],'both targets hit, late player protected');
}
{
 const f=fixture();f.q.location.x=0;f.tick(0);f.tick(80);f.tick(120);
 assert.deepEqual(f.hits.map(x=>x[0]),['p','q'],'overlap is capped to one hit per player per tick');
}
for(const mode of ['parry','stagger','peaceful','stale']){
 const f=fixture();f.q.location.x=0;f.tick(0);f.tick(80);
 if(mode==='parry'){f.system.currentTick=112;assert.equal(f.ctrl.onMeleeParry({damagingEntity:f.p,hitEntity:f.boss}),true);}
 if(mode==='stagger')f.ctrl.stagger(f.boss,112);
 if(mode==='peaceful')f.world.getDifficulty=()=>Difficulty.Peaceful;
 f.tick(mode==='stale'?121:120);assert.deepEqual(f.hits,[],mode);
}
// A player outside the first circle can counter the overlapping second cross.
{
 const f=fixture();f.setPlayers([f.p]);f.tick(0);f.tick(80);f.p.location.x=4;
 f.system.currentTick=112;assert.equal(f.ctrl.onMeleeParry({damagingEntity:f.p,hitEntity:f.boss}),true);
 f.tick(120);assert.deepEqual(f.hits,[]);
}
// Exercise the actual selection loop through all forty patterns in each
// non-final form, rather than just counting exported recipes.
for(let phase=0;phase<4;phase++){
 const f=fixture(phase);f.setPlayers([f.p]);
 for(let t=0;t<6000;t++)f.tick(t);
 for(const attack of wardenPatterns(phase))assert.ok(f.messages.some(([,m])=>m.includes(`§c${attack.attack}：`)),`${phase}: ${attack.attack}`);
}
// Flight checks the swept volume including vertical clearance and players.
for(const phase of [1,4]){
 const f=fixture();f.q.location.x=10;f.p.location={x:0,y:80,z:8};
 const moves=[];Object.assign(f.boss,{isOnGround:false,location:{x:0,y:83,z:0},getVelocity:()=>({x:0,y:0,z:0}),applyImpulse:v=>moves.push(v)});
 const s={takeoffAt:0,takeoffY:80};assert.equal(steerWarden(f.boss,s,phase,0),true);assert.equal(steerWarden(f.boss,s,phase,6),true);
 assert.ok(moves.some(v=>v.y>0)&&moves.some(v=>v.y<0));
 f.dim.isChunkLoaded=()=>false;assert.equal(steerWarden(f.boss,s,phase,12),false);
 f.dim.isChunkLoaded=()=>true;f.dim.getBlock=()=>({isAir:false});assert.equal(steerWarden(f.boss,s,phase,18),false);
}
console.log('Parallel warden: independent warnings, capped overlap, late players, cancellation and 3D path checks (mocked)');
