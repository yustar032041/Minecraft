import assert from 'node:assert/strict';
import fs from 'node:fs';
import { GUIDE_ENTRIES, GUIDE_ICONS, GUIDE_SECTIONS, guidePageCount, guidePageSlice, creatureEntriesByRealm, selectGuidePage, gearKinds, filterGear } from '../Hakkai_v7.1.0/BehaviorPack/scripts/guide_navigation.js';
import { catalog, attrs } from '../Hakkai_v7.1.0/BehaviorPack/scripts/data.js';
import { mobContentList } from '../Hakkai_v7.1.0/BehaviorPack/scripts/mob_content.js';
const main=fs.readFileSync('Hakkai_v7.1.0/BehaviorPack/scripts/main.js','utf8');
const dispatch=main.slice(main.indexOf('async function dispatchGuide('),main.indexOf('async function magicIndex('));
const routes=[...dispatch.matchAll(/if\(ix===(\d+)\)/g)].map(m=>Number(m[1]));
assert.equal(GUIDE_ENTRIES.length,56);assert.equal(GUIDE_ICONS.length,GUIDE_ENTRIES.length);
for(const icon of GUIDE_ICONS)assert.ok(fs.existsSync(`Hakkai_v7.1.0/ResourcePack/textures/items/hakkai_${icon}.png`),icon);
const ids=GUIDE_SECTIONS.flatMap(section=>section.ids);
assert.equal(ids.length,56);assert.equal(new Set(ids).size,56);
assert.deepEqual([...ids].sort((a,b)=>a-b),Array.from({length:56},(_,i)=>i));
assert.deepEqual([...new Set(routes)].sort((a,b)=>a-b),Array.from({length:56},(_,i)=>i));
for(const group of GUIDE_SECTIONS){
 assert.ok(group.title&&group.hint&&group.ids.length);
 assert.ok(fs.existsSync(`Hakkai_v7.1.0/ResourcePack/textures/items/hakkai_${group.icon}.png`));
 for(const id of group.ids) assert.ok(GUIDE_ENTRIES[id]);
}
assert.equal(guidePageCount(0),1);assert.equal(guidePageCount(8),1);assert.equal(guidePageCount(9),2);
const entries=Array.from({length:19},(_,i)=>[`entry ${i}`]);
assert.equal(guidePageSlice(entries,0).entries.length,8);
assert.equal(guidePageSlice(entries,1).offset,8);
assert.deepEqual(guidePageSlice(entries,99),{page:2,pages:3,offset:16,entries:entries.slice(16)});
const seen=[];const p={isValid:true};
const makeShow=sequence=>async (_player,_title,body,buttons)=>{
 seen.push({body,buttons});return sequence.shift();
};
// First page: next is index 8. Second page: previous is 8, next is 9.
assert.deepEqual(await selectGuidePage(p,'title','body',entries,makeShow([8,9,2])),{index:18,page:2});
assert.ok(seen[0].body.includes('1 / 3'));assert.ok(seen[1].body.includes('2 / 3'));assert.ok(seen[2].body.includes('3 / 3'));
assert.deepEqual(await selectGuidePage(p,'title','body',entries,makeShow([8,8,8,0])),{index:8,page:1});
assert.deepEqual(await selectGuidePage(p,'title','body',entries,makeShow([9])),{back:true,page:0});
assert.deepEqual(await selectGuidePage(p,'title','body',entries,makeShow([undefined])),{closed:true,page:0});
assert.deepEqual(await selectGuidePage(p,'title','body',[],makeShow([0])),{back:true,page:0});
assert.deepEqual(await selectGuidePage({isValid:false},'title','body',entries,()=>{throw Error('must not open');}),{closed:true,page:0});
assert.equal(gearKinds(catalog).length,15);
for (const g of catalog){
 assert.ok(filterGear(catalog,'kind',g.kind).includes(g));
 assert.ok(filterGear(catalog,'attribute',g.a).includes(g));
 assert.ok(filterGear(catalog,'attribute',g.modifier).includes(g));
 const group=Math.floor((Number(g.number)-1)/12);
 assert.ok(filterGear(catalog,'number',group).includes(g));
}
for(let a=0;a<attrs.length;a++)assert.ok(filterGear(catalog,'attribute',a).length);
assert.deepEqual(filterGear(catalog,'invalid',0),[]);
const covered=new Set();
for(let realm=0;realm<8;realm++){
 const list=creatureEntriesByRealm(mobContentList,realm);assert.equal(list.length,15);
 for(const {profile,index} of list){assert.equal(profile.realm,realm);assert.equal(mobContentList[index],profile);covered.add(index);}
}
assert.equal(covered.size,120);assert.deepEqual(creatureEntriesByRealm(mobContentList,99),[]);
console.log('Guide: all 56 routes, category icons, pagination/back/cancel, 175 gear filters and 120 realm-filtered creature entries OK (mocked/static)');
{
 const {searchGuideEntries}=await import('../Hakkai_v7.1.0/BehaviorPack/scripts/guide_navigation.js');
 const entries=[[0,'鉄の剣（hakkai:gear_010）'],[1,'鉄の斧（hakkai:gear_011）'],[2,'紙（minecraft:paper）']];
 assert.deepEqual(searchGuideEntries(entries,'鉄 GEAR_010'),[entries[0]]);
 assert.deepEqual(searchGuideEntries(entries,'ＰＡＰＥＲ'),[entries[2]]);
 assert.deepEqual(searchGuideEntries(entries,'鉄'),entries.slice(0,2));
 assert.deepEqual(searchGuideEntries(entries,'['),[],'literal, not regular expression');
 assert.deepEqual(searchGuideEntries(entries,'  '),[]);assert.deepEqual(searchGuideEntries(entries,null),[]);
}
