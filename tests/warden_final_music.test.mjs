import assert from 'node:assert/strict';
import {setupWardenBoss,wardenPatterns,WARDEN_HEAL_PER_SECOND} from '../Hakkai_v7.1.0/BehaviorPack/scripts/warden_boss.js';
import {GameMode,Difficulty} from '@minecraft/server';
const d={id:'hakkai:warden_arena',isChunkLoaded:()=>true,getBlock:()=>({isAir:true}),getBlockFromRay:()=>undefined,spawnParticle:()=>{}};
const hp={currentValue:5000,effectiveMax:5000,setCurrentValue(v){this.currentValue=v;}};
const props=new Map(),visual=new Map();let failures=0;
const boss={id:'boss',isValid:true,typeId:'hakkai:time_warden',location:{x:0,y:80,z:0},dimension:d,getComponent:()=>hp,getDynamicProperty:k=>props.get(k),setDynamicProperty:(k,v)=>{if(failures-->0)throw Error('write fail');props.set(k,v);},getProperty:k=>visual.get(k),setProperty:(k,v)=>visual.set(k,v)};
const sounds=[],messages=[];
function player(id){return {id,isValid:true,typeId:'minecraft:player',dimension:d,location:{x:0,y:80,z:3},getGameMode:()=>GameMode.Survival,getComponent:()=>undefined,sendMessage:m=>messages.push([id,m]),applyDamage:()=>{},addEffect:()=>{},playSound:(name)=>{if(!name.startsWith('hakkai.warden_phase_'))return;const obj={id,name,stopped:false,stop(){this.stopped=true;}};sounds.push(obj);return obj;}};}
const p=player('p'),q=player('q');let players=[p,q],bosses=[boss],muted=new Set();
d.getPlayers=()=>players;d.getEntities=()=>bosses;
const sys={currentTick:0},world={difficulty:Difficulty.Normal,getDifficulty(){return this.difficulty},getAllPlayers:()=>players};
function controller(){return setupWardenBoss({world,system:sys,property:()=>{},report:(_,e)=>{throw e;},musicMuted:x=>muted.has(x.id)});}
let ctrl=controller();function tick(t){sys.currentTick=t;for(const person of players)ctrl.tick(person,t);}
// Per-player handles never stop someone else's sound; exactly one loop at a time.
tick(0);assert.deepEqual(sounds.map(x=>x.name),['hakkai.warden_phase_1','hakkai.warden_phase_1']);
tick(936);assert.equal(sounds.length,2);tick(937);assert.equal(sounds.length,4);assert.ok(sounds[0].stopped&&sounds[1].stopped);
hp.currentValue=900;tick(938);assert.equal(sounds.at(-1).name,'hakkai.warden_phase_5');assert.ok(sounds[2].stopped&&sounds[3].stopped);
hp.currentValue=5000;tick(939);assert.equal(sounds.length,6);assert.equal(props.get('hakkai:warden_phase'),4);
muted.add('p');tick(940);assert.equal(ctrl.musicActive('p'),false);assert.equal(ctrl.musicActive('q'),true);assert.equal(sounds[4].stopped,true);assert.equal(sounds[5].stopped,false);
muted.clear();tick(941);assert.equal(sounds.at(-1).id,'p');
q.dimension={id:'minecraft:overworld'};tick(942);assert.equal(ctrl.musicActive('q'),false);q.dimension=d;
world.difficulty=Difficulty.Peaceful;tick(943);assert.equal(ctrl.musicActive('p'),false);world.difficulty=Difficulty.Normal;tick(944);assert.equal(ctrl.musicActive('q'),true);
bosses=[];tick(945);assert.equal(ctrl.musicActive('p'),false);bosses=[boss];tick(946);ctrl.onDeath({deadEntity:boss});assert.equal(ctrl.musicActive('p'),false);assert.equal(ctrl.musicActive('q'),false);
// Save failure is retried; client-synced saved form is an independent reload fallback.
props.clear();visual.clear();hp.currentValue=950;failures=1;ctrl=controller();tick(1000);assert.equal(props.has('hakkai:warden_phase'),false);assert.equal(visual.get('hakkai:form'),4);
hp.currentValue=5000;tick(1020);assert.equal(props.get('hakkai:warden_phase'),4);
props.clear();ctrl=controller();tick(1040);assert.equal(props.get('hakkai:warden_phase'),4,'saved visual fallback restores maximum phase');
// High damage jumps thresholds; healing remains capped and duplicate ticks do not stack.
props.clear();visual.clear();hp.currentValue=1000;ctrl=controller();tick(1100);hp.currentValue=4990;tick(1200);assert.equal(hp.currentValue,5000);assert.equal(props.get('hakkai:warden_phase'),4);
hp.currentValue=4000;tick(1400);assert.equal(hp.currentValue,4000+2*WARDEN_HEAL_PER_SECOND);
// Run the actual selector through all 100 warnings without fighting private state.
props.clear();visual.clear();sounds.length=0;messages.length=0;hp.currentValue=900;players=[p];muted.add('p');ctrl=controller();
for(let t=2000;t<=20000;t++)tick(t);
const all=wardenPatterns(4);assert.equal(all.length,210);assert.equal(new Set(all.map(x=>x.attack)).size,210);
const warned=messages.filter(([,m])=>m.includes('（約2秒）')).map(([,m])=>m);
for(const a of all)assert.ok(warned.some(m=>m.includes(`§c${a.attack}：`)),`not scheduled: ${a.attack}`);
for(let i=0;i<all.length;i++)assert.ok(warned[i]?.includes(`§c${all[i].attack}：`),`out of order ${i}`);
console.log('Warden final: all 210 attacks scheduled, irreversible phases, healing, per-player music lifecycle (mocked)');
