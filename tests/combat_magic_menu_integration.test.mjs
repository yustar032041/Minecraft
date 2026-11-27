import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';
import {tomeSpells,tomeCurrent,tomeNext,tomeCrouchTick} from '../Hakkai_v7.1.0/BehaviorPack/scripts/spell_tome.js';
const src=fs.readFileSync('Hakkai_v7.1.0/BehaviorPack/scripts/main.js','utf8');
const code=src.slice(src.indexOf('const TOME_SPELLS='),src.indexOf('function shore(p){'));
const attrs=['風','水','火','土','雷','光','闇','時'];const pairs=[{a:0,b:1,label:'霧'},{a:2,b:3,label:'溶岩'},{a:4,b:1,label:'嵐'},{a:5,b:6,label:'虹'},{a:7,b:0,label:'疾風'}];
let held='hakkai:element_tome',casts=[],notices=[];const props=new Map();
const p={id:'p',isValid:true,getGameMode:()=> 'survival'};const c={tomeSpells,tomeCurrent,tomeNext,attrs,pairs,GameMode:{Spectator:'spectator'},num:(_,k,d)=>props.get(k)??d,property:(_,k,v)=>props.set(k,v),selected:()=>({typeId:held}),ns:'hakkai:',notice:(_,v)=>notices.push(v),castMagic:(_,v)=>casts.push(v),castElement:(_,a,b,label)=>casts.push(label)};
vm.createContext(c);vm.runInContext(code,c);assert.equal(tomeSpells(attrs,pairs).length,18);
c.castTome(p);assert.deepEqual(casts,['風'],'no visit required');
for(const expected of ['水','火','土','雷','光','闇','時','霧','溶岩','嵐','虹','疾風','光の矢（魔力5）','絆の灯（魔力20）','風の輪（魔力8）','水の縛り（魔力10）','炎の環（魔力12）','風']){c.advanceTome(p);assert.ok(notices.at(-1).includes(expected),expected);}
props.set('tome_spell_v1',14);c.castTome(p);assert.equal(casts.at(-1),'bond');
held='minecraft:book';const count=casts.length;c.castTome(p);assert.equal(casts.length,count);
let moves=0;const s={},player={isSneaking:true};tomeCrouchTick(player,s,'hakkai:element_tome',()=>moves++);assert.equal(moves,0);player.isSneaking=false;tomeCrouchTick(player,s,'other',()=>moves++);player.isSneaking=true;tomeCrouchTick(player,s,'other',()=>moves++);tomeCrouchTick(player,s,'hakkai:element_tome',()=>moves++);assert.equal(moves,0);player.isSneaking=false;tomeCrouchTick(player,s,'hakkai:element_tome',()=>moves++);player.isSneaking=true;tomeCrouchTick(player,s,'hakkai:element_tome',()=>moves++);tomeCrouchTick(player,s,'hakkai:element_tome',()=>moves++);assert.equal(moves,1);
assert.ok(src.includes("if(id===ns+'element_tome'){tomeCrouchTick"));assert.ok(src.includes('tomeCrouchTick(p,s,selected(p)?.typeId'));
console.log('Tome: all spell order, casting, crouch edges and held item (mocked)');
