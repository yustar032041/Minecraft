import assert from 'node:assert/strict';
import {setupWardenArena,WARDEN_DIMENSION} from '../Hakkai_v7.1.0/BehaviorPack/scripts/warden_arena.js';
import {GameMode,Difficulty} from '@minecraft/server';
import {isWardenStructure} from '../Hakkai_v7.1.0/BehaviorPack/scripts/warden_arena_protection.js';
const key=p=>`${Math.floor(p.x)},${Math.floor(p.y)},${Math.floor(p.z)}`;
class Dim{
 constructor(id){this.id=id;this.blocks=new Map();this.writes=[];this.players=[];this.entities=[];}
 isChunkLoaded(){return true;}
 getBlock(p){const type=this.blocks.get(key(p))??'minecraft:air';return {typeId:type,isAir:type==='minecraft:air',isSolid:type!=='minecraft:air'};}
 setBlockType(p,type){this.writes.push({p:{...p},type});this.blocks.set(key(p),type);}
 fillBlocks(v,type){for(let x=v.from.x;x<=v.to.x;x++)for(let y=v.from.y;y<=v.to.y;y++)for(let z=v.from.z;z<=v.to.z;z++)this.setBlockType({x,y,z},type);}
 containsBlock(v){for(const [k] of this.blocks){const [x,y,z]=k.split(',').map(Number);if(x>=v.from.x&&x<=v.to.x&&y>=v.from.y&&y<=v.to.y&&z>=v.from.z&&z<=v.to.z)return true;}return false;}
 getPlayers(opts){if(!opts?.location)return this.players;return this.players.filter(p=>Math.hypot(p.location.x-opts.location.x,p.location.y-opts.location.y,p.location.z-opts.location.z)<=opts.maxDistance);}
 getEntities({type,location,maxDistance}){return this.entities.filter(e=>e.typeId===type&&(!location||Math.hypot(e.location.x-location.x,e.location.y-location.y,e.location.z-location.z)<=maxDistance));}
 spawnEntity(type,at){const e={typeId:type,location:at};this.entities.push(e);return e;}
}
function fixture(){
 const dim=new Dim(WARDEN_DIMENSION),origin=new Dim('minecraft:overworld');origin.blocks.set('2,79,3','minecraft:stone');
 const data=new Map(),worldData=new Map(),inventory=new Map([['hakkai:warden_sigil',1]]),messages=[],errors=[];
 const p={isValid:true,typeId:'minecraft:player',dimension:origin,location:{x:2.5,y:80,z:3.5},getGameMode:()=>GameMode.Survival,
  getDynamicProperty:k=>data.get(k),tryTeleport(at,opts){this.dimension=opts.dimension;this.location={...at};dim.players=[this];return true;}};
 const world={difficulty:Difficulty.Normal,getDifficulty(){return this.difficulty;},getDimension(id){assert.equal(id,WARDEN_DIMENSION);return dim;}};
 const property=(entity,k,v)=>{const m=entity===world?worldData:data;if(v===undefined)m.delete('hakkai:'+k);else m.set('hakkai:'+k,v);};
 const num=(entity,k,or=0)=>(entity===world?worldData:data).get('hakkai:'+k)??or;
 const safe=(d,l)=>{const v={x:Math.floor(l.x),y:Math.floor(l.y),z:Math.floor(l.z)};return d.getBlock({...v,y:v.y-1}).isSolid&&d.getBlock(v).isAir&&d.getBlock({...v,y:v.y+1}).isAir;};
 const args={world,system:{},num,property,notice:(p,s)=>messages.push(s),report:(s,e)=>errors.push([s,e]),loaded:async(d,a,b,fn)=>fn(),safe,
  safeNear:(d,l)=>safe(d,l)?l:undefined,point:p=>({...p.location,id:p.dimension.id}),parsePoint:(p,k)=>{const v=data.get('hakkai:'+k);return v?JSON.parse(v):undefined;},
  returnNatural:async(p,k)=>{const saved=JSON.parse(data.get('hakkai:'+k));p.dimension=origin;p.location={x:saved.x,y:saved.y,z:saved.z};},
  form:async()=>0,total:(c,id)=>c.get(id)??0,space:()=>inventory};
 const arena=setupWardenArena(args);return {arena,p,dim,origin,world,data,worldData,inventory,messages,errors,args};
}
{
 const f=fixture();f.inventory.clear();assert.equal(await f.arena.enter(f.p),false);assert.equal(f.dim.writes.length,0);
}
{
 const f=fixture();assert.equal(await f.arena.enter(f.p),true);assert.equal(f.p.dimension.id,WARDEN_DIMENSION);
 assert.equal(f.worldData.get('hakkai:warden_arena_built_v1'),1);
 for(const {p,type} of f.dim.writes){assert.ok(isWardenStructure(f.dim,p),JSON.stringify(p));assert.ok(['hakkai:warden_arena_stone','hakkai:warden_arena_light'].includes(type),type);}
 assert.equal(f.dim.blocks.get('0,79,0'),'hakkai:warden_arena_stone');assert.equal(f.dim.blocks.get('12,95,12'),'hakkai:warden_arena_light');
 assert.deepEqual(JSON.parse(f.data.get('hakkai:warden_return')),{x:2.5,y:80,z:3.5,id:'minecraft:overworld'});
 assert.equal(f.arena.summon(f.p),true);assert.equal(f.arena.summon(f.p),false,'no duplicate boss');
 f.dim.entities=[];f.world.difficulty=Difficulty.Peaceful;assert.equal(f.arena.summon(f.p),false);
 f.world.difficulty=Difficulty.Normal;f.dim.players.push({location:{x:.5,y:80,z:-6.5}});assert.equal(f.arena.summon(f.p),false,'no boss on top of a player');
 f.dim.players.pop();await f.arena.open(f.p);assert.equal(f.p.dimension.id,'minecraft:overworld');
 const count=f.dim.writes.length;f.inventory.clear();assert.equal(await f.arena.enter(f.p),true,'guide recovery after loss of sigil');assert.equal(f.dim.writes.length,count,'previous arena never regenerated');
}
{
 const f=fixture();f.dim.blocks.set('4,80,4','minecraft:diamond_block');assert.equal(await f.arena.enter(f.p),false);
 assert.equal(f.dim.writes.length,0);assert.equal(f.dim.blocks.get('4,80,4'),'minecraft:diamond_block');
}
{
 const f=fixture();f.dim.players=[{location:{x:2,y:80,z:2}}];assert.equal(await f.arena.enter(f.p),false);assert.equal(f.dim.writes.length,0);
}
{
 const f=fixture(),old=f.dim.fillBlocks.bind(f.dim);let n=0;
 f.dim.fillBlocks=(v,type)=>{if(++n===3)throw Error('unloaded mid-build');return old(v,type)};
 assert.equal(await f.arena.enter(f.p),false);assert.equal(f.worldData.has('hakkai:warden_arena_built_v1'),false);
 const written=f.dim.writes.length;assert.ok(written>0);f.dim.fillBlocks=old;
 assert.equal(await f.arena.enter(f.p),false);assert.equal(f.dim.writes.length,written,'partial structure protected on retry');
}
{
 const f=fixture();f.data.set('hakkai:warden_return',JSON.stringify({id:'minecraft:overworld',x:9,y:80,z:9}));
 const previous=f.data.get('hakkai:warden_return');f.p.tryTeleport=()=>false;
 assert.equal(await f.arena.enter(f.p),false);assert.equal(f.data.get('hakkai:warden_return'),previous);
}
console.log('Warden arena: preflight, partial-build protection, safe arrival/return, recovery and duplicate spawn checks OK (simulated)');

