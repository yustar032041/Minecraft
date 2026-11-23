// Exercises the registered melee event handler with fake Bedrock entities.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const source=fs.readFileSync('Hakkai_v7.1.0/BehaviorPack/scripts/main.js','utf8');
const code=source.slice(source.indexOf("safeSub('world','after','entityHitEntity'"),source.indexOf("safeSub('world','after','playerSpawn'"));
assert.ok(code.startsWith("safeSub('world','after','entityHitEntity'"));
const g={id:'gear_001',kind:'剣'},s={s:50,useTick:0,cd:new Map()},casts=[];
const p={typeId:'minecraft:player',id:'p',isValid:true,isSneaking:false,addEffect:()=>{}},target={typeId:'minecraft:zombie',isValid:true};
let healing=0;
let selectedItem={typeId:'hakkai:gear_001'},parry=false,handler;
const context={ultimateParryHeal:()=>healing++,airStrike:undefined,safeSub:(scope,when,event,fn)=>handler=fn,isCreative:()=>false,wardenBoss:{onMeleeParry:()=>{if(parry){s.s-=15;return true;}return false;}},report:()=>assert.fail(),state:()=>s,gear:new Map([[selectedItem.typeId,g]]),selected:()=>selectedItem,system:{currentTick:100},_melee:/_(sword|axe)$/,num:()=>0,growAffinity:()=>{},cast:(...args)=>casts.push(args),ns:'hakkai:'};
vm.createContext(context);vm.runInContext(code,context);assert.equal(typeof handler,'function');
handler({damagingEntity:p,hitEntity:target});assert.equal(s.s,47,'supported weak attack costs three');assert.equal(casts.length,0);
p.isSneaking=true;parry=true;s.s=30;handler({damagingEntity:p,hitEntity:target});
assert.equal(s.s,12,'parry and melee both cost stamina');assert.equal(healing,1,'warden parry triggers final set heal once');assert.equal(casts.length,0,'successful parry suppresses automatic skill');
parry=false;s.s=30;handler({damagingEntity:p,hitEntity:target});assert.equal(s.s,27);assert.equal(casts.length,1,'non-parry crouching hit retains old skill behavior');
selectedItem={typeId:'minecraft:iron_sword',getDynamicProperty:()=>undefined};p.isSneaking=false;s.s=30;handler({damagingEntity:p,hitEntity:target});assert.equal(s.s,26,'other equipment retains original melee cost');
console.log('Melee event: supported costs, regular attacks, parry and skill coexistence OK (mocked)');
