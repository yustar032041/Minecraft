import assert from 'node:assert/strict';
import {WARDEN_EXTRA,inWardenWarning,setupWardenBoss} from '../Hakkai_v7.1.0/BehaviorPack/scripts/warden_boss.js';
import {GameMode,Difficulty} from '@minecraft/server';
assert.equal(WARDEN_EXTRA.length,5);assert.ok(WARDEN_EXTRA.every(x=>x.length===3));assert.equal(new Set(WARDEN_EXTRA.flat().map(x=>x.attack)).size,15);
function fixture(phase=0){
 const hits=[],messages=[],particles=[];let players=[];
 const dim={id:'hakkai:warden_arena',getEntities:()=>[boss],getPlayers:()=>players,spawnParticle:(...x)=>particles.push(x)};
 function player(id){return {id,isValid:true,typeId:'minecraft:player',location:{x:0,y:80,z:-3},dimension:dim,isSneaking:true,getGameMode:()=>GameMode.Survival,sendMessage:m=>messages.push([id,m]),applyDamage:n=>hits.push([id,n]),addEffect:()=>{},getComponent:()=>undefined};}
 const p=player('p');players=[p];const health={currentValue:[5000,3990,2990,1990,990][phase],effectiveMax:5000,setCurrentValue(v){this.currentValue=v;}};
 const boss={id:'boss',isValid:true,typeId:'hakkai:time_warden',location:{x:0,y:80,z:-6},dimension:dim,getDynamicProperty:()=>undefined,setDynamicProperty:()=>{},getComponent:()=>health};
 const system={currentTick:0},world={getDifficulty:()=>Difficulty.Normal,getAllPlayers:()=>players};
 const ctrl=setupWardenBoss({world,system,property:()=>{},report:(_,e)=>{throw e;},spendParry:()=>true});
 const tick=t=>{system.currentTick=t;ctrl.tick(p,t);};
 return {p,boss,dim,health,ctrl,system,world,hits,messages,particles,player,tick,setPlayers:q=>players=q};
}
// All new shapes match their advertised safe/unsafe boundaries.
for(const group of WARDEN_EXTRA)for(const a of group){
 const o={x:0,y:80,z:0};assert.equal(inWardenWarning({x:0,y:84,z:0},o,a),false);
 if(a.shape==='line'){assert.equal(inWardenWarning({x:a.width,y:80,z:a.radius},o,a),true);assert.equal(inWardenWarning({x:a.width+.1,y:80,z:0},o,a),false);}
 if(a.shape==='square'){assert.equal(inWardenWarning({x:a.radius,y:80,z:a.radius},o,a),true);assert.equal(inWardenWarning({x:a.radius+.1,y:80,z:0},o,a),false);}
 if(a.shape==='twin'){assert.equal(inWardenWarning({x:a.offset,y:80,z:0},o,a),true);assert.equal(inWardenWarning(o,o,a),false);}
}
function reachThird(f){for(const t of [0,80,120,220,260,360])f.tick(t);}
{
 const f=fixture();reachThird(f);assert.ok(f.messages.some(x=>x[1].includes('時の三連撃')));f.hits.length=0;
 f.tick(400);f.tick(420);f.tick(440);assert.deepEqual(f.hits,[['p',6],['p',6],['p',6]],'each warned strike applies once');
 assert.equal(f.messages.filter(x=>x[1].includes('次の一撃')).length,2);
}
{
 const f=fixture();reachThird(f);f.hits.length=0;f.tick(400);f.system.currentTick=412;
 assert.equal(f.ctrl.onMeleeParry({damagingEntity:f.p,hitEntity:f.boss}),true);f.tick(420);f.tick(440);assert.deepEqual(f.hits,[['p',6]],'mid-combo parry stops remaining strikes');
}
{
 const f=fixture();reachThird(f);f.hits.length=0;f.dim.spawnParticle=()=>{throw Error('missing particle')};f.tick(400);f.tick(420);f.tick(440);assert.deepEqual(f.hits,[['p',6]],'missing follow-up warning aborts remaining hits');
}
{
 const f=fixture(4),q=f.player('q');f.setPlayers([f.p,q]);
 f.p.getComponent=id=>id==='minecraft:inventory'?{container:{size:2,getItem:i=>i===1?{typeId:'hakkai:fushi_totem'}:undefined}}:undefined;
 let warning=-1;for(let t=0;t<4000;t++){f.tick(t);if(f.messages.some(x=>x[1].includes('月光の審判'))){warning=t;break;}}
 assert.ok(warning>=0);f.hits.length=0;for(let t=warning+1;t<=warning+40;t++)f.tick(t);
 assert.deepEqual(f.hits,[['p',10],['q',20]],'ward applies only to bearer and does not consume totem');
 assert.ok(f.messages.some(x=>x[0]==='p'&&x[1].includes('和らげた')));
}
{
 const f=fixture();reachThird(f);f.hits.length=0;f.tick(400);f.tick(421);f.tick(440);assert.deepEqual(f.hits,[['p',6]],'late tick cancels stale follow-up');
}
// Every phase cycles through all three additional, actually scheduled moves.
for(let phase=0;phase<5;phase++){
 const f=fixture(phase);
 for(let t=0;t<=(phase===4?4500:1100);t++)f.tick(t);
 for(const attack of WARDEN_EXTRA[phase])assert.ok(f.messages.some(([,m])=>m.includes(attack.attack)),`${phase}: ${attack.attack}`);
}
console.log('Expanded warden: shapes, warned multi-strike, parry, failures, totem ward and stale events (mocked)');
