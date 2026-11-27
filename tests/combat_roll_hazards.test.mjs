import {test} from 'node:test';
import assert from 'node:assert/strict';
import {setupCombatRoll} from '../Hakkai_v7.1.0/BehaviorPack/scripts/combat_roll.js';
import {GameMode} from '@minecraft/server';
// Stable API-shaped blocks intentionally omit the preview-only isSolid field.
const air={typeId:'minecraft:air',isAir:true,isLiquid:false,isWaterlogged:false};
const stone={typeId:'minecraft:stone',isAir:false,isLiquid:false,isWaterlogged:false};
function fixture(hazard,atFloor=false){
 let input=0;const edits=new Map(),moves=[];
 const d={id:'realm',isChunkLoaded:()=>true,spawnParticle:()=>{},getBlock({x,y,z}){
  x=Math.floor(x);y=Math.floor(y);z=Math.floor(z);
  return edits.get(`${x},${y},${z}`)??(y<=79?stone:air);
 }};
 d.getBlockFromRay=({x,y,z})=>{
  const py=Math.floor(y-.05),block=d.getBlock({x,y:py,z});
  return block.isAir?undefined:{block:{...block,location:{x:Math.floor(x),y:py,z:Math.floor(z)}},face:'Up',faceLocation:{y:1}};
 };
 const p={id:'p',typeId:'minecraft:player',isValid:true,isSneaking:true,isOnGround:true,dimension:d,location:{x:.5,y:80,z:.5},
  getComponent:()=>undefined,getGameMode:()=>GameMode.Survival,inputPermissions:{isPermissionCategoryEnabled:()=>true},inputInfo:{getMovementVector:()=>({x:0,y:input})},getViewDirection:()=>({x:1,z:0}),clearVelocity:()=>{},
  tryTeleport(pos){moves.push({...pos});this.location={...pos};return true;},playSound:()=>{},playAnimation:()=>{}};
 const s={s:50},ctrl=setupCombatRoll({notice:()=>{}});
 const install=(start=3)=>{for(let x=start;x<=35;x++)edits.set(`${x},${atFloor?79:80},0`,hazard);};
 const tap=()=>{input=1;ctrl.tick(p,s,0);input=0;ctrl.tick(p,s,1);input=1;ctrl.tick(p,s,2);};
 const run=()=>{for(let t=3;t<13;t++)ctrl.tick(p,s,t);};
 return {p,s,ctrl,moves,edits,install,tap,run};
}
for(const id of ['minecraft:fire','minecraft:soul_fire','minecraft:sweet_berry_bush','minecraft:wither_rose','minecraft:powder_snow','minecraft:pointed_dripstone']){
 test(`roll avoids ${id} even if non-solid`,()=>{
  const f=fixture({typeId:id,isAir:false,isSolid:false,isLiquid:false,isWaterlogged:false});f.install();f.tap();f.run();
  assert.ok(f.p.location.x+.3<=3.001);assert.equal(f.s.s,40);assert.equal(f.ctrl.evading(f.p,2),true);
 });
}
for(const hazard of [{typeId:'minecraft:water',isSolid:false,isLiquid:true},{typeId:'minecraft:lava',isSolid:false,isLiquid:true},
 {typeId:'minecraft:oak_fence',isSolid:false,isWaterlogged:true}]){
 test(`roll stops at fluid ${hazard.typeId}`,()=>{const f=fixture({isAir:false,...hazard});f.install();f.tap();f.run();assert.ok(f.p.location.x+.3<=3.001);});
}
for(const hazard of [{...stone,typeId:'minecraft:magma'},{...stone,typeId:'minecraft:campfire'}, {...stone,isWaterlogged:true}]){
 test(`roll avoids dangerous supporting floor ${hazard.typeId}`,()=>{const f=fixture(hazard,true);f.install();f.tap();f.run();assert.ok(f.p.location.x+.3<=3.001);});
}
test('late hazard is checked at the next segment',()=>{const f=fixture({...air,isAir:false,typeId:'minecraft:fire'});f.tap();f.install(2);f.run();assert.ok(f.p.location.x+.3<=2.001);});
for(const id of ['minecraft:short_grass','minecraft:fern','minecraft:dandelion','minecraft:poppy','minecraft:azure_bluet','minecraft:oxeye_daisy','minecraft:cornflower','minecraft:allium','minecraft:blue_orchid','minecraft:red_tulip','minecraft:orange_tulip','minecraft:white_tulip','minecraft:pink_tulip']){
 test(`known benign plant ${id} remains traversable without isSolid`,()=>{const f=fixture({...air,isAir:false,typeId:id});f.install();f.tap();f.run();assert.ok(f.p.location.x>3.4);});
}
for(const hazard of [
 {...air,isAir:false,typeId:'minecraft:stone_slab',isSolid:false},
 {...air,isAir:false,typeId:'hakkai:unknown_plant',isSolid:false},
 {...air,isAir:false,typeId:'minecraft:short_grass',isWaterlogged:true},
 {...air,isAir:false,typeId:'minecraft:short_grass',isLiquid:true},
 {...air,isAir:false,typeId:'minecraft:short_grass',isWaterlogged:undefined},
 {...air,isAir:undefined,typeId:'minecraft:short_grass'}
])test(`unknown, liquid or partial body blocks stop the roll: ${hazard.typeId}`,()=>{
 const f=fixture(hazard);f.install();
 // Block the raised route too: the roll may legitimately climb a verified
 // one-block obstacle, and this simplified ray mock treats its top as flat.
 for(let x=3;x<=35;x++)for(let y=81;y<=83;y++)f.edits.set(`${x},${y},0`,hazard);
 f.tap();f.run();assert.ok(f.p.location.x+.3<=3.001);
});
