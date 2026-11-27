import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {setupCombatRoll} from '../Hakkai_v7.1.0/BehaviorPack/scripts/combat_roll.js';
import {GameMode} from '@minecraft/server';
const source=fs.readFileSync('Hakkai_v7.1.0/BehaviorPack/scripts/main.js','utf8');
const floorCode=source.slice(source.indexOf('function safeFloor('),source.indexOf('function campfireNearby('));
const safeCode=source.slice(source.indexOf('function safe(d,l){'),source.indexOf('function safeNear('));
const context={LiquidType:{Water:'water'}};vm.createContext(context);vm.runInContext(floorCode+'\n'+safeCode,context);
const solid={typeId:'minecraft:stone',isAir:false,isSolid:true,isLiquid:false,isWaterlogged:false,isLiquidBlocking:()=>true},air={typeId:'minecraft:air',isAir:true,isSolid:false};
function fixture(height=()=>79){
 let input=0;const edits=new Map(),moves=[],notes=[];
 const d={id:'realm',isChunkLoaded:()=>true,getBlock:({x,y,z})=>{x=Math.floor(x);y=Math.floor(y);z=Math.floor(z);return edits.get(`${x},${y},${z}`)??(y<=height(x,z)?solid:air);},spawnParticle:()=>{}};
 d.getBlockFromRay=({x,y,z})=>{const by=Math.floor(y-.55),b=d.getBlock({x,y:by,z});return b.isAir?undefined:{block:{...b,location:{x:Math.floor(x),y:by,z:Math.floor(z)}},face:'Up',faceLocation:{x:0,y:1,z:0}};};
 const s={s:50},p={id:'p',typeId:'minecraft:player',isValid:true,isSneaking:true,isOnGround:true,dimension:d,location:{x:.5,y:80,z:.5},getComponent:()=>undefined,getGameMode:()=>GameMode.Survival,inputPermissions:{isPermissionCategoryEnabled:()=>true},inputInfo:{getMovementVector:()=>({x:0,y:input})},getViewDirection:()=>({x:1,z:0}),clearVelocity:()=>{},tryTeleport(pos){moves.push({...pos});this.location={...pos};return true;},playSound:()=>{},playAnimation:()=>{}};
 const ctrl=setupCombatRoll({notice:(...x)=>notes.push(x),safe:context.safe});
 function tap(t=0){input=1;ctrl.tick(p,s,t);input=0;ctrl.tick(p,s,t+1);input=1;ctrl.tick(p,s,t+2);}
 function run(from=3,to=14){for(let t=from;t<=to;t++)ctrl.tick(p,s,t);}
 return {d,s,p,ctrl,tap,run,moves,edits,notes};
}
{
 const f=fixture();f.tap();f.run();assert.ok(Math.abs(f.p.location.x-30.5)<1e-8);assert.equal(f.s.s,40);
}
{
 const f=fixture(x=>x>=3?80:79);f.tap();f.run();assert.equal(f.p.location.y,81,'fully supported one-block rise is climbed');assert.ok(f.p.location.x>20);assert.equal(f.ctrl.evading(f.p,2),true);
}
{
 const f=fixture(x=>x>=4?78:79);f.tap();f.run();assert.ok(f.p.location.x+.28<4.01,'stops before a one-block drop');
}
{
 const f=fixture(x=>x>=4?-64:79);f.tap();f.run();assert.ok(f.p.location.x+.28<4.01,'stops before an unsupported gap');
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
 const f=fixture();f.p.tryTeleport=()=>false;f.tap();assert.equal(f.s.s,40);assert.equal(f.ctrl.evading(f.p,2),true,'rejected movement still activates in place');
}
console.log('Roll movement: real safe validator, uphill, drops, void, wall, unload, late blocks and teleport failure (simulated)');
{
 const f=fixture();for(let x=3;x<35;x++)for(let y=80;y<=83;y++)f.edits.set(`${x},${y},0`,solid);
 f.p.getViewDirection=()=>({x:1,z:.6});f.tap();f.run();assert.ok(f.ctrl.evading(f.p,2),'wall never prevents activation');assert.ok(f.p.location.z>1,'diagonal travel can follow a wall');
}
{
 const f=fixture();f.d.getBlockFromRay=()=>{throw Error('unsupported ray API');};f.tap();f.run();assert.ok(Math.abs(f.p.location.x-30.5)<1e-8,'known full cube does not need ray API');
}
{
 const f=fixture();for(let y=80;y<=83;y++)f.edits.set(`1,${y},0`,solid);f.tap();assert.equal(f.ctrl.evading(f.p,2),true);assert.equal(f.s.s,40,'roll triggers even immediately against a wall');
}

{
 const f=fixture();f.tap();const y=f.p.location.y;f.p.location.y-=.35;f.run(3,3);assert.equal(f.p.location.y,y,'during active movement do not plan below activation height');
}

{
 const f=fixture(x=>x>=3?80:79);for(let x=2;x<6;x++)f.edits.set(`${x},82,0`,solid);
 f.tap();f.run();assert.ok(f.p.location.x+.3<3.01,'a low ceiling blocks the raised path');assert.equal(f.p.location.y,80);
}
{
 const f=fixture(x=>x===3?80:x>=4?-64:79);f.tap();f.run();assert.equal(f.p.location.y,81,'can land on a supported raised ledge');assert.ok(f.p.location.x+.28<4.01,'then stops at the raised ledge edge');
}
{
 const f=fixture(x=>x>=3?80:79);f.tap();f.run(3,3);assert.equal(f.p.location.y,81);
 f.p.location.y=80.5;f.run(4,4);assert.equal(f.p.location.y,81,'after a rise the planned height never drops back below it');
}
for(const mode of [GameMode.Survival,GameMode.Creative]){
 const f=fixture();f.p.getGameMode=()=>mode;f.d.getBlockFromRay=()=>undefined;
 f.tap();f.p.isSneaking=false;f.run();assert.ok(Math.abs(f.p.location.x-30.5)<1e-8,`${mode} travels 30 blocks on a known cube even with absent ray hits`);
}
{
 const f=fixture();f.d.getBlockFromRay=()=>undefined;f.edits.set('3,79,0',{...solid,typeId:'minecraft:stone_slab'});
 f.tap();f.run();assert.ok(f.p.location.x+.28<3.01,'unverified slab is not treated as a full cube');
}
{
 const f=fixture(x=>x>=4?78:79);f.d.getBlockFromRay=()=>undefined;f.tap();f.run();assert.ok(f.p.location.x+.28<4.01,'missing support still stops at edge without ray API');
}
