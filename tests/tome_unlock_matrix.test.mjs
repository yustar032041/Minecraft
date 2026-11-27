// Mocked main.js path: selections and casts do not depend on visit history.
import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';
import {tomeSpells,tomeCurrent,tomeNext,tomeUnlocked} from '../Hakkai_v7.1.0/BehaviorPack/scripts/spell_tome.js';
import {attrs,pairs} from '../Hakkai_v7.1.0/BehaviorPack/scripts/data.js';
const source=fs.readFileSync('Hakkai_v7.1.0/BehaviorPack/scripts/main.js','utf8');const a=source.indexOf('const TOME_SPELLS='),b=source.indexOf('function shore(p){',a);assert.ok(a>=0&&b>a);
test('all 18 spells are selectable and castable with all 256 legacy visit combinations',()=>{
 const spells=tomeSpells(attrs,pairs);assert.equal(spells.length,18);
 for(let mask=0;mask<256;mask++){
  const props=new Map(),casts=[];const p={id:'p',isValid:true,getGameMode:()=> 'survival'};
  const c={tomeSpells,tomeCurrent,tomeNext,attrs,pairs,GameMode:{Spectator:'spectator'},
   num:(_p,k,d)=>k==='tome_spell_v1'?(props.get(k)??d):mask,property:(_p,k,v)=>props.set(k,v),
   selected:()=>({typeId:'hakkai:element_tome'}),ns:'hakkai:',notice:()=>{},castMagic:(_p,k)=>casts.push(k),castElement:(_p,x,y)=>casts.push([x,y])};
  vm.createContext(c);vm.runInContext(source.slice(a,b),c);
  for(let i=0;i<spells.length;i++){
   props.set('tome_spell_v1',i);assert.ok(tomeUnlocked(spells[i],()=>false));assert.equal(c.tomeSelection(p),i);
   c.castTome(p);assert.equal(casts.length,i+1);assert.equal(c.tomeNext(spells,i),(i+1)%18);
  }
 }
});
test('moon magic is excluded from the tome and retains index 18 for history',()=>{
 const spells=tomeSpells(attrs,pairs);assert.ok(!spells.some(s=>s.special==='moon'));assert.equal(spells[13].special,'light');assert.equal(spells[17].special,'fire');
});
