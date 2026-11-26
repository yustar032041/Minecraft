import {createGuardianMultiplayer} from '../Hakkai_v7.1.0/BehaviorPack/scripts/guardian_multiplayer.js';
import {test} from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';
// Exercises the production entityDie subscriber, not a substitute reward model.
function fixture(){
 const src=fs.readFileSync('Hakkai_v7.1.0/BehaviorPack/scripts/main.js','utf8');
 const a=src.indexOf("safeSub('world','after','entityDie',({deadEntity,damageSource})=>{"),b=src.indexOf("safeSub('world','after','entityDie',e=>",a);assert.ok(a>0&&b>a);
 let handler,failGive=false,failDrop=false;const items=new Map(),props=new Map(),drops=[],messages=[],reports=[];
 const dim={id:'realm',spawnItem:(stack,loc)=>{if(failDrop)throw Error('cannot spawn');drops.push([stack.typeId,loc]);},spawnParticle:()=>{}};
 const player={id:'p1',typeId:'minecraft:player',isValid:true,getGameMode:()=> 'survival',location:{x:0,y:0,z:0},dimension:dim,sendMessage:s=>messages.push(s),playSound:()=>{}};
 class ItemStack{constructor(typeId,amount){this.typeId=typeId;this.amount=amount;}}
 const guardianMultiplayer=createGuardianMultiplayer({spectator:'spectator'});
 const ctx={guardianMultiplayer,COOP_BOSS_REWARDS:{},system:{currentTick:100},ns:'hakkai:',safeSub:(_a,_b,_name,fn)=>handler=fn,num:(_e,k)=>props.get(k)??0,property:(_e,k,v)=>props.set(k,v),guardians:Array.from({length:8},(_,i)=>`guardian ${i}`),ItemStack,
  giveStatus:(_p,id,n)=>{if(failGive)return 'full';items.set(id,(items.get(id)??0)+n);return 'ok';},report:(...v)=>reports.push(v),vanillaDrops:{}};
 vm.createContext(ctx);vm.runInContext(src.slice(a,b),ctx);
 let sequence=0;function kill(i,killer=player){handler({deadEntity:{id:`boss${i}-${sequence++}`,typeId:`hakkai:guardian_${i}`,dimension:dim,location:{x:i,y:0,z:0}},damageSource:{damagingEntity:killer}});}
 return {player,kill,items,props,drops,messages,reports,failGive:v=>failGive=v,failDrop:v=>failDrop=v};
}
test('eight guardian cores remain renewable for both legacy forge and final awakening',()=>{
 const f=fixture();for(let i=0;i<8;i++)f.kill(i);
 assert.equal(f.props.get('guards'),255);assert.equal(f.props.get('guardian_core_claims'),255);
 for(let i=0;i<8;i++){const id=`hakkai:guardian_core_${i}`;assert.equal(f.items.get(id),1);f.items.set(id,0);}
 for(let i=0;i<8;i++)f.kill(i);for(let i=0;i<8;i++)assert.equal(f.items.get(`hakkai:guardian_core_${i}`),1);
 assert.equal(f.messages.filter(m=>m.includes('初討伐')).length,8);assert.equal(f.messages.filter(m=>m.includes('再討伐')).length,8);
});
test('full inventory drops one core and records claim; failure keeps archive recovery available',()=>{
 const f=fixture();f.failGive(true);f.kill(0);assert.deepEqual(f.drops,[['hakkai:guardian_core_0',{x:0,y:0,z:0}]]);assert.equal(f.props.get('guardian_core_claims'),1);
 f.failDrop(true);f.kill(1);assert.equal(f.props.get('guards'),3);assert.equal(f.props.get('guardian_core_claims'),1);assert.match(f.messages.at(-1),/届けられません/);
 f.failDrop(false);f.kill(1);assert.equal(f.props.get('guardian_core_claims'),3);assert.equal(f.drops.length,2);
});
test('non-player kills or unrelated types do not issue a player core',()=>{
 const f=fixture();f.kill(0,{typeId:'minecraft:zombie',isValid:true});f.kill(0,null);f.kill(8);assert.equal(f.items.size,0);assert.equal(f.props.size,0);
});

