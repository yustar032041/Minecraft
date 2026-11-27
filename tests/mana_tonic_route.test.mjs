// Verify the advertised crafting route against the JSON and real guide menus.
// This does not simulate Bedrock recipe registration or brewing stand behavior.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const bp='Hakkai_v7.1.0/BehaviorPack';
const source=fs.readFileSync(`${bp}/scripts/main.js`,'utf8');
const recipe=JSON.parse(fs.readFileSync(`${bp}/recipes/mana_tonic.json`,'utf8'))['minecraft:recipe_shapeless'];
const slice=(a,b)=>{const start=source.indexOf(a),end=source.indexOf(b,start);assert.ok(start>=0&&end>start);return source.slice(start,end);};
test('the direct magic tonic recipe has the ingredients advertised and an always-unlocked crafting table entry',()=>{
 assert.deepEqual(recipe.tags,['crafting_table']);
 assert.deepEqual(recipe.unlock,[{context:'AlwaysUnlocked'}]);
 assert.deepEqual(recipe.ingredients.map(x=>x.item).sort(),['hakkai:crystal_1','minecraft:glass_bottle','minecraft:glow_berries'].sort());
 assert.deepEqual(recipe.result,{item:'hakkai:mana_tonic',count:1});
 const loot=JSON.parse(fs.readFileSync(`${bp}/loot_tables/hakkai/blocks/ore_1.json`,'utf8'));
 assert.ok(loot.pools.some(pool=>pool.entries.some(entry=>entry.name==='hakkai:crystal_1')));
});
test('both in-game descriptions lead with the actual direct crafting option',async()=>{
 let shown;const ctx={form:async()=>1,simple:(_p,title,body)=>{shown={title,body}}};
 vm.createContext(ctx);vm.runInContext(slice('async function recipeIndex(p){','async function gearAcquisitionGuide(p){'),ctx);
 await ctx.recipeIndex({});assert.equal(shown.title,'魔法と醸造');
 for(const word of ['作業台','ガラス瓶','グロウベリー','水の結晶','直接'])assert.ok(shown.body.includes(word),word);
 // Exercise the same description used by the enchantment/brewing menu.
 const match=source.match(/if\(pick===0\)return simple\(p,'魔力の薬','([^']+)'\);/);
 assert.ok(match);for(const word of ['作業台','ガラス瓶','グロウベリー','水の結晶','直接','しゃがんで'])assert.ok(match[1].includes(word),word);
});
