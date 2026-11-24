import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {setupCombatRoll} from '../Hakkai_v7.1.0/BehaviorPack/scripts/combat_roll.js';
import {GameMode} from '@minecraft/server';
const source=fs.readFileSync('Hakkai_v7.1.0/BehaviorPack/scripts/main.js','utf8');
const floorCode=source.slice(source.indexOf('function safeFloor('),source.indexOf('function campfireNearby('));
const safeCode=source.slice(source.indexOf('function safe(d,l){'),source.indexOf('function safeNear('));
const context={LiquidType:{Water:'water'}};vm.createContext(context);vm.runInContext(floorCode+'\n'+safeCode,context);
const solid={typeId:'minecraft:stone',isAir:false,isSolid:true,isLiquid:false,isLiquidBlocking:()=>true},air={typeId:'minecraft:air',isAir:true,isSolid:false};
function fixture(height=()=>79){
 let input=0;const edits=new Map(),moves=[],notes=[];
 const d={id:'realm',isChunkLoaded:()=>true,getBlock:({x,y,z})=>{x=Math.floor(x);y=Math.floor(y);z=Math.floor(z);return edits.get(`${x},${y},${z}`)??(y<=height(x,z)?solid:air);},spawnParticle:()=>{}};
 const s={s:50},p={id:'p',typeId:'minecraft:player',isValid:true,isSneaking:true,isOnGround:true,dimension:d,location:{x:.5,y:80,z:.5},getComponent:()=>undefined,getGameMode:()=>GameMode.Survival,inputPermissions:{isPermissionCategoryEnabled:()=>true},inputInfo:{getMovementVector:()=>({x:0,y:input})},getViewDirection:()=>({x:1,z:0}),clearVelocity:()=>{},tryTeleport(pos){moves.push({...pos});this.location={...pos};return true;},playSound:()=>{},playAnimation:()=>{}};
 const ctrl=setupCombatRoll({notice:(...x)=>notes.push(x),safe:context.safe});
 function tap(t=0){input=1;ctrl.tick(p,s,t);input=0;ctrl.tick(p,s,t+1);input=1;ctrl.tick(p,s,t+2);}
 function run(from=3,to=14){for(let t=from;t<=to;t++)ctrl.tick(p,s,t);}
 return {d,s,p,ctrl,tap,run,moves,edits,notes};
}
{
 const f=fixture();f.tap();f.run();assert.ok(Math.abs(f.p.location.x-24.5)<1e-8);assert.equal(f.s.s,40);
}
{
 const f=fixture(x=>x>=3?80:79);f.tap();f.run();assert.equal(f.p.location.y,81,'climbs one-block uphill');assert.ok(f.p.location.x>20);
}
{
 const f=fixture(x=>x>=4?78:79);f.tap();f.run();assert.ok(f.p.location.x>20,'crosses a one-block drop');
}
{
 const f=fixture(x=>x>=4?-64:79);f.tap();f.run();assert.ok(f.p.location.x>20,'crosses a gap without support checks');
}
{
 const f=fixture();for(let y=80;y<=83;y++)f.edits.set(`3,${y},0`,solid);f.tap();f.run();assert.ok(f.p.location.x+.28<3,'cannot pass through a wall');
}
{
 const f=fixture();f.d.isChunkLoaded=p=>p.x<4;f.tap();f.run();assert.ok(f.p.location.x+.28<4,'unloaded area stops the roll');
}
{
 const f=fixture();f.tap();for(let y=80;y<=83;y++)f.edits.set(`5,${y},0`,solid);f.run();assert.ok(f.p.location.x+.28<5,'late wall is checked immediately before movement');
}
{
 const f=fixture();f.p.tryTeleport=()=>false;f.tap();assert.equal(f.s.s,50);assert.equal(f.ctrl.evading(f.p,2),false);
}
console.log('Roll movement: real safe validator, uphill, every drop, void, wall, unload, late blocks and teleport failure (simulated)');
