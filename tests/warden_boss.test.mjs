import assert from 'node:assert/strict';
import {wardenPhase,WARDEN_PHASES,WARDEN_ALTERNATES,WARDEN_DAMAGE_MULTIPLIER,inWardenWarning,setupWardenBoss} from '../Hakkai_v7.1.0/BehaviorPack/scripts/warden_boss.js';
import {Difficulty,GameMode} from '@minecraft/server';
import {setupCombatGuard} from '../Hakkai_v7.1.0/BehaviorPack/scripts/combat_guard.js';
import {setupCombatParry} from '../Hakkai_v7.1.0/BehaviorPack/scripts/combat_parry.js';
for(const [hp,p] of [[5000,0],[4001,0],[4000,1],[3000,2],[2000,3],[1000,4],[0,4]])assert.equal(wardenPhase(hp),p,`hp=${hp}`);
assert.equal(WARDEN_PHASES.length,5);
function fixture(){
 const damage=[],messages=[],effects=[],particles=[],props=[],parryCosts=[];
 const dim={id:'hakkai:warden_arena',getEntities:()=>[boss],getPlayers:()=>[p],spawnParticle:(...x)=>particles.push(x)};
 const p={id:'p',isValid:true,typeId:'minecraft:player',location:{x:0,y:80,z:5},dimension:dim,getGameMode:()=>GameMode.Survival,
 sendMessage:s=>messages.push(s),applyDamage:n=>damage.push(n),addEffect:(e,n)=>effects.push([e,n])};
 const health={currentValue:5000,effectiveMax:5000,setCurrentValue(v){this.currentValue=v;}};
 const bossProps=new Map();
 const boss={getDynamicProperty:k=>bossProps.get(k),setDynamicProperty:(k,v)=>bossProps.set(k,v),id:'boss',typeId:'hakkai:time_warden',isValid:true,location:{x:0,y:80,z:-6},dimension:dim,getComponent:()=>health};
 const system={currentTick:0};const world={difficulty:Difficulty.Normal,getDifficulty(){return this.difficulty;},getAllPlayers:()=>[p]};
 const ctrl=setupWardenBoss({world,system,property:(...v)=>props.push(v),report:()=>assert.fail('unexpected error'),spendParry:(p,cost)=>{parryCosts.push([p.id,cost]);return true;}});
 return {ctrl,p,boss,dim,world,system,health,damage,messages,effects,particles,props,parryCosts};
}
{
 const f=fixture();f.health.currentValue=4500;f.ctrl.tick(f.p,0);f.ctrl.tick(f.p,40);
 assert.equal(f.health.currentValue,4524,'twelve HP per second');
 f.ctrl.tick(f.p,40);assert.equal(f.health.currentValue,4524,'no duplicate multiplayer ticks');
 f.ctrl.tick(f.p,80);assert.equal(f.particles.filter(([id])=>id==='hakkai:warning_marker').length,20);assert.equal(f.damage.length,0);
 f.ctrl.tick(f.p,120);assert.deepEqual(f.damage,[9*WARDEN_DAMAGE_MULTIPLIER]);assert.equal(f.effects[0][0],'slowness');
}
for(let phase=0;phase<5;phase++){
 const f=fixture();f.health.currentValue=[5000,3990,2990,1990,990][phase];
 f.ctrl.tick(f.p,0);f.ctrl.tick(f.p,80);f.ctrl.tick(f.p,120);
 assert.equal(f.damage[0],WARDEN_PHASES[phase].damage*WARDEN_DAMAGE_MULTIPLIER);assert.ok(f.messages.some(m=>m.includes(WARDEN_PHASES[phase].name)));
}
{
 const f=fixture();f.ctrl.tick(f.p,0);f.ctrl.tick(f.p,80);f.p.location.x=9;f.ctrl.tick(f.p,120);assert.equal(f.damage.length,0,'dodge leaves marked area');
}
{
 const f=fixture();f.ctrl.tick(f.p,0);f.ctrl.tick(f.p,80);f.world.difficulty=Difficulty.Peaceful;f.ctrl.tick(f.p,120);assert.equal(f.damage.length,0);
}
{
 const f=fixture();f.ctrl.onDeath({deadEntity:f.boss,damageSource:{damagingEntity:f.p}});
 assert.equal(f.props[0][1],'time_warden_clear');
}
// All explicitly warned players in the circle are affected, while failed
// message delivery and people arriving after the warning remain safe.
{
 const f=fixture(),hits=[];
 const make=(id,sendMessage=()=>{})=>({...f.p,id,sendMessage,applyDamage:n=>hits.push(id),addEffect:()=>{}});
 const second=make('second'),failed=make('failed',()=>{throw Error('offline');}),late=make('late');
 let players=[f.p,second,failed];f.dim.getPlayers=()=>players;f.world.getAllPlayers=()=>players;
 f.ctrl.tick(f.p,0);f.ctrl.tick(f.p,80);players=[...players,late];f.ctrl.tick(f.p,120);
 assert.deepEqual(hits,['second']);assert.deepEqual(f.damage,[9*WARDEN_DAMAGE_MULTIPLIER]);
}
// Phase is monotonic across controller reloads even after regeneration.
{
 const f=fixture();f.health.currentValue=900;f.ctrl.tick(f.p,0);
 assert.equal(f.boss.getDynamicProperty('hakkai:warden_phase'),4);
 f.health.currentValue=5000;
 const ctrl=setupWardenBoss({world:f.world,system:{},property:()=>{},report:()=>assert.fail('unexpected error')});
 ctrl.tick(f.p,100);ctrl.tick(f.p,180);ctrl.tick(f.p,220);
 assert.equal(f.damage[0],WARDEN_PHASES[4].damage*WARDEN_DAMAGE_MULTIPLIER);
}
{
 const f=fixture();f.dim.spawnParticle=()=>{throw Error('marker missing')};
 f.ctrl.tick(f.p,0);f.ctrl.tick(f.p,80);f.ctrl.tick(f.p,120);
 assert.equal(f.damage.length,0,'no attack without a visible marker');
}
{
 const f=fixture();f.ctrl.tick(f.p,0);f.ctrl.tick(f.p,80);f.ctrl.tick(f.p,200);
 assert.equal(f.damage.length,0,'stale arena telegraph must not damage on reload');
}
// Parry requires a warned, endangered, sneaking melee attacker very close
// to the boss, in the final 8 ticks. It interrupts the shared attack and
// prevents regeneration for a full 200 ticks without catch-up healing.
{
 const f=fixture();f.p.location.z=-3;f.p.isSneaking=true;f.health.currentValue=4500;
 f.ctrl.tick(f.p,0);f.ctrl.tick(f.p,80);const hp=f.health.currentValue;
 f.system.currentTick=111;assert.equal(f.ctrl.onMeleeParry({damagingEntity:f.p,hitEntity:f.boss}),false,'too early');
 f.p.isSneaking=false;f.system.currentTick=112;assert.equal(f.ctrl.onMeleeParry({damagingEntity:f.p,hitEntity:f.boss}),false,'must sneak');
 f.p.isSneaking=true;assert.equal(f.ctrl.onMeleeParry({damagingEntity:f.p,hitEntity:f.boss}),true);
 assert.deepEqual(f.parryCosts,[['p',15]]);
 assert.equal(f.ctrl.onMeleeParry({damagingEntity:f.p,hitEntity:f.boss}),false,'one parry per warning');
 f.ctrl.tick(f.p,120);assert.equal(f.damage.length,0);
 for(const t of [160,200,240,280,312,320])f.ctrl.tick(f.p,t);
 assert.equal(f.health.currentValue,hp,'no healing during the ten second window');
 f.ctrl.tick(f.p,340);assert.equal(f.health.currentValue,hp+12,'healing resumes without a burst');
 assert.ok(f.messages.some(m=>m.includes('パリィ成功')));
}
{
 const f=fixture();f.p.location.z=-3;f.p.isSneaking=true;f.ctrl.tick(f.p,0);f.ctrl.tick(f.p,80);f.system.currentTick=112;
 const stranger={...f.p,id:'stranger'};
 assert.equal(f.ctrl.onMeleeParry({damagingEntity:stranger,hitEntity:f.boss}),false,'not warned');
 f.p.location.x=10;assert.equal(f.ctrl.onMeleeParry({damagingEntity:f.p,hitEntity:f.boss}),false,'too far and outside the mark');
 f.p.location.x=0;f.world.difficulty=Difficulty.Peaceful;
 assert.equal(f.ctrl.onMeleeParry({damagingEntity:f.p,hitEntity:f.boss}),false,'peaceful');
}
{
 const f=fixture(),hits=[];f.p.location.z=-3;f.p.isSneaking=true;
 const q={...f.p,id:'q',applyDamage:n=>hits.push(n),sendMessage:()=>{},addEffect:()=>{}};
 f.dim.getPlayers=()=>[f.p,q];f.world.getAllPlayers=()=>[f.p,q];
 f.ctrl.tick(f.p,0);f.ctrl.tick(f.p,80);f.system.currentTick=115;
 assert.equal(f.ctrl.onMeleeParry({damagingEntity:q,hitEntity:f.boss}),true);
 f.ctrl.tick(f.p,120);assert.deepEqual(hits,[]);assert.deepEqual(f.damage,[],'shared attack is interrupted');
}
{
 const f=fixture();f.p.location.z=-3;f.p.isSneaking=true;
 const ctrl=setupWardenBoss({world:f.world,system:f.system,property:()=>{},report:()=>{},spendParry:()=>false});
 ctrl.tick(f.p,0);ctrl.tick(f.p,80);f.system.currentTick=112;
 assert.equal(ctrl.onMeleeParry({damagingEntity:f.p,hitEntity:f.boss}),false,'insufficient stamina cannot parry');
 ctrl.tick(f.p,120);assert.equal(f.damage[0],9*WARDEN_DAMAGE_MULTIPLIER,'failed parry must not cancel attack');
}
// A roll protects only its owner, including the scripted status effect.
{
 const f=fixture(),hits=[],debuffs=[];
 const q={...f.p,id:'q',sendMessage:()=>{},applyDamage:n=>hits.push(n),addEffect:x=>debuffs.push(x)};
 f.dim.getPlayers=()=>[f.p,q];f.world.getAllPlayers=()=>[f.p,q];
 const ctrl=setupWardenBoss({world:f.world,system:f.system,property:()=>{},report:()=>{},isEvading:p=>p.id==='p'});
 ctrl.tick(f.p,0);ctrl.tick(f.p,80);ctrl.tick(f.p,120);
 assert.deepEqual(f.damage,[]);assert.deepEqual(f.effects,[]);assert.deepEqual(hits,[9*WARDEN_DAMAGE_MULTIPLIER]);assert.deepEqual(debuffs,['slowness']);
}
// The release parry is per-player: other warned players still take the hit.
// The queued boss callback pauses regeneration without moving the boss.
{
 const f=fixture(),hits=[],effects=[];f.p.location.z=-3;f.health.currentValue=4500;
 Object.assign(f.p,{selectedSlotIndex:0,isSneaking:true,isSwimming:false,getViewDirection:()=>({x:0,y:0,z:-1}),playAnimation:()=>{},playSound:()=>{}});
 const q={...f.p,id:'q',sendMessage:()=>{},applyDamage:n=>hits.push(n),addEffect:e=>effects.push(e)};
 f.dim.getPlayers=()=>[f.p,q];f.world.getAllPlayers=()=>[f.p,q];
 const gear={id:'gear_1',kind:'剣'},s={s:40},guard=setupCombatGuard({notice:()=>{}});
 let ctrl;const parry=setupCombatParry({guard,onSuccess:({attacker,at})=>ctrl.stagger(attacker,at)});
 ctrl=setupWardenBoss({world:f.world,system:f.system,property:()=>{},report:()=>{},tryParry:(p,e)=>p.id==='p'&&parry.tryHit(p,gear,s,{cause:'entityAttack',damagingEntity:e},f.system.currentTick)});
 ctrl.tick(f.p,0);ctrl.tick(f.p,80);guard.tick(f.p,gear,s,114);parry.tick(f.p,gear,s,114);
 f.p.isSneaking=false;parry.tick(f.p,gear,s,118);f.system.currentTick=120;ctrl.tick(f.p,120);
 assert.deepEqual(f.damage,[]);assert.deepEqual(f.effects,[]);assert.deepEqual(hits,[9*WARDEN_DAMAGE_MULTIPLIER]);assert.deepEqual(effects,['slowness']);assert.equal(s.s,20);
 const hp=f.health.currentValue;parry.flush(121);ctrl.tick(f.p,160);assert.equal(f.health.currentValue,hp,'release parry pauses warden healing');
}
// Distinct patterns are alternated within each phase. Boundary tests describe
// the same fixed geometry used by the markers and damage checks.
for(let phase=0;phase<4;phase++){
 const f=fixture();f.health.currentValue=[5000,3990,2990,1990,990][phase];
 f.ctrl.tick(f.p,0);f.ctrl.tick(f.p,80);f.ctrl.tick(f.p,120);
 f.ctrl.tick(f.p,240);
 const a=WARDEN_ALTERNATES[phase];assert.ok(f.messages.some(m=>m.includes(a.attack)));
 assert.ok(f.particles.some(([id])=>id==='hakkai:warning_marker'));
 const aim={...f.p.location};
 if(a.shape==='cross'){
  assert.ok(inWardenWarning(aim,aim,a));
  assert.equal(inWardenWarning({x:aim.x+2,y:aim.y,z:aim.z+2},aim,a),false);
  assert.ok(inWardenWarning({x:aim.x+a.radius,y:aim.y,z:aim.z},aim,a));
 }else{
  assert.equal(inWardenWarning(aim,aim,a),false);
  assert.ok(inWardenWarning({x:aim.x+3,y:aim.y,z:aim.z},aim,a));
  f.p.location.x+=3;
 }
 assert.equal(inWardenWarning({x:aim.x,y:aim.y+4,z:aim.z},aim,a),false);
 f.ctrl.tick(f.p,280);assert.equal(f.damage.at(-1),a.damage*WARDEN_DAMAGE_MULTIPLIER);
}
console.log('Prototype warden: phase boundaries, regeneration, warning/dodge, peaceful and completion OK (simulated)');
// Refused damage and API errors must not leave a standalone debuff.
for(const fail of [()=>false,()=>{throw Error('not available');}]){
 const f=fixture();f.p.applyDamage=fail;f.ctrl.tick(f.p,0);f.ctrl.tick(f.p,80);f.ctrl.tick(f.p,120);assert.deepEqual(f.effects,[]);
}

// Successful attacks retain a full two-second warning but recover in 40 ticks.
{
 const f=fixture();for(let t=0;t<=200;t++)f.ctrl.tick(f.p,t);
 assert.ok(f.messages.some(m=>m.includes(WARDEN_ALTERNATES[0].attack)), 'second warning by tick 160');
 assert.deepEqual(f.damage,[9*WARDEN_DAMAGE_MULTIPLIER,8*WARDEN_DAMAGE_MULTIPLIER]);
}