test('real legacy forge and final trial can both consume guardian cores after rematches',async()=>{
 const f=fixture(),s=fs.readFileSync('Hakkai_v7.1.0/BehaviorPack/scripts/main.js','utf8');for(let i=0;i<8;i++){f.kill(i);f.items.set(`hakkai:gear_${196+i}`,1);f.items.set(`hakkai:crystal_${i}`,4);}f.items.set('minecraft:emerald',384);f.items.set('minecraft:ancient_debris',8);f.items.set('minecraft:netherite_ingot',1);
 const a=s.indexOf('const guardianLegacyGear=['),b=s.indexOf('function applyGuardianLegacyEffects(',a),c=s.indexOf('async function finalAwakeningTrial('),d=s.indexOf('async function finalChronicle(',c);assert.ok(a>0&&b>a&&c>0&&d>c);
 let pick=0;const notes=[],container={size:64,getItem:()=>undefined},num=(_p,k,fallback=0)=>f.props.get(k)??fallback;
 const ctx={ns:'hakkai:',space:()=>container,realmRankIndex:()=>7,realmRanks:Array.from({length:8},(_,i)=>[i,`rank${i}`]),num,property:(_p,k,v)=>f.props.set(k,v),guardianCoreNames:Array.from({length:8},(_,i)=>`core${i}`),
  total:(_c,id)=>f.items.get(id)??0,debit:(_c,id,n)=>{const have=f.items.get(id)??0;if(have<n)return false;f.items.set(id,have-n);return true},give:(_p,id,n)=>{f.items.set(id,(f.items.get(id)??0)+n);return true},room:()=>true,
  ItemStack:class{constructor(id,n){this.typeId=id;this.amount=n}},form:async()=>pick,notice:(_p,m)=>notes.push(m),simple:()=>{},
  deliverTrial:(_p,costs,products,updates)=>{if(costs.some(([id,n])=>(f.items.get(id)??0)<n))return false;for(const [id,n] of costs)f.items.set(id,f.items.get(id)-n);for(const [id,n] of products)f.items.set(id,(f.items.get(id)??0)+n);for(const [key,value] of Object.entries(updates))f.props.set(key,value);return true;}};
 vm.createContext(ctx);vm.runInContext(s.slice(a,b)+'\n'+s.slice(c,d)+'\nthis.forge=guardianLegacyForge;this.final=finalAwakeningTrial;',ctx);
 for(let i=0;i<8;i++){pick=i;await ctx.forge(f.player);assert.equal(f.items.get(`hakkai:guardian_core_${i}`),0);assert.equal(f.items.get(`hakkai:gear_${204+i}`),1);}
 pick=8;await ctx.forge(f.player);assert.equal(f.items.get('hakkai:gear_212'),1);
 pick=0;await ctx.final(f.player);assert.equal(f.items.get('hakkai:gear_212'),1,'missing cores do not consume equipment');assert.equal(f.props.get('final_awakening_complete'),undefined);
 for(let i=0;i<8;i++)f.kill(i);
 f.items.set('minecraft:netherite_ingot',0);await ctx.final(f.player);assert.equal(f.items.get('hakkai:gear_212'),1);assert.equal(f.props.get('final_awakening_complete'),undefined);
 f.items.set('minecraft:netherite_ingot',1);await ctx.final(f.player);assert.equal(f.items.get('hakkai:gear_213'),1);assert.equal(f.items.get('hakkai:wind_legacy_memorial'),1);assert.equal(f.props.get('final_awakening_complete'),1);
});
test('overlapping legacy forms and a previously incomplete final form use current progress',async()=>{
 const f=fixture(),s=fs.readFileSync('Hakkai_v7.1.0/BehaviorPack/scripts/main.js','utf8'),pending=[],notes=[];
 const a=s.indexOf('const guardianLegacyGear=['),b=s.indexOf('function applyGuardianLegacyEffects(',a),c=s.indexOf('async function finalAwakeningTrial('),d=s.indexOf('async function finalChronicle(',c);
 const ctx={ns:'hakkai:',space:()=>({}),realmRankIndex:()=>7,realmRanks:Array.from({length:8},(_,i)=>[i,`rank${i}`]),num:(_p,k,v=0)=>f.props.get(k)??v,guardianCoreNames:Array.from({length:8},(_,i)=>`core${i}`),total:(_c,id)=>f.items.get(id)??0,form:()=>new Promise(resolve=>pending.push(resolve)),notice:(_p,m)=>notes.push(m),simple:()=>{},
 deliverTrial:(_p,costs,products,updates)=>{if(costs.some(([id,n])=>(f.items.get(id)??0)<n))return false;for(const [id,n] of costs)f.items.set(id,f.items.get(id)-n);for(const [id,n] of products)f.items.set(id,(f.items.get(id)??0)+n);for(const [key,value] of Object.entries(updates))f.props.set(key,value);return true;}};
 vm.createContext(ctx);vm.runInContext(s.slice(a,b)+'\n'+s.slice(c,d)+'\nthis.forge=guardianLegacyForge;this.final=finalAwakeningTrial;',ctx);
 for(const [id,n] of [['gear_196',1],['guardian_core_0',1],['crystal_0',4]])f.items.set('hakkai:'+id,n);f.items.set('minecraft:emerald',32);f.items.set('minecraft:ancient_debris',1);
 const one=ctx.forge(f.player),two=ctx.forge(f.player);pending.shift()(0);await one;pending.shift()(0);await two;
 assert.equal(f.items.get('hakkai:gear_204'),1);assert.equal(f.props.get('guardian_legacy_claims'),1);assert.equal(f.items.get('hakkai:gear_196'),0,'a stale second form cannot reuse consumed materials');
 const trial=ctx.final(f.player);f.props.set('guards',255);f.items.set('hakkai:gear_212',1);for(let i=0;i<8;i++)f.items.set('hakkai:guardian_core_'+i,1);f.items.set('minecraft:emerald',128);f.items.set('minecraft:netherite_ingot',1);pending.shift()(0);await trial;assert.equal(f.props.get('final_awakening_complete'),1);
});
