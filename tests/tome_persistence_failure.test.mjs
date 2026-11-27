import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';
import {tomeSpells,tomeCurrent,tomeNext,tomeUnlocked,hasTomeRealm} from '../Hakkai_v7.1.0/BehaviorPack/scripts/spell_tome.js';
import {attrs,home,pairs} from '../Hakkai_v7.1.0/BehaviorPack/scripts/data.js';
const src=fs.readFileSync('Hakkai_v7.1.0/BehaviorPack/scripts/main.js','utf8');
const code=src.slice(src.indexOf('const TOME_SPELLS='),src.indexOf('function shore(p){'));
function fixture(realm=4){
 const data=new Map(),casts=[],notices=[];let fail=true;
 const p={id:'person',isValid:true,dimension:{id:`hakkai:realm_${realm}`},getGameMode:()=> 'survival',getDynamicProperty:k=>{if(fail)throw Error('read not ready');return data.get(k);},setDynamicProperty:(k,v)=>{if(fail)throw Error('write not ready');data.set(k,v);}};
 const ctx={tomeSpells,tomeCurrent,tomeNext,tomeUnlocked,attrs,home,pairs,GameMode:{Spectator:'spectator'},isCreative:()=>false,hasTomeRealm,visited:player=>{player.getDynamicProperty('hakkai:visits');return false},num:(player,k,or=0)=>{const v=player.getDynamicProperty('hakkai:'+k);return typeof v==='number'?v:or;},property:(player,k,v)=>player.setDynamicProperty('hakkai:'+k,v),selected:()=>({typeId:'hakkai:element_tome'}),ns:'hakkai:',notice:(_p,v)=>notices.push(v),castMagic:(_p,v)=>casts.push(v),castElement:(_p,a,b)=>casts.push([a,b])};
 vm.createContext(ctx);vm.runInContext(code,ctx);return {p,ctx,data,casts,notices,recover:()=>{fail=false}};
}
test('current realm remains usable while persisted records cannot be read or written',()=>{
 for(let realm=0;realm<8;realm++){
  const f=fixture(realm);assert.doesNotThrow(()=>f.ctx.castTome(f.p));
  assert.deepEqual(f.casts[0],[0,-1],`no visits needed in realm ${realm}`);
 }
});
test('temporary choice can advance during failure then persist after recovery',()=>{
 const f=fixture(0);f.ctx.castTome(f.p);assert.deepEqual(f.casts.at(-1),[0,-1]);
 f.ctx.advanceTome(f.p);assert.match(f.notices.at(-1),/水/);f.ctx.castTome(f.p);assert.deepEqual(f.casts.at(-1),[1,-1]);
 f.recover();f.ctx.castTome(f.p);assert.deepEqual(f.casts.at(-1),[1,-1]);assert.equal(f.data.get('hakkai:tome_spell_v1'),1);
});
test('unsaved choices are player-specific and are cleared when player leaves',()=>{
 const f=fixture(0),other={...f.p,id:'other'};f.ctx.advanceTome(f.p);f.ctx.castTome(other);assert.deepEqual(f.casts.at(-1),[0,-1]);
 const a=src.indexOf("safeSub('world','after','playerLeave'"),b=src.indexOf('\n',a);assert.match(src.slice(a,b),/TOME_SELECTIONS\.delete\(playerId\)/);
 vm.runInContext("TOME_SELECTIONS.delete('person')",f.ctx);f.ctx.castTome(f.p);assert.deepEqual(f.casts.at(-1),[0,-1]);
});
