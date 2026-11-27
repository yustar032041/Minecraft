import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {COMBAT_GUIDE_SECTIONS,COMBAT_GUIDE_FOOTER} from '../Hakkai_v7.1.0/BehaviorPack/scripts/combat_guide.js';
const main=fs.readFileSync('Hakkai_v7.1.0/BehaviorPack/scripts/main.js','utf8');
test('combat guide sections retain essential instructions in bounded, distinct pages',()=>{
 assert.equal(COMBAT_GUIDE_SECTIONS.length,8);assert.equal(new Set(COMBAT_GUIDE_SECTIONS.map(p=>p.title)).size,8);
 assert.ok(COMBAT_GUIDE_SECTIONS.every(p=>p.body.length<500));
 const all=COMBAT_GUIDE_SECTIONS.map(p=>p.body).join('\n');
 for(const token of ['風紋','二連終撃','70%','盾','巻物','角笛','回避ロール','空中ダッシュ','武器の軌跡','必殺','パリィ'])assert.ok(all.includes(token),token);
 assert.match(COMBAT_GUIDE_FOOTER,/マナ/);assert.match(main,/if\(i===11\)return combatGuide\(p\)/);
});
test('actual menu opens the selected page and returns to selection until closed',async()=>{
 const start=main.indexOf('async function combatGuide(p){'),end=main.indexOf('async function survivalGuide(p){',start);assert.ok(start>=0&&end>start);
 const requests=[],pages=[],selection=[0,3,6,COMBAT_GUIDE_SECTIONS.length];
 const ctx={COMBAT_GUIDE_SECTIONS,COMBAT_GUIDE_FOOTER,form:async(_p,title,body,rows)=>{requests.push({title,body,rows});return selection.shift();},simple:async(_p,title,body)=>pages.push({title,body})};
 vm.createContext(ctx);vm.runInContext(main.slice(start,end)+'\nglobalThis.run=combatGuide;',ctx);
 await ctx.run({isValid:true});assert.deepEqual(pages.map(x=>x.title),[COMBAT_GUIDE_SECTIONS[0].title,COMBAT_GUIDE_SECTIONS[3].title,COMBAT_GUIDE_SECTIONS[6].title]);
 assert.equal(requests.length,4);assert.equal(requests[0].rows.length,COMBAT_GUIDE_SECTIONS.length+1);assert.match(requests[0].body,/知りたい操作/);
});
test('progression guide reflects actual map gate, separate boss unlocks and pre-boss recommendation',()=>{
 assert.match(main,/if\(site\.id<=8\)return visited\(p,site\.id-1\)/);
 assert.match(main,/前の界を訪れると次の界が解放/);assert.doesNotMatch(main,/行き先は固定されず、後の界から先に訪れる/);
 const arena=fs.readFileSync('Hakkai_v7.1.0/BehaviorPack/scripts/warden_arena.js','utf8');
 assert.match(arena,/風記の永劫鎧/);assert.match(arena,/終刻装備はこの戦いの後/);assert.doesNotMatch(arena,/強化したネザライト装備や/);
});