// Fallen players are moved only onto a loaded, vacant floor away from the boss.
{
 const f=fixture();assert.equal(await f.arena.enter(f.p),true);
 f.p.location={x:0,y:70,z:10};assert.equal(f.arena.rescuePlayer(f.p,100),true);
 assert.ok(f.p.location.y>=80);assert.ok(f.messages.some(x=>x.includes('安全な足場')));
 f.p.location.y=70;assert.equal(f.arena.rescuePlayer(f.p,101),false,'retry throttle');
 f.dim.isChunkLoaded=()=>false;assert.equal(f.arena.rescuePlayer(f.p,120),false,'unloaded');
}
{
 const f=fixture();await f.arena.enter(f.p);f.p.location={x:0,y:70,z:10};
 f.args.safeNear=()=>undefined; // Controller captured the original function; block all landing columns instead.
 for(let x=-5;x<=6;x++)for(let z=7;z<=14;z++)for(let y=80;y<=83;y++)f.dim.blocks.set(`${x},${y},${z}`,'minecraft:stone');
 assert.equal(f.arena.rescuePlayer(f.p,0),false,'no safe location');assert.equal(f.p.location.y,70);
}
{
 const f=fixture();await f.arena.enter(f.p);f.p.id='falling';f.p.location={x:0,y:70,z:10};
 f.dim.entities=[{typeId:'hakkai:time_warden',location:{x:.5,y:80,z:12.5}},{typeId:'hakkai:time_warden',location:{x:4.5,y:80,z:12.5}},{typeId:'hakkai:time_warden',location:{x:-3.5,y:80,z:12.5}},{typeId:'hakkai:time_warden',location:{x:.5,y:80,z:8.5}}];
 assert.equal(f.arena.rescuePlayer(f.p,0),false,'no teleport on top of boss');assert.equal(f.p.location.y,70);
}
// Progress tells players exactly what is held, without consuming materials.
{
 const f=fixture(),texts=[];f.inventory.clear();f.inventory.set('hakkai:pearl_0',1);f.inventory.set('hakkai:pearl_7',1);
 f.args.form=async(_p,_title,body)=>{texts.push(body);return undefined;};
 const arena=setupWardenArena(f.args);await arena.open(f.p);
 assert.ok(texts[0].includes('§a◆風')&&texts[0].includes('§7◇霧')&&texts[0].includes('§a◆時'));
 assert.ok(texts[0].includes('§7◇ FUSHIのトーテム'));assert.equal(f.inventory.size,2);
 f.p.getComponent=()=>({getEquipment:()=>({typeId:'hakkai:fushi_totem'})});await arena.open(f.p);
 assert.ok(texts[1].includes('§a◆ FUSHIのトーテム'),'offhand is included');assert.equal(f.inventory.size,2);
 f.p.getComponent=()=>{throw Error('unavailable')};await arena.open(f.p);assert.ok(texts[2].includes('確認できません'));
}
// A friend with no sigil can join a valid player already inside, from a safe
// origin, and receives an independent return point. No host means no entry.
{
 const f=fixture();await f.arena.enter(f.p);const host=f.p,guestData=new Map(),guestInventory=new Map();
 const guest={id:'guest',isValid:true,typeId:'minecraft:player',dimension:f.origin,location:{x:2.5,y:80,z:3.5},getGameMode:()=>GameMode.Survival,
  getDynamicProperty:k=>guestData.get(k),tryTeleport(at,opts){this.dimension=opts.dimension;this.location={...at};f.dim.players.push(this);return true;}};
 const args={...f.args,space:p=>p===guest?guestInventory:f.inventory,parsePoint:(p,k)=>{const v=p.getDynamicProperty('hakkai:'+k);return v?JSON.parse(v):undefined;},property:(entity,k,v)=>{if(entity===guest){if(v===undefined)guestData.delete('hakkai:'+k);else guestData.set('hakkai:'+k,v);}else f.args.property(entity,k,v)}};
 const arena=setupWardenArena(args);assert.equal(await arena.enter(guest),true);assert.equal(guest.dimension.id,WARDEN_DIMENSION);
 assert.deepEqual(JSON.parse(guestData.get('hakkai:warden_return')),{id:'minecraft:overworld',x:2.5,y:80,z:3.5});
 assert.notDeepEqual(guest.location,host.location,'arrival does not overlap host');
 assert.equal(guestInventory.size,0,'no sigil or other items consumed');
}
{
 const f=fixture(),guest=f.p;f.inventory.clear();assert.equal(await f.arena.enter(guest),false,'uninvited entry is denied');
}
{
 const f=fixture();await f.arena.enter(f.p);const host=f.p,guestData=new Map(),guest={isValid:true,typeId:'minecraft:player',dimension:f.origin,location:{x:2.5,y:80,z:3.5},getGameMode:()=>GameMode.Survival,getDynamicProperty:k=>guestData.get(k),tryTeleport:()=>assert.fail('host left before entry')};
 const args={...f.args,space:()=>new Map(),parsePoint:(p,k)=>{const v=p.getDynamicProperty('hakkai:'+k);return v?JSON.parse(v):undefined;},loaded:async(_d,_a,_b,fn)=>{f.dim.players=[];return fn();}};
 assert.equal(await setupWardenArena(args).enter(guest),false,'host presence is rechecked after loading');assert.equal(guestData.size,0);
}
// Creative can enter without a sigil for testing, but survival still cannot.
{
 const f=fixture();f.inventory.clear();f.p.getGameMode=()=>GameMode.Creative;
 assert.equal(await f.arena.enter(f.p),true);assert.equal(f.p.dimension.id,WARDEN_DIMENSION);
}
// The menu keeps practical preparation advice, not an attack catalogue.
{
 const f=fixture(),texts=[];f.p.dimension=f.dim;f.args.form=async(_p,_title,body)=>{texts.push(body);return undefined};await setupWardenArena(f.args).open(f.p);
 assert.match(texts[0],/非常に強力なラスボス/);assert.match(texts[0],/推奨装備・持ち物/);assert.match(texts[0],/風記の永劫鎧/);assert.match(texts[0],/その時点で入手できる最上位/);assert.match(texts[0],/トーテム/);
 assert.doesNotMatch(texts[0],/パターン|連撃|パリィ|第五形態|200以上/);assert.match(texts[0],/参加者/);
}
// Preparation is visible before entering as well as inside the arena.
{
 const f=fixture(),texts=[];f.args.form=async(_p,_title,body)=>{texts.push(body);return undefined};
 await setupWardenArena(f.args).open(f.p);
 assert.match(texts[0],/非常に強力なラスボス/);assert.match(texts[0],/風記の永劫鎧/);
 assert.match(texts[0],/初回討伐後/);assert.match(texts[0],/トーテム/);
 assert.doesNotMatch(texts[0],/パターン|連撃|パリィ|第五形態/);
}
