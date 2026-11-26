import {test} from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';
import {armorRecipe} from '../Hakkai_v7.1.0/BehaviorPack/scripts/armor_guide.js';
import {RECIPE_INDEX} from '../Hakkai_v7.1.0/BehaviorPack/scripts/recipe_index.js';
import {catalog} from '../Hakkai_v7.1.0/BehaviorPack/scripts/data.js';
import {progressReward} from '../Hakkai_v7.1.0/BehaviorPack/scripts/inventory_exchange.js';
import {filterGear} from '../Hakkai_v7.1.0/BehaviorPack/scripts/guide_navigation.js';
test('catalog number pages retain original number ranges across deleted entries',()=>{
 assert.equal(catalog.length,175);const all=[];
 for(let n=0;n<16;n++){const page=filterGear(catalog,'number',n);for(const g of page){assert.ok(+g.number>n*12&&+g.number<=(n+1)*12);all.push(g.id)}}
 assert.equal(all.length,175);assert.equal(new Set(all).size,175);assert.equal(all.at(-1),'gear_186');
});
test('real legendary guardian trial rewards leggings and emerald with one progress record',async()=>{
 const src=fs.readFileSync('Hakkai_v7.1.0/BehaviorPack/scripts/main.js','utf8'),a=src.indexOf('const legendGearTrials=['),b=src.indexOf('async function nextHeldGearRecipe(',a);assert.ok(a>0&&b>a);
 const props=new Map(),messages=[];let pick=3,rank=7,fail=false;
 class ItemStack{constructor(id,count=1){this.typeId=id;this.amount=count;this.maxAmount=id==='minecraft:emerald'?64:1}clone(){return new ItemStack(this.typeId,this.amount)}isStackableWith(other){return this.typeId===other.typeId&&this.maxAmount>1}}
 let items=[undefined,undefined],writes=0;const container={get size(){return items.length},getItem:i=>items[i]?.clone(),setItem:(i,x)=>{items[i]=x?.clone();if(fail&&++writes===2)throw Error('partial write')}};
 const p={isValid:true,location:{x:0,y:0,z:0},getDynamicProperty:k=>props.get(k.slice(7)),setDynamicProperty:(k,v)=>v===undefined?props.delete(k.slice(7)):props.set(k.slice(7),v),playSound:()=>{},dimension:{spawnParticle:()=>{}}};
 const ctx={ns:'hakkai:',gear:new Map(catalog.map(g=>['hakkai:'+g.id,g])),armorRecipe,RECIPE_INDEX,num:(_p,key)=>props.get(key)??0,realmRankIndex:()=>rank,realmRanks:Array.from({length:8},(_,i)=>[0,'rank'+i]),form:async(_p,_title,body,rows)=>{messages.push({body,rows});return pick},notice:(_p,msg)=>messages.push({msg}),
  deliverTrial:(_p,costs,products,updates)=>progressReward(p,costs,products,updates,{space:()=>container,ItemStack,ns:'hakkai:'})==='ok'};
 vm.createContext(ctx);vm.runInContext(src.slice(a,b)+';this.open=legendGearTrialBoard;',ctx);
 await ctx.open(p);assert.ok(messages.at(-1).msg.includes('討伐記録'));props.set('guards',255);rank=0;await ctx.open(p);assert.ok(messages.at(-1).msg.includes('ランク'));
 rank=7;items=[new ItemStack('minecraft:diamond'),undefined];await ctx.open(p);assert.equal(props.has('legend_gear_claims'),false,'missing netherite cannot claim');assert.equal(items[0].typeId,'minecraft:diamond');
 items=[undefined,new ItemStack('minecraft:stone'),new ItemStack('minecraft:diamond',2),new ItemStack('minecraft:netherite_ingot',2)];await ctx.open(p);assert.equal(items[0],undefined,'one free slot cannot hold both rewards');
 items=[new ItemStack('minecraft:diamond'),new ItemStack('minecraft:netherite_ingot')];fail=true;await ctx.open(p);assert.deepEqual(items.map(x=>[x.typeId,x.amount]),[['minecraft:diamond',1],['minecraft:netherite_ingot',1]]);assert.equal(props.has('legend_gear_claims'),false);
 fail=false;await ctx.open(p);assert.deepEqual(items.map(x=>[x.typeId,x.amount]),[['hakkai:series_leggings_10',1],['minecraft:emerald',6]]);assert.equal(props.get('legend_gear_claims'),8);assert.ok(messages.some(x=>x.rows?.[3][0].includes('霧銀装 IIIのレギンス')));assert.ok(messages.some(x=>x.msg?.includes('霧銀装 IIIのレギンス')));
 await ctx.open(p);assert.equal(props.get('legend_gear_claims'),8);
});
