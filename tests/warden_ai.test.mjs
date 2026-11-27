import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createWardenBrain,observeWarden,wardenSituation,recordWardenHurt,recordWardenParry,chooseWardenTarget,chooseWardenMode,chooseWardenAttack,rememberWardenAttack,chooseSwordAction} from '../Hakkai_v7.1.0/BehaviorPack/scripts/warden_ai.js';
import {setupWardenModes} from '../Hakkai_v7.1.0/BehaviorPack/scripts/warden_modes.js';
const boss={id:'boss',location:{x:0,y:80,z:0}};
const player=(id,x,z=0)=>({id,isValid:true,typeId:'minecraft:player',location:{x,y:80,z}});
function situation(b,people,t=0){observeWarden(b,boss,people,t);return wardenSituation(b,boss,people,t);}
test('mode utility responds to distance, ranged pressure, movement and groups while respecting phase gates',()=>{
 const near=player('n',2),far=player('f',15);
 const closeBrain=createWardenBrain(7),close=situation(closeBrain,[near]);
 const farBrain=createWardenBrain(7);observeWarden(farBrain,boss,[far],0);recordWardenHurt(farBrain,far,20,0,'projectile');const distant=wardenSituation(farBrain,boss,[far],0);
 assert.equal(chooseWardenMode(closeBrain,4,close),'sword');
 assert.equal(chooseWardenMode(farBrain,4,distant),'flight');
 assert.equal(chooseWardenMode(createWardenBrain(1),0,distant),'traditional');
 assert.equal(chooseWardenMode(createWardenBrain(1),2,distant),'traditional');
 const a=player('a',6),b=player('b',6,1),brain=createWardenBrain(11);observeWarden(brain,boss,[a,b],0);a.location.z+=4;b.location.z+=4;observeWarden(brain,boss,[a,b],10);
 const group=wardenSituation(brain,boss,[a,b],10);assert.ok(group.fast>=1);assert.equal(chooseWardenMode(brain,4,group),'flight_sword');
});
test('combat memory favours the player who recently dealt damage and fades; parries and dodges are observed',()=>{
 const a=player('a',5),b=player('b',5,1),brain=createWardenBrain(8);observeWarden(brain,boss,[a,b],0);
 recordWardenHurt(brain,b,100,1,'projectile');recordWardenHurt(brain,b,100,2,'projectile');
 let s=wardenSituation(brain,boss,[a,b],3);assert.equal(chooseWardenTarget(brain,s).id,'b');assert.equal(s.ranged,1);
 recordWardenParry(brain,a,4);observeWarden(brain,boss,[a,b],5,{isEvading:p=>p.id==='a'});
 s=wardenSituation(brain,boss,[a,b],5);assert.ok(s.profiles.find(p=>p.player.id==='a').dodges>=2);
 const earlier=s.profiles.find(p=>p.player.id==='b').threat;s=wardenSituation(brain,boss,[a,b],500);assert.ok(s.profiles.find(p=>p.player.id==='b').threat<earlier/5);assert.equal(s.ranged,0);
 observeWarden(brain,boss,[a,b],800);assert.equal(wardenSituation(brain,boss,[a,b],800).profiles.find(p=>p.player.id==='a').dodges,0,'long loading gaps reset volatile memories');
});
test('invalid observations and damage never create threats or poison selection',()=>{
 const brain=createWardenBrain(),bad=player('bad',NaN),good=player('good',5);
 assert.doesNotThrow(()=>observeWarden(brain,boss,null,0));
 observeWarden(brain,boss,[bad,good,{isValid:true}],1);
 for(const amount of [NaN,Infinity,-1,0])recordWardenHurt(brain,good,amount,2,'projectile');
 const s=wardenSituation(brain,boss,[bad,good,{isValid:true}],2);
 assert.equal(s.profiles.length,1);assert.equal(s.pressure,0);assert.equal(chooseWardenTarget(brain,s),good);
});
test('attacks and held sword technique react to observed mobility rather than fixed indices',()=>{
 const idle=player('p',3),fast=player('p',12),brain1=createWardenBrain(42),brain2=createWardenBrain(42);
 const close=situation(brain1,[idle]);observeWarden(brain2,boss,[fast],0);fast.location.z=3;observeWarden(brain2,boss,[fast],10);const moving=wardenSituation(brain2,boss,[fast],10);
 const patterns=[{attack:'circle',shape:'circle',radius:4},{attack:'bolt',shape:'line',motion:'bolt',radius:8,width:1},{attack:'sweep',shape:'circle',motion:'sweep',radius:6,width:1}];
 assert.equal(chooseWardenAttack(brain1,patterns,close,idle).attack,'circle');
 assert.equal(chooseWardenAttack(brain2,patterns,moving,fast).attack,'bolt');
 assert.equal(chooseSwordAction(close,idle),'combo');assert.equal(chooseSwordAction(moving,fast),'wave');
 const choices=new Set();for(let i=0;i<30;i++){const a=chooseWardenAttack(brain1,patterns,close,idle);choices.add(a.attack);rememberWardenAttack(brain1,a);}assert.ok(choices.size>1,'recent attack memory avoids immediate repetition');
});
test('actual mode controller reacts to player repositioning, instead of always entering the same mode',()=>{
 function run(startX){
  const player1=player('p',startX),positions=[],props=[],messages=[];
  const d={getPlayers:()=>[player1],getBlockFromRay:()=>undefined,isChunkLoaded:()=>true,getBlock:p=>p.y<80?{typeId:'minecraft:stone',isAir:false,isLiquid:false,isWaterlogged:false}:{isAir:true},spawnParticle:()=>{}};
  const e={id:'boss',isValid:true,location:{x:0,y:80,z:0},dimension:d,get isOnGround(){return this.location.y<=80.01},clearVelocity:()=>{},tryTeleport(p){positions.push(p);this.location={...p};return true;},setProperty:(k,v)=>props.push([k,v]),playAnimation:()=>{},addEffect:()=>{}};
  player1.sendMessage=m=>messages.push(m);player1.applyDamage=()=>true;
  const sword={release:()=>{},acquire:()=>true},ctrl=setupWardenModes({validPlayer:p=>p.isValid,swords:sword,damageCause:'attack'}),state={};
  let observed;for(let t=0;t<180;t++){const r=ctrl.tick(e,state,4,t);if(r.active&&!observed)observed=r.mode;}
  return {observed,props,messages};
 }
 assert.equal(run(3).observed,'sword');assert.equal(run(13).observed,'flight');
});
