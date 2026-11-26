import {isRecoveryFood} from '../Hakkai_v7.1.0/BehaviorPack/scripts/food_recovery.js';
import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';
import {catalog} from '../Hakkai_v7.1.0/BehaviorPack/scripts/data.js';import {ULTIMATE_WEAPONS} from '../Hakkai_v7.1.0/BehaviorPack/scripts/ultimate_weapons.js';import {isTraceWeapon} from '../Hakkai_v7.1.0/BehaviorPack/scripts/combat_weapon_trace.js';
const src=fs.readFileSync('Hakkai_v7.1.0/BehaviorPack/scripts/main.js','utf8');const code=src.slice(src.indexOf('function use(e){'),src.indexOf('system.runInterval(()=>{',src.indexOf('function use(e){')));
const weapons=[...catalog,...ULTIMATE_WEAPONS].filter(isTraceWeapon),gear=new Map(weapons.map(g=>['hakkai:'+g.id,g]));let selected,ultimate=[],normal=[];
const s={s:20,m:20,useTick:-10},p={id:'p',typeId:'minecraft:player',isValid:true,isSneaking:false,isOnGround:false,getGameMode:()=> 'survival'},system={currentTick:100};
const c={system,state:()=>s,gear,GameMode:{Spectator:'spectator'},ns:'hakkai:',magicItems:{},isTraceWeapon,selected:()=>({typeId:selected}),combatUltimate:{cast:(_,__,g)=>ultimate.push(g)},cast:(_,g)=>normal.push(g)};c.isRecoveryFood=isRecoveryFood;vm.createContext(c);vm.runInContext(code,c);
for(const g of weapons){selected='hakkai:'+g.id;s.useTick=-10;s.s=20;s.m=20;c.use({source:p,itemStack:{typeId:selected}});assert.equal(ultimate.at(-1),g,g.id);}
assert.equal(ultimate.length,97);selected='hakkai:'+weapons[0].id;s.useTick=-10;p.isOnGround=true;c.use({source:p,itemStack:{typeId:selected}});assert.equal(normal.length,1,'standing use retains normal skill');
s.useTick=-10;p.isSneaking=true;c.use({source:p,itemStack:{typeId:selected}});assert.equal(normal.length,2,'crouching use invokes charge immediately');assert.equal(ultimate.length,97);
console.log('Actual weapon use routing: all 97, airborne ultimate and crouch tap charge (mocked)');
// Bow preserves short release input rather than also firing a tap-cast.
const bow=weapons.find(g=>g.kind==='弓');selected='hakkai:'+bow.id;s.useTick=-10;p.isSneaking=true;p.isOnGround=true;const count=normal.length;c.use({source:p,itemStack:{typeId:selected}});assert.equal(normal.length,count);
