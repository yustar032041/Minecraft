import assert from 'node:assert/strict';
import {setupAirStrike} from '../Hakkai_v7.1.0/BehaviorPack/scripts/combat_air_strike.js';
function fixture(){
 const dmg=[],particles=[];
 const d={id:'a',getEntities:()=>[],spawnParticle:(...x)=>particles.push(x)};
 const target=(id='z',x=1,type='minecraft:zombie')=>({id,typeId:type,isValid:true,dimension:d,location:{x,y:0,z:0},getHeadLocation(){return {...this.location,y:1}},getComponent:()=>({hasTypeFamily:k=>k==='monster'}),applyDamage:(n)=>{dmg.push([id,n]);return true;},applyKnockback:()=>{},addEffect:()=>{},setOnFire:()=>{}});
 const p={id:'p',typeId:'minecraft:player',isValid:true,isOnGround:true,dimension:d,location:{x:0,y:0,z:0},getVelocity:()=>({y:-.2}),getGameMode:()=> 'survival',getComponent:()=>undefined,playAnimation:()=>{},playSound:()=>{}};
 const s={s:50},g={id:'g',kind:'剣',a:0},notes=[],blocked=new Set();
 const air=setupAirStrike({notice:(_,s)=>notes.push(s),visibleFrom:(_,pos)=>!blocked.has(pos.x)});
 air.tick(p,1);p.isOnGround=false;return {p,s,g,d,target,air,dmg,particles,blocked};
}
for(const order of ['hurt-first','hit-first']){
 const f=fixture(),{p,s,g,target,air,dmg,d}=f,e=target(),near=target('near',2),friend=target('friend',2,'minecraft:player'),hidden=target('hidden',2.2);
 f.blocked.add(2.2);d.getEntities=opts=>opts.type?[]:[e,near,friend,hidden,near];
 assert.equal(air.onHurt(p,e,s,g,7,10),true);
 assert.equal(s.s,41,order+' total stamina');assert.deepEqual(dmg,[['z',4],['near',4]]);
 assert.equal(air.onHurt(p,e,s,g,7,11),false,'one per airtime');
 p.isOnGround=true;air.tick(p,12);p.isOnGround=false;assert.equal(air.onHurt(p,e,s,g,7,13),true,'landing rearms');
}
{
 const {p,s,g,target,air}=fixture(),e=target();s.s=8;
 assert.equal(air.onHurt(p,e,s,g,5,2),false);assert.equal(s.s,8);
}
for(const change of [f=>f.p.isSneaking=true,f=>f.p.getVelocity=()=>({y:.1}),f=>f.p.isSwimming=true,f=>f.p.getComponent=()=>({}),f=>f.s.busy=true,f=>f.g.kind='盾',f=>f.p.getGameMode=()=> 'spectator',f=>f.d.getEntities=()=>{throw Error()}]){
 const f=fixture(),e=f.target();change(f);assert.equal(f.air.onHurt(f.p,e,f.s,f.g,5,3),false);assert.equal(f.s.s,50);
}
{
 const f=fixture(),e=f.target();f.air.clear(f.p.id);assert.equal(f.air.onHurt(f.p,e,f.s,f.g,5,3),false,'airborne join requires landing');
}
{
 const f=fixture(),e=f.target();f.p.getGameMode=()=> 'creative';f.s.s=0;
 assert.equal(f.air.onHurt(f.p,e,f.s,f.g,5,3),true);assert.equal(f.s.s,0);assert.equal(f.dmg.length,1);
}
console.log('Air strike: hit ordering, cost, landing, targeting, safety (mocked)');
