import assert from 'node:assert/strict';
import {setupWardenModes,WARDEN_MODE_DAMAGE} from '../Hakkai_v7.1.0/BehaviorPack/scripts/warden_modes.js';
import {bladeDirection} from '../Hakkai_v7.1.0/BehaviorPack/scripts/warden_swords.js';
function fixture(phase=4){
 let turn=0;const order=phase===1?['flight']:phase===3?['sword']:['flight','sword','flight_sword'];
 // Isolate each physical mode from the adaptive policy in this engine test.
 const decision={mode:(_brain,_phase,_situation,opts)=>opts.current==='traditional'?order[(turn++)%order.length]:opts.current};
 const parts=[],hits=[],moves=[],poses=[],messages=[],props=[],held=[];
 let wall=false,loaded=true,visual=true;
 const d={isChunkLoaded:()=>loaded,getBlock:q=>Math.floor(q.y)<80?{typeId:'hakkai:warden_arena_stone',isAir:false,isLiquid:false,isWaterlogged:false}:{isAir:true},getBlockFromRay:()=>wall?{}:undefined,
  spawnParticle(id,p){if(!visual)throw Error('particle');parts.push({id,p});},getPlayers:()=>[p]};
 const p={id:'p',isValid:true,typeId:'minecraft:player',location:{x:0,y:80,z:0},sendMessage:m=>messages.push(m),applyDamage:(n,src)=>{hits.push({n,src});return true;},setOnFire:()=>{}};
 const boss={id:'b',typeId:'hakkai:time_warden',isValid:true,location:{x:-6,y:80,z:-6},dimension:d,get isOnGround(){return this.location.y<=80.01;},
  setProperty:(k,v)=>props.push([k,v]),playAnimation:id=>poses.push(id),clearVelocity:()=>{},addEffect:()=>{},tryTeleport(at){moves.push({...at});this.location={...at};return true;}};
 const swords={acquire:(e,i)=>{held.push(['acquire',i]);return true;},release:()=>held.push(['release'])};
 const ctrl=setupWardenModes({validPlayer:p=>p.isValid,isEvading:()=>false,damageCause:'attack',swords,decision}),state={};
 return {d,p,boss,ctrl,state,parts,hits,moves,poses,messages,props,held,setWall:v=>wall=v,setLoaded:v=>loaded=v,setVisual:v=>visual=v,tick(t,opts={}){return ctrl.tick(boss,state,phase,t,opts);}};
}
{
 const f=fixture();let flight=0,sword=0,airSword=0,maximum=0,seen=new Set();
 for(let t=0;t<3000;t++){
  const r=f.tick(t);if(r.mode==='flight')flight++;if(r.mode==='sword')sword++;if(r.mode==='flight_sword')airSword++;
  maximum=Math.max(maximum,f.boss.location.y);seen.add(r.mode);
 }
 assert.ok(flight>=600,`long flight: ${flight}`);assert.ok(sword>=300,`sword mode ${sword}`);assert.ok(airSword>=600,`air sword mode ${airSword}`);
 assert.ok(maximum>85&&maximum<92);assert.ok(f.moves.every(p=>Math.abs(p.x)<=12.8&&Math.abs(p.z)<=12.8&&p.y>=80&&p.y<=91.8));
 assert.ok(f.parts.some(x=>x.id==='hakkai:warden_hellfire'),'visible fire hazard');
 assert.ok(f.parts.some(x=>x.id==='hakkai:warden_front_moon'),'flying slash');
 assert.ok(f.hits.some(x=>x.n===WARDEN_MODE_DAMAGE.lightning)&&f.hits.some(x=>x.n===WARDEN_MODE_DAMAGE.fire),'lightning and fire inflict damage');
 assert.ok(f.held.some(([x])=>x==='acquire'),'sword mode borrows a blade');assert.ok(f.poses.includes('animation.hakkai.warden_roll')&&f.poses.includes('animation.hakkai.warden_leap'));
 for(const name of ['blade_ready','blade_cut','blade_reverse','blade_aerial'])assert.ok(f.poses.includes('animation.hakkai.warden_'+name),name);
 assert.ok(f.props.some(([k,v])=>k==='hakkai:flying'&&v===true));
}
{
 const f=fixture(1);for(let t=0;t<181;t++)f.tick(t,{busy:true});assert.equal(f.moves.length,0,'special waits for the old attack slots');
 for(let t=181;t<230;t++)f.tick(t);assert.ok(f.moves.length>0);
 const count=f.hits.length;f.tick(230,{paused:true});for(let t=231;t<450;t++)f.tick(t,{paused:true});assert.equal(f.hits.length,count,'pause removes projectiles and hazards');
}
{
 const f=fixture(1);f.setLoaded(false);for(let t=0;t<280;t++)f.tick(t);assert.equal(f.moves.length,0,'no motion in unloaded space');assert.equal(f.hits.length,0);
}
{
 const f=fixture(1);f.setVisual(false);for(let t=0;t<500;t++)f.tick(t);assert.equal(f.hits.length,0,'no projectile or zone damage without visual');
}
{
 const f=fixture(1);f.setWall(true);for(let t=0;t<600;t++)f.tick(t);assert.equal(f.hits.length,0,'blocked projectiles never hit through walls');
}
{
 const f=fixture(1);for(let t=0;t<220;t++)f.tick(t);const count=f.hits.length;
 const r=f.tick(500);assert.equal(r.active,false,'stale actions are cancelled after a tick gap');assert.equal(f.hits.length,count);
}
{
 const base={x:1,y:0,z:0};const v=Array.from({length:8},(_,i)=>bladeDirection(i,2,1,5,base).z.toFixed(4));assert.equal(new Set(v).size,8,'eight individual trajectories');
 assert.notDeepEqual(bladeDirection(0,2,2,5,base),bladeDirection(0,3,2,5,base),'later form adds an alternate');
}
console.log('Warden enhanced modes, bounded flight, visual attacks, pause, walls, eight sword trajectories (mocked)');
