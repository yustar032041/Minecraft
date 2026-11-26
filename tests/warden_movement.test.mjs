import assert from 'node:assert/strict';
import {steerWarden} from '../Hakkai_v7.1.0/BehaviorPack/scripts/warden_movement.js';
import {updateWardenAppearance} from '../Hakkai_v7.1.0/BehaviorPack/scripts/warden_appearance.js';
function fixture(){
 const impulses=[],effects=[],removed=[],solid={typeId:'hakkai:clockstone',isAir:false,isLiquid:false,isWaterlogged:false},air={typeId:'minecraft:air',isAir:true,isLiquid:false,isWaterlogged:false};
 const p={id:'p',typeId:'minecraft:player',isValid:true,location:{x:0,y:80,z:8}};
 const dim={id:'hakkai:warden_arena',isChunkLoaded:()=>true,getBlock:q=>Math.floor(q.y)===79?solid:air,getPlayers:()=>[p]};
 const e={isValid:true,location:{x:0,y:80,z:0},dimension:dim,isOnGround:true,getVelocity:()=>({x:0,y:0,z:0}),applyImpulse:v=>impulses.push(v),setProperty:()=>{},addEffect:(...v)=>effects.push(v),removeEffect:id=>removed.push(id)};
 return {e,s:{},p,dim,impulses,effects,removed};
}
{
 const f=fixture();assert.equal(steerWarden(f.e,f.s,0,0),true);assert.equal(steerWarden(f.e,f.s,0,1),false);assert.equal(steerWarden(f.e,f.s,0,12),true);
 assert.notDeepEqual(f.impulses[0],f.impulses[1],'changes direction');assert.ok(f.impulses.every(v=>Math.abs(v.y)<1e-8&&Math.hypot(v.x,v.z)<=.091));
}
for(const reason of ['unloaded','blocked','no-floor','too-fast','idle','peaceful','no-player']){
 const f=fixture();let opts={};
 if(reason==='unloaded')f.dim.isChunkLoaded=()=>false;
 if(reason==='blocked')f.dim.getBlock=()=>({isAir:false,isSolid:true,typeId:'minecraft:stone'});
 if(reason==='no-floor')f.dim.getBlock=()=>({isAir:true,isSolid:false,typeId:'minecraft:air'});
 if(reason==='too-fast')f.e.getVelocity=()=>({x:1,z:0});
 if(reason==='idle')opts={idle:false};if(reason==='peaceful')opts={peaceful:true};if(reason==='no-player')f.dim.getPlayers=()=>[];
 assert.equal(steerWarden(f.e,f.s,0,0,opts),false,reason);assert.equal(f.impulses.length,0);
}
{
 const f=fixture();f.e.isOnGround=false;f.e.location.y=84;f.s.takeoffAt=0;
 assert.equal(steerWarden(f.e,f.s,1,0),true);assert.equal(steerWarden(f.e,f.s,1,5),false);assert.equal(steerWarden(f.e,f.s,1,6),true);
 assert.ok(f.impulses.every(v=>Math.hypot(v.x,v.z)<=.231));assert.ok(f.impulses.some(v=>v.y>0)&&f.impulses.some(v=>v.y<0));
}
{
 const f=fixture();updateWardenAppearance(f.e,f.s,1,0);updateWardenAppearance(f.e,f.s,1,100,{idle:true});
 f.e.isOnGround=false;f.e.location.y=80.6;assert.equal(updateWardenAppearance(f.e,f.s,1,112,{idle:true}),false,'phase two may warn in low flight');
 f.e.location.y=83;assert.equal(updateWardenAppearance(f.e,f.s,1,113,{idle:true}),true,'high flight blocks attacks');assert.equal(f.s.flightUnsafe,true);assert.equal(f.removed.length,0);
 f.e.location.y=85.6;updateWardenAppearance(f.e,f.s,1,114,{idle:true});assert.ok(f.removed.includes('levitation'),'ascent bounded below ceiling');
}
console.log('Warden movement: directional steering, frequency, obstacle/player bounds, two-form low/high flight (mocked)');
// Stable API has no isSolid: arena floor may be checked by its known full
// block identity, but arbitrary partial or waterlogged blocks remain unsafe.
for(const floor of [
 {typeId:'minecraft:stone_slab',isAir:false,isLiquid:false,isWaterlogged:false},
 {typeId:'hakkai:clockstone',isAir:false,isLiquid:false,isWaterlogged:true},
 {typeId:'hakkai:clockstone',isAir:false,isLiquid:false},
 {typeId:'hakkai:clockstone',isAir:false,isLiquid:true,isWaterlogged:false}
]){
 const f=fixture(),original=f.dim.getBlock;f.dim.getBlock=q=>q.y===79?floor:original(q);
 assert.equal(steerWarden(f.e,f.s,0,0),false);assert.equal(f.impulses.length,0);
}
