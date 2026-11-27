import {test} from 'node:test';import assert from 'node:assert/strict';
import {actionEnchantmentBonus} from '../Hakkai_v7.1.0/BehaviorPack/scripts/combat_action_enchantments.js';
const item=levels=>({getComponent:()=>({getEnchantment:id=>levels[id]===undefined?undefined:{level:levels[id]}})});
const target=(...types)=>({getComponent:()=>({hasTypeFamily:id=>types.includes(id)})});
test('sharpness and type bonuses are bounded and command-made combinations do not stack',()=>{
 assert.equal(actionEnchantmentBonus(item({sharpness:3}),target()),3.75);
 assert.equal(actionEnchantmentBonus(item({smite:4}),target('undead')),10);
 assert.equal(actionEnchantmentBonus(item({bane_of_arthropods:2}),target('arthropod')),5);
 assert.equal(actionEnchantmentBonus(item({sharpness:3,smite:4,bane_of_arthropods:5}),target('undead')),10);
 assert.equal(actionEnchantmentBonus(item({sharpness:999}),target()),6.25);
 assert.equal(actionEnchantmentBonus(item({sharpness:NaN}),target()),0);
 assert.equal(actionEnchantmentBonus(item({smite:5}),target()),0);
});
test('missing or throwing item and unknown family fail safely',()=>{
 assert.equal(actionEnchantmentBonus(undefined,target()),0);
 assert.equal(actionEnchantmentBonus({getComponent(){throw Error('invalid');}},target()),0);
 assert.equal(actionEnchantmentBonus(item({sharpness:2,smite:5}),{getComponent(){throw Error('unknown');}}),2.5);
 assert.equal(actionEnchantmentBonus({getComponent:()=>({getEnchantment(){throw Error('unknown');}})},target('undead')),0);
});
