// Actual main.js tome and attribute-cast functions with mocked Bedrock APIs.
// Verifies routing/mana, not runtime effects, animation or networking.
import {test} from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';
import {GameMode} from '@minecraft/server';
import {tomeSpells,tomeCurrent,tomeNext} from '../Hakkai_v7.1.0/BehaviorPack/scripts/spell_tome.js';
import {castNewMagic} from '../Hakkai_v7.1.0/BehaviorPack/scripts/combat_magic.js';
import {attrs,pairs} from '../Hakkai_v7.1.0/BehaviorPack/scripts/data.js';
const source=fs.readFileSync('Hakkai_v7.1.0/BehaviorPack/scripts/main.js','utf8');
const sections=[['function castElement(', '\nasync function form('],['function castMagic(p,kind){','async function totemMagicMenu('],['const TOME_SPELLS=','function shore(p){']];
test('each of 18 real tome routes spends its mana without realm visits or ordinary cooldown',()=>{
 let selection=0;const notices=[],marks=[],s={m:100,cd:new Map([['spell',9999]])};
 const health={currentValue:10,effectiveMax:20,setCurrentValue(v){this.currentValue=v}};
 const d={id:'minecraft:overworld',isChunkLoaded:()=>true,getBlockFromRay:()=>undefined,getEntitiesFromRay:()=>[],getEntities:()=>[],getPlayers:()=>[],spawnParticle:()=>{}};
 const p={id:'p',isValid:true,typeId:'minecraft:player',dimension:d,location:{x:0,y:64,z:0},getGameMode:()=>GameMode.Survival,
  getHeadLocation:()=>({x:0,y:65,z:0}),getViewDirection:()=>({x:1,y:0,z:0}),getComponent:()=>health,
  addEffect:()=>{},removeEffect:()=>{},playAnimation:()=>{},playSound:()=>{}};
 const c={tomeSpells,tomeCurrent,tomeNext,castNewMagic,attrs,pairs,GameMode,ns:'hakkai:',
  selected:()=>({typeId:'hakkai:element_tome'}),state:()=>s,system:{currentTick:100,runTimeout:()=>{}},isCreative:()=>false,
  num:(_p,_k,dflt)=>selection??dflt,property:(_p,_k,v)=>{selection=v},notice:(_p,m)=>notices.push(m),mark:(_p,_k,i)=>marks.push(i),
  effects:Array(8).fill('speed'),world:{getTimeOfDay:()=>6000},currentPlace:()=>undefined,home:[],aspect:()=>0,enemies:()=>[],visibleFrom:()=>true,hit:()=>true,combatEffectAllowed:()=>true,
  combatParry:null,mobSystem:null,realmEnders:null};
 vm.createContext(c);
 for(const [begin,end] of sections){const a=source.indexOf(begin),b=source.indexOf(end,a);assert.ok(a>=0&&b>a);vm.runInContext(source.slice(a,b),c)}
 const costs=[...Array(8).fill(12),...Array(5).fill(19),5,20,8,10,12];
 for(let i=0;i<18;i++){
  selection=i;s.m=100;health.currentValue=10;c.castTome(p);
  assert.equal(s.m,100-costs[i],`spell ${i}`);assert.equal(marks.at(-1),i,`history ${i}`);
  s.m=costs[i]-1;const before=marks.length;c.castTome(p);assert.equal(marks.length,before,`not enough mana ${i}`);assert.equal(s.m,costs[i]-1);
 }
 assert.equal(s.cd.get('spell'),9999,'old shared cooldown no longer blocks new casts');
});
