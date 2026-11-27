// A lightweight check of the real early-game map gates and recovery helper.
// These mocks do not demonstrate world generation or Bedrock gameplay.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const source=fs.readFileSync('Hakkai_v7.1.0/BehaviorPack/scripts/main.js','utf8');
const slice=(start,end)=>{const a=source.indexOf(start),b=source.indexOf(end,a);assert.ok(a>=0&&b>a);return source.slice(a,b);};

test('the real map gate opens the eight realms in order using the previous visit',()=>{
 const visits=new Set(),ctx={isCreative:()=>false,visited:(_p,id)=>visits.has(id),total:()=>0,space:()=>({}),ns:'hakkai:'};
 vm.createContext(ctx);vm.runInContext(slice('function unlocked(p,site){','async function map(p){')+';this.unlocked=unlocked;',ctx);
 for(let id=1;id<=8;id++){
  const site={id,kind:'realm'};assert.equal(ctx.unlocked({},site),id===1,`realm ${id} before visits`);
 }
 for(let id=1;id<=8;id++){
  assert.equal(ctx.unlocked({},{id,kind:'realm'}),true,`realm ${id}`);
  visits.add(id);
  if(id<8)assert.equal(ctx.unlocked({},{id:id+1,kind:'realm'}),true,`realm ${id+1} after visit`);
 }
});

test('the recovery helper reissues missing guide and return stone without duplicating owned ones',()=>{
 const items=new Set(),ctx={ns:'hakkai:',space:()=>items,getItem:(c,id)=>c.has(id)?0:-1,give:(_p,id)=>{items.add(id);return true;}};
 vm.createContext(ctx);vm.runInContext(slice('function restore(p){','function parsePoint(p,k){')+';this.restore=restore;',ctx);
 assert.equal(ctx.restore({}),true);assert.deepEqual([...items].sort(),['hakkai:guide','hakkai:return_stone']);
 assert.equal(ctx.restore({}),true);assert.equal(items.size,2);
 items.delete('hakkai:return_stone');ctx.give=()=>false;
 assert.equal(ctx.restore({}),false);assert.equal(items.has('hakkai:guide'),true);assert.equal(items.has('hakkai:return_stone'),false);
});
