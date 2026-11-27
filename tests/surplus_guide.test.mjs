import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {SURPLUS_GUIDE} from '../Hakkai_v7.1.0/BehaviorPack/scripts/surplus_guide.js';
const main=fs.readFileSync('Hakkai_v7.1.0/BehaviorPack/scripts/main.js','utf8');
test('surplus guide describes all material families and irreversible choices',()=>{
 assert.equal(SURPLUS_GUIDE.length,4);
 const text=SURPLUS_GUIDE.map(x=>x.body).join('\n');
 for(const word of ['欠片2個','結晶1個','魔力を45回復','エンダーパール4個','挑戦印','ダイヤモンド2個','ネザライトの欠片2個','ネザライトの欠片4個','消費'])assert.ok(text.includes(word),word);
});
test('actual catalog dispatch opens surplus menu and page then returns',async()=>{
 const start=main.indexOf('async function openSurplusGuide('),end=main.indexOf('async function openRecipeCatalog(',start);assert.ok(start>=0&&end>start);
 assert.match(main,/if\(selected===9\)\{await openSurplusGuide\(p\);continue;\}/);
 const choices=[1,4],calls=[];const ctx={SURPLUS_GUIDE,form:async(...a)=>{calls.push(a);return choices.shift()},simple:async(...a)=>calls.push(a)};vm.createContext(ctx);
 vm.runInContext(main.slice(start,end)+'\nthis.open=openSurplusGuide;',ctx);
 await ctx.open({isValid:true});assert.equal(calls.length,3);assert.equal(calls[1][1],SURPLUS_GUIDE[1].title);assert.equal(calls[1][2],SURPLUS_GUIDE[1].body);
});
