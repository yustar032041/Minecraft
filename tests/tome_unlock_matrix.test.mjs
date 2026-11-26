import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';
import {tomeSpells,tomeCurrent,tomeNext,tomeUnlocked} from '../Hakkai_v7.1.0/BehaviorPack/scripts/spell_tome.js';
import {attrs,home,pairs} from '../Hakkai_v7.1.0/BehaviorPack/scripts/data.js';
const source=fs.readFileSync('Hakkai_v7.1.0/BehaviorPack/scripts/main.js','utf8');const a=source.indexOf('const TOME_SPELLS='),b=source.indexOf('function shore(p){',a);assert.ok(a>=0&&b>a);
function context(mask,legacy=false){const p={id:'p',isValid:true,getGameMode:()=> 'survival'};const c={tomeSpells,tomeCurrent,tomeNext,tomeUnlocked,attrs,home,pairs,GameMode:{Spectator:'spectator'},isCreative:()=>false,hasTomeRealm:(_,r)=>!legacy&&!!(mask&(1<<r)),visited:(_,site)=>legacy&&!!(mask&(1<<(site-1))),num:(_p,_k,d)=>d,property:()=>{},selected:()=>({typeId:'hakkai:element_tome'}),ns:'hakkai:',notice:()=>{},castMagic:()=>{},castElement:()=>{}};vm.createContext(c);vm.runInContext(source.slice(a,b),c);return {p,c};}
const realmFor=[[0],[3],[2],[0,1],[4],[6],[5],[7]];
for(const legacy of [false,true])test(`${legacy?'legacy site':'realm'}: all 256 visit combinations gate every one of 18 spells correctly`,()=>{
 const spells=tomeSpells(attrs,pairs);
 for(let mask=0;mask<256;mask++){
  const {p,c}=context(mask,legacy);const has=a=>realmFor[a].some(r=>mask&(1<<r));
  for(let attr=0;attr<8;attr++)assert.equal(c.tomeHasAttribute(p,attr),!!has(attr),`mask=${mask}, attr=${attr}`);
  for(let i=0;i<spells.length;i++)assert.equal(tomeUnlocked(spells[i],a=>c.tomeHasAttribute(p,a)),!!has(spells[i].a)&&(spells[i].b<0||!!has(spells[i].b)),`mask=${mask}, spell=${i}`);
 }
});
test('each realm alone unlocks a base attribute and old grass-earth access remains',()=>{
 for(const [realm,attribute] of [0,3,2,1,4,6,5,7].entries()){const {p,c}=context(1<<realm);assert.equal(c.tomeHasAttribute(p,attribute),true,`realm ${realm}`);}
 const {p,c}=context(1);assert.equal(c.tomeHasAttribute(p,3),true);
});
