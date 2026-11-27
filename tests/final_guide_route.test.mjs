import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {GUIDE_ENTRIES,GUIDE_ICONS,GUIDE_SECTIONS} from '../Hakkai_v7.1.0/BehaviorPack/scripts/guide_navigation.js';
const main=fs.readFileSync('Hakkai_v7.1.0/BehaviorPack/scripts/main.js','utf8');
test('battle chapter exposes direct warden arena entry with its real icon',()=>{
 const section=GUIDE_SECTIONS.find(s=>s.title==='戦いと挑戦');assert.ok(section.ids.includes(55));
 assert.equal(GUIDE_ENTRIES[55],'時空の闘技場');assert.equal(GUIDE_ICONS[55],'warden_sigil');
 assert.ok(fs.existsSync('Hakkai_v7.1.0/ResourcePack/textures/items/hakkai_warden_sigil.png'));
});
test('real dispatch routes the new menu entry to existing arena controller',async()=>{
 const begin=main.indexOf('async function dispatchGuide('),end=main.indexOf('async function magicIndex(',begin);
 assert.ok(begin>=0&&end>begin);const calls=[],player={isValid:true};
 const ctx={wardenArena:{open:p=>{calls.push(p);return 'opened';}}};vm.createContext(ctx);
 vm.runInContext(main.slice(begin,end)+'\nthis.dispatch=dispatchGuide;',ctx);
 assert.equal(await ctx.dispatch(player,55),'opened');assert.deepEqual(calls,[player]);
});
test('progression advice distinguishes visits from kills and king preparation',()=>{
 assert.match(main,/守護獣を倒さなくても次の界を訪問でき/);
 assert.match(main,/統合装にはさらに冒険者ランクと素材が必要/);
 assert.match(main,/風記の永劫鎧も王の前に作れる/);
});
